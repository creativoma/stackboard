'use client'

import { useActionState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CornerDownRight, ListTree, X } from 'lucide-react'
import {
    addSubtaskAction,
    removeSubtaskLinkAction,
} from '@/lib/actions/subtasks'
import { subtaskProgress } from '@/lib/domain/subtasks'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { ProgressBar } from '@/app/_components/progress-bar'
import { Button } from '@/app/_components/button'

type Subtask = { id: string; title: string; status: string }
type ParentCard = { id: string; title: string } | null

export function SubtasksSection({
    boardId,
    cardId,
    parentCard,
    subtasks,
    canEdit,
}: {
    boardId: string
    cardId: string
    parentCard: ParentCard
    subtasks: Subtask[]
    canEdit: boolean
}) {
    const boundAction = addSubtaskAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()
    const { total, done } = subtaskProgress(subtasks)

    async function handleUnlink() {
        if (!parentCard) return
        if (!confirm(`Remove this card as a subtask of "${parentCard.title}"?`))
            return
        const result = await removeSubtaskLinkAction(boardId, cardId)
        if (!result?.error) router.refresh()
    }

    return (
        <div className="flex flex-col gap-3">
            <h2 className="eyebrow flex items-center gap-1.5">
                <ListTree size={13} strokeWidth={2.5} aria-hidden="true" />
                Subtasks
            </h2>

            {parentCard ? (
                <div className="elevated-surface flex items-center justify-between gap-2 p-2.5">
                    <Link
                        href={`/boards/${boardId}/cards/${parentCard.id}`}
                        className="flex items-center gap-1.5 min-w-0 text-sm text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] transition-colors"
                    >
                        <CornerDownRight
                            size={13}
                            strokeWidth={2}
                            className="shrink-0 text-[var(--color-fog)]"
                            aria-hidden="true"
                        />
                        <span className="truncate">
                            Subtask of{' '}
                            <span className="font-medium">
                                {parentCard.title}
                            </span>
                        </span>
                    </Link>
                    {canEdit ? (
                        <Button
                            variant="icon"
                            size="sm"
                            onClick={handleUnlink}
                            aria-label="Remove subtask link"
                            title="Remove subtask link"
                        >
                            <X size={13} strokeWidth={2} aria-hidden="true" />
                        </Button>
                    ) : null}
                </div>
            ) : null}

            {total > 0 ? (
                <ProgressBar
                    value={done}
                    max={total}
                    label={`${done} of ${total} subtasks archived`}
                />
            ) : null}

            {subtasks.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                    {subtasks.map((s) => (
                        <li key={s.id}>
                            <Link
                                href={`/boards/${boardId}/cards/${s.id}`}
                                className="elevated-surface flex items-center justify-between gap-2 p-2.5 text-sm hover:text-[var(--color-electric-blue)] transition-colors"
                            >
                                <span className="truncate">{s.title}</span>
                                {s.status === 'archived' ? (
                                    <span className="pill bg-[var(--color-sunken)] text-[var(--color-fog)] shrink-0">
                                        archived
                                    </span>
                                ) : null}
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-[var(--color-fog)]">
                    No subtasks yet.
                </p>
            )}

            {canEdit ? (
                <form
                    ref={formRef}
                    action={(formData) => {
                        formAction(formData)
                        formRef.current?.reset()
                    }}
                    className="flex items-center gap-2 flex-wrap"
                >
                    <label htmlFor="subtask-title" className="sr-only">
                        Subtask title
                    </label>
                    <input
                        id="subtask-title"
                        name="title"
                        required
                        maxLength={200}
                        placeholder="Add a subtask…"
                        className="input flex-1 min-w-[180px]"
                    />
                    <SubmitButton pendingText="Adding…">Add</SubmitButton>
                    {state?.error ? (
                        <p
                            role="alert"
                            className="text-xs text-[var(--color-coral)] w-full"
                        >
                            {state.error}
                        </p>
                    ) : null}
                </form>
            ) : null}
        </div>
    )
}
