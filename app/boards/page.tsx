import type { Metadata } from 'next'
import Link from 'next/link'
import { LayoutGrid, Lock, Mail, SquareCheck, Users } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { listBoardsForUser, listPendingInvitations } from '@/lib/queries/boards'
import { describeActivity } from '@/lib/domain/activity'
import { boardGradient } from '@/lib/board-colors'
import { formatRelativeTime } from '@/lib/format'
import { StaggerIn } from '@/app/_components/stagger-in'
import { AvatarStack, Avatar } from '@/app/_components/avatar-stack'
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

    const totalCards = active.reduce((sum, b) => sum + b.cardCount, 0)
    const totalMembers = new Set(
        active.flatMap((b) => b.members.map((m) => m.id))
    ).size

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

            {active.length > 0 ? (
                <div className="elevated-surface flex flex-wrap divide-x divide-[var(--color-mist)]">
                    <div className="flex items-center gap-3 px-6 py-4">
                        <span className="w-9 h-9 rounded-full bg-[var(--color-electric-blue-tint)] text-[var(--color-electric-blue)] flex items-center justify-center shrink-0">
                            <LayoutGrid size={17} strokeWidth={2} />
                        </span>
                        <div>
                            <p className="text-lg font-semibold leading-tight text-[var(--color-ink)]">
                                {active.length}
                            </p>
                            <p className="text-xs text-[var(--color-fog)]">
                                Active board{active.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <span className="w-9 h-9 rounded-full bg-[var(--color-label-green-subtle)] text-[var(--color-success)] flex items-center justify-center shrink-0">
                            <SquareCheck size={17} strokeWidth={2} />
                        </span>
                        <div>
                            <p className="text-lg font-semibold leading-tight text-[var(--color-ink)]">
                                {totalCards}
                            </p>
                            <p className="text-xs text-[var(--color-fog)]">
                                Card{totalCards === 1 ? '' : 's'} in flight
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-6 py-4">
                        <span className="w-9 h-9 rounded-full bg-[var(--color-lavender)] text-[var(--color-ink)] flex items-center justify-center shrink-0">
                            <Users size={17} strokeWidth={2} />
                        </span>
                        <div>
                            <p className="text-lg font-semibold leading-tight text-[var(--color-ink)]">
                                {totalMembers}
                            </p>
                            <p className="text-xs text-[var(--color-fog)]">
                                Teammate{totalMembers === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

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
                            <li
                                key={invitation.id}
                                className="text-sm flex items-center gap-2"
                            >
                                <Mail
                                    size={14}
                                    strokeWidth={2}
                                    className="shrink-0 text-[var(--color-midnight)]"
                                    aria-hidden="true"
                                />
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
                    <StaggerIn className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {active.map(
                            ({
                                board,
                                role,
                                members,
                                cardCount,
                                latestActivity,
                            }) => (
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
                                        {role === 'owner' ? (
                                            <span className="pill absolute top-3 right-3 bg-white/20 text-white">
                                                Owner
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-col gap-3 p-4">
                                        <div className="flex items-center justify-between">
                                            <AvatarStack
                                                people={members}
                                                max={4}
                                                size="sm"
                                            />
                                            <span className="text-xs text-[var(--color-fog)] flex items-center gap-1 shrink-0">
                                                <SquareCheck
                                                    size={13}
                                                    strokeWidth={2}
                                                    aria-hidden="true"
                                                />
                                                {cardCount}
                                            </span>
                                        </div>
                                        {latestActivity ? (
                                            <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-mist)]">
                                                <Avatar
                                                    person={{
                                                        id: latestActivity.actorName,
                                                        name: latestActivity.actorName,
                                                    }}
                                                    size="sm"
                                                />
                                                <p className="text-xs text-[var(--color-fog)] line-clamp-1 min-w-0">
                                                    <span className="text-[var(--color-smoke)] font-medium">
                                                        {
                                                            latestActivity.actorName.split(
                                                                ' '
                                                            )[0]
                                                        }
                                                    </span>{' '}
                                                    {describeActivity(
                                                        latestActivity
                                                    )}{' '}
                                                    ·{' '}
                                                    {formatRelativeTime(
                                                        latestActivity.createdAt
                                                    )}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[var(--color-fog)] pt-2 border-t border-[var(--color-mist)]">
                                                No activity yet
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            )
                        )}
                    </StaggerIn>
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
                    <StaggerIn className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {closed.map(({ board, memberCount }) => (
                            <div
                                key={board.id}
                                className="flex items-center gap-3 rounded-[var(--radius-cards)] p-4 bg-[var(--color-snow)]"
                            >
                                <span
                                    className="relative w-9 h-9 rounded-[var(--radius-tags)] shrink-0 opacity-60 flex items-center justify-center"
                                    style={{
                                        background: boardGradient(board.id),
                                    }}
                                    aria-hidden="true"
                                >
                                    <Lock
                                        size={14}
                                        strokeWidth={2}
                                        className="text-white"
                                    />
                                </span>
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
                    </StaggerIn>
                </section>
            ) : null}
        </div>
    )
}
