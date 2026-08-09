'use client'

import { useActionState, useState } from 'react'
import {
    createBoardAction,
    createBoardFromTemplateAction,
} from '@/lib/actions/boards'
import { BOARD_TEMPLATES } from '@/lib/templates/boards'
import { SubmitButton } from '../(auth)/submit-button'
import { Button } from '../_components/button'
import { Drawer } from '../_components/drawer'

export function NewBoardForm() {
    const [open, setOpen] = useState(false)
    // '' = start blank; otherwise a template key from BOARD_TEMPLATES.
    const [template, setTemplate] = useState('')
    const [state, formAction] = useActionState(createBoardAction, undefined)
    const [templateState, templateFormAction] = useActionState(
        createBoardFromTemplateAction,
        undefined
    )

    const usingTemplate = template !== ''
    const error = usingTemplate ? templateState?.error : state?.error

    return (
        <>
            <Button variant="primary" onClick={() => setOpen(true)}>
                + Create a board
            </Button>
            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title="New board"
                description="Pick a starting point, then name your board."
            >
                <form
                    action={usingTemplate ? templateFormAction : formAction}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <fieldset className="flex flex-col gap-1.5">
                        <legend className="text-sm font-medium mb-1.5">
                            Start from
                        </legend>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-cards)] border border-[var(--color-mist)] cursor-pointer transition-colors hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-electric-blue)] has-[:checked]:bg-[var(--color-electric-blue-tint)]">
                                <input
                                    type="radio"
                                    name="template"
                                    value=""
                                    checked={!usingTemplate}
                                    onChange={() => setTemplate('')}
                                    className="mt-0.5 accent-[var(--color-electric-blue)]"
                                />
                                <span className="text-sm">
                                    <span className="font-medium">
                                        Blank board
                                    </span>
                                    <span className="block text-xs text-[var(--color-fog)]">
                                        Name your own columns below.
                                    </span>
                                </span>
                            </label>
                            {BOARD_TEMPLATES.map((t) => (
                                <label
                                    key={t.key}
                                    className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-cards)] border border-[var(--color-mist)] cursor-pointer transition-colors hover:border-[var(--color-border-strong)] has-[:checked]:border-[var(--color-electric-blue)] has-[:checked]:bg-[var(--color-electric-blue-tint)]"
                                >
                                    <input
                                        type="radio"
                                        name="template"
                                        value={t.key}
                                        checked={template === t.key}
                                        onChange={() => setTemplate(t.key)}
                                        className="mt-0.5 accent-[var(--color-electric-blue)]"
                                    />
                                    <span className="text-sm">
                                        <span className="font-medium">
                                            {t.name}
                                        </span>
                                        <span className="block text-xs text-[var(--color-fog)]">
                                            {t.description}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

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
                            required={!usingTemplate}
                            maxLength={100}
                            className="input"
                            placeholder={
                                usingTemplate
                                    ? 'Optional — uses the template name'
                                    : 'Marketing launch'
                            }
                        />
                    </div>

                    {usingTemplate ? null : (
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
                    )}

                    {error ? (
                        <p
                            role="alert"
                            className="text-sm text-[var(--color-coral)]"
                        >
                            {error}
                        </p>
                    ) : null}

                    <div className="flex gap-2 justify-end pt-4 mt-1 border-t border-[var(--color-mist)]">
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
