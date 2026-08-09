'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth/session'
import { actionErrorMessage } from './helpers'

export type NotificationActionState =
    { error?: string; ok?: boolean } | undefined

/** Marks one of the caller's own notifications read. Never anyone else's. */
export async function markNotificationReadAction(
    notificationId: string
): Promise<NotificationActionState> {
    try {
        const user = await requireUser()
        await db
            .update(schema.notifications)
            .set({ readAt: new Date() })
            .where(
                and(
                    eq(schema.notifications.id, notificationId),
                    eq(schema.notifications.userId, user.id),
                    isNull(schema.notifications.readAt)
                )
            )
        revalidatePath('/boards/notifications')
        revalidatePath('/boards')
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
    try {
        const user = await requireUser()
        await db
            .update(schema.notifications)
            .set({ readAt: new Date() })
            .where(
                and(
                    eq(schema.notifications.userId, user.id),
                    isNull(schema.notifications.readAt)
                )
            )
        revalidatePath('/boards/notifications')
        revalidatePath('/boards')
        return { ok: true }
    } catch (err) {
        return { error: actionErrorMessage(err) }
    }
}
