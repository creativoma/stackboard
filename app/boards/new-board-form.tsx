'use client'

import { useActionState, useState } from 'react'
import { createBoardAction } from '@/lib/actions/boards'
import { SubmitButton } from '../(auth)/submit-button'
import { Button } from '../_components/button'
import { Drawer } from '../_components/drawer'

export function NewBoardForm() {
    const [open, setOpen] = useState(false)
    const [state, formAction] = useActionState(createBoardAction, undefined)

    return (
        <>
            <Button variant="primary" onClick={() => setOpen(true)}>
                + Create a board
            </Button>
            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title="New board"
            >
                <h2 className="text-lg font-semibold mb-4">New board</h2>
                <form
                    action={formAction}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="board-name"
                            className="text-sm font-medium"
                        >
                            Board name
                        </label>
                        <input
                            id="board-name"
                            name="name"
                            required
                            maxLength={100}
                            className="input"
                            placeholder="Marketing launch"
                        />
                    </div>

                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="text-sm font-medium mb-1">
                            Columns
                        </legend>
                        <input
                            name="columnName"
                            defaultValue="To do"
                            required
                            maxLength={60}
                            className="input"
                            aria-label="Column 1"
                        />
                        <input
                            name="columnName"
                            defaultValue="In progress"
                            required
                            maxLength={60}
                            className="input"
                            aria-label="Column 2"
                        />
                        <input
                            name="columnName"
                            defaultValue="Done"
                            required
                            maxLength={60}
                            className="input"
                            aria-label="Column 3"
                        />
                    </fieldset>

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
                        <SubmitButton pendingText="Creating…">
                            Create board
                        </SubmitButton>
                    </div>
                </form>
            </Drawer>
        </>
    )
}
