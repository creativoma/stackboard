'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth/session'
import {
    isStackboardExport,
    parseStackboardExport,
} from '@/lib/import/stackboard'
import { parseTrelloExport } from '@/lib/import/trello'
import { parseCsvImport } from '@/lib/import/csv'
import type { NormalizedImport } from '@/lib/import/types'

export type ImportBoardState = { error?: string } | undefined

const MAX_IMPORT_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function importBoardAction(
    _prev: ImportBoardState,
    formData: FormData
): Promise<ImportBoardState> {
    const user = await requireUser()

    const file = formData.get('file')
    if (!(file instanceof Blob) || file.size === 0) {
        return { error: 'Choose a JSON file to import' }
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
        return { error: 'File is too large (max 20MB)' }
    }

    const text = await file.text()
    const looksLikeJson = /^[[{]/.test(text.trimStart())

    let parsed: NormalizedImport
    if (looksLikeJson) {
        let raw: unknown
        try {
            raw = JSON.parse(text)
        } catch {
            return { error: 'That file is not valid JSON' }
        }
        try {
            parsed = isStackboardExport(raw)
                ? parseStackboardExport(raw)
                : parseTrelloExport(raw)
        } catch (err) {
            return {
                error:
                    err instanceof Error
                        ? err.message
                        : 'Could not read that file',
            }
        }
    } else {
        try {
            parsed = parseCsvImport(text)
        } catch (err) {
            return {
                error:
                    err instanceof Error
                        ? err.message
                        : 'Could not read that file',
            }
        }
    }

    if (parsed.columns.length === 0) {
        return { error: 'That board has no lists/columns to import' }
    }

    let boardId = ''
    await db.transaction(async (tx) => {
        const [board] = await tx
            .insert(schema.boards)
            .values({ name: parsed.boardName, ownerId: user.id })
            .returning()
        boardId = board.id

        await tx
            .insert(schema.boardMemberships)
            .values({ boardId, userId: user.id, role: 'owner' })

        const insertedColumns = await tx
            .insert(schema.columns)
            .values(
                parsed.columns.map((column, position) => ({
                    boardId,
                    name: column.name,
                    position,
                    status: column.status,
                    archivedAt:
                        column.status === 'archived' ? new Date() : null,
                }))
            )
            .returning()

        const insertedLabels = parsed.labels.length
            ? await tx
                  .insert(schema.labels)
                  .values(
                      parsed.labels.map((label) => ({
                          boardId,
                          name: label.name,
                          color: label.color,
                      }))
                  )
                  .returning()
            : []

        const validCards = parsed.cards.filter(
            (card) => insertedColumns[card.columnIndex]
        )

        const insertedCards = validCards.length
            ? await tx
                  .insert(schema.cards)
                  .values(
                      validCards.map((card) => ({
                          boardId,
                          columnId: insertedColumns[card.columnIndex].id,
                          title: card.title,
                          description: card.description,
                          dueDate: card.dueDate,
                          position: card.position,
                          status: card.status,
                          archivedAt:
                              card.status === 'archived' ? new Date() : null,
                      }))
                  )
                  .returning()
            : []

        const cardLabelValues: { cardId: string; labelId: string }[] = []
        const checklistValues: {
            cardId: string
            text: string
            done: boolean
            position: number
        }[] = []
        const commentValues: {
            cardId: string
            authorId: string
            body: string
        }[] = []

        validCards.forEach((card, i) => {
            const cardId = insertedCards[i].id
            for (const labelIndex of card.labelIndexes) {
                const label = insertedLabels[labelIndex]
                if (label) cardLabelValues.push({ cardId, labelId: label.id })
            }
            card.checklist.forEach((item, position) => {
                checklistValues.push({
                    cardId,
                    text: item.text,
                    done: item.done,
                    position,
                })
            })
            card.comments.forEach((comment) => {
                commentValues.push({
                    cardId,
                    authorId: user.id,
                    body: comment.body,
                })
            })
        })

        if (cardLabelValues.length)
            await tx.insert(schema.cardLabels).values(cardLabelValues)
        if (checklistValues.length)
            await tx.insert(schema.checklistItems).values(checklistValues)
        if (commentValues.length)
            await tx.insert(schema.comments).values(commentValues)

        await tx.insert(schema.activityEvents).values({
            boardId,
            actorId: user.id,
            type: 'board.created',
            newValue: board.name,
        })
    })

    revalidatePath('/boards')
    redirect(`/boards/${boardId}`)
}
