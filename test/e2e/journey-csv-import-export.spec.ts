import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('owner exports a board as CSV and re-imports it as a new board', async ({
    page,
}) => {
    await login(page, 'alice@example.com')
    await page.getByRole('link', { name: 'Product Launch' }).click()
    await page.waitForURL('**/boards/*')
    const boardUrl = page.url()
    const boardId = boardUrl.split('/').pop()

    // Fetch the CSV export via the authenticated browser session.
    const response = await page.request.get(
        `/boards/${boardId}/export?format=csv`
    )
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('text/csv')
    const csv = await response.text()
    expect(csv.split('\n')[0]).toContain('Type,Name,Status')

    // Re-import that CSV as a brand new board.
    await page.goto('/boards')
    await page.getByRole('button', { name: 'Import a board' }).click()
    await page.getByLabel('JSON or CSV file').setInputFiles({
        name: 'product-launch-export.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf-8'),
    })
    await page.getByRole('button', { name: 'Import board' }).click()

    await page.waitForURL('**/boards/*')
    await expect(
        page.getByRole('heading', { name: 'Product Launch' })
    ).toBeVisible()
    await expect(page.getByText('To do')).toBeVisible()
    await expect(page.getByText('In progress')).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible()
    await expect(
        page.getByRole('link', { name: 'Write launch announcement' })
    ).toBeVisible()
})
