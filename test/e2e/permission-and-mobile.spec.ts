import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('a user with no board membership is denied access, even via a direct URL', async ({
    page,
}) => {
    await login(page, 'dave@example.com')

    // Dave knows the board exists (e.g. a shared link) but was never invited.
    await page.goto('/boards')
    const boardLink = page.getByRole('link', { name: 'Product Launch' })
    await expect(boardLink).toHaveCount(0)

    // Discover the board id via an active member's account, then try it as Dave.
    const aliceContext = await page.context().browser()!.newContext()
    const alicePage = await aliceContext.newPage()
    await login(alicePage, 'alice@example.com')
    await alicePage.getByRole('link', { name: 'Product Launch' }).click()
    await alicePage.waitForURL('**/boards/*')
    const boardUrl = alicePage.url()
    await aliceContext.close()

    await page.goto(boardUrl)
    await expect(
        page.getByText("You don't have access to this board")
    ).toBeVisible()
})

test.describe('mobile viewport', () => {
    test.use({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
    })

    test('the board is usable on a small screen', async ({ page }) => {
        await login(page, 'bob@example.com')
        await page.getByRole('link', { name: 'Product Launch' }).click()
        await page.waitForURL('**/boards/*')

        await expect(
            page.getByRole('heading', { name: 'Product Launch' })
        ).toBeVisible()
        await expect(page.getByText('To do').first()).toBeVisible()

        await page
            .getByRole('link', { name: 'Write launch announcement' })
            .click()
        await page.waitForURL('**/cards/*')
        await expect(
            page.getByRole('textbox', { name: 'Card title' })
        ).toHaveValue('Write launch announcement')
    })
})
