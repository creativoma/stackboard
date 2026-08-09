import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { searchCards } from '@/lib/queries/search'

export const metadata: Metadata = { title: 'Search cards' }

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q = '' } = await searchParams
    const user = await requireUser()
    const results = q ? await searchCards(user.id, q) : []

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <h1 className="text-[16px] font-medium tracking-[-0.2px]">
                    Search cards
                </h1>
                <p className="text-sm text-[var(--color-smoke)] mt-1">
                    Searches titles and descriptions across every board
                    you&apos;re a member of.
                </p>
            </div>

            <form action="/boards/search" className="relative max-w-[420px]">
                <Search
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fog)]"
                />
                <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Search cards…"
                    aria-label="Search cards"
                    autoFocus
                    className="input input--icon-left"
                />
            </form>

            {q ? (
                results.length === 0 ? (
                    <div className="card-surface text-center py-12">
                        <p className="text-[var(--color-smoke)]">
                            No cards match &ldquo;{q}&rdquo;.
                        </p>
                    </div>
                ) : (
                    <ul
                        className="flex flex-col gap-2"
                        data-testid="search-results"
                    >
                        {results.map((r) => (
                            <li key={r.cardId}>
                                <Link
                                    href={`/boards/${r.boardId}/cards/${r.cardId}`}
                                    className="elevated-surface flex flex-col gap-1 p-3 hover:-translate-y-0.5 transition-transform"
                                >
                                    <span className="text-sm font-medium text-[var(--color-ink)]">
                                        {r.title}
                                        {r.cardStatus === 'archived' ? (
                                            <span className="ml-2 pill bg-[var(--color-sunken)] text-[var(--color-fog)]">
                                                archived
                                            </span>
                                        ) : null}
                                    </span>
                                    {r.description ? (
                                        <span className="text-xs text-[var(--color-smoke)] line-clamp-2">
                                            {r.description}
                                        </span>
                                    ) : null}
                                    <span className="text-xs text-[var(--color-fog)]">
                                        {r.boardName} · {r.columnName}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )
            ) : null}
        </div>
    )
}

export const dynamic = 'force-dynamic'
