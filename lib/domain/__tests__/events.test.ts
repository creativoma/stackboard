import { describe, expect, it } from 'vitest'
import { formatSseEvent, SSE_HEARTBEAT_FRAME } from '../events'

describe('formatSseEvent', () => {
    it('formats an event with id, event name, and JSON data', () => {
        const frame = formatSseEvent({
            id: 'evt-1',
            event: 'board-activity',
            data: { lastEventAt: '2026-08-09T12:00:00.000Z' },
        })
        expect(frame).toBe(
            'id: evt-1\nevent: board-activity\ndata: {"lastEventAt":"2026-08-09T12:00:00.000Z"}\n\n'
        )
    })

    it('omits the id line when absent', () => {
        const frame = formatSseEvent({
            event: 'board-activity',
            data: { n: 1 },
        })
        expect(frame).toBe('event: board-activity\ndata: {"n":1}\n\n')
    })

    it('never allows newline injection through data (JSON encodes it)', () => {
        const frame = formatSseEvent({
            event: 'board-activity',
            data: { text: 'line1\nline2' },
        })
        // The raw newline must be JSON-escaped, not a literal frame break.
        expect(frame.split('\n\n')).toHaveLength(2) // one frame + trailing empty
        expect(frame).toContain('line1\\nline2')
    })

    it('exposes a comment-style heartbeat frame', () => {
        expect(SSE_HEARTBEAT_FRAME).toBe(': ping\n\n')
    })
})
