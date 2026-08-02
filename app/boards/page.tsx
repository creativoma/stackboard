import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { listBoardsForUser, listPendingInvitations } from '@/lib/queries/boards'
import { describeActivity } from '@/lib/domain/activity'
import { boardGradient } from '@/lib/board-colors'
import { NewBoardForm } from './new-board-form'
import { ImportBoardForm } from './import-board-form'

export const metadata: Metadata = { title: 'Your boards' }

export default async function BoardsDashboard() {
    const user = await getCurrentUser()
    if (!user) return null

    const [{ active, closed }, pendingInvites] = await Promise.all([
        listBoardsForUser(user.id),
        listPendingInvitations(user.email),
    ])

    return (
        <div className="flex flex-col gap-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-[32px] font-semibold tracking-[-0.02em] leading-tight">
                        Your boards
                    </h1>
                    <p className="text-[var(--color-smoke)] mt-1">
                        Everything your team is working on, in one place.
                    </p>
                </div>
                <div className="flex items-start gap-2 flex-wrap">
                    <ImportBoardForm />
                    <NewBoardForm />
                </div>
            </div>

            {pendingInvites.length > 0 ? (
                <section
                    aria-labelledby="pending-invites-heading"
                    className="card-surface !bg-[var(--color-electric-blue-tint)]"
                >
                    <h2
                        id="pending-invites-heading"
                        className="eyebrow mb-2 !text-[var(--color-midnight)]"
                    >
                        Pending invitations
                    </h2>
                    <ul className="flex flex-col gap-2">
                        {pendingInvites.map(({ invitation, board }) => (
                            <li key={invitation.id} className="text-sm">
                                <strong className="font-medium">
                                    {board.name}
                                </strong>{' '}
                                <span className="text-[var(--color-smoke)]">
                                    — check your email ({user.email}) for the
                                    invite link.
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <section aria-labelledby="active-boards-heading">
                <h2
                    id="active-boards-heading"
                    className="text-sm font-medium text-[var(--color-fog)] mb-3"
                >
                    Active boards
                </h2>
                {active.length === 0 ? (
                    <div className="card-surface text-center py-12">
                        <p className="text-[var(--color-smoke)]">
                            No boards yet. Create your first board to get
                            started.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {active.map(
                            ({ board, memberCount, latestActivity }) => (
                                <Link
                                    key={board.id}
                                    href={`/boards/${board.id}`}
                                    className="group elevated-surface flex flex-col overflow-hidden hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(9,30,66,0.18)] transition-[transform,box-shadow] duration-150"
                                >
                                    <div
                                        className="relative h-20 shrink-0 flex items-end p-4"
                                        style={{
                                            background: boardGradient(board.id),
                                        }}
                                    >
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                background:
                                                    'radial-gradient(140% 160% at 100% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%)',
                                            }}
                                            aria-hidden="true"
                                        />
                                        <h3 className="relative font-semibold text-[17px] tracking-[-0.02em] text-white leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.25)] line-clamp-2">
                                            {board.name}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col gap-2 p-4">
                                        <p className="text-sm text-[var(--color-smoke)] flex items-center gap-1.5">
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 16 16"
                                                fill="none"
                                                aria-hidden="true"
                                                className="shrink-0"
                                            >
                                                <circle
                                                    cx="8"
                                                    cy="5.5"
                                                    r="2.5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.3"
                                                />
                                                <path
                                                    d="M2.8 13.2C3.4 10.7 5.5 9.5 8 9.5C10.5 9.5 12.6 10.7 13.2 13.2"
                                                    stroke="currentColor"
                                                    strokeWidth="1.3"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            {memberCount} member
                                            {memberCount === 1 ? '' : 's'}
                                        </p>
                                        <p className="text-xs text-[var(--color-fog)] mt-auto line-clamp-1">
                                            {latestActivity
                                                ? describeActivity(
                                                      latestActivity
                                                  )
                                                : 'No activity yet'}
                                        </p>
                                    </div>
                                </Link>
                            )
                        )}
                    </div>
                )}
            </section>

            {closed.length > 0 ? (
                <section aria-labelledby="closed-boards-heading">
                    <h2
                        id="closed-boards-heading"
                        className="text-sm font-medium text-[var(--color-fog)] mb-3"
                    >
                        Archived boards
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {closed.map(({ board, memberCount }) => (
                            <div
                                key={board.id}
                                className="flex items-center gap-3 rounded-[var(--radius-cards)] p-4 bg-[var(--color-snow)]"
                            >
                                <span
                                    className="w-9 h-9 rounded-[var(--radius-tags)] shrink-0 opacity-60"
                                    style={{
                                        background: boardGradient(board.id),
                                    }}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-[15px] text-[var(--color-smoke)] truncate">
                                        {board.name}
                                    </h3>
                                    <p className="text-xs text-[var(--color-fog)]">
                                        {memberCount} member
                                        {memberCount === 1 ? '' : 's'} · closed
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    )
}
