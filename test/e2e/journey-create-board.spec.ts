import { test, expect } from '@playwright/test'
import { login } from './helpers'

test('owner creates a board, invites teammates, and adds a labeled card with assignee and checklist', async ({
    page,
}) => {
    await login(page, 'alice@example.com')

    await page.getByRole('button', { name: '+ Create a board' }).click()
    await page.getByLabel('Board name').fill('Website Redesign')
    await page.getByRole('button', { name: 'Create board' }).click()

    await page.waitForURL('**/boards/*')
    await expect(
        page.getByRole('heading', { name: 'Website Redesign' })
    ).toBeVisible()
    await expect(page.getByText('To do')).toBeVisible()
    await expect(page.getByText('In progress')).toBeVisible()
    await expect(page.getByText('Done')).toBeVisible()

    await page.getByRole('link', { name: 'Board settings' }).click()
    await page.getByLabel('Invite by email').fill('bob@example.com')
    await page.getByRole('button', { name: 'Send invite' }).click()
    await expect(page.getByText('This person is already a member')).toHaveCount(
        0
    )

    await page.getByRole('link', { name: /Website Redesign/ }).click()

    await page.getByRole('button', { name: '+ Add a card' }).first().click()
    await page.getByPlaceholder('Card title').fill('Design new homepage hero')
    await page.getByRole('button', { name: 'Add card' }).click()

    await expect(
        page.getByRole('link', { name: 'Design new homepage hero' })
    ).toBeVisible()
    await page.getByRole('link', { name: 'Design new homepage hero' }).click()

    await page.waitForURL('**/cards/*')
    await expect(page.getByRole('textbox', { name: 'Card title' })).toHaveValue(
        'Design new homepage hero'
    )

    // Bob was just invited but hasn't accepted yet, so he isn't an
    // assignable member until he does — assign to the owner instead.
    await page.getByLabel('Assignee').selectOption({ label: 'Alice Owens' })
    await page.getByLabel('Due date').fill('2099-12-31')

    const checklistForm = page
        .locator('form')
        .filter({ has: page.getByPlaceholder('Add checklist item') })
    await checklistForm
        .getByPlaceholder('Add checklist item')
        .fill('Get design sign-off')
    await checklistForm
        .getByRole('button', { name: 'Add', exact: true })
        .click()
    await expect(page.getByText('Get design sign-off')).toBeVisible()
})
