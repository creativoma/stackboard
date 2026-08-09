import { getCurrentUser } from '@/lib/auth/session'
import { countUnreadNotifications } from '@/lib/queries/notifications'
import { formatSseEvent, SSE_HEARTBEAT_FRAME } from '@/lib/domain/events'

const POLL_INTERVAL_MS = 3000
const HEARTBEAT_INTERVAL_MS = 25_000

/**
 * Per-user notification channel (Server-Sent Events).
 *
 * Polls the caller's own unread count and emits `notifications-changed`
 * whenever it moves — a new mention landing, or another tab marking things
 * read. Same shape as the board channel: no LISTEN/NOTIFY, no shared
 * in-process state, so it behaves the same on one instance or many.
 */
export async function GET(request: Request) {
    const user = await getCurrentUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        start(controller) {
            let lastCount = -1
            let lastBeat = Date.now()
            let closed = false

            const close = () => {
                if (closed) return
                closed = true
                clearInterval(timer)
                try {
                    controller.close()
                } catch {
                    // already closed by the runtime
                }
            }

            const timer = setInterval(async () => {
                if (closed) return
                try {
                    const unread = await countUnreadNotifications(user.id)
                    if (unread !== lastCount) {
                        lastCount = unread
                        controller.enqueue(
                            encoder.encode(
                                formatSseEvent({
                                    event: 'notifications-changed',
                                    data: { unread },
                                })
                            )
                        )
                    } else if (Date.now() - lastBeat >= HEARTBEAT_INTERVAL_MS) {
                        lastBeat = Date.now()
                        controller.enqueue(encoder.encode(SSE_HEARTBEAT_FRAME))
                    }
                } catch {
                    close()
                }
            }, POLL_INTERVAL_MS)

            request.signal.addEventListener('abort', close)

            controller.enqueue(encoder.encode(SSE_HEARTBEAT_FRAME))
        },
    })

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    })
}
