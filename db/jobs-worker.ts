import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { processDueJobs } from '../lib/jobs/worker'

const POLL_INTERVAL_MS = 2000

async function main() {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')

    const client = postgres(connectionString, { max: 5 })
    const db = drizzle(client, { schema })

    let running = true
    process.on('SIGINT', () => {
        running = false
    })
    process.on('SIGTERM', () => {
        running = false
    })

    console.log(`Jobs worker started, polling every ${POLL_INTERVAL_MS}ms…`)

    while (running) {
        const processed = await processDueJobs(db)
        if (processed > 0) {
            console.log(`Processed ${processed} job(s).`)
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    await client.end()
    console.log('Jobs worker stopped.')
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
