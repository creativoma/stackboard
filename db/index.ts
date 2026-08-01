import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and configure it.'
    )
}

const globalForDb = globalThis as unknown as {
    deckClient?: ReturnType<typeof postgres>
}

const client = globalForDb.deckClient ?? postgres(connectionString, { max: 10 })
if (process.env.NODE_ENV !== 'production') globalForDb.deckClient = client

export const db = drizzle(client, { schema })
export * as schema from './schema'
