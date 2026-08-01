import 'server-only'
import { cookies } from 'next/headers'
import { randomBytes, createHash } from 'node:crypto'
import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'

const SESSION_COOKIE = 'deck_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string): Promise<void> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
    await db
        .insert(schema.sessions)
        .values({ id: hashToken(token), userId, expiresAt })

    const store = await cookies()
    store.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
    })
}

export type SessionUser = { id: string; email: string; name: string }

export async function getCurrentUser(): Promise<SessionUser | null> {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (!token) return null

    const rows = await db
        .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
        .from(schema.sessions)
        .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
        .where(eq(schema.sessions.id, hashToken(token)))
        .limit(1)

    const row = rows[0]
    if (!row || row.expiresAt.getTime() < Date.now()) return null

    return { id: row.user.id, email: row.user.email, name: row.user.name }
}

/** Throws-free helper for pages/actions that require an authenticated user. */
export async function requireUser(): Promise<SessionUser> {
    const user = await getCurrentUser()
    if (!user) throw new Error('UNAUTHENTICATED')
    return user
}

export async function destroySession(): Promise<void> {
    const store = await cookies()
    const token = store.get(SESSION_COOKIE)?.value
    if (token) {
        await db
            .delete(schema.sessions)
            .where(eq(schema.sessions.id, hashToken(token)))
    }
    store.delete(SESSION_COOKIE)
}
