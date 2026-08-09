import { describe, expect, it } from 'vitest'
import {
    MAX_ATTACHMENT_BYTES,
    sanitizeFilename,
    validateAttachment,
} from '../attachments'

describe('validateAttachment', () => {
    it('accepts a normal file', () => {
        expect(
            validateAttachment({ filename: 'spec.pdf', sizeBytes: 1024 })
        ).toEqual({ ok: true })
    })

    it('rejects an empty file', () => {
        const result = validateAttachment({ filename: 'x.png', sizeBytes: 0 })
        expect(result.ok).toBe(false)
    })

    it('rejects a file over the 10MB cap', () => {
        const result = validateAttachment({
            filename: 'big.zip',
            sizeBytes: MAX_ATTACHMENT_BYTES + 1,
        })
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error).toMatch(/10MB/)
    })

    it('rejects a nameless file', () => {
        expect(validateAttachment({ filename: '', sizeBytes: 10 }).ok).toBe(
            false
        )
    })
})

describe('sanitizeFilename', () => {
    it('strips path separators and traversal sequences', () => {
        expect(sanitizeFilename('../../etc/passwd')).toBe('etc_passwd')
        expect(sanitizeFilename('a\\b/c.txt')).toBe('a_b_c.txt')
    })

    it('strips control characters and quotes (Content-Disposition safety)', () => {
        expect(sanitizeFilename('we"ird\n.txt')).toBe('weird.txt')
    })

    it('caps length at 150 chars, preserving the extension', () => {
        const long = 'x'.repeat(300) + '.tar.gz'
        const safe = sanitizeFilename(long)
        expect(safe.length).toBeLessThanOrEqual(150)
        expect(safe.endsWith('.gz')).toBe(true)
    })

    it('falls back to "file" when nothing survives', () => {
        expect(sanitizeFilename('///')).toBe('file')
    })
})
