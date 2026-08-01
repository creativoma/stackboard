'use client'

import { useActionState, useRef, useState } from 'react'
import { createColumnAction } from '@/lib/actions/columns'

export function NewColumnForm({ boardId }: { boardId: string }) {
    const [open, setOpen] = useState(false)
    const boundAction = createColumnAction.bind(null, boardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-[280px] shrink-0 rounded-[var(--radius-largecards)] border-2 border-dashed border-white/30 text-white/90 text-sm font-semibold px-3 py-2.5 text-left hover:bg-white/12 hover:border-white/50 transition-colors"
            >
                + Add column
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
            className="flex items-center gap-2 w-fit bg-[var(--color-snow)] rounded-[var(--radius-largecards)] p-2"
        >
            <input
                name="name"
                required
                maxLength={60}
                autoFocus
                placeholder="Column name"
                className="input w-[220px]"
            />
            <button type="submit" className="btn-secondary">
                Add
            </button>
            <button
                type="button"
                className="btn-outline"
                onClick={() => setOpen(false)}
            >
                Cancel
            </button>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}
