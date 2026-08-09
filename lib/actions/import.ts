'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/session'
import {
    isStackboardExport,
    parseStackboardExport,
} from '@/lib/import/stackboard'
import { parseTrelloExport } from '@/lib/import/trello'
import { parseCsvImport } from '@/lib/import/csv'
import { createBoardFromNormalized } from '@/lib/import/create-board'
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

    const boardId = await createBoardFromNormalized(user.id, parsed)

    revalidatePath('/boards')
    redirect(`/boards/${boardId}`)
}
