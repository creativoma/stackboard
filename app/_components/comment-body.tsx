import {
    MENTION_PATTERN,
    isResolvedMentionToken,
    type MentionableMember,
} from '@/lib/domain/mentions'

/**
 * Renders a plain-text comment body, highlighting @mentions that resolve to
 * an actual board member. Text stays text — no HTML is ever injected.
 */
export function CommentBody({
    body,
    members,
}: {
    body: string
    members: MentionableMember[]
}) {
    const parts: React.ReactNode[] = []
    let cursor = 0

    for (const match of body.matchAll(MENTION_PATTERN)) {
        const index = match.index ?? 0
        const token = match[1]
        if (index > cursor) parts.push(body.slice(cursor, index))
        if (isResolvedMentionToken(token, members)) {
            parts.push(
                <strong
                    key={`${index}-${token}`}
                    className="font-semibold text-[var(--color-electric-blue)]"
                >
                    @{token}
                </strong>
            )
        } else {
            parts.push(match[0])
        }
        cursor = index + match[0].length
    }
    if (cursor < body.length) parts.push(body.slice(cursor))

    return <p className="text-sm whitespace-pre-wrap">{parts}</p>
}
