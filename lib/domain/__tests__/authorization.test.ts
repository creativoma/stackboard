import { describe, expect, it } from 'vitest'
import {
    canArchiveCard,
    canCloseBoard,
    canManageBoard,
    canMutateBoardContent,
    isActiveMember,
    isBoardOwner,
} from '../authorization'

describe('authorization predicates', () => {
    it('rejects a missing membership', () => {
        expect(isActiveMember(null)).toBe(false)
        expect(isActiveMember(undefined)).toBe(false)
    })

    it('rejects a removed member even if they were previously an owner', () => {
        const removedOwner = {
            role: 'owner' as const,
            status: 'removed' as const,
        }
        expect(isActiveMember(removedOwner)).toBe(false)
        expect(canManageBoard(removedOwner)).toBe(false)
        expect(canCloseBoard(removedOwner)).toBe(false)
        expect(canMutateBoardContent(removedOwner)).toBe(false)
    })

    it('allows an active member to mutate content but not manage the board', () => {
        const member = { role: 'member' as const, status: 'active' as const }
        expect(canMutateBoardContent(member)).toBe(true)
        expect(canArchiveCard(member)).toBe(true)
        expect(canManageBoard(member)).toBe(false)
        expect(canCloseBoard(member)).toBe(false)
        expect(isBoardOwner(member)).toBe(false)
    })

    it('allows an observer to read but never mutate', () => {
        const observer = {
            role: 'observer' as const,
            status: 'active' as const,
        }
        expect(isActiveMember(observer)).toBe(true)
        expect(canMutateBoardContent(observer)).toBe(false)
        expect(canArchiveCard(observer)).toBe(false)
        expect(canManageBoard(observer)).toBe(false)
        expect(canCloseBoard(observer)).toBe(false)
        expect(isBoardOwner(observer)).toBe(false)
    })

    it('rejects a removed observer entirely', () => {
        const removed = {
            role: 'observer' as const,
            status: 'removed' as const,
        }
        expect(isActiveMember(removed)).toBe(false)
        expect(canMutateBoardContent(removed)).toBe(false)
    })

    it('allows an active owner to do everything', () => {
        const owner = { role: 'owner' as const, status: 'active' as const }
        expect(canManageBoard(owner)).toBe(true)
        expect(canCloseBoard(owner)).toBe(true)
        expect(isBoardOwner(owner)).toBe(true)
    })
})
