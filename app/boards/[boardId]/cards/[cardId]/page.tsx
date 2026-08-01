import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getCardDetail } from '@/lib/queries/card'
import {
    getActiveColumns,
    getBoard,
    getBoardLabels,
    getBoardMembers,
} from '@/lib/queries/board'
import {
    TitleField,
    DescriptionField,
    AssigneeField,
    DueDateField,
    LabelsField,
    ArchiveRestoreControls,
} from './card-fields'
import { ChecklistSection } from './checklist-section'
import { CommentsSection } from './comments-section'
import { ActivityTimeline } from './activity-timeline'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string; cardId: string }>
}): Promise<Metadata> {
    const { boardId, cardId } = await params
    const detail = await getCardDetail(boardId, cardId)
    return { title: detail?.card.title ?? 'Card' }
}

export default async function CardDetailPage({
    params,
}: {
    params: Promise<{ boardId: string; cardId: string }>
}) {
    const { boardId, cardId } = await params
    const user = await requireUser()

    const [board, membership] = await Promise.all([
        getBoard(boardId),
        getMembership(boardId, user.id),
    ])
    if (!board) notFound()
    if (!isActiveMember(membership)) {
        return (
            <div className="card-surface text-center py-16">
                <h1 className="text-xl font-semibold mb-2">
                    You don&apos;t have access to this card
                </h1>
            </div>
        )
    }

    const detail = await getCardDetail(boardId, cardId)
    if (!detail) notFound()

    const [members, labels, activeColumns] = await Promise.all([
        getBoardMembers(boardId),
        getBoardLabels(boardId),
        getActiveColumns(boardId),
    ])

    const { card, column, checklistItems, labelIds, comments, activity } =
        detail

    return (
        <div className="flex flex-col gap-4 max-w-[960px] mx-auto">
            <Link
                href={`/boards/${boardId}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-electric-blue)] hover:text-[var(--color-midnight-pressed)] w-fit"
            >
                <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0"
                >
                    <path
                        d="M9.5 3L4.5 8L9.5 13"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                {board.name}
            </Link>

            <div
                className="rounded-[var(--radius-sheet)] bg-[var(--color-paper)] p-6 sm:p-8"
                style={{ boxShadow: 'var(--shadow-sheet)' }}
            >
                {column ? (
                    <p className="eyebrow mb-2">In {column.name}</p>
                ) : null}

                <TitleField
                    boardId={boardId}
                    cardId={cardId}
                    title={card.title}
                />

                <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 mt-6">
                    <div className="flex flex-col gap-7">
                        <section>
                            <h2 className="text-sm font-semibold mb-2">
                                Description
                            </h2>
                            <DescriptionField
                                boardId={boardId}
                                cardId={cardId}
                                description={card.description}
                            />
                        </section>

                        <section className="border-t border-[var(--color-mist)] pt-6">
                            <ChecklistSection
                                boardId={boardId}
                                cardId={cardId}
                                items={checklistItems}
                            />
                        </section>

                        <section className="border-t border-[var(--color-mist)] pt-6">
                            <CommentsSection
                                boardId={boardId}
                                cardId={cardId}
                                comments={comments}
                            />
                        </section>

                        <section className="border-t border-[var(--color-mist)] pt-6">
                            <h2 className="text-sm font-semibold mb-2">
                                Activity
                            </h2>
                            <ActivityTimeline activity={activity} />
                        </section>
                    </div>

                    <aside className="flex flex-col gap-4 md:bg-[var(--color-snow)] md:rounded-[var(--radius-cards)] md:p-4 h-fit">
                        <AssigneeField
                            boardId={boardId}
                            cardId={cardId}
                            assigneeId={card.assigneeId}
                            members={members.map((m) => m.user)}
                        />
                        <DueDateField
                            boardId={boardId}
                            cardId={cardId}
                            dueDate={
                                card.dueDate ? card.dueDate.toISOString() : null
                            }
                        />
                        <div>
                            <h2 className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide mb-1.5">
                                Labels
                            </h2>
                            <LabelsField
                                boardId={boardId}
                                cardId={cardId}
                                labelIds={labelIds}
                                labels={labels}
                            />
                        </div>
                        <div className="border-t border-[var(--color-mist)] pt-4">
                            <ArchiveRestoreControls
                                boardId={boardId}
                                cardId={cardId}
                                status={card.status}
                                activeColumns={activeColumns}
                            />
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    )
}

export const dynamic = 'force-dynamic'
