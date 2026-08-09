'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import {
    createLabelAction,
    updateLabelColorAction,
    deleteLabelAction,
    type LabelActionState,
} from '@/lib/actions/labels'
import {
    LABEL_COLORS,
    LABEL_COLOR_VAR,
    LABEL_COLOR_SUBTLE_VAR,
} from '@/lib/labels'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { Button } from '@/app/_components/button'

type Label = { id: string; name: string; color: string }

function ColorSwatches({
    value,
    onChange,
    disabled,
}: {
    value: string
    onChange: (color: string) => void
    disabled?: boolean
}) {
    return (
        <div
            role="radiogroup"
            aria-label="Label color"
            className="flex items-center gap-1.5"
        >
            {LABEL_COLORS.map((c) => {
                const active = value === c.value
                return (
                    <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={c.label}
                        title={c.label}
                        disabled={disabled}
                        onClick={() => onChange(c.value)}
                        className="w-5 h-5 rounded-full shrink-0 transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-electric-blue)]"
                        style={{
                            background: LABEL_COLOR_VAR[c.value],
                            boxShadow: active
                                ? '0 0 0 2px var(--color-paper), 0 0 0 4px var(--color-electric-blue)'
                                : 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                        }}
                    />
                )
            })}
        </div>
    )
}

function LabelRow({
    boardId,
    label,
    canEdit,
}: {
    boardId: string
    label: Label
    canEdit: boolean
}) {
    const [color, setColor] = useState(label.color)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function handleColorChange(next: string) {
        if (next === color) return
        const prev = color
        setColor(next)
        setBusy(true)
        const result = await updateLabelColorAction(boardId, label.id, next)
        setBusy(false)
        if (result?.error) {
            setColor(prev)
            setError(result.error)
        } else {
            setError(null)
            router.refresh()
        }
    }

    async function handleDelete() {
        if (
            !confirm(
                `Delete label "${label.name}"? It will be removed from every card.`
            )
        )
            return
        setBusy(true)
        const result = await deleteLabelAction(boardId, label.id)
        setBusy(false)
        if (result?.error) setError(result.error)
        else router.refresh()
    }

    return (
        <li className="flex flex-wrap items-center gap-3 py-2.5 border-b border-[var(--color-mist)] last:border-0">
            <span
                className="pill shrink-0"
                style={{
                    background:
                        LABEL_COLOR_SUBTLE_VAR[color] ?? 'var(--color-sunken)',
                    color: 'var(--color-ink)',
                }}
            >
                {label.name}
            </span>
            {canEdit ? (
                <>
                    <ColorSwatches
                        value={color}
                        onChange={handleColorChange}
                        disabled={busy}
                    />
                    <Button
                        variant="icon"
                        size="default"
                        onClick={handleDelete}
                        disabled={busy}
                        className="ml-auto"
                        aria-label={`Delete label ${label.name}`}
                        title="Delete label"
                    >
                        <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                    </Button>
                </>
            ) : null}
            {error ? (
                <p
                    role="alert"
                    className="text-xs text-[var(--color-coral)] w-full"
                >
                    {error}
                </p>
            ) : null}
        </li>
    )
}

function CreateLabelForm({ boardId }: { boardId: string }) {
    const boundAction = createLabelAction.bind(null, boardId)
    const [state, formAction] = useActionState<LabelActionState, FormData>(
        boundAction,
        undefined
    )
    const [name, setName] = useState('')
    const [color, setColor] = useState<string>(LABEL_COLORS[0].value)

    return (
        <form
            action={(formData) => {
                formAction(formData)
                setName('')
                setColor(LABEL_COLORS[0].value)
            }}
            className="flex flex-wrap items-center gap-3 pt-4 mt-2 border-t border-[var(--color-mist)]"
        >
            <input type="hidden" name="color" value={color} />
            <label htmlFor="label-name" className="sr-only">
                Label name
            </label>
            <input
                id="label-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="New label name"
                required
                className="input max-w-50"
            />
            <ColorSwatches value={color} onChange={setColor} />
            <SubmitButton pendingText="Adding…">Add label</SubmitButton>
            {state?.error ? (
                <p
                    role="alert"
                    className="text-xs text-[var(--color-coral)] w-full"
                >
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function LabelsManager({
    boardId,
    labels,
    canEdit,
}: {
    boardId: string
    labels: Label[]
    canEdit: boolean
}) {
    return (
        <div>
            {labels.length > 0 ? (
                <ul className="flex flex-col">
                    {labels.map((l) => (
                        <LabelRow
                            key={l.id}
                            boardId={boardId}
                            label={l}
                            canEdit={canEdit}
                        />
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-[var(--color-fog)]">
                    No labels yet{canEdit ? ' — add one below.' : '.'}
                </p>
            )}
            {canEdit ? <CreateLabelForm boardId={boardId} /> : null}
        </div>
    )
}
