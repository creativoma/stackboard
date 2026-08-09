import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('a card created by one member appears for another member without any interaction (SSE)', async ({
    browser,
}) => {
    // Two isolated sessions: Alice (owner) and Bob (member), same board.
    const aliceContext = await browser.newContext()
    const bobContext = await browser.newContext()
    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    try {
        await login(alice, 'alice@example.com')
        await login(bob, 'bob@example.com')

        // Bob is a member of only the seeded "Product Launch" (earlier specs
        // can give Alice a second board with that name via CSV import), so
        // discover the URL through Bob and point Alice at the same board.
        await bob.getByRole('link', { name: 'Product Launch' }).click()
        await bob.waitForURL('**/boards/*')
        await alice.goto(bob.url())
        await alice.waitForURL('**/boards/*')

        const cardTitle = `Realtime proof ${Date.now()}`

        // Alice adds a card; Bob does NOT interact with his page at all.
        // Target "To do" by name, not position — journey-column-reorder.spec.ts
        // permanently reorders this board's columns, and "In progress" (the
        // other candidate) has a WIP limit already met by seed data.
        await alice
            .locator('[data-column-name="To do"]')
            .getByRole('button', { name: '+ Add a card' })
            .click()
        await alice.getByPlaceholder('Card title').fill(cardTitle)
        await alice.getByRole('button', { name: 'Add card' }).click()
        await expect(alice.getByRole('link', { name: cardTitle })).toBeVisible()

        // The SSE channel polls every 2s and the client debounces refresh —
        // give it a generous window, but no clicks/reloads on Bob's side.
        await expect(bob.getByRole('link', { name: cardTitle })).toBeVisible({
            timeout: 15_000,
        })
    } finally {
        await aliceContext.close()
        await bobContext.close()
    }
})
