/**
 * Server-Sent Events framing for the board realtime channel
 * (app/boards/[boardId]/events/route.ts). Pure string building — data is
 * always JSON-encoded, so payload content can never break out of a frame.
 */

export type SseEvent = {
    event: string
    data: unknown
    id?: string
}

export function formatSseEvent({ event, data, id }: SseEvent): string {
    const lines: string[] = []
    if (id) lines.push(`id: ${id}`)
    lines.push(`event: ${event}`)
    lines.push(`data: ${JSON.stringify(data)}`)
    return lines.join('\n') + '\n\n'
}

/** SSE comment line — keeps proxies from closing an idle connection. */
export const SSE_HEARTBEAT_FRAME = ': ping\n\n'
