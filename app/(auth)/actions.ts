'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSession, destroySession } from '@/lib/auth/session'
import { loginSchema, signupSchema } from '@/lib/validation/auth'

export type AuthActionState = { error?: string } | undefined

export async function signupAction(
    _prev: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    const parsed = signupSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, parsed.data.email))
        .limit(1)
    if (existing.length > 0) {
        return { error: 'An account with that email already exists' }
    }

    const passwordHash = await hashPassword(parsed.data.password)
    const [user] = await db
        .insert(schema.users)
        .values({
            name: parsed.data.name,
            email: parsed.data.email,
            passwordHash,
        })
        .returning()

    await createSession(user.id)
    redirect(safeNextPath(formData.get('next')))
}

export async function loginAction(
    _prev: AuthActionState,
    formData: FormData
): Promise<AuthActionState> {
    const parsed = loginSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, parsed.data.email))
        .limit(1)
    const user = rows[0]
    if (
        !user ||
        !(await verifyPassword(parsed.data.password, user.passwordHash))
    ) {
        return { error: 'Incorrect email or password' }
    }

    await createSession(user.id)
    redirect(safeNextPath(formData.get('next')))
}

function safeNextPath(value: FormDataEntryValue | null): string {
    const path = typeof value === 'string' ? value : ''
    return path.startsWith('/') && !path.startsWith('//') ? path : '/boards'
}

export async function logoutAction(): Promise<void> {
    await destroySession()
    redirect('/login')
}
