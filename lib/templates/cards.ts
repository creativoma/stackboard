import type { CardPriority } from '@/db/schema'

/**
 * Built-in card templates: a starter checklist (and, for a couple, a
 * default priority) seeded onto a new card at creation time. Unlike board
 * templates (lib/templates/boards.ts), this doesn't reuse the import
 * pipeline — it's just a checklist bulk-insert alongside the normal
 * createCardAction insert, so there's no separate transactional path to
 * maintain.
 */
export type CardTemplate = {
    key: string
    name: string
    description: string
    checklist: string[]
    priority?: CardPriority
}

export const CARD_TEMPLATES: CardTemplate[] = [
    {
        key: 'bug',
        name: 'Bug report',
        description: 'Steps to reproduce, expected vs. actual behavior.',
        checklist: [
            'Steps to reproduce',
            'Expected behavior',
            'Actual behavior',
            'Environment (browser/OS/version)',
        ],
        priority: 'high',
    },
    {
        key: 'feature',
        name: 'Feature request',
        description: 'Problem, proposed solution, acceptance criteria.',
        checklist: [
            'Problem statement',
            'Proposed solution',
            'Acceptance criteria',
        ],
    },
    {
        key: 'task',
        name: 'Task',
        description: 'A short checklist for a small, well-scoped task.',
        checklist: ['Define done', 'Do the work', 'Verify'],
    },
]

export function getCardTemplate(key: string): CardTemplate | undefined {
    return CARD_TEMPLATES.find((t) => t.key === key)
}
