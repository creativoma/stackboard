// Pinned to 'en-US' so the server-rendered string always matches the
// client's re-render, regardless of either environment's default locale
// (Intl.*'s locale-less form uses the runtime's locale and caused a
// hydration mismatch between Node and the browser).
const dateFormatter = new Intl.DateTimeFormat('en-US')
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
})

export function formatDate(date: Date | string): string {
    return dateFormatter.format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
    return dateTimeFormatter.format(new Date(date))
}

const relativeTimeFormatter = new Intl.RelativeTimeFormat('en-US', {
    numeric: 'auto',
})
const RELATIVE_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
]

export function formatRelativeTime(date: Date | string): string {
    const diff = new Date(date).getTime() - Date.now()
    for (const { unit, ms } of RELATIVE_UNITS) {
        if (Math.abs(diff) >= ms) {
            return relativeTimeFormatter.format(Math.round(diff / ms), unit)
        }
    }
    return relativeTimeFormatter.format(Math.round(diff / 1000), 'second')
}
