// Fixed six-color functional label palette, harmonized to the brand
// family (see DESIGN.md, "Stackboard adaptations").
export const LABEL_COLORS = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Red' },
] as const

export const LABEL_COLOR_VAR: Record<string, string> = {
    green: 'var(--color-label-green)',
    yellow: 'var(--color-label-yellow)',
    orange: 'var(--color-label-orange)',
    red: 'var(--color-label-red)',
    purple: 'var(--color-label-purple)',
    blue: 'var(--color-label-blue)',
}

export const LABEL_COLOR_SUBTLE_VAR: Record<string, string> = {
    green: 'var(--color-label-green-subtle)',
    yellow: 'var(--color-label-yellow-subtle)',
    orange: 'var(--color-label-orange-subtle)',
    red: 'var(--color-label-red-subtle)',
    purple: 'var(--color-label-purple-subtle)',
    blue: 'var(--color-label-blue-subtle)',
}

// Cycles columns through the same fixed six-color palette so each column
// gets a stable status dot without introducing a new color concept.
const COLUMN_ACCENT_ORDER = [
    'var(--color-label-blue)',
    'var(--color-label-green)',
    'var(--color-label-yellow)',
    'var(--color-label-purple)',
    'var(--color-label-orange)',
    'var(--color-label-red)',
]

export function columnAccentColor(position: number): string {
    return COLUMN_ACCENT_ORDER[position % COLUMN_ACCENT_ORDER.length]
}
