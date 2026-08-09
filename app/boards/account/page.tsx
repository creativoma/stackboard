import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { requireUser } from '@/lib/auth/session'
import { UpdateProfileForm, ChangePasswordForm } from './account-forms'

export const metadata: Metadata = { title: 'Account settings' }

export default async function AccountPage() {
    const user = await requireUser()

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <Button href="/boards" variant="ghost">
                    &larr; Boards
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Account settings
                </h1>
            </div>

            <section aria-labelledby="profile-heading" className="card-surface">
                <h2 id="profile-heading" className="eyebrow mb-3">
                    Profile
                </h2>
                <p className="text-sm text-[var(--color-fog)] mb-3">
                    {user.email}
                </p>
                <UpdateProfileForm name={user.name} />
            </section>

            <section
                aria-labelledby="password-heading"
                className="card-surface"
            >
                <h2 id="password-heading" className="eyebrow mb-3">
                    Password
                </h2>
                <ChangePasswordForm />
            </section>
        </div>
    )
}

export const dynamic = 'force-dynamic'
