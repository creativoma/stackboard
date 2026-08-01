import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('teammate filters to their cards, completes a checklist item, comments, and moves the card to Done', async ({
    page,
}) => {
    await login(page, 'carol@example.com')

    await page.getByRole('link', { name: 'Product Launch' }).click()
    await page.waitForURL('**/boards/*')

    // Filter to Carol's own cards.
    await page
        .getByLabel('Filter by member')
        .selectOption({ label: 'Carol Nguyen' })
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(
        page.getByRole('link', { name: 'Fix onboarding checklist bug' })
    ).toBeVisible()
    await expect(
        page.getByRole('link', { name: 'Write launch announcement' })
    ).toHaveCount(0)

    await page
        .getByRole('link', { name: 'Fix onboarding checklist bug' })
        .click()
    await page.waitForURL('**/cards/*')

    // Complete a checklist item.
    const checklistItem = page.getByLabel('Ship a fix')
    await checklistItem.check()
    await expect(checklistItem).toBeChecked()

    // Post a comment.
    await page
        .getByLabel('Add a comment')
        .fill('Deployed the fix, watching error rates now.')
    await page.getByRole('button', { name: 'Comment' }).click()
    await expect(
        page.getByText('Deployed the fix, watching error rates now.')
    ).toBeVisible()

    // Go back to the board and drag the card from "In progress" to "Done".
    await page.goBack()
    await page.waitForLoadState('networkidle')

    const card = page
        .getByRole('link', { name: 'Fix onboarding checklist bug' })
        .locator('..')
    const doneColumn = page.locator('[data-column-name="Done"]')

    const cardBox = await card.boundingBox()
    const targetBox = await doneColumn.boundingBox()
    if (!cardBox || !targetBox)
        throw new Error('Could not measure drag source/target')

    await page.mouse.move(
        cardBox.x + cardBox.width / 2,
        cardBox.y + cardBox.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        cardBox.y + cardBox.height / 2,
        { steps: 10 }
    )
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 40, {
        steps: 10,
    })
    await page.mouse.up()

    await page.waitForTimeout(500)
    await page.reload()

    // The card must appear exactly once on the board after the move — no duplication.
    await expect(
        page.getByRole('link', { name: 'Fix onboarding checklist bug' })
    ).toHaveCount(1)
})
