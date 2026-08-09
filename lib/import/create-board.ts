import 'server-only'
import { db, schema } from '@/db'
import type { NormalizedImport } from './types'

/**
 * Creates a complete board (columns, labels, cards, checklists, comments)
 * from a NormalizedImport in one transaction, owned by `userId`. Shared by
 * the file-import action and the board-template action — both funnel
 * through the same validated shape. Returns the new board id.
 */
export async function createBoardFromNormalized(
    userId: string,
    parsed: NormalizedImport
): Promise<string> {
    let boardId = ''
    await db.transaction(async (tx) => {
        const [board] = await tx
            .insert(schema.boards)
            .values({ name: parsed.boardName, ownerId: userId })
            .returning()
        boardId = board.id

        await tx
            .insert(schema.boardMemberships)
            .values({ boardId, userId, role: 'owner' })

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
                    authorId: userId,
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
            actorId: userId,
            type: 'board.created',
            newValue: board.name,
        })
    })
    return boardId
}
