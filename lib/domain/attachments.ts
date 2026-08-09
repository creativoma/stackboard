/**
 * Validation and filename hygiene for card attachments. The stored object
 * key never contains the user's filename (see lib/actions/attachments.ts);
 * the sanitized name is only used for display and the Content-Disposition
 * header on download.
 */

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_FILENAME_LENGTH = 150

export type AttachmentValidation = { ok: true } | { ok: false; error: string }

export function validateAttachment(input: {
    filename: string
    sizeBytes: number
}): AttachmentValidation {
    if (!input.filename.trim()) {
        return { ok: false, error: 'The file needs a name' }
    }
    if (input.sizeBytes <= 0) {
        return { ok: false, error: 'The file is empty' }
    }
    if (input.sizeBytes > MAX_ATTACHMENT_BYTES) {
        return { ok: false, error: 'File is too large (max 10MB)' }
    }
    return { ok: true }
}

/**
 * Make a user-supplied filename safe for display and for a
 * Content-Disposition header: no path separators or traversal, no control
 * chars or quotes, bounded length with the extension preserved.
 */
export function sanitizeFilename(raw: string): string {
    let name = raw

        .replace(/[\u0000-\u001f"]/g, '')
        .replace(/\.\.+/g, '.')
        .replace(/[/\\]+/g, '_')
        .replace(/^[_.]+|[_.]+$/g, '')
        .trim()

    if (!name) return 'file'

    if (name.length > MAX_FILENAME_LENGTH) {
        const dot = name.lastIndexOf('.')
        const ext = dot > 0 ? name.slice(dot) : ''
        name = name.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext
    }
    return name
}
