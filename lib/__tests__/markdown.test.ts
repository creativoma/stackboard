import { describe, expect, it } from 'vitest'
import { renderMarkdownLite } from '../markdown'

describe('renderMarkdownLite', () => {
    it('escapes raw HTML so it cannot inject tags', () => {
        const html = renderMarkdownLite('<img src=x onerror=alert(1)>')
        expect(html).not.toContain('<img')
        expect(html).toContain('&lt;img')
    })

    it('escapes HTML even when it looks like markdown syntax', () => {
        const html = renderMarkdownLite('**<script>alert(1)</script>**')
        expect(html).not.toContain('<script>')
        expect(html).toContain('<strong>')
    })

    it('renders bold, italic, and code spans', () => {
        expect(renderMarkdownLite('**bold**')).toBe('<strong>bold</strong>')
        expect(renderMarkdownLite('*italic*')).toBe('<em>italic</em>')
        expect(renderMarkdownLite('`code`')).toBe('<code>code</code>')
    })

    it('only links http(s) URLs, not javascript: URIs', () => {
        const safe = renderMarkdownLite('[click me](https://example.com)')
        expect(safe).toContain('<a href="https://example.com"')

        const unsafe = renderMarkdownLite('[click me](javascript:alert(1))')
        expect(unsafe).not.toContain('<a href')
    })

    it('links URLs that carry an optional title, e.g. Trello-exported links', () => {
        const html = renderMarkdownLite(
            '[click me](https://example.com "some title")'
        )
        expect(html).toBe(
            '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">click me</a>'
        )
    })

    it('converts newlines to line breaks', () => {
        expect(renderMarkdownLite('line one\nline two')).toBe(
            'line one<br />line two'
        )
    })
})
