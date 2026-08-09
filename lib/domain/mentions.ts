/**
 * @mention rules for comments.
 *
 * Comments are plain text (never rendered as markdown/HTML), so mentions are
 * resolved twice from the raw body: once when the comment is created (to
 * decide who to notify) and once at render time (to highlight). Nothing
 * special is persisted in the comment body.
 *
 * A candidate is `@` + word chars/dots/hyphens, not preceded by a word char
 * (so `alice@example.com` is an email, not a mention of "example"). It
 * resolves to a member when it equals — case-insensitively — either the
 * member's email local part or their first name. Only resolved, active
 * members are ever notified or highlighted.
 */

export type MentionableMember = { id: string; name: string; email: string }

export const MENTION_PATTERN = /(?<![\w.@-])@([\w.-]{1,30})/g

export function extractMentionCandidates(body: string): string[] {
    const seen = new Set<string>()
    for (const match of body.matchAll(MENTION_PATTERN)) {
        seen.add(match[1].toLowerCase())
    }
    return [...seen]
}

function candidateKeys(member: MentionableMember): string[] {
    const emailLocal = member.email.split('@')[0]?.toLowerCase() ?? ''
    const firstName = member.name.split(/\s+/)[0]?.toLowerCase() ?? ''
    return [emailLocal, firstName].filter(Boolean)
}

/** Resolve candidate tokens to unique member ids, in candidate order. */
export function resolveMentions(
    candidates: readonly string[],
    members: readonly MentionableMember[]
): string[] {
    const resolved: string[] = []
    for (const candidate of candidates) {
        const token = candidate.toLowerCase()
        for (const member of members) {
            if (
                candidateKeys(member).includes(token) &&
                !resolved.includes(member.id)
            ) {
                resolved.push(member.id)
            }
        }
    }
    return resolved
}

/**
 * The token the composer inserts for a member. Email local parts are unique
 * per board (emails are), first names are not, so autocomplete always writes
 * the local part even when the member would also match by first name.
 */
export function mentionToken(member: MentionableMember): string {
    return member.email.split('@')[0]?.toLowerCase() ?? ''
}

/** Members whose name/email matches the token being typed, best-prefix first. */
export function searchMentionables(
    query: string,
    members: readonly MentionableMember[],
    limit = 6
): MentionableMember[] {
    const q = query.toLowerCase()
    if (!q) return members.slice(0, limit)
    const scored: { member: MentionableMember; score: number }[] = []
    for (const member of members) {
        const keys = [...candidateKeys(member), member.name.toLowerCase()]
        if (keys.some((key) => key.startsWith(q))) {
            scored.push({ member, score: 0 })
        } else if (keys.some((key) => key.includes(q))) {
            scored.push({ member, score: 1 })
        }
    }
    return scored
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((entry) => entry.member)
}

/** True when this exact token resolves to any member — used for highlighting. */
export function isResolvedMentionToken(
    token: string,
    members: readonly MentionableMember[]
): boolean {
    return resolveMentions([token], members).length > 0
}
