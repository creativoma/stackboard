'use client'

import { useActionState, useState } from 'react'
import { importBoardAction } from '@/lib/actions/import'
import { SubmitButton } from '../(auth)/submit-button'

export function ImportBoardForm() {
    const [open, setOpen] = useState(false)
    const [state, formAction] = useActionState(importBoardAction, undefined)

    if (!open) {
        return (
            <button
                type="button"
                className="btn-outline"
                onClick={() => setOpen(true)}
            >
                Import a board
            </button>
        )
    }

    return (
        <div className="elevated-surface p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-1">Import a board</h2>
            <p className="text-sm text-[var(--color-smoke)] mb-4">
                Upload a Trello board export or a creativodeck board export
                (JSON). This creates a new board.
            </p>
            <form
                action={formAction}
                className="flex flex-col gap-4"
                noValidate
            >
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="import-file"
                        className="text-sm font-medium"
                    >
                        JSON file
                    </label>
                    <input
                        id="import-file"
                        name="file"
                        type="file"
                        accept="application/json,.json"
                        required
                        className="input"
                    />
                </div>

                {state?.error ? (
                    <p
                        role="alert"
                        className="text-sm text-[var(--color-coral)]"
                    >
                        {state.error}
                    </p>
                ) : null}

                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setOpen(false)}
                    >
                        Cancel
                    </button>
                    <SubmitButton pendingText="Importing…">
                        Import board
                    </SubmitButton>
                </div>
            </form>
        </div>
    )
}
