'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '../actions'
import { SubmitButton } from '../submit-button'

export default function LoginPage() {
    const [state, formAction] = useActionState(loginAction, undefined)
    const next = useSearchParams().get('next') ?? ''

    return (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm elevated-surface p-6">
                <h1 className="text-[15px] font-medium tracking-[-0.1px] mb-1">
                    Log in to Stackboard
                </h1>
                <p className="text-sm text-[var(--color-smoke)] mb-6">
                    Pick up where your team left off.
                </p>

                <form
                    action={formAction}
                    className="flex flex-col gap-4"
                    noValidate
                >
                    <input type="hidden" name="next" value={next} />
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
                            autoComplete="current-password"
                            className="input"
                        />
                    </div>

                    {state?.error ? (
                        <p
                            role="alert"
                            className="text-sm text-[var(--color-coral)]"
                        >
                            {state.error}
                        </p>
                    ) : null}

                    <SubmitButton pendingText="Logging in…" className="w-full">
                        Log in
                    </SubmitButton>
                </form>

                <p className="text-sm text-[var(--color-smoke)] mt-6">
                    New here?{' '}
                    <Link
                        href="/signup"
                        className="font-medium text-[var(--color-electric-blue)] hover:text-[var(--color-midnight-pressed)] transition-colors"
                    >
                        Create an account
                    </Link>
                </p>
            </div>
        </main>
    )
}
