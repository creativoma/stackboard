import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth/session'
import { acceptInvitationAction } from '@/lib/actions/invitations'

export const metadata: Metadata = {
    robots: { index: false, follow: false },
}

export default async function AcceptInvitePage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    const user = await getCurrentUser()

    if (!user) {
        return (
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-sm elevated-surface p-8 text-center">
                    <h1 className="text-[20px] font-semibold mb-2">
                        You&apos;ve been invited to a board
                    </h1>
                    <p className="text-sm text-[var(--color-smoke)] mb-6">
                        Log in or create an account with the invited email to
                        accept.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Link
                            href={`/login?next=/invite/${token}`}
                            className="btn-primary justify-center"
                        >
                            Log in
                        </Link>
                        <Link
                            href={`/signup?next=/invite/${token}`}
                            className="btn-outline justify-center"
                        >
                            Sign up
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    const result = await acceptInvitationAction(token)
    if (result.boardId) redirect(`/boards/${result.boardId}`)

    return (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-sm elevated-surface p-8 text-center">
                <h1 className="text-[20px] font-semibold mb-2">
                    Couldn&apos;t accept this invitation
                </h1>
                <p className="text-sm text-[var(--color-coral)] mb-6">
                    {result.error}
                </p>
                <Link
                    href="/boards"
                    className="text-[var(--color-electric-blue)]"
                >
                    Go to your boards
                </Link>
            </div>
        </main>
    )
}

export const dynamic = 'force-dynamic'
