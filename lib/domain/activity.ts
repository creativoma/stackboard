export type ActivityType =
    | 'board.created'
    | 'board.member_invited'
    | 'board.member_joined'
    | 'board.closed'
    | 'column.created'
    | 'column.archived'
    | 'column.restored'
    | 'card.created'
    | 'card.moved'
    | 'card.field_changed'
    | 'card.archived'
    | 'card.restored'
    | 'checklist.item_added'
    | 'checklist.item_toggled'
    | 'comment.added'

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
        case 'column.created':
            return `added column "${event.newValue}"`
        case 'column.archived':
            return `archived column "${event.oldValue}"`
        case 'column.restored':
            return `restored column "${event.newValue}"`
        case 'card.created':
            return 'created this card'
        case 'card.moved':
            return `moved this card from "${event.oldValue}" to "${event.newValue}"`
        case 'card.field_changed':
            return `changed ${event.field} ${event.oldValue ? `from "${event.oldValue}" ` : ''}to "${event.newValue}"`
        case 'card.archived':
            return 'archived this card'
        case 'card.restored':
            return `restored this card to "${event.newValue}"`
        case 'checklist.item_added':
            return `added checklist item "${event.newValue}"`
        case 'checklist.item_toggled':
            return `marked "${event.field}" ${event.newValue === 'true' ? 'done' : 'not done'}`
        case 'comment.added':
            return 'commented'
        default:
            return event.type
    }
}
