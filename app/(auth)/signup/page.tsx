'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signupAction } from '../actions'
import { SubmitButton } from '../submit-button'
import { Button } from '@/app/_components/button'

export default function SignupPage() {
    const [state, formAction] = useActionState(signupAction, undefined)
    const next = useSearchParams().get('next') ?? ''

    return (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm elevated-surface p-8">
                <h1 className="text-[24px] font-semibold tracking-[-0.02em] mb-1">
                    Create your account
                </h1>
                <p className="text-sm text-[var(--color-smoke)] mb-6">
                    Start a board your team can actually use.
                </p>

                <form
                    action={formAction}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <input type="hidden" name="next" value={next} />
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-sm font-medium">
                            Name
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            autoComplete="name"
                            className="input"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm font-medium">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            className="input"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="password"
                            className="text-sm font-medium"
                        >
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            minLength={8}
                            autoComplete="new-password"
                            className="input"
                        />
                        <span className="text-xs text-[var(--color-fog)]">
                            At least 8 characters.
                        </span>
                    </div>

                    {state?.error ? (
                        <p
                            role="alert"
                            className="text-sm text-[var(--color-coral)]"
                        >
                            {state.error}
                        </p>
                    ) : null}

                    <SubmitButton pendingText="Creating account…">
                        Sign up for free
                    </SubmitButton>
                </form>

                <p className="text-sm text-[var(--color-smoke)] mt-6">
                    Already have an account?{' '}
                    <Button
                        href="/login"
                        variant="ghost"
                        className="!inline-flex !p-0 !min-h-0 font-medium"
                    >
                        Log in
                    </Button>
                </p>
            </div>
        </main>
    )
}
