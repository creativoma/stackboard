'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    updateCardAction,
    archiveCardAction,
    restoreCardAction,
    type CardActionState,
} from '@/lib/actions/cards'
import { toggleCardLabelAction } from '@/lib/actions/labels'
import { renderMarkdownLite } from '@/lib/markdown'
import { LABEL_COLOR_VAR, LABEL_COLOR_SUBTLE_VAR } from '@/lib/labels'
import { PRIORITIES } from '@/lib/priority'
import { MIN_DUE_YEAR, MAX_DUE_YEAR } from '@/lib/domain/due'
import { PriorityIcon } from '@/app/_components/priority-icon'
import type { MemberSummary, LabelSummary } from '../../board-types'
import { Button } from '../../../../_components/button'

export function TitleField({
    boardId,
    cardId,
    title,
}: {
    boardId: string
    cardId: string
    title: string
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const [value, setValue] = useState(title)

    return (
        <form
            action={formAction}
            onBlur={(e) => {
                if (value.trim() && value !== title)
                    e.currentTarget.requestSubmit()
            }}
        >
            <label htmlFor="title" className="sr-only">
                Card title
            </label>
            <textarea
                id="title"
                name="title"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                maxLength={200}
                rows={1}
                className="text-[15px] font-medium tracking-[-0.1px] w-full resize-none border-none outline-none bg-transparent focus-visible:outline-2 focus-visible:outline-[var(--color-electric-blue)] rounded"
            />
            {state?.error ? (
                <p
                    role="alert"
                    className="text-sm text-[var(--color-coral)] mt-1"
                >
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function DescriptionField({
    boardId,
    cardId,
    description,
}: {
    boardId: string
    cardId: string
    description: string
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(description)

    if (!editing) {
        return (
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-left w-full text-sm text-[var(--color-ink)] rounded-lg p-2 -m-2 hover:bg-[var(--color-snow)]"
            >
                {description ? (
                    <span
                        dangerouslySetInnerHTML={{
                            __html: renderMarkdownLite(description),
                        }}
                    />
                ) : (
                    <span className="text-[var(--color-fog)]">
                        Add a description…
                    </span>
                )}
            </button>
        )
    }

    return (
        <form
            action={(formData) => {
                formAction(formData)
                setEditing(false)
            }}
            className="flex flex-col gap-2"
        >
            <label htmlFor="description" className="sr-only">
                Description
            </label>
            <textarea
                id="description"
                name="description"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={6}
                autoFocus
                className="input"
                placeholder="Add more detail. Supports **bold**, *italic*, `code`, and links."
            />
            {state?.error ? (
                <p role="alert" className="text-sm text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
            <div className="flex gap-2">
                <Button type="submit" variant="primary">
                    Save
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}

export function AssigneeField({
    boardId,
    cardId,
    assigneeId,
    members,
}: {
    boardId: string
    cardId: string
    assigneeId: string | null
    members: MemberSummary[]
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)

    return (
        <form action={formAction} className="flex flex-col gap-1">
            <label
                htmlFor="assigneeId"
                className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide"
            >
                Assignee
            </label>
            <select
                id="assigneeId"
                name="assigneeId"
                defaultValue={assigneeId ?? ''}
                className="input"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
            >
                <option value="">Unassigned</option>
                {members.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.name}
                    </option>
                ))}
            </select>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function PriorityField({
    boardId,
    cardId,
    priority,
}: {
    boardId: string
    cardId: string
    priority: string | null
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)

    return (
        <form action={formAction} className="flex flex-col gap-1">
            <label
                htmlFor="priority"
                className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide"
            >
                Priority
            </label>
            <div className="relative">
                <select
                    id="priority"
                    name="priority"
                    defaultValue={priority ?? ''}
                    className={`input ${priority ? 'pl-8' : ''}`}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                >
                    <option value="">No priority</option>
                    {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                            {p.label}
                        </option>
                    ))}
                </select>
                {priority ? (
                    <PriorityIcon
                        priority={priority}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
                    />
                ) : null}
            </div>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function StartDateField({
    boardId,
    cardId,
    startDate,
}: {
    boardId: string
    cardId: string
    startDate: string | null
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const initial = startDate ? startDate.slice(0, 10) : ''

    return (
        <form action={formAction} className="flex flex-col gap-1">
            <label
                htmlFor="startDate"
                className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide"
            >
                Start date
            </label>
            <input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={initial}
                min={`${MIN_DUE_YEAR}-01-01`}
                max={`${MAX_DUE_YEAR}-12-31`}
                className="input"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function DueDateField({
    boardId,
    cardId,
    dueDate,
}: {
    boardId: string
    cardId: string
    dueDate: string | null
}) {
    const boundAction = updateCardAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const initial = dueDate ? dueDate.slice(0, 10) : ''

    return (
        <form action={formAction} className="flex flex-col gap-1">
            <label
                htmlFor="dueDate"
                className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide"
            >
                Due date
            </label>
            <input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={initial}
                // Mirrors the server-side range in lib/domain/due.ts — a date
                // picker will happily emit year 0022 from a typo otherwise.
                min={`${MIN_DUE_YEAR}-01-01`}
                max={`${MAX_DUE_YEAR}-12-31`}
                className="input"
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function LabelsField({
    boardId,
    cardId,
    labelIds,
    labels,
}: {
    boardId: string
    cardId: string
    labelIds: string[]
    labels: LabelSummary[]
}) {
    const [active, setActive] = useState(new Set(labelIds))
    const [pending, setPending] = useState<string | null>(null)

    async function toggle(labelId: string) {
        const isOn = active.has(labelId)
        setPending(labelId)
        const next = new Set(active)
        if (isOn) next.delete(labelId)
        else next.add(labelId)
        setActive(next)
        const result = await toggleCardLabelAction(
            boardId,
            cardId,
            labelId,
            !isOn
        )
        if (result?.error) {
            const revert = new Set(active)
            setActive(revert)
        }
        setPending(null)
    }

    if (labels.length === 0) {
        return (
            <p className="text-xs text-[var(--color-fog)]">
                No labels on this board yet — add one from board settings.
            </p>
        )
    }

    return (
        <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
                const on = active.has(label.id)
                return (
                    <button
                        key={label.id}
                        type="button"
                        onClick={() => toggle(label.id)}
                        disabled={pending === label.id}
                        className="pill"
                        style={{
                            background: on
                                ? (LABEL_COLOR_SUBTLE_VAR[label.color] ??
                                  'var(--color-concrete)')
                                : 'transparent',
                            color: on
                                ? 'var(--color-ink)'
                                : 'var(--color-smoke)',
                            border: `1px solid ${on ? (LABEL_COLOR_VAR[label.color] ?? 'var(--color-concrete)') : 'var(--color-border-strong)'}`,
                        }}
                        aria-pressed={on}
                    >
                        {label.name}
                    </button>
                )
            })}
        </div>
    )
}

export function ArchiveRestoreControls({
    boardId,
    cardId,
    status,
    activeColumns,
}: {
    boardId: string
    cardId: string
    status: string
    activeColumns: { id: string; name: string }[]
}) {
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [destColumnId, setDestColumnId] = useState(activeColumns[0]?.id ?? '')
    const router = useRouter()

    async function handleArchive() {
        setBusy(true)
        const result: CardActionState = await archiveCardAction(boardId, cardId)
        if (result?.error) setError(result.error)
        else router.refresh()
        setBusy(false)
    }

    async function handleRestore() {
        if (!destColumnId) {
            setError('Choose a column to restore into')
            return
        }
        setBusy(true)
        const result: CardActionState = await restoreCardAction(
            boardId,
            cardId,
            destColumnId
        )
        if (result?.error) setError(result.error)
        else router.refresh()
        setBusy(false)
    }

    return (
        <div className="flex flex-col gap-2">
            {error ? (
                <p role="alert" className="text-sm text-[var(--color-coral)]">
                    {error}
                </p>
            ) : null}
            {status === 'active' ? (
                <Button
                    variant="outline"
                    onClick={handleArchive}
                    disabled={busy}
                    className="w-fit"
                >
                    Archive card
                </Button>
            ) : (
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="pill"
                        style={{ background: 'var(--color-ice)' }}
                    >
                        Archived
                    </span>
                    {activeColumns.length > 0 ? (
                        <>
                            <select
                                value={destColumnId}
                                onChange={(e) =>
                                    setDestColumnId(e.target.value)
                                }
                                className="input w-auto"
                                aria-label="Restore into column"
                            >
                                {activeColumns.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <Button
                                variant="secondary"
                                onClick={handleRestore}
                                disabled={busy}
                            >
                                Restore
                            </Button>
                        </>
                    ) : (
                        <span className="text-xs text-[var(--color-fog)]">
                            Add an active column before restoring this card.
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}
