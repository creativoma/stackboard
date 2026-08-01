import { execSync } from 'node:child_process'

export default function globalSetup() {
    const databaseUrl =
        process.env.DATABASE_URL ??
        'postgresql://stackboard:stackboard@localhost:5432/stackboard'
    execSync('bun run db:seed', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
    })
}
