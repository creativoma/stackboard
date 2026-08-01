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
