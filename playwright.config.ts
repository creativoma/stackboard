import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './test/e2e',
    globalSetup: './test/e2e/global-setup.ts',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: 'list',
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3100',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'bun run build && bun run start -- -p 3100',
        url: 'http://localhost:3100',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
            DATABASE_URL:
                process.env.DATABASE_URL ??
                'postgresql://stackboard:stackboard@localhost:5432/stackboard',
        },
    },
})
