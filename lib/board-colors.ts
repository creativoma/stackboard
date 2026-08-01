// Boards have no stored color, so we derive a stable one from the board id —
// this lets dashboard tiles read as miniature boards (DESIGN.md's
// "Board-Background Header" pattern) instead of flat white cards.
const BOARD_GRADIENTS = [
    'linear-gradient(155deg, #1090df 0%, #0079bf 45%, #005a94 100%)', // classic board blue
    'linear-gradient(155deg, #6fdba0 0%, #4bce97 45%, #1f845a 100%)', // label green
    'linear-gradient(155deg, #ffb87a 0%, #fea362 45%, #c9631a 100%)', // label orange
    'linear-gradient(155deg, #ff9c96 0%, #f87168 45%, #c9372c 100%)', // label red
    'linear-gradient(155deg, #c1b3ff 0%, #9f8fef 45%, #6e58d6 100%)', // label purple
    'linear-gradient(155deg, #7fb4ff 0%, #579dff 45%, #0c66e4 100%)', // label blue
]

export function boardGradient(boardId: string): string {
    let hash = 0
    for (let i = 0; i < boardId.length; i++) {
        hash = (hash * 31 + boardId.charCodeAt(i)) | 0
    }
    const index = Math.abs(hash) % BOARD_GRADIENTS.length
    return BOARD_GRADIENTS[index]
}
