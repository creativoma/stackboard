import { describe, expect, it } from 'vitest'
import {
    extractMentionCandidates,
    mentionToken,
    resolveMentions,
    searchMentionables,
} from '../mentions'

const MEMBERS = [
    { id: 'u-alice', name: 'Alice Owens', email: 'alice@example.com' },
    { id: 'u-bob', name: 'Bob Márquez', email: 'bob.m@example.com' },
    { id: 'u-carol', name: 'Carol', email: 'carol@example.com' },
]

describe('extractMentionCandidates', () => {
    it('extracts @tokens with word chars, dots, and hyphens', () => {
        expect(
            extractMentionCandidates('ping @alice and @bob.m about this')
        ).toEqual(['alice', 'bob.m'])
    })

    it('ignores emails (no mention inside a word) and bare @', () => {
        expect(
            extractMentionCandidates('mail me at alice@example.com @ nothing')
        ).toEqual([])
    })

    it('dedupes repeated candidates', () => {
        expect(extractMentionCandidates('@carol @carol')).toEqual(['carol'])
    })

    it('accepts mentions at start, after punctuation, and at end', () => {
        expect(extractMentionCandidates('@alice, see this (@carol)')).toEqual([
            'alice',
            'carol',
        ])
    })

    it('caps candidate length at 30 chars', () => {
        const long = 'x'.repeat(40)
        expect(extractMentionCandidates(`@${long}`)[0]).toHaveLength(30)
    })
})

describe('resolveMentions', () => {
    it('matches the email local part case-insensitively', () => {
        expect(resolveMentions(['ALICE'], MEMBERS)).toEqual(['u-alice'])
        expect(resolveMentions(['bob.m'], MEMBERS)).toEqual(['u-bob'])
    })

    it('matches the first name case-insensitively', () => {
        expect(resolveMentions(['carol'], MEMBERS)).toEqual(['u-carol'])
    })

    it('never matches partial names or unknown tokens', () => {
        expect(resolveMentions(['ali'], MEMBERS)).toEqual([])
        expect(resolveMentions(['nobody'], MEMBERS)).toEqual([])
    })

    it('dedupes when two candidates resolve to the same member', () => {
        expect(resolveMentions(['alice', 'Alice'], MEMBERS)).toEqual([
            'u-alice',
        ])
    })
})

describe('mentionToken', () => {
    it('is the email local part, so what autocomplete inserts resolves back', () => {
        for (const member of MEMBERS) {
            expect(resolveMentions([mentionToken(member)], MEMBERS)).toEqual([
                member.id,
            ])
        }
    })
})

describe('searchMentionables', () => {
    const ids = (query: string) =>
        searchMentionables(query, MEMBERS).map((m) => m.id)

    it('lists everyone for an empty token (a bare @)', () => {
        expect(ids('')).toEqual(['u-alice', 'u-bob', 'u-carol'])
    })

    it('matches prefixes of the email local part, first name, and full name', () => {
        expect(ids('ali')).toEqual(['u-alice'])
        expect(ids('bob.')).toEqual(['u-bob'])
        expect(ids('Bob Már')).toEqual(['u-bob'])
    })

    it('ranks prefix matches above substring matches', () => {
        expect(ids('c')).toEqual(['u-carol', 'u-alice'])
    })

    it('returns nothing when no member matches', () => {
        expect(ids('zzz')).toEqual([])
    })

    it('caps the list', () => {
        expect(searchMentionables('', MEMBERS, 2)).toHaveLength(2)
    })
})
