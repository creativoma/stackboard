import type { Metadata } from 'next'
import Link from 'next/link'
import { LayoutGrid, MessageSquare, Search, SquareKanban } from 'lucide-react'
import { requireUser } from '@/lib/auth/session'
import { searchBoards, searchCards, searchComments } from '@/lib/queries/search'
import { formatRelativeTime } from '@/lib/format'

export const metadata: Metadata = { title: 'Search' }

export default async function SearchPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>
}) {
    const { q = '' } = await searchParams
    const user = await requireUser()
    const [cards, boards, comments] = q
        ? await Promise.all([
              searchCards(user.id, q),
              searchBoards(user.id, q),
              searchComments(user.id, q),
          ])
        : [[], [], []]
    const totalResults = cards.length + boards.length + comments.length

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <h1 className="text-[16px] font-medium tracking-[-0.2px]">
                    Search
                </h1>
                <p className="text-sm text-[var(--color-smoke)] mt-1">
                    Searches boards, cards, and comments across every board
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
                    placeholder="Search everything…"
                    aria-label="Search"
                    autoFocus
                    className="input input--icon-left"
                />
            </form>

            {q ? (
                totalResults === 0 ? (
                    <div className="card-surface text-center py-12">
                        <p className="text-[var(--color-smoke)]">
                            Nothing matches &ldquo;{q}&rdquo;.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {boards.length > 0 ? (
                            <section aria-labelledby="boards-heading">
                                <h2
                                    id="boards-heading"
                                    className="eyebrow mb-2 flex items-center gap-1.5"
                                >
                                    <LayoutGrid
                                        size={12}
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Boards
                                </h2>
                                <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] overflow-hidden">
                                    <ul className="divide-y divide-[var(--color-mist)]">
                                        {boards.map((b) => (
                                            <li key={b.boardId}>
                                                <Link
                                                    href={`/boards/${b.boardId}`}
                                                    className="block px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-snow)] hover:text-[var(--color-electric-blue)] transition-colors"
                                                >
                                                    {b.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </section>
                        ) : null}

                        {cards.length > 0 ? (
                            <section aria-labelledby="cards-heading">
                                <h2
                                    id="cards-heading"
                                    className="eyebrow mb-2 flex items-center gap-1.5"
                                >
                                    <SquareKanban
                                        size={12}
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Cards
                                </h2>
                                <ul
                                    className="flex flex-col gap-2"
                                    data-testid="search-results"
                                >
                                    {cards.map((r) => (
                                        <li key={r.cardId}>
                                            <Link
                                                href={`/boards/${r.boardId}/cards/${r.cardId}`}
                                                className="elevated-surface flex flex-col gap-1 p-3 hover:-translate-y-0.5 transition-transform"
                                            >
                                                <span className="text-sm font-medium text-[var(--color-ink)]">
                                                    {r.title}
                                                    {r.cardStatus ===
                                                    'archived' ? (
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
                                                    {r.boardName} ·{' '}
                                                    {r.columnName}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {comments.length > 0 ? (
                            <section aria-labelledby="comments-heading">
                                <h2
                                    id="comments-heading"
                                    className="eyebrow mb-2 flex items-center gap-1.5"
                                >
                                    <MessageSquare
                                        size={12}
                                        strokeWidth={2.5}
                                        aria-hidden="true"
                                    />
                                    Comments
                                </h2>
                                <ul className="flex flex-col gap-2">
                                    {comments.map((c) => (
                                        <li key={c.commentId}>
                                            <Link
                                                href={`/boards/${c.boardId}/cards/${c.cardId}`}
                                                className="elevated-surface flex flex-col gap-1 p-3 hover:-translate-y-0.5 transition-transform"
                                            >
                                                <span className="text-xs text-[var(--color-fog)]">
                                                    <strong className="font-medium text-[var(--color-ink)]">
                                                        {c.authorName}
                                                    </strong>{' '}
                                                    on {c.cardTitle} ·{' '}
                                                    {formatRelativeTime(
                                                        c.createdAt
                                                    )}
                                                </span>
                                                <span className="text-sm text-[var(--color-ink-secondary)] line-clamp-2">
                                                    {c.body}
                                                </span>
                                                <span className="text-xs text-[var(--color-fog)]">
                                                    {c.boardName}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>
                )
            ) : null}
        </div>
    )
}

export const dynamic = 'force-dynamic'
