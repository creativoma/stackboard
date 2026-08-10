export type ActivityType =
    | 'board.created'
    | 'board.member_invited'
    | 'board.member_joined'
    | 'board.closed'
    | 'board.public_link_enabled'
    | 'board.public_link_disabled'
    | 'column.created'
    | 'column.archived'
    | 'column.restored'
    | 'column.wip_limit_changed'
    | 'label.created'
    | 'label.updated'
    | 'label.deleted'
    | 'card.created'
    | 'card.moved'
    | 'card.field_changed'
    | 'card.archived'
    | 'card.restored'
    | 'card.attachment_added'
    | 'card.attachment_removed'
    | 'checklist.item_added'
    | 'checklist.item_toggled'
    | 'comment.added'
    | 'card.dependency_added'
    | 'card.dependency_removed'

export type NewActivityEvent = {
    boardId: string
    cardId?: string | null
    actorId: string
    type: ActivityType
    field?: string | null
    oldValue?: string | null
    newValue?: string | null
}

/** Human-readable one-line summary for the activity timeline. Pure/no I/O so it's unit-testable. */
export function describeActivity(event: {
    type: string
    field?: string | null
    oldValue?: string | null
    newValue?: string | null
}): string {
    switch (event.type as ActivityType) {
        case 'board.created':
            return 'created the board'
        case 'board.member_invited':
            return `invited ${event.newValue}`
        case 'board.member_joined':
            return `${event.newValue} joined the board`
        case 'board.closed':
            return 'closed the board'
        case 'board.public_link_enabled':
            return 'turned on the public board link'
        case 'board.public_link_disabled':
            return 'turned off the public board link'
        case 'column.created':
            return `added column "${event.newValue}"`
        case 'column.archived':
            return `archived column "${event.oldValue}"`
        case 'column.restored':
            return `restored column "${event.newValue}"`
        case 'column.wip_limit_changed':
            return event.newValue
                ? `set the WIP limit on "${event.field}" to ${event.newValue}`
                : `removed the WIP limit on "${event.field}"`
        case 'label.created':
            return `created label "${event.newValue}"`
        case 'label.updated':
            return `changed the color of "${event.field}" to ${event.newValue}`
        case 'label.deleted':
            return `deleted label "${event.oldValue}"`
        case 'card.created':
            return 'created this card'
        case 'card.moved':
            return `moved this card from "${event.oldValue}" to "${event.newValue}"`
        case 'card.field_changed': {
            // Description bodies aren't logged; assignee/due-date removals
            // have no newValue and read as "removed the …".
            if (event.field === 'description') return 'updated the description'
            if (!event.newValue) return `removed the ${event.field}`
            if (!event.oldValue)
                return `set the ${event.field} to "${event.newValue}"`
            return `changed the ${event.field} from "${event.oldValue}" to "${event.newValue}"`
        }
        case 'card.archived':
            return 'archived this card'
        case 'card.restored':
            return `restored this card to "${event.newValue}"`
        case 'card.attachment_added':
            return `attached "${event.newValue}"`
        case 'card.attachment_removed':
            return `removed attachment "${event.oldValue}"`
        case 'checklist.item_added':
            return `added checklist item "${event.newValue}"`
        case 'checklist.item_toggled':
            return `marked "${event.field}" ${event.newValue === 'true' ? 'done' : 'not done'}`
        case 'comment.added':
            return 'commented'
        case 'card.dependency_added':
            return `marked this card as blocked by "${event.newValue}"`
        case 'card.dependency_removed':
            return `removed the block by "${event.oldValue}"`
        default:
            return event.type
    }
}
