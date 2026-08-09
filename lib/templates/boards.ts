import type { NormalizedImport } from '@/lib/import/types'

/**
 * Built-in board templates. Each is a plain NormalizedImport — the exact
 * shape the file importer produces — so template creation reuses the same
 * transactional insert path (lib/import/create-board.ts) with zero special
 * cases. Card `position` is per-column.
 */

export type BoardTemplate = {
    key: string
    name: string
    description: string
    board: NormalizedImport
}

function card(
    columnIndex: number,
    position: number,
    title: string,
    description = '',
    checklist: { text: string; done: boolean }[] = [],
    labelIndexes: number[] = []
): NormalizedImport['cards'][number] {
    return {
        columnIndex,
        position,
        title,
        description,
        status: 'active',
        dueDate: null,
        labelIndexes,
        checklist,
        comments: [],
    }
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
    {
        key: 'kanban',
        name: 'Basic Kanban',
        description: 'To do / Doing / Done with a starter card.',
        board: {
            boardName: 'Kanban board',
            columns: [
                { name: 'To do', status: 'active' },
                { name: 'Doing', status: 'active' },
                { name: 'Done', status: 'active' },
            ],
            labels: [
                { name: 'Priority', color: 'red' },
                { name: 'Nice to have', color: 'blue' },
            ],
            cards: [
                card(
                    0,
                    0,
                    'Welcome to your board',
                    'Drag this card to **Doing** to get started. Open it to add a due date, assignee, labels, or a checklist.',
                    [
                        { text: 'Create your first real card', done: false },
                        { text: 'Invite a teammate', done: false },
                    ]
                ),
            ],
        },
    },
    {
        key: 'sprint',
        name: 'Weekly sprint',
        description: 'Backlog / This week / In review / Shipped.',
        board: {
            boardName: 'Weekly sprint',
            columns: [
                { name: 'Backlog', status: 'active' },
                { name: 'This week', status: 'active' },
                { name: 'In review', status: 'active' },
                { name: 'Shipped', status: 'active' },
            ],
            labels: [
                { name: 'Feature', color: 'green' },
                { name: 'Bug', color: 'red' },
                { name: 'Chore', color: 'yellow' },
            ],
            cards: [
                card(
                    0,
                    0,
                    'Sprint planning',
                    'Pull cards from **Backlog** into **This week** each Monday.',
                    [
                        { text: 'Review the backlog', done: false },
                        { text: 'Agree on the week scope', done: false },
                    ]
                ),
            ],
        },
    },
    {
        key: 'bugs',
        name: 'Bug tracking',
        description: 'Reported / Confirmed / Fixing / Verified.',
        board: {
            boardName: 'Bug tracking',
            columns: [
                { name: 'Reported', status: 'active' },
                { name: 'Confirmed', status: 'active' },
                { name: 'Fixing', status: 'active' },
                { name: 'Verified', status: 'active' },
            ],
            labels: [
                { name: 'Critical', color: 'red' },
                { name: 'Regression', color: 'orange' },
                { name: 'UI', color: 'purple' },
            ],
            cards: [
                card(
                    0,
                    0,
                    'Example bug report',
                    'Include **steps to reproduce**, expected vs actual behavior, and environment details.',
                    [
                        { text: 'Reproduce the bug', done: false },
                        { text: 'Write a failing test', done: false },
                        { text: 'Fix and verify', done: false },
                    ],
                    [0]
                ),
            ],
        },
    },
]

export function getBoardTemplate(key: string): BoardTemplate | undefined {
    return BOARD_TEMPLATES.find((t) => t.key === key)
}
