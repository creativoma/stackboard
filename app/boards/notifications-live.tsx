'use client'

import {
    createContext,
    useContext,
    useEffect,
    useEffectEvent,
    useState,
} from 'react'
import { useRouter } from 'next/navigation'

const UnreadContext = createContext(0)

/** Unread notification count, kept live by the SSE channel below. */
export function useUnreadCount() {
    return useContext(UnreadContext)
}

/**
 * Subscribes once to the per-user notification channel and shares the unread
 * count with everything in the shell (header bell, sidebar badge). Every
 * change also triggers router.refresh(), so a notification list that is
 * currently on screen fills in without a manual reload.
 */
export function NotificationsLive({
    initialUnread,
    children,
}: {
    initialUnread: number
    children: React.ReactNode
}) {
    const router = useRouter()
    const [unread, setUnread] = useState(initialUnread)
    const [lastFromServer, setLastFromServer] = useState(initialUnread)

    // A fresh server render is more authoritative than anything the stream has
    // told us, so adopt its count while rendering rather than in an effect.
    if (lastFromServer !== initialUnread) {
        setLastFromServer(initialUnread)
        setUnread(initialUnread)
    }

    // The stream re-sends the current count on every (re)connect, so ignore
    // repeats — only a real change is worth a refresh.
    const onCount = useEffectEvent((next: number) => {
        if (next === unread) return
        setUnread(next)
        router.refresh()
    })

    useEffect(() => {
        const source = new EventSource('/boards/notifications/events')

        const onMessage = (event: MessageEvent<string>) => {
            let next: unknown
            try {
                next = JSON.parse(event.data).unread
            } catch {
                return
            }
            if (typeof next === 'number') onCount(next)
        }

        source.addEventListener('notifications-changed', onMessage)

        return () => {
            source.removeEventListener('notifications-changed', onMessage)
            source.close()
        }
    }, [])

    return <UnreadContext value={unread}>{children}</UnreadContext>
}
