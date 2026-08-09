'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signupAction } from '../actions'
import { SubmitButton } from '../submit-button'

export default function SignupPage() {
    const [state, formAction] = useActionState(signupAction, undefined)
    const next = useSearchParams().get('next') ?? ''

    return (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm elevated-surface p-6">
                <h1 className="text-[15px] font-medium tracking-[-0.1px] mb-1">
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

                    <SubmitButton
                        pendingText="Creating account…"
                        className="w-full"
                    >
                        Sign up for free
                    </SubmitButton>
                </form>

                <p className="text-sm text-[var(--color-smoke)] mt-6">
                    Already have an account?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-[var(--color-electric-blue)] hover:text-[var(--color-midnight-pressed)] transition-colors"
                    >
                        Log in
                    </Link>
                </p>
            </div>
        </main>
    )
}
