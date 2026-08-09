'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/app/_components/button'
import { watchCardAction } from '@/lib/actions/cards'

export function WatchButton({
    boardId,
    cardId,
    watching,
}: {
    boardId: string
    cardId: string
    watching: boolean
}) {
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    function toggle() {
        setError(null)
        startTransition(async () => {
            const result = await watchCardAction(boardId, cardId, !watching)
            if (result?.error) setError(result.error)
            else router.refresh()
        })
    }

    return (
        <span className="inline-flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={toggle}
                disabled={pending}
                aria-pressed={watching}
            >
                {watching ? (
                    <BellOff size={14} strokeWidth={2} aria-hidden="true" />
                ) : (
                    <Bell size={14} strokeWidth={2} aria-hidden="true" />
                )}
                {watching ? 'Stop watching' : 'Watch'}
            </Button>
            {error ? (
                <span
                    role="alert"
                    className="text-xs text-[var(--color-coral)]"
                >
                    {error}
                </span>
            ) : null}
        </span>
    )
}
