'use client'

import { useActionState, useState } from 'react'
import { importBoardAction } from '@/lib/actions/import'
import { SubmitButton } from '../(auth)/submit-button'
import { Button } from '../_components/button'
import { Drawer } from '../_components/drawer'

export function ImportBoardForm() {
    const [open, setOpen] = useState(false)
    const [state, formAction] = useActionState(importBoardAction, undefined)

    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                Import a board
            </Button>
            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title="Import a board"
            >
                <h2 className="text-lg font-semibold mb-1">Import a board</h2>
                <p className="text-sm text-[var(--color-smoke)] mb-4">
                    Upload a Trello board export (JSON), a stackboard board
                    export (JSON or CSV). This creates a new board.
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
                            JSON or CSV file
                        </label>
                        <input
                            id="import-file"
                            name="file"
                            type="file"
                            accept="application/json,.json,text/csv,.csv"
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
                        <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <SubmitButton pendingText="Importing…">
                            Import board
                        </SubmitButton>
                    </div>
                </form>
            </Drawer>
        </>
    )
}
