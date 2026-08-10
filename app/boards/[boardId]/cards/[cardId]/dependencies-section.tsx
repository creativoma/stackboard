'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Link2, Lock, X } from 'lucide-react'
import {
    addDependencyAction,
    removeDependencyAction,
} from '@/lib/actions/dependencies'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { Button } from '@/app/_components/button'

type DependencyCard = {
    dependencyId: string
    id: string
    title: string
    status: string
}

export function DependenciesSection({
    boardId,
    cardId,
    blockedBy,
    blocks,
    options,
    canEdit,
}: {
    boardId: string
    cardId: string
    blockedBy: DependencyCard[]
    blocks: DependencyCard[]
    options: { id: string; title: string }[]
    canEdit: boolean
}) {
    const boundAction = addDependencyAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const router = useRouter()

    const pickable = options.filter(
        (o) => o.id !== cardId && !blockedBy.some((b) => b.id === o.id)
    )

    async function handleRemove(dependencyId: string) {
        const result = await removeDependencyAction(boardId, dependencyId)
        if (!result?.error) router.refresh()
    }

    return (
        <div className="flex flex-col gap-3">
            <h2 className="eyebrow flex items-center gap-1.5">
                <Link2 size={13} strokeWidth={2.5} aria-hidden="true" />
                Dependencies
            </h2>

            <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide">
                    Blocked by
                </h3>
                {blockedBy.length === 0 ? (
                    <p className="text-sm text-[var(--color-fog)]">
                        Nothing is blocking this card.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-1.5">
                        {blockedBy.map((b) => (
                            <li
                                key={b.dependencyId}
                                className="elevated-surface flex items-center justify-between gap-2 p-2.5"
                            >
                                <Link
                                    href={`/boards/${boardId}/cards/${b.id}`}
                                    className="flex items-center gap-1.5 min-w-0 text-sm text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] transition-colors"
                                >
                                    {b.status === 'active' ? (
                                        <Lock
                                            size={12}
                                            strokeWidth={2.25}
                                            className="shrink-0 text-[var(--color-fog)]"
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    <span className="truncate">{b.title}</span>
                                    {b.status === 'archived' ? (
                                        <span className="pill bg-[var(--color-sunken)] text-[var(--color-fog)] shrink-0">
                                            done
                                        </span>
                                    ) : null}
                                </Link>
                                {canEdit ? (
                                    <Button
                                        variant="icon"
                                        size="sm"
                                        onClick={() =>
                                            handleRemove(b.dependencyId)
                                        }
                                        aria-label={`Remove block by ${b.title}`}
                                        title="Remove"
                                    >
                                        <X
                                            size={13}
                                            strokeWidth={2}
                                            aria-hidden="true"
                                        />
                                    </Button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {blocks.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                    <h3 className="text-xs font-medium text-[var(--color-fog)] uppercase tracking-wide">
                        Blocks
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                        {blocks.map((b) => (
                            <li key={b.dependencyId}>
                                <Link
                                    href={`/boards/${boardId}/cards/${b.id}`}
                                    className="elevated-surface flex items-center gap-1.5 p-2.5 text-sm text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] transition-colors"
                                >
                                    <ArrowRight
                                        size={12}
                                        strokeWidth={2.25}
                                        className="shrink-0 text-[var(--color-fog)]"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">{b.title}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {canEdit && pickable.length > 0 ? (
                <form
                    action={formAction}
                    className="flex items-center gap-2 flex-wrap"
                >
                    <label htmlFor="blockerCardId" className="sr-only">
                        Blocked by
                    </label>
                    <select
                        id="blockerCardId"
                        name="blockerCardId"
                        required
                        defaultValue=""
                        className="input flex-1 min-w-[180px]"
                    >
                        <option value="" disabled>
                            Add a card that blocks this one…
                        </option>
                        {pickable.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.title}
                            </option>
                        ))}
                    </select>
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
