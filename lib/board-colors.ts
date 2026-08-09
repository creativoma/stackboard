// Boards have no stored color, so we derive a stable one from the board id —
// each board gets a flat tonal fill from the Blueprint family (blue tints and
// grays, DESIGN.md). Referencing the label-subtle tokens keeps the fills
// theme-aware: pale tints in light mode, deep tints in dark mode, with ink
// text readable on both.
const BOARD_TINTS = [
    'var(--color-label-blue-subtle)',
    'var(--color-label-purple-subtle)',
    'var(--color-label-green-subtle)',
    'var(--color-label-yellow-subtle)',
    'var(--color-label-red-subtle)',
    'var(--color-label-orange-subtle)',
]

export function boardGradient(boardId: string): string {
    let hash = 0
    for (let i = 0; i < boardId.length; i++) {
        hash = (hash * 31 + boardId.charCodeAt(i)) | 0
    }
    const index = Math.abs(hash) % BOARD_TINTS.length
    return BOARD_TINTS[index]
}
