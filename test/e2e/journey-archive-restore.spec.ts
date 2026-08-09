import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('owner archives a card and an empty column, reviews activity, then restores the card', async ({
    page,
}) => {
    await login(page, 'alice@example.com')
    await page.getByRole('link', { name: 'Product Launch' }).click()
    await page.waitForURL('**/boards/*')

    // Archive an active card via its detail page.
    await page.getByRole('link', { name: 'Finalize pricing page copy' }).click()
    await page.waitForURL('**/cards/*')
    await page.getByRole('button', { name: 'Archive card' }).click()
    await expect(page.getByText('Archived', { exact: true })).toBeVisible()

    // Review the activity trail on the card.
    await expect(page.getByText('archived this card')).toBeVisible()

    await page.goto(page.url().replace(/\/cards\/.*/, ''))

    // Archive the pre-seeded empty "Blocked" column from the board.
    const blockedColumn = page.locator('[data-column-name="Blocked"]')
    await blockedColumn.hover() // the archive button reveals on hover
    await blockedColumn
        .getByRole('button', { name: /Archive column Blocked/ })
        .click()
    await expect(page.locator('[data-column-name="Blocked"]')).toHaveCount(0)

    // Restore the archived card into an active column from board settings.
    // Archived columns/cards live inside the "View archive" drawer.
    await page.getByRole('link', { name: 'Board settings' }).click()
    await page.getByRole('button', { name: 'View archive' }).click()
    const drawer = page.getByRole('dialog', { name: 'Archive' })
    await expect(drawer.getByText('Blocked')).toBeVisible() // archived column

    const archivedCardRow = drawer.locator('li', {
        hasText: 'Finalize pricing page copy',
    })
    await archivedCardRow
        .getByLabel('Restore into column')
        .selectOption({ label: 'To do' })
    await archivedCardRow.getByRole('button', { name: 'Restore' }).click()

    // Once restored, the card leaves the archived-cards list in the drawer.
    await expect(drawer.getByText('Finalize pricing page copy')).toHaveCount(0)
    await page.keyboard.press('Escape') // close the drawer before navigating

    // And it reappears as an active card on the board, in the chosen column.
    await page
        .getByRole('link', { name: /Product Launch/ })
        .first()
        .click()
    await page.waitForURL('**/boards/*')
    await expect(
        page.getByRole('link', { name: 'Finalize pricing page copy' })
    ).toBeVisible()
})
