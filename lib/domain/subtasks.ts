/**
 * Subtask rollup for the parent card's progress bar. A subtask is "done"
 * when it's archived — the same reuse of card status as everywhere else
 * (there's no separate workflow-done concept for cards).
 */
export function subtaskProgress(subtasks: readonly { status: string }[]): {
    total: number
    done: number
} {
    return {
        total: subtasks.length,
        done: subtasks.filter((s) => s.status === 'archived').length,
    }
}
