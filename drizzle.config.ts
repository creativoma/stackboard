import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    schema: './db/schema.ts',
    out: './db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url:
            process.env.DATABASE_URL ??
            'postgresql://stackboard:stackboard@localhost:5432/stackboard',
    },
    strict: true,
    verbose: true,
})
