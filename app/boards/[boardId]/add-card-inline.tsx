'use client'

import { useActionState, useRef, useState } from 'react'
import { createCardAction } from '@/lib/actions/cards'

export function AddCardInline({
    boardId,
    columnId,
}: {
    boardId: string
    columnId: string
}) {
    const [open, setOpen] = useState(false)
    const boundAction = createCardAction.bind(null, boardId, columnId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="text-sm text-[var(--color-smoke)] hover:text-[var(--color-ink)] px-2 py-1.5 w-full text-left rounded-lg hover:bg-[var(--color-mist)]/30"
            >
                + Add a card
            </button>
        )
    }

    return (
        <form
            ref={formRef}
            action={(formData) => {
                formAction(formData)
                formRef.current?.reset()
            }}
            className="flex flex-col gap-2"
        >
            <textarea
                name="title"
                required
                autoFocus
                maxLength={200}
                rows={2}
                placeholder="Card title"
                className="input resize-none"
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setOpen(false)
                }}
            />
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
            <div className="flex gap-2">
                <button type="submit" className="btn-secondary">
                    Add card
                </button>
                <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setOpen(false)}
                >
                    Cancel
                </button>
            </div>
        </form>
    )
}
