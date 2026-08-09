import type { Metadata } from 'next'
import Link from 'next/link'
import { requireUser } from '@/lib/auth/session'
import { listNotifications } from '@/lib/queries/notifications'
import { markAllNotificationsReadAction } from '@/lib/actions/notifications'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { formatRelativeTime } from '@/lib/format'
import { MarkReadButton } from './mark-read-button'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
    const user = await requireUser()
    const notifications = await listNotifications(user.id)
    const unread = notifications.filter((n) => !n.readAt)

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div className="flex items-end justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-[16px] font-medium tracking-[-0.2px]">
                        Notifications
                    </h1>
                    <p className="tabular text-sm text-[var(--color-smoke)] mt-1">
                        {unread.length} unread
                    </p>
                </div>
                {unread.length > 0 ? (
                    <form
                        action={async () => {
                            'use server'
                            await markAllNotificationsReadAction()
                        }}
                    >
                        <SubmitButton pendingText="Marking…">
                            Mark all read
                        </SubmitButton>
                    </form>
                ) : null}
            </div>

            {notifications.length === 0 ? (
                <div className="card-surface text-center py-12">
                    <p className="text-[var(--color-smoke)]">
                        Nothing yet. Mentions, assignments, and due-date
                        reminders will show up here.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-2">
                    {notifications.map((n) => (
                        <li
                            key={n.id}
                            className={`elevated-surface flex items-center justify-between gap-3 p-3 ${
                                n.readAt ? 'opacity-70' : ''
                            }`}
                        >
                            <div className="min-w-0">
                                <Link
                                    href={
                                        n.cardId
                                            ? `/boards/${n.boardId}/cards/${n.cardId}`
                                            : `/boards/${n.boardId}`
                                    }
                                    className="block text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] truncate"
                                >
                                    {!n.readAt ? (
                                        <span
                                            className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-electric-blue)] mr-2 align-middle"
                                            aria-label="Unread"
                                        />
                                    ) : null}
                                    {n.title}
                                </Link>
                                <p className="text-xs text-[var(--color-fog)] truncate">
                                    {n.boardName} ·{' '}
                                    {formatRelativeTime(n.createdAt)}
                                </p>
                            </div>
                            {!n.readAt ? (
                                <MarkReadButton notificationId={n.id} />
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export const dynamic = 'force-dynamic'
