import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('owner reorders board columns via drag-and-drop in Settings', async ({
    page,
}) => {
    await login(page, 'alice@example.com')
    await page.getByRole('link', { name: 'Product Launch' }).click()
    await page.waitForURL('**/boards/*')
    await page.getByRole('link', { name: 'Settings' }).click()

    const columnsSection = page.locator('section', {
        has: page.locator('#columns-heading'),
    })
    await expect(columnsSection.getByText('To do')).toBeVisible()

    // Drag the "To do" column below "In progress".
    const toDoHandle = page.getByRole('button', { name: 'Reorder To do' })
    const inProgressRow = columnsSection.locator('li', {
        hasText: 'In progress',
    })
    await toDoHandle.scrollIntoViewIfNeeded()
    await inProgressRow.scrollIntoViewIfNeeded()

    const handleBox = await toDoHandle.boundingBox()
    const targetBox = await inProgressRow.boundingBox()
    if (!handleBox || !targetBox)
        throw new Error('Could not measure drag source/target')

    await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
    )
    await page.mouse.down()
    await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 }
    )
    await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 }
    )
    await page.mouse.up()

    await page.waitForTimeout(500)
    await page.reload()

    // Order persists after reload: "In progress" now comes before "To do".
    const rowNames = columnsSection.getByTestId('column-row-name')
    await expect(rowNames.first()).toHaveText('In progress')
    await expect(rowNames.nth(1)).toHaveText('To do')

    // The board view reflects the new column order too.
    await page.goto(page.url().replace(/\/settings$/, ''))
    const columns = page.locator('[data-column-name]')
    await expect(columns.first()).toHaveAttribute(
        'data-column-name',
        'In progress'
    )
})
