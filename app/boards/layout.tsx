import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/session'
import { logoutAction } from '../(auth)/actions'

export default async function BoardsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    return (
        <div className="min-h-screen flex bg-[var(--color-snow)]">
            <aside className="w-60 shrink-0 h-screen sticky top-0 bg-[var(--color-paper)] border-r border-[var(--color-mist)] flex flex-col justify-between py-4">
                <div>
                    <Link
                        href="/boards"
                        className="flex items-center gap-2 font-bold text-[17px] text-[var(--color-ink)] px-4 mb-6"
                    >
                        <span
                            className="w-7 h-7 rounded-[var(--radius-tags)] flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{
                                background:
                                    'linear-gradient(155deg, #1090df 0%, var(--color-board-blue) 100%)',
                            }}
                            aria-hidden="true"
                        >
                            S
                        </span>
                        Stackboard
                    </Link>
                    <nav
                        aria-label="Main"
                        className="px-2 flex flex-col gap-0.5"
                    >
                        <Link
                            href="/boards"
                            className="flex items-center gap-2.5 rounded-[var(--radius-buttons)] px-2.5 py-2 text-sm font-semibold text-[var(--color-electric-blue)] bg-[var(--color-electric-blue-tint)]"
                        >
                            <svg
                                width="17"
                                height="17"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                                className="shrink-0"
                            >
                                <rect
                                    x="2"
                                    y="2"
                                    width="5"
                                    height="8"
                                    rx="1.2"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                />
                                <rect
                                    x="9"
                                    y="2"
                                    width="5"
                                    height="5"
                                    rx="1.2"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                />
                                <rect
                                    x="9"
                                    y="9"
                                    width="5"
                                    height="5"
                                    rx="1.2"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                />
                            </svg>
                            Boards
                        </Link>
                    </nav>
                </div>

                <div className="px-2">
                    <div className="flex items-center gap-2.5 rounded-[var(--radius-buttons)] px-2.5 py-2">
                        <span
                            className="w-8 h-8 rounded-full bg-[var(--color-lavender)] text-[var(--color-ink)] text-[12px] font-semibold flex items-center justify-center shrink-0"
                            aria-hidden="true"
                        >
                            {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-ink)] truncate">
                                {user.name}
                            </p>
                            <p className="text-xs text-[var(--color-fog)] truncate">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <form action={logoutAction} className="mt-1">
                        <button
                            type="submit"
                            className="w-full text-left flex items-center gap-2.5 rounded-[var(--radius-buttons)] px-2.5 py-2 text-sm font-medium text-[var(--color-smoke)] hover:bg-[var(--color-snow)] hover:text-[var(--color-ink)] transition-colors"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                                className="shrink-0"
                            >
                                <path
                                    d="M6 2H3.5C2.7 2 2 2.7 2 3.5V12.5C2 13.3 2.7 14 3.5 14H6"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M10.5 11L14 8L10.5 5"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M14 8H6"
                                    stroke="currentColor"
                                    strokeWidth="1.4"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Log out
                        </button>
                    </form>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col min-h-screen">
                <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-6">
                    {children}
                </main>
                <footer className="border-t border-[var(--color-mist)]">
                    <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 lg:px-10 py-4 text-xs text-[var(--color-fog)]">
                        <span>© {new Date().getFullYear()} Stackboard</span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                            v0.1.0
                        </span>
                    </div>
                </footer>
            </div>
        </div>
    )
}
