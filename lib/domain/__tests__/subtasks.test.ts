import { describe, expect, it } from 'vitest'
import { subtaskProgress } from '../subtasks'

describe('subtaskProgress', () => {
    it('counts archived subtasks as done', () => {
        const subtasks = [
            { status: 'active' },
            { status: 'archived' },
            { status: 'archived' },
        ]
        expect(subtaskProgress(subtasks)).toEqual({ total: 3, done: 2 })
    })

    it('handles no subtasks', () => {
        expect(subtaskProgress([])).toEqual({ total: 0, done: 0 })
    })
})
