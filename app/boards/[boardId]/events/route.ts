import { and, eq, gt } from 'drizzle-orm'
import { db, schema } from '@/db'
import { getCurrentUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { formatSseEvent, SSE_HEARTBEAT_FRAME } from '@/lib/domain/events'

const POLL_INTERVAL_MS = 2000
const HEARTBEAT_INTERVAL_MS = 25_000

/**
 * Board realtime channel (Server-Sent Events).
 *
 * Each connection watermark-polls activity_events for this board (backed by
 * the existing activity_board_idx) and emits a `board-activity` event when
 * anything new lands; the client responds with router.refresh(). No
 * LISTEN/NOTIFY and no shared in-process state, so it behaves identically
 * on a single VM or many instances.
 */
export async function GET(
    request: Request,
    ctx: RouteContext<'/boards/[boardId]/events'>
) {
    const { boardId } = await ctx.params

    const user = await getCurrentUser()
    if (!user) return new Response('Unauthorized', { status: 401 })
    const membership = await getMembership(boardId, user.id)
    if (!isActiveMember(membership)) {
        return new Response('Forbidden', { status: 403 })
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
        start(controller) {
            let lastSeen = new Date()
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
                    const [latest] = await db
                        .select({
                            id: schema.activityEvents.id,
                            createdAt: schema.activityEvents.createdAt,
                        })
                        .from(schema.activityEvents)
                        .where(
                            and(
                                eq(schema.activityEvents.boardId, boardId),
                                gt(schema.activityEvents.createdAt, lastSeen)
                            )
                        )
                        .orderBy(schema.activityEvents.createdAt)
                        .limit(1)

                    if (latest) {
                        lastSeen = latest.createdAt
                        controller.enqueue(
                            encoder.encode(
                                formatSseEvent({
                                    id: latest.id,
                                    event: 'board-activity',
                                    data: {
                                        lastEventAt:
                                            latest.createdAt.toISOString(),
                                    },
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
