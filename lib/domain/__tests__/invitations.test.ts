import { describe, expect, it } from 'vitest'
import {
    invitationExpiresAt,
    isInvitationUsable,
    isValidEmail,
    normalizeEmail,
} from '../invitations'

describe('invitationExpiresAt', () => {
    it('expires exactly 7 days after now', () => {
        const now = new Date('2024-01-01T00:00:00Z')
        const expires = invitationExpiresAt(now)
        expect(expires.getTime() - now.getTime()).toBe(7 * 24 * 60 * 60 * 1000)
    })
})

describe('isInvitationUsable', () => {
    it('is usable while pending and not yet expired', () => {
        const invite = { status: 'pending', expiresAt: new Date('2024-01-10') }
        expect(isInvitationUsable(invite, new Date('2024-01-05'))).toBe(true)
    })

    it('is not usable once expired, even if still marked pending', () => {
        const invite = { status: 'pending', expiresAt: new Date('2024-01-01') }
        expect(isInvitationUsable(invite, new Date('2024-01-05'))).toBe(false)
    })

    it('is not usable once accepted or revoked', () => {
        const future = new Date('2099-01-01')
        expect(
            isInvitationUsable({ status: 'accepted', expiresAt: future })
        ).toBe(false)
        expect(
            isInvitationUsable({ status: 'revoked', expiresAt: future })
        ).toBe(false)
    })
})

describe('normalizeEmail / isValidEmail', () => {
    it('lowercases and trims', () => {
        expect(normalizeEmail('  Alice@Example.com ')).toBe('alice@example.com')
    })

    it('rejects malformed addresses', () => {
        expect(isValidEmail('not-an-email')).toBe(false)
        expect(isValidEmail('a@b.com')).toBe(true)
    })
})
