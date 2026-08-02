'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@/db'
import { requireUser } from '@/lib/auth/session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

export type AccountActionState =
    { error?: string; success?: string } | undefined

const updateProfileSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(100),
})

export async function updateProfileAction(
    _prev: AccountActionState,
    formData: FormData
): Promise<AccountActionState> {
    const user = await requireUser()

    const parsed = updateProfileSchema.safeParse({
        name: formData.get('name'),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    await db
        .update(schema.users)
        .set({ name: parsed.data.name })
        .where(eq(schema.users.id, user.id))

    revalidatePath('/account')
    revalidatePath('/boards', 'layout')
    return { success: 'Profile updated' }
}

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z
            .string()
            .min(8, 'New password must be at least 8 characters')
            .max(200),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    })

export async function changePasswordAction(
    _prev: AccountActionState,
    formData: FormData
): Promise<AccountActionState> {
    const user = await requireUser()

    const parsed = changePasswordSchema.safeParse({
        currentPassword: formData.get('currentPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword'),
    })
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }
    }

    const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id))
        .limit(1)
    const dbUser = rows[0]
    if (
        !dbUser ||
        !(await verifyPassword(
            parsed.data.currentPassword,
            dbUser.passwordHash
        ))
    ) {
        return { error: 'Current password is incorrect' }
    }

    const passwordHash = await hashPassword(parsed.data.newPassword)
    await db
        .update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.id, user.id))

    return { success: 'Password updated' }
}
