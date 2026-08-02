import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
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
        <div className="flex flex-col gap-10 max-w-[720px]">
            <div>
                <Button
                    href={`/boards/${boardId}`}
                    variant="ghost"
                    className="!p-0 !min-h-0"
                >
                    &larr; {board.name}
                </Button>
                {column ? (
                    <p className="eyebrow mt-3 mb-1">In {column.name}</p>
                ) : null}
                <TitleField
                    boardId={boardId}
                    cardId={cardId}
                    title={card.title}
                />
            </div>

            <section aria-labelledby="details-heading" className="card-surface">
                <h2 id="details-heading" className="eyebrow mb-3">
                    Details
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                </div>
                <div className="mt-4">
                    <h3 className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide mb-1.5">
                        Labels
                    </h3>
                    <LabelsField
                        boardId={boardId}
                        cardId={cardId}
                        labelIds={labelIds}
                        labels={labels}
                    />
                </div>
            </section>

            <section
                aria-labelledby="description-heading"
                className="card-surface"
            >
                <h2 id="description-heading" className="eyebrow mb-3">
                    Description
                </h2>
                <DescriptionField
                    boardId={boardId}
                    cardId={cardId}
                    description={card.description}
                />
            </section>

            <section className="card-surface">
                <ChecklistSection
                    boardId={boardId}
                    cardId={cardId}
                    items={checklistItems}
                />
            </section>

            <section className="card-surface">
                <CommentsSection
                    boardId={boardId}
                    cardId={cardId}
                    comments={comments}
                />
            </section>

            <section
                aria-labelledby="activity-heading"
                className="card-surface"
            >
                <h2 id="activity-heading" className="eyebrow mb-3">
                    Activity
                </h2>
                <ActivityTimeline activity={activity} />
            </section>

            <section aria-labelledby="archive-heading" className="card-surface">
                <h2 id="archive-heading" className="eyebrow mb-3">
                    Archive
                </h2>
                <ArchiveRestoreControls
                    boardId={boardId}
                    cardId={cardId}
                    status={card.status}
                    activeColumns={activeColumns}
                />
            </section>
        </div>
    )
}

export const dynamic = 'force-dynamic'
