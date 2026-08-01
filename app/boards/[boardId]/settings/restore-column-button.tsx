'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreColumnAction } from '@/lib/actions/columns'

export function RestoreColumnButton({
    boardId,
    columnId,
}: {
    boardId: string
    columnId: string
}) {
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const router = useRouter()

    async function handleClick() {
        setBusy(true)
        const result = await restoreColumnAction(boardId, columnId)
        if (result?.error) setError(result.error)
        else router.refresh()
        setBusy(false)
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={busy}
                className="btn-outline px-3 py-1 text-xs"
            >
                Restore
            </button>
            {error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
