'use client'

import { useActionState } from 'react'
import {
    updateProfileAction,
    changePasswordAction,
} from '@/lib/actions/account'
import { SubmitButton } from '@/app/(auth)/submit-button'

export function UpdateProfileForm({ name }: { name: string }) {
    const [state, formAction] = useActionState(updateProfileAction, undefined)

    return (
        <form action={formAction} className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                    Name
                </label>
                <input
                    id="name"
                    name="name"
                    defaultValue={name}
                    maxLength={100}
                    required
                    className="input w-[280px]"
                />
            </div>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
            {state?.error ? (
                <p
                    role="alert"
                    className="text-sm text-[var(--color-coral)] w-full"
                >
                    {state.error}
                </p>
            ) : null}
            {state?.success ? (
                <p className="text-sm text-[var(--color-success)] w-full">
                    {state.success}
                </p>
            ) : null}
        </form>
    )
}

export function ChangePasswordForm() {
    const [state, formAction] = useActionState(changePasswordAction, undefined)

    return (
        <form
            action={formAction}
            key={state?.success ? 'reset' : 'form'}
            className="flex flex-col gap-3 max-w-[320px]"
        >
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="currentPassword"
                    className="text-sm font-medium"
                >
                    Current password
                </label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    className="input"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="newPassword" className="text-sm font-medium">
                    New password
                </label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    minLength={8}
                    required
                    className="input"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor="confirmPassword"
                    className="text-sm font-medium"
                >
                    Confirm new password
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    minLength={8}
                    required
                    className="input"
                />
            </div>
            <SubmitButton pendingText="Updating…">Update password</SubmitButton>
            {state?.error ? (
                <p role="alert" className="text-sm text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
            {state?.success ? (
                <p className="text-sm text-[var(--color-success)]">
                    {state.success}
                </p>
            ) : null}
        </form>
    )
}
