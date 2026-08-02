/**
 * Minimal, safe markdown-lite renderer for card descriptions.
 *
 * The whole input is HTML-escaped first, so every regex substitution below
 * only ever injects tags we wrote ourselves — user input can never introduce
 * a new tag or attribute. Supports: **bold**, *italic*, `code`, line breaks,
 * and [text](https://url) links restricted to http(s) schemes.
 */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function renderMarkdownLite(source: string): string {
    let html = escapeHtml(source)

    html = html.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+&quot;[^)]*&quot;)?\)/g,
        (_m, text, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`
        }
    )
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
    html = html.replace(/\n/g, '<br />')

    return html
}
