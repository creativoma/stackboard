import type { BoardColor } from '@/db/schema'

// Boards can pick a color explicitly (Settings → Appearance). Boards that
// haven't picked one yet fall back to a stable tone derived from the board
// id, so every board still gets a flat tonal fill from the Blueprint family
// (blue tints and grays, DESIGN.md). Referencing the label-subtle tokens
// keeps the fills theme-aware: pale tints in light mode, deep tints in dark
// mode, with ink text readable on both.
export const BOARD_COLORS: { value: BoardColor; label: string }[] = [
    { value: 'blue', label: 'Blue' },
    { value: 'purple', label: 'Purple' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'red', label: 'Red' },
    { value: 'orange', label: 'Orange' },
]

const BOARD_TINTS: Record<BoardColor, string> = {
    blue: 'var(--color-label-blue-subtle)',
    purple: 'var(--color-label-purple-subtle)',
    green: 'var(--color-label-green-subtle)',
    yellow: 'var(--color-label-yellow-subtle)',
    red: 'var(--color-label-red-subtle)',
    orange: 'var(--color-label-orange-subtle)',
}

const HASH_ORDER = BOARD_COLORS.map((c) => c.value)

function hashColor(boardId: string): BoardColor {
    let hash = 0
    for (let i = 0; i < boardId.length; i++) {
        hash = (hash * 31 + boardId.charCodeAt(i)) | 0
    }
    return HASH_ORDER[Math.abs(hash) % HASH_ORDER.length]
}

export function boardGradient(
    boardId: string,
    color?: BoardColor | null
): string {
    return BOARD_TINTS[color ?? hashColor(boardId)]
}
