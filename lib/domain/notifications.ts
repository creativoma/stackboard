import type { NotificationType } from '@/db/schema'

/**
 * Who gets notified for which event — pure rules, no I/O.
 *
 * Invariants, regardless of event type:
 *  - only currently-active board members are ever notified
 *  - the actor never notifies themselves (except system events that opt in
 *    via `includeActor`, e.g. due-soon reminders where the "actor" is the
 *    assignee)
 *  - recipients are deduplicated
 */

export type NotificationEvent = {
    type: NotificationType
    actorId: string
    assigneeId: string | null
    watcherIds: readonly string[]
    mentionedIds: readonly string[]
    activeMemberIds: readonly string[]
    includeActor?: boolean
}

export function recipientsForEvent(event: NotificationEvent): string[] {
    let pool: (string | null)[]
    switch (event.type) {
        case 'card.assigned':
            pool = [event.assigneeId]
            break
        case 'comment.added':
            pool = [...event.watcherIds, event.assigneeId]
            break
        case 'comment.mentioned':
            pool = [...event.mentionedIds]
            break
        case 'card.due_soon':
            pool = [event.assigneeId, ...event.watcherIds]
            break
    }

    const active = new Set(event.activeMemberIds)
    const seen = new Set<string>()
    const recipients: string[] = []
    for (const id of pool) {
        if (!id || seen.has(id)) continue
        if (!active.has(id)) continue
        if (!event.includeActor && id === event.actorId) continue
        seen.add(id)
        recipients.push(id)
    }
    return recipients
}

/**
 * A single comment produces at most one notification per person: mentioned
 * members get the (more specific) mention notification; remaining watchers
 * and the assignee get the plain comment one.
 */
export function splitCommentRecipients(event: {
    actorId: string
    assigneeId: string | null
    watcherIds: readonly string[]
    mentionedIds: readonly string[]
    activeMemberIds: readonly string[]
}): { mentioned: string[]; others: string[] } {
    const mentioned = recipientsForEvent({
        ...event,
        type: 'comment.mentioned',
    })
    const mentionedSet = new Set(mentioned)
    const others = recipientsForEvent({
        ...event,
        type: 'comment.added',
    }).filter((id) => !mentionedSet.has(id))
    return { mentioned, others }
}

export function notificationTitle(
    type: NotificationType,
    actorName: string,
    cardTitle: string
): string {
    switch (type) {
        case 'card.assigned':
            return `${actorName} assigned you "${cardTitle}"`
        case 'comment.added':
            return `${actorName} commented on "${cardTitle}"`
        case 'comment.mentioned':
            return `${actorName} mentioned you on "${cardTitle}"`
        case 'card.due_soon':
            return `"${cardTitle}" is due within 24 hours`
    }
}
