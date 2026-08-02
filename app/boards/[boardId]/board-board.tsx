'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Archive, Calendar, CheckSquare } from 'lucide-react'
import { Button } from '../../_components/button'
import { Avatar } from '../../_components/avatar-stack'
import { ProgressBar } from '../../_components/progress-bar'
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveCardAction, type CardActionState } from '@/lib/actions/cards'
import { archiveColumnAction } from '@/lib/actions/columns'
import { isOverdue } from '@/lib/domain/filters'
import type {
    CardSummary,
    ColumnSummary,
    LabelSummary,
    MemberSummary,
} from './board-types'
import { AddCardInline } from './add-card-inline'
import {
    LABEL_COLOR_VAR,
    LABEL_COLOR_SUBTLE_VAR,
    columnAccentColor,
} from '@/lib/labels'
import { formatDate } from '@/lib/format'

gsap.registerPlugin(useGSAP)

function CardChip({
    card,
    members,
    labels,
}: {
    card: CardSummary
    members: MemberSummary[]
    labels: LabelSummary[]
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: card.id,
        data: { columnId: card.columnId },
    })
    const assignee = members.find((m) => m.id === card.assigneeId)
    const overdue = isOverdue(card.dueDate ? new Date(card.dueDate) : null)
    const cardLabels = labels.filter((l) => card.labelIds.includes(l.id))

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
            {...attributes}
            {...listeners}
            className="elevated-surface relative overflow-hidden p-3 pl-3.5 flex flex-col gap-2 cursor-grab active:cursor-grabbing transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_14px_rgba(9,30,66,0.16)] focus-visible:outline-2 focus-visible:outline-[var(--color-electric-blue)]"
        >
            {cardLabels[0] ? (
                <span
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{
                        background:
                            LABEL_COLOR_VAR[cardLabels[0].color] ??
                            'transparent',
                    }}
                    aria-hidden="true"
                />
            ) : null}
            {cardLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {cardLabels.map((l) => (
                        <span
                            key={l.id}
                            className="pill text-[var(--color-ink)]"
                            style={{
                                background:
                                    LABEL_COLOR_SUBTLE_VAR[l.color] ??
                                    'var(--color-concrete)',
                                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${
                                    LABEL_COLOR_VAR[l.color] ?? 'transparent'
                                } 45%, transparent)`,
                            }}
                        >
                            {l.name}
                        </span>
                    ))}
                </div>
            ) : null}
            <Link
                href={`/boards/${card.boardId}/cards/${card.id}`}
                className="text-sm font-medium leading-snug text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] break-words"
                onClick={(e) => e.stopPropagation()}
            >
                {card.title}
            </Link>
            {card.checklist.total > 0 ? (
                <ProgressBar
                    value={card.checklist.done}
                    max={card.checklist.total}
                    label={`Checklist ${card.checklist.done} of ${card.checklist.total} complete`}
                />
            ) : null}
            {card.dueDate || card.checklist.total > 0 || assignee ? (
                <div className="flex items-center justify-between text-xs text-[var(--color-fog)]">
                    <span className="flex items-center gap-2.5">
                        {card.dueDate ? (
                            <span
                                className={
                                    overdue
                                        ? 'inline-flex items-center gap-1 rounded-[var(--radius-tags)] px-1.5 py-0.5 bg-[var(--color-blush)] text-[var(--color-coral)] font-semibold'
                                        : 'inline-flex items-center gap-1'
                                }
                            >
                                <Calendar
                                    size={12}
                                    strokeWidth={2}
                                    className="shrink-0"
                                    aria-hidden="true"
                                />
                                {overdue ? 'Overdue: ' : ''}
                                {formatDate(card.dueDate)}
                            </span>
                        ) : null}
                        {card.checklist.total > 0 ? (
                            <span className="inline-flex items-center gap-1">
                                <CheckSquare
                                    size={12}
                                    strokeWidth={2}
                                    className="shrink-0"
                                    aria-hidden="true"
                                />
                                {card.checklist.done}/{card.checklist.total}
                            </span>
                        ) : null}
                    </span>
                    {assignee ? <Avatar person={assignee} size="sm" /> : null}
                </div>
            ) : null}
        </li>
    )
}

function Column({
    column,
    index,
    cards,
    members,
    labels,
    canManage,
}: {
    column: ColumnSummary
    index: number
    cards: CardSummary[]
    members: MemberSummary[]
    labels: LabelSummary[]
    canManage: boolean
}) {
    const [, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const cardIds = cards.map((c) => c.id)
    const listRef = useRef<HTMLUListElement>(null)

    useGSAP(
        () => {
            if (!listRef.current) return
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                return
            const items = listRef.current.children
            if (items.length === 0) return
            gsap.from(items, {
                opacity: 0,
                duration: 0.3,
                stagger: 0.04,
                ease: 'power1.out',
                clearProps: 'opacity',
            })
        },
        { scope: listRef, dependencies: [column.id] }
    )

    function handleArchive() {
        if (cards.length > 0) {
            setError(
                'Move or archive all cards out of this column before archiving it'
            )
            return
        }
        startTransition(async () => {
            const result = await archiveColumnAction(column.boardId, column.id)
            if (result?.error) setError(result.error)
        })
    }

    return (
        <div
            data-testid={`column-${column.id}`}
            data-column-name={column.name}
            className="group flex flex-col w-[280px] shrink-0 bg-[var(--color-snow)] rounded-[var(--radius-largecards)] p-3 max-h-full min-h-0"
            style={{ boxShadow: 'var(--shadow-subtle)' }}
        >
            <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="font-semibold text-sm tracking-[-0.01em] text-[var(--color-ink)] flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: columnAccentColor(index) }}
                        aria-hidden="true"
                    />
                    {column.name}
                    <span className="text-[10px] font-semibold text-[var(--color-smoke)] bg-[var(--color-sunken)] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                        {cards.length}
                    </span>
                </h3>
                {canManage ? (
                    <Button
                        variant="icon"
                        size="sm"
                        onClick={handleArchive}
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        aria-label={`Archive column ${column.name}`}
                        title="Archive column"
                    >
                        <Archive size={15} strokeWidth={2} aria-hidden="true" />
                    </Button>
                ) : null}
            </div>
            {error ? (
                <p
                    role="alert"
                    className="text-xs text-[var(--color-coral)] px-1 mb-2"
                >
                    {error}
                </p>
            ) : null}

            <div className="mb-2 shrink-0">
                <AddCardInline boardId={column.boardId} columnId={column.id} />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
                <SortableContext
                    items={cardIds}
                    strategy={verticalListSortingStrategy}
                >
                    <DroppableColumnBody columnId={column.id}>
                        <ul
                            ref={listRef}
                            className="flex flex-col gap-2 min-h-[40px]"
                        >
                            {cards.map((card) => (
                                <CardChip
                                    key={card.id}
                                    card={card}
                                    members={members}
                                    labels={labels}
                                />
                            ))}
                        </ul>
                    </DroppableColumnBody>
                </SortableContext>
            </div>
        </div>
    )
}

function DroppableColumnBody({
    columnId,
    children,
}: {
    columnId: string
    children: React.ReactNode
}) {
    // Lets an empty column (with no sortable card items) still accept a drop.
    const { setNodeRef } = useDroppable({
        id: `column-slot:${columnId}`,
        data: { columnId },
    })
    return <div ref={setNodeRef}>{children}</div>
}

export function BoardBoard({
    boardId,
    columns,
    cardsByColumn,
    members,
    labels,
    canManage,
}: {
    boardId: string
    columns: ColumnSummary[]
    cardsByColumn: Record<string, CardSummary[]>
    members: MemberSummary[]
    labels: LabelSummary[]
    canManage: boolean
}) {
    const [localCards, setLocalCards] = useState(cardsByColumn)
    const [activeCard, setActiveCard] = useState<CardSummary | null>(null)
    const columnsRef = useRef<HTMLDivElement>(null)

    useGSAP(
        () => {
            if (!columnsRef.current) return
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                return
            gsap.from(columnsRef.current.children, {
                opacity: 0,
                duration: 0.35,
                stagger: 0.06,
                ease: 'power1.out',
                clearProps: 'opacity',
            })
        },
        { scope: columnsRef, dependencies: [boardId] }
    )

    // The server re-renders this page after every mutation (revalidatePath),
    // handing down a fresh `cardsByColumn`. Sync it in whenever that happens
    // so newly created/edited/filtered cards show up without a hard reload —
    // this only overwrites local state when the *server* data actually changed,
    // never mid-drag, since a drag doesn't cause the parent to re-render.
    useEffect(() => {
        setLocalCards(cardsByColumn)
    }, [cardsByColumn])
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const allCards = useMemo(
        () => Object.values(localCards).flat(),
        [localCards]
    )

    function findColumnOf(cardId: string): string | undefined {
        return Object.keys(localCards).find((colId) =>
            localCards[colId].some((c) => c.id === cardId)
        )
    }

    function handleDragStart(event: DragStartEvent) {
        const card = allCards.find((c) => c.id === event.active.id)
        setActiveCard(card ?? null)
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveCard(null)
        const { active, over } = event
        if (!over) return

        const sourceColId = findColumnOf(String(active.id))
        if (!sourceColId) return

        let destColId = String(over.id).startsWith('column-slot:')
            ? String(over.id).replace('column-slot:', '')
            : findColumnOf(String(over.id))
        if (!destColId) destColId = sourceColId

        const destList = localCards[destColId] ?? []
        const overIndex = destList.findIndex((c) => c.id === over.id)
        const destIndex = overIndex >= 0 ? overIndex : destList.length

        if (sourceColId === destColId) {
            const list = [...(localCards[sourceColId] ?? [])]
            const from = list.findIndex((c) => c.id === active.id)
            if (from === -1 || from === destIndex) return
            const [moved] = list.splice(from, 1)
            list.splice(destIndex, 0, moved)
            setLocalCards({ ...localCards, [sourceColId]: list })
        } else {
            const sourceList = [...(localCards[sourceColId] ?? [])]
            const from = sourceList.findIndex((c) => c.id === active.id)
            const [moved] = sourceList.splice(from, 1)
            const destListCopy = [...destList]
            destListCopy.splice(destIndex, 0, { ...moved, columnId: destColId })
            setLocalCards({
                ...localCards,
                [sourceColId]: sourceList,
                [destColId]: destListCopy,
            })
        }

        moveCardAction(boardId, String(active.id), destColId, destIndex).then(
            (result: CardActionState) => {
                if (result?.error) {
                    // Reconcile: revert optimistic move on failure.
                    setLocalCards(cardsByColumn)
                }
            }
        )
    }

    return (
        <DndContext
            id={`board-dnd-${boardId}`}
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div
                ref={columnsRef}
                className="flex flex-1 min-h-0 gap-4 overflow-x-auto pb-4 -mx-1 px-1"
            >
                {columns.map((column, index) => (
                    <Column
                        key={column.id}
                        column={column}
                        index={index}
                        cards={localCards[column.id] ?? []}
                        members={members}
                        labels={labels}
                        canManage={canManage}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeCard ? (
                    <div
                        className="p-3 w-[260px] bg-[var(--color-paper)] rounded-[var(--radius-cards)] rotate-[1.5deg] scale-[1.03]"
                        style={{ boxShadow: 'var(--shadow-dragging)' }}
                    >
                        <p className="text-sm font-medium text-[var(--color-ink)]">
                            {activeCard.title}
                        </p>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
