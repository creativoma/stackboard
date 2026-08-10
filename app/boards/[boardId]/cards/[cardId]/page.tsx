import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import {
    canMutateBoardContent,
    isActiveMember,
} from '@/lib/domain/authorization'
import { getCardDetail } from '@/lib/queries/card'
import { dueDateToIso } from '@/lib/domain/due'
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
    PriorityField,
    StartDateField,
    DueDateField,
    LabelsField,
    ArchiveRestoreControls,
} from './card-fields'
import { ChecklistSection } from './checklist-section'
import { CommentsSection } from './comments-section'
import { ActivityTimeline } from './activity-timeline'
import { WatchButton } from './watch-button'
import { AttachmentsSection } from './attachments-section'
import { SubtasksSection } from './subtasks-section'
import { DependenciesSection } from './dependencies-section'
import {
    getActiveCardOptions,
    getCardAttachments,
    getCardWatchers,
} from '@/lib/queries/card'
import { isBoardOwner } from '@/lib/domain/authorization'

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
                <h1 className="text-[15px] font-normal tracking-[-0.1px] mb-2">
                    You don&apos;t have access to this card
                </h1>
            </div>
        )
    }

    const detail = await getCardDetail(boardId, cardId)
    if (!detail) notFound()

    const [
        members,
        labels,
        activeColumns,
        watcherRows,
        attachments,
        cardOptions,
    ] = await Promise.all([
        getBoardMembers(boardId),
        getBoardLabels(boardId),
        getActiveColumns(boardId),
        getCardWatchers(cardId),
        getCardAttachments(cardId),
        getActiveCardOptions(boardId),
    ])

    const {
        card,
        column,
        checklistItems,
        labelIds,
        comments,
        activity,
        parentCard,
        subtasks,
        blockedBy,
        blocks,
    } = detail
    const watching = watcherRows.some((w) => w.userId === user.id)

    // Observers see everything but every form control below is disabled via
    // the wrapping fieldsets; the Server Actions reject them regardless.
    const canEdit = canMutateBoardContent(membership)

    return (
        <div className="max-w-6xl flex flex-col gap-3">
            <div>
                <Button
                    href={`/boards/${boardId}`}
                    variant="ghost"
                    className="-ml-2"
                >
                    &larr; {board.name}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
                <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] divide-y divide-[var(--color-mist)]">
                    <div className="p-4">
                        <fieldset disabled={!canEdit} className="contents">
                            <TitleField
                                boardId={boardId}
                                cardId={cardId}
                                title={card.title}
                            />
                        </fieldset>
                    </div>

                    <section
                        aria-labelledby="description-heading"
                        className="p-4"
                    >
                        <h2 id="description-heading" className="eyebrow mb-3">
                            Description
                        </h2>
                        <fieldset disabled={!canEdit} className="contents">
                            <DescriptionField
                                boardId={boardId}
                                cardId={cardId}
                                description={card.description}
                            />
                        </fieldset>
                    </section>

                    <section className="p-4">
                        <fieldset disabled={!canEdit} className="contents">
                            <ChecklistSection
                                boardId={boardId}
                                cardId={cardId}
                                items={checklistItems}
                            />
                        </fieldset>
                    </section>

                    <section className="p-4">
                        <SubtasksSection
                            boardId={boardId}
                            cardId={cardId}
                            parentCard={parentCard}
                            subtasks={subtasks}
                            canEdit={canEdit}
                        />
                    </section>

                    <section className="p-4">
                        <DependenciesSection
                            boardId={boardId}
                            cardId={cardId}
                            blockedBy={blockedBy}
                            blocks={blocks}
                            options={cardOptions}
                            canEdit={canEdit}
                        />
                    </section>

                    <section className="p-4">
                        <AttachmentsSection
                            boardId={boardId}
                            cardId={cardId}
                            attachments={attachments}
                            canEdit={canEdit}
                            currentUserId={user.id}
                            isOwner={isBoardOwner(membership)}
                        />
                    </section>

                    <section className="p-4">
                        <fieldset disabled={!canEdit} className="contents">
                            <CommentsSection
                                boardId={boardId}
                                cardId={cardId}
                                comments={comments}
                                members={members.map((m) => m.user)}
                            />
                        </fieldset>
                    </section>

                    <section aria-labelledby="activity-heading" className="p-4">
                        <h2 id="activity-heading" className="eyebrow mb-3">
                            Activity
                        </h2>
                        <ActivityTimeline activity={activity} />
                    </section>
                </div>

                <aside className="flex flex-col gap-4 lg:sticky lg:top-4">
                    <section
                        aria-labelledby="properties-heading"
                        className="card-surface flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h2 id="properties-heading" className="eyebrow">
                                Properties
                            </h2>
                            <WatchButton
                                boardId={boardId}
                                cardId={cardId}
                                watching={watching}
                            />
                        </div>
                        {column ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide">
                                    Status
                                </span>
                                <span className="text-[13px] text-[var(--color-ink)]">
                                    {column.name}
                                </span>
                            </div>
                        ) : null}
                        <fieldset disabled={!canEdit} className="contents">
                            <AssigneeField
                                boardId={boardId}
                                cardId={cardId}
                                assigneeId={card.assigneeId}
                                members={members.map((m) => m.user)}
                            />
                            <PriorityField
                                boardId={boardId}
                                cardId={cardId}
                                priority={card.priority}
                            />
                            <StartDateField
                                boardId={boardId}
                                cardId={cardId}
                                startDate={dueDateToIso(card.startDate)}
                            />
                            <DueDateField
                                boardId={boardId}
                                cardId={cardId}
                                dueDate={dueDateToIso(card.dueDate)}
                            />
                            <div className="flex flex-col gap-1.5">
                                <h3 className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide">
                                    Labels
                                </h3>
                                <LabelsField
                                    boardId={boardId}
                                    cardId={cardId}
                                    labelIds={labelIds}
                                    labels={labels}
                                />
                            </div>
                        </fieldset>
                    </section>

                    {canEdit ? (
                        <section
                            aria-labelledby="archive-heading"
                            className="card-surface"
                        >
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
                    ) : null}
                </aside>
            </div>
        </div>
    )
}

export const dynamic = 'force-dynamic'
