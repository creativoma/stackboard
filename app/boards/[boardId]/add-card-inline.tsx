'use client'

import { useActionState, useRef, useState } from 'react'
import { createCardAction } from '@/lib/actions/cards'
import { CARD_TEMPLATES } from '@/lib/templates/cards'
import { Button } from '../../_components/button'

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
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
                className="w-full text-left"
            >
                + Add a card
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
            <label htmlFor="templateKey" className="sr-only">
                Template
            </label>
            <select
                id="templateKey"
                name="templateKey"
                defaultValue=""
                className="input text-xs"
            >
                <option value="">No template</option>
                {CARD_TEMPLATES.map((t) => (
                    <option key={t.key} value={t.key} title={t.description}>
                        {t.name}
                    </option>
                ))}
            </select>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
            <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                    Add card
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}
