import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getCurrentUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getStorage } from '@/lib/storage'

/**
 * Authenticated attachment download. Membership is re-checked on every
 * request — attachment URLs are worthless without an active session on the
 * board. Bytes stream straight from the storage adapter.
 */
export async function GET(
    _request: Request,
    ctx: RouteContext<'/boards/[boardId]/attachments/[attachmentId]'>
) {
    const { boardId, attachmentId } = await ctx.params

    const user = await getCurrentUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    const membership = await getMembership(boardId, user.id)
    if (!isActiveMember(membership)) {
        return new Response('Forbidden', { status: 403 })
    }

    const [attachment] = await db
        .select()
        .from(schema.attachments)
        .where(
            and(
                eq(schema.attachments.id, attachmentId),
                eq(schema.attachments.boardId, boardId)
            )
        )
        .limit(1)
    if (!attachment || !attachment.storageKey) {
        return new Response('Not found', { status: 404 })
    }

    const stream = await getStorage().getStream(attachment.storageKey)
    if (!stream) return new Response('Not found', { status: 404 })

    // Images and PDFs are previewable inline (attachments-section.tsx embeds
    // them in an <img>/<iframe>); an `attachment` disposition makes browsers
    // download an iframe's content instead of rendering it. Everything else
    // still forces a download.
    const disposition =
        attachment.mimeType.startsWith('image/') ||
        attachment.mimeType === 'application/pdf'
            ? 'inline'
            : 'attachment'

    // filename is already sanitized (no quotes/control chars); filename* carries
    // the UTF-8 form per RFC 5987.
    return new Response(stream, {
        headers: {
            'Content-Type': attachment.mimeType,
            'Content-Length': String(attachment.sizeBytes),
            'Content-Disposition': `${disposition}; filename="${attachment.filename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    })
}
