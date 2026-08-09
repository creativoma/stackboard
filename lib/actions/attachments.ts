'use server'

import { revalidatePath } from 'next/cache'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import { isBoardOwner } from '@/lib/domain/authorization'
import { sanitizeFilename, validateAttachment } from '@/lib/domain/attachments'
import { getStorage } from '@/lib/storage'

export type AttachmentActionState = { error?: string; ok?: boolean } | undefined

export async function addAttachmentAction(
    boardId: string,
    cardId: string,
    _prev: AttachmentActionState,
    formData: FormData
): Promise<AttachmentActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

        const [card] = await db
            .select({ id: schema.cards.id })
            .from(schema.cards)
            .where(
                and(
                    eq(schema.cards.id, cardId),
                    eq(schema.cards.boardId, boardId)
                )
            )
            .limit(1)
        if (!card) throw new ActionError('Card not found')

        const file = formData.get('file')
        if (!(file instanceof File) || file.size === 0) {
            return { error: 'Choose a file to attach' }
        }

        const filename = sanitizeFilename(file.name)
        const validation = validateAttachment({
            filename,
            sizeBytes: file.size,
        })
        if (!validation.ok) return { error: validation.error }

        // The storage key is entirely server-generated — the user's filename
        // never becomes part of a filesystem path.
        const [attachment] = await db
            .insert(schema.attachments)
            .values({
                boardId,
                cardId,
                uploaderId: user.id,
                filename,
                mimeType: file.type || 'application/octet-stream',
                sizeBytes: file.size,
                storageKey: '', // set below once the id exists
            })
            .returning()

        const storageKey = `${boardId}/${attachment.id}`
        try {
            await getStorage().put(
                storageKey,
                new Uint8Array(await file.arrayBuffer())
            )
        } catch (err) {
            // Never leave a metadata row pointing at bytes that don't exist.
            await db
                .delete(schema.attachments)
                .where(eq(schema.attachments.id, attachment.id))
            throw err
        }
        await db
            .update(schema.attachments)
            .set({ storageKey })
            .where(eq(schema.attachments.id, attachment.id))

        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'card.attachment_added',
            newValue: filename,
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

/** The uploader or the board owner may delete an attachment. */
export async function deleteAttachmentAction(
    boardId: string,
    cardId: string,
    attachmentId: string
): Promise<AttachmentActionState> {
    try {
        const { user, membership } = await requireContentEditor(boardId)

        const [attachment] = await db
            .select()
            .from(schema.attachments)
            .where(
                and(
                    eq(schema.attachments.id, attachmentId),
                    eq(schema.attachments.boardId, boardId),
                    eq(schema.attachments.cardId, cardId)
                )
            )
            .limit(1)
        if (!attachment) throw new ActionError('Attachment not found')

        if (attachment.uploaderId !== user.id && !isBoardOwner(membership)) {
            throw new ActionError(
                'Only the uploader or the board owner can delete this'
            )
        }

        await db
            .delete(schema.attachments)
            .where(eq(schema.attachments.id, attachmentId))
        if (attachment.storageKey) {
            await getStorage().delete(attachment.storageKey)
        }

        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'card.attachment_removed',
            oldValue: attachment.filename,
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
