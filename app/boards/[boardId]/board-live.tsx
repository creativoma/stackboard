'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const REFRESH_DEBOUNCE_MS = 300

/**
 * Subscribes to the board's SSE channel and refreshes the router when any
 * member changes the board, so everyone converges without reloading.
 * refresh() re-renders Server Components in place — local client state
 * (e.g. an in-flight drag) is preserved, and applying our own change twice
 * is a no-op, so events from this tab need no special-casing. EventSource
 * reconnects on its own after network blips.
 */
export function BoardLive({ boardId }: { boardId: string }) {
    const router = useRouter()
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        const source = new EventSource(`/boards/${boardId}/events`)

        const onActivity = () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => {
                router.refresh()
            }, REFRESH_DEBOUNCE_MS)
        }

        source.addEventListener('board-activity', onActivity)

        return () => {
            source.removeEventListener('board-activity', onActivity)
            source.close()
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [boardId, router])

    return null
}
