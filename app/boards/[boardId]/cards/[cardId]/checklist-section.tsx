'use client'

import { useActionState, useRef, useState } from 'react'
import {
    addChecklistItemAction,
    toggleChecklistItemAction,
} from '@/lib/actions/checklist'
import { Button } from '../../../../_components/button'

type ChecklistItem = { id: string; text: string; done: boolean }

export function ChecklistSection({
    boardId,
    cardId,
    items,
}: {
    boardId: string
    cardId: string
    items: ChecklistItem[]
}) {
    const [localItems, setLocalItems] = useState(items)
    const boundAdd = addChecklistItemAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAdd, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    const done = localItems.filter((i) => i.done).length

    async function handleToggle(item: ChecklistItem) {
        const nextDone = !item.done
        setLocalItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i))
        )
        const result = await toggleChecklistItemAction(
            boardId,
            cardId,
            item.id,
            nextDone
        )
        if (result?.error) {
            setLocalItems((prev) =>
                prev.map((i) =>
                    i.id === item.id ? { ...i, done: item.done } : i
                )
            )
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Checklist</h2>
                {localItems.length > 0 ? (
                    <span className="text-xs text-[var(--color-fog)]">
                        {done}/{localItems.length}
                    </span>
                ) : null}
            </div>

            {localItems.length > 0 ? (
                <div
                    className="h-1.5 rounded-full bg-[var(--color-mist)] overflow-hidden"
                    role="progressbar"
                    aria-valuenow={done}
                    aria-valuemin={0}
                    aria-valuemax={localItems.length}
                >
                    <div
                        className="h-full bg-[var(--color-success)] transition-[width] duration-200"
                        style={{
                            width: `${(done / localItems.length) * 100}%`,
                        }}
                    />
                </div>
            ) : null}

            <ul className="flex flex-col gap-0.5">
                {localItems.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center gap-2.5 text-sm py-1.5 px-1.5 -mx-1.5 rounded-[var(--radius-tags)] hover:bg-[var(--color-snow)]"
                    >
                        <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => handleToggle(item)}
                            id={`checklist-${item.id}`}
                            className="w-4 h-4 rounded shrink-0 accent-[var(--color-success)] cursor-pointer"
                        />
                        <label
                            htmlFor={`checklist-${item.id}`}
                            className={
                                item.done
                                    ? 'line-through text-[var(--color-fog)] cursor-pointer'
                                    : 'cursor-pointer'
                            }
                        >
                            {item.text}
                        </label>
                    </li>
                ))}
            </ul>

            <form
                ref={formRef}
                action={(formData) => {
                    formAction(formData)
                    formRef.current?.reset()
                }}
                className="flex gap-2 mt-1"
            >
                <input
                    name="text"
                    maxLength={300}
                    placeholder="Add checklist item"
                    className="input"
                />
                <Button type="submit" variant="outline" className="shrink-0">
                    Add
                </Button>
            </form>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </div>
    )
}
