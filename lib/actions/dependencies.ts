'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import {
    requireContentEditor,
    logActivity,
    actionErrorMessage,
    ActionError,
} from './helpers'
import { wouldCreateCycle } from '@/lib/domain/dependencies'
import { getBoardDependencyEdges } from '@/lib/queries/card'

export type DependencyActionState = { error?: string; ok?: boolean } | undefined

const cardIdSchema = z.string().uuid()

/** cardId is blocked by blockerCardId — blockerCardId must finish first. */
export async function addDependencyAction(
    boardId: string,
    cardId: string,
    _prev: DependencyActionState,
    formData: FormData
): Promise<DependencyActionState> {
    try {
        const { user } = await requireContentEditor(boardId)
        const parsed = cardIdSchema.safeParse(formData.get('blockerCardId'))
        if (!parsed.success) return { error: 'Choose a card' }
        const blockerCardId = parsed.data

        const [card, blocker] = await Promise.all([
            db
                .select()
                .from(schema.cards)
                .where(
                    and(
                        eq(schema.cards.id, cardId),
                        eq(schema.cards.boardId, boardId)
                    )
                )
                .limit(1)
                .then((r) => r[0]),
            db
                .select()
                .from(schema.cards)
                .where(
                    and(
                        eq(schema.cards.id, blockerCardId),
                        eq(schema.cards.boardId, boardId)
                    )
                )
                .limit(1)
                .then((r) => r[0]),
        ])
        if (!card) throw new ActionError('Card not found')
        if (!blocker) throw new ActionError('That card is not on this board')

        const edges = await getBoardDependencyEdges(boardId)
        if (wouldCreateCycle(edges, { blockerCardId, blockedCardId: cardId }))
            throw new ActionError(
                'That would create a dependency cycle between these cards'
            )

        await db
            .insert(schema.cardDependencies)
            .values({ boardId, blockerCardId, blockedCardId: cardId })
            .onConflictDoNothing()

        await logActivity({
            boardId,
            cardId,
            actorId: user.id,
            type: 'card.dependency_added',
            newValue: blocker.title,
        })

        revalidatePath(`/boards/${boardId}/cards/${cardId}`)
        revalidatePath(`/boards/${boardId}/cards/${blockerCardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function removeDependencyAction(
    boardId: string,
    dependencyId: string
): Promise<DependencyActionState> {
    try {
        const { user } = await requireContentEditor(boardId)

        const [dependency] = await db
            .select({
                id: schema.cardDependencies.id,
                blockerCardId: schema.cardDependencies.blockerCardId,
                blockedCardId: schema.cardDependencies.blockedCardId,
            })
            .from(schema.cardDependencies)
            .where(
                and(
                    eq(schema.cardDependencies.id, dependencyId),
                    eq(schema.cardDependencies.boardId, boardId)
                )
            )
            .limit(1)
        if (!dependency) throw new ActionError('Dependency not found')

        const [blocker] = await db
            .select({ title: schema.cards.title })
            .from(schema.cards)
            .where(eq(schema.cards.id, dependency.blockerCardId))
            .limit(1)

        await db
            .delete(schema.cardDependencies)
            .where(eq(schema.cardDependencies.id, dependencyId))

        await logActivity({
            boardId,
            cardId: dependency.blockedCardId,
            actorId: user.id,
            type: 'card.dependency_removed',
            oldValue: blocker?.title ?? 'a card',
        })

        revalidatePath(`/boards/${boardId}/cards/${dependency.blockedCardId}`)
        revalidatePath(`/boards/${boardId}/cards/${dependency.blockerCardId}`)
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
