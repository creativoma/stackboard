'use client'

import { useActionState, useRef, useState } from 'react'
import { createColumnAction } from '@/lib/actions/columns'
import { Button } from '../../_components/button'

export function NewColumnForm({ boardId }: { boardId: string }) {
    const [open, setOpen] = useState(false)
    const boundAction = createColumnAction.bind(null, boardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    if (!open) {
        return (
            <Button
                variant="onBoardDashed"
                onClick={() => setOpen(true)}
                className="w-[280px] shrink-0 text-left justify-start"
            >
                + Add column
            </Button>
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
            <Button type="submit" variant="secondary">
                Add
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
            </Button>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}
