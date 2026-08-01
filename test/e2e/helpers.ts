import type { Page } from '@playwright/test'

export async function login(
    page: Page,
    email: string,
    password = 'password123'
) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Log in' }).click()
    await page.waitForURL('**/boards')
}
