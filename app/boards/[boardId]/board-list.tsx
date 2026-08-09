'use client'

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { Calendar, CheckSquare, ChevronDown } from 'lucide-react'
import { Avatar } from '../../_components/avatar-stack'
import { PriorityIcon } from '@/app/_components/priority-icon'
import {
    moveCardAction,
    updateCardAction,
    type CardActionState,
} from '@/lib/actions/cards'
import { isOverdue } from '@/lib/domain/filters'
import { formatDate } from '@/lib/format'
import { PRIORITIES } from '@/lib/priority'
import {
    LABEL_COLOR_SUBTLE_VAR,
    LABEL_COLOR_VAR,
    columnAccentColor,
} from '@/lib/labels'
import type {
    CardSummary,
    ColumnSummary,
    LabelSummary,
    MemberSummary,
} from './board-types'

gsap.registerPlugin(useGSAP)

function StatusSelect({
    boardId,
    card,
    columns,
    columnIndex,
    canEdit,
    destIndex,
    onMove,
}: {
    boardId: string
    card: CardSummary
    columns: ColumnSummary[]
    columnIndex: number
    canEdit: boolean
    destIndex: (destColumnId: string) => number
    onMove: (cardId: string, destColumnId: string) => void
}) {
    const [, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const accent = columnAccentColor(columnIndex)

    if (!canEdit) {
        return (
            <span
                className="inline-flex items-center gap-1.5 text-[12px] font-medium rounded-[var(--radius-tags)] px-2 py-1 bg-[var(--color-sunken)] text-[var(--color-ink)]"
                title={columns[columnIndex]?.name}
            >
                <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: accent }}
                    aria-hidden="true"
                />
                {columns[columnIndex]?.name}
            </span>
        )
    }

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const destColumnId = e.target.value
        if (destColumnId === card.columnId) return
        const from = card.columnId
        onMove(card.id, destColumnId)
        setError(null)
        startTransition(async () => {
            const result: CardActionState = await moveCardAction(
                boardId,
                card.id,
                destColumnId,
                destIndex(destColumnId)
            )
            if (result?.error) {
                onMove(card.id, from)
                setError(result.error)
            }
        })
    }

    return (
        <span className="relative inline-flex items-center">
            <span
                className="pointer-events-none absolute left-2 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: accent }}
                aria-hidden="true"
            />
            <select
                value={card.columnId}
                onChange={handleChange}
                aria-label={`Move "${card.title}" to a different column`}
                title={error ?? undefined}
                className={`appearance-none text-[12px] font-medium rounded-[var(--radius-tags)] pl-5 pr-6 py-1 cursor-pointer bg-[var(--color-sunken)] text-[var(--color-ink)] hover:bg-[var(--color-mist)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-electric-blue)] ${error ? 'ring-1 ring-[var(--color-coral)]' : ''}`}
            >
                {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-1.5 text-[var(--color-fog)]"
                size={12}
                strokeWidth={2}
                aria-hidden="true"
            />
        </span>
    )
}

function PrioritySelect({
    boardId,
    card,
    canEdit,
    onPatch,
}: {
    boardId: string
    card: CardSummary
    canEdit: boolean
    onPatch: (cardId: string, patch: Partial<CardSummary>) => void
}) {
    const [, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    if (!canEdit) {
        return card.priority ? (
            <PriorityIcon
                priority={card.priority}
                size={13}
                className="shrink-0"
            />
        ) : (
            <span className="text-xs text-[var(--color-fog)]">—</span>
        )
    }

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const value = e.target.value
        const from = card.priority
        onPatch(card.id, { priority: value || null })
        setError(null)
        startTransition(async () => {
            const formData = new FormData()
            formData.set('priority', value)
            const result: CardActionState = await updateCardAction(
                boardId,
                card.id,
                undefined,
                formData
            )
            if (result?.error) {
                onPatch(card.id, { priority: from })
                setError(result.error)
            }
        })
    }

    return (
        <span className="relative inline-flex items-center">
            {card.priority ? (
                <PriorityIcon
                    priority={card.priority}
                    size={13}
                    className="pointer-events-none absolute left-1.5 z-1"
                />
            ) : null}
            <select
                value={card.priority ?? ''}
                onChange={handleChange}
                aria-label={`Set priority for "${card.title}"`}
                title={error ?? undefined}
                className={`appearance-none text-[12px] rounded-[var(--radius-tags)] py-1 pr-6 cursor-pointer bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-sunken)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--color-electric-blue)] ${card.priority ? 'pl-6' : 'pl-1.5'} ${error ? 'ring-1 ring-[var(--color-coral)]' : ''}`}
            >
                <option value="">No priority</option>
                {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                        {p.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                className="pointer-events-none absolute right-1.5 text-[var(--color-fog)]"
                size={12}
                strokeWidth={2}
                aria-hidden="true"
            />
        </span>
    )
}

function ListRow({
    boardId,
    card,
    columns,
    columnIndex,
    members,
    labels,
    canEdit,
    destIndex,
    onMove,
    onPatch,
}: {
    boardId: string
    card: CardSummary
    columns: ColumnSummary[]
    columnIndex: number
    members: MemberSummary[]
    labels: LabelSummary[]
    canEdit: boolean
    destIndex: (destColumnId: string) => number
    onMove: (cardId: string, destColumnId: string) => void
    onPatch: (cardId: string, patch: Partial<CardSummary>) => void
}) {
    const assignee = members.find((m) => m.id === card.assigneeId)
    const overdue = isOverdue(card.dueDate ? new Date(card.dueDate) : null)
    const cardLabels = labels.filter((l) => card.labelIds.includes(l.id))

    return (
        <tr className="group border-b border-[var(--color-mist)] last:border-0 hover:bg-[var(--color-sunken)] transition-colors">
            <td className="px-3 py-2.5 align-middle max-w-0 w-full">
                <Link
                    href={`/boards/${boardId}/cards/${card.id}`}
                    className="text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] truncate block"
                >
                    {card.title}
                </Link>
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                <StatusSelect
                    boardId={boardId}
                    card={card}
                    columns={columns}
                    columnIndex={columnIndex}
                    canEdit={canEdit}
                    destIndex={destIndex}
                    onMove={onMove}
                />
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                <PrioritySelect
                    boardId={boardId}
                    card={card}
                    canEdit={canEdit}
                    onPatch={onPatch}
                />
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                {cardLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {cardLabels.map((l) => (
                            <span
                                key={l.id}
                                className="pill text-[var(--color-ink)]"
                                style={{
                                    background:
                                        LABEL_COLOR_SUBTLE_VAR[l.color] ??
                                        'var(--color-concrete)',
                                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${
                                        LABEL_COLOR_VAR[l.color] ??
                                        'transparent'
                                    } 45%, transparent)`,
                                }}
                            >
                                {l.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-xs text-[var(--color-fog)]">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                {card.dueDate ? (
                    <span
                        className={
                            overdue
                                ? 'inline-flex items-center gap-1 text-xs rounded-[var(--radius-tags)] px-1.5 py-0.5 bg-[var(--color-blush)] text-[var(--color-coral)] font-semibold'
                                : 'inline-flex items-center gap-1 text-xs text-[var(--color-smoke)]'
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
                ) : (
                    <span className="text-xs text-[var(--color-fog)]">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                {card.checklist.total > 0 ? (
                    <span className="tabular inline-flex items-center gap-1 text-xs text-[var(--color-smoke)]">
                        <CheckSquare
                            size={12}
                            strokeWidth={2}
                            className="shrink-0"
                            aria-hidden="true"
                        />
                        {card.checklist.done}/{card.checklist.total}
                    </span>
                ) : (
                    <span className="text-xs text-[var(--color-fog)]">—</span>
                )}
            </td>
            <td className="px-3 py-2.5 align-middle whitespace-nowrap">
                {assignee ? (
                    <Avatar person={assignee} size="sm" boardId={boardId} />
                ) : (
                    <span className="text-xs text-[var(--color-fog)]">
                        Unassigned
                    </span>
                )}
            </td>
        </tr>
    )
}

const HEADERS = [
    'Title',
    'Status',
    'Priority',
    'Labels',
    'Due date',
    'Checklist',
    'Assignee',
]

export function BoardList({
    boardId,
    columns,
    cardsByColumn,
    members,
    labels,
    canEdit,
}: {
    boardId: string
    columns: ColumnSummary[]
    cardsByColumn: Record<string, CardSummary[]>
    members: MemberSummary[]
    labels: LabelSummary[]
    canEdit: boolean
}) {
    const [localCards, setLocalCards] = useState(cardsByColumn)
    const bodyRef = useRef<HTMLTableSectionElement>(null)

    // Mirrors BoardBoard: re-sync from fresh server props (after any
    // revalidatePath) without clobbering an in-flight optimistic move.
    const [lastFromServer, setLastFromServer] = useState(cardsByColumn)
    if (lastFromServer !== cardsByColumn) {
        setLastFromServer(cardsByColumn)
        setLocalCards(cardsByColumn)
    }

    useGSAP(
        () => {
            if (!bodyRef.current) return
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                return
            const rows = bodyRef.current.children
            if (rows.length === 0) return
            gsap.from(rows, {
                opacity: 0,
                duration: 0.3,
                stagger: 0.02,
                ease: 'power1.out',
                clearProps: 'opacity',
            })
        },
        { scope: bodyRef, dependencies: [boardId] }
    )

    function handleMove(cardId: string, destColumnId: string) {
        setLocalCards((prev) => {
            const sourceColId = columns.find((c) =>
                prev[c.id]?.some((c2) => c2.id === cardId)
            )?.id
            if (!sourceColId || sourceColId === destColumnId) return prev
            const card = prev[sourceColId].find((c) => c.id === cardId)
            if (!card) return prev
            return {
                ...prev,
                [sourceColId]: prev[sourceColId].filter((c) => c.id !== cardId),
                [destColumnId]: [
                    ...(prev[destColumnId] ?? []),
                    { ...card, columnId: destColumnId },
                ],
            }
        })
    }

    function handlePatch(cardId: string, patch: Partial<CardSummary>) {
        setLocalCards((prev) => {
            const colId = columns.find((c) =>
                prev[c.id]?.some((c2) => c2.id === cardId)
            )?.id
            if (!colId) return prev
            return {
                ...prev,
                [colId]: prev[colId].map((c) =>
                    c.id === cardId ? { ...c, ...patch } : c
                ),
            }
        })
    }

    const rows = columns.flatMap((column, columnIndex) =>
        (localCards[column.id] ?? []).map((card) => ({
            card,
            columnIndex,
        }))
    )

    if (rows.length === 0) {
        return (
            <div className="elevated-surface text-center py-16">
                <p className="text-[var(--color-smoke)]">
                    No cards match the current filters.
                </p>
            </div>
        )
    }

    return (
        <div className="elevated-surface overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="border-b border-[var(--color-mist)]">
                        {HEADERS.map((h) => (
                            <th
                                key={h}
                                className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-fog)]"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody ref={bodyRef}>
                    {rows.map(({ card, columnIndex }) => (
                        <ListRow
                            key={card.id}
                            boardId={boardId}
                            card={card}
                            columns={columns}
                            columnIndex={columnIndex}
                            members={members}
                            labels={labels}
                            canEdit={canEdit}
                            destIndex={(destColumnId) =>
                                (localCards[destColumnId] ?? []).length
                            }
                            onMove={handleMove}
                            onPatch={handlePatch}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}
