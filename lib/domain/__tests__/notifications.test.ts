import { describe, expect, it } from 'vitest'
import {
    recipientsForEvent,
    notificationTitle,
    splitCommentRecipients,
} from '../notifications'

const ACTIVE = ['u-owner', 'u-alice', 'u-bob', 'u-carol']

describe('recipientsForEvent', () => {
    it('notifies the assignee on card.assigned, never the actor', () => {
        expect(
            recipientsForEvent({
                type: 'card.assigned',
                actorId: 'u-owner',
                assigneeId: 'u-alice',
                watcherIds: [],
                mentionedIds: [],
                activeMemberIds: ACTIVE,
            })
        ).toEqual(['u-alice'])
    })

    it('self-assignment notifies nobody', () => {
        expect(
            recipientsForEvent({
                type: 'card.assigned',
                actorId: 'u-alice',
                assigneeId: 'u-alice',
                watcherIds: [],
                mentionedIds: [],
                activeMemberIds: ACTIVE,
            })
        ).toEqual([])
    })

    it('comment.added notifies watchers and the assignee, minus the commenter', () => {
        expect(
            recipientsForEvent({
                type: 'comment.added',
                actorId: 'u-bob',
                assigneeId: 'u-alice',
                watcherIds: ['u-bob', 'u-carol'],
                mentionedIds: [],
                activeMemberIds: ACTIVE,
            }).sort()
        ).toEqual(['u-alice', 'u-carol'])
    })

    it('mentions take precedence: a mentioned watcher gets one notification, as a mention', () => {
        const { mentioned, others } = splitCommentRecipients({
            actorId: 'u-bob',
            assigneeId: null,
            watcherIds: ['u-carol'],
            mentionedIds: ['u-carol'],
            activeMemberIds: ACTIVE,
        })
        expect(mentioned).toEqual(['u-carol'])
        expect(others).toEqual([])
    })

    it('drops recipients who are no longer active members', () => {
        expect(
            recipientsForEvent({
                type: 'comment.mentioned',
                actorId: 'u-bob',
                assigneeId: null,
                watcherIds: [],
                mentionedIds: ['u-ghost', 'u-alice'],
                activeMemberIds: ACTIVE,
            })
        ).toEqual(['u-alice'])
    })

    it('card.due_soon notifies assignee and watchers with no actor exclusion issue', () => {
        expect(
            recipientsForEvent({
                type: 'card.due_soon',
                actorId: 'u-alice', // system events use the assignee as actor
                assigneeId: 'u-alice',
                watcherIds: ['u-bob'],
                mentionedIds: [],
                activeMemberIds: ACTIVE,
                includeActor: true,
            }).sort()
        ).toEqual(['u-alice', 'u-bob'])
    })
})

describe('notificationTitle', () => {
    it('describes each event type with actor and card title', () => {
        expect(
            notificationTitle('card.assigned', 'Alice', 'Ship it')
        ).toContain('Alice')
        expect(
            notificationTitle('comment.mentioned', 'Bob', 'Ship it')
        ).toContain('mentioned')
        expect(notificationTitle('card.due_soon', '', 'Ship it')).toContain(
            'due'
        )
    })
})
