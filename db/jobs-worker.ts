import 'dotenv/config'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import { processDueJobs, scanDueSoonCards } from '../lib/jobs/worker'

const POLL_INTERVAL_MS = 2000
const DUE_SCAN_INTERVAL_MS = 60 * 60 * 1000 // hourly

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

    let lastDueScan = 0
    while (running) {
        if (Date.now() - lastDueScan >= DUE_SCAN_INTERVAL_MS) {
            lastDueScan = Date.now()
            const reminded = await scanDueSoonCards(db)
            if (reminded > 0) {
                console.log(`Sent due-soon reminders for ${reminded} card(s).`)
            }
        }
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
