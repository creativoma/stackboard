'use client'

import { useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bookmark, X } from 'lucide-react'
import { Button } from '@/app/_components/button'

type SavedView = { name: string; query: string }

const MAX_SAVED_VIEWS = 10
const listeners = new Set<() => void>()
// getSnapshot must return a stable reference when nothing changed, so the
// parsed array is cached against the raw string it came from.
const snapshotCache = new Map<
    string,
    { raw: string | null; views: SavedView[] }
>()

function storageKey(boardId: string) {
    return `stackboard:savedViews:${boardId}`
}

function getSnapshot(boardId: string): SavedView[] {
    const raw = window.localStorage.getItem(storageKey(boardId))
    const cached = snapshotCache.get(boardId)
    if (cached && cached.raw === raw) return cached.views
    let views: SavedView[] = []
    try {
        views = raw ? JSON.parse(raw) : []
    } catch {
        views = []
    }
    snapshotCache.set(boardId, { raw, views })
    return views
}

function getServerSnapshot(): SavedView[] {
    return []
}

function writeViews(boardId: string, views: SavedView[]) {
    window.localStorage.setItem(storageKey(boardId), JSON.stringify(views))
    for (const listener of listeners) listener()
}

function subscribe(callback: () => void) {
    listeners.add(callback)
    window.addEventListener('storage', callback)
    return () => {
        listeners.delete(callback)
        window.removeEventListener('storage', callback)
    }
}

/**
 * Personal, per-browser shortcuts for filter combinations — filters already
 * live in the URL query string, so "saving" one just means remembering the
 * query string under a name. No backend, no schema change. Reads through
 * useSyncExternalStore (not state+effect) so localStorage stays the single
 * source of truth and writes from this component re-render immediately.
 */
export function SavedViews({ boardId }: { boardId: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const views = useSyncExternalStore(
        subscribe,
        () => getSnapshot(boardId),
        getServerSnapshot
    )

    function handleSave() {
        const query = searchParams.toString()
        const name = window.prompt('Name this view')?.trim().slice(0, 40)
        if (!name) return
        const next = [
            ...views.filter((v) => v.name !== name),
            { name, query },
        ].slice(-MAX_SAVED_VIEWS)
        writeViews(boardId, next)
    }

    function handleDelete(name: string) {
        writeViews(
            boardId,
            views.filter((v) => v.name !== name)
        )
    }

    return (
        <div
            className="flex items-center gap-1.5 flex-wrap"
            role="group"
            aria-label="Saved views"
        >
            {views.map((v) => (
                <span
                    key={v.name}
                    className="inline-flex items-center h-9 rounded-[var(--radius-inputs)] border border-[var(--color-border-strong)] bg-[var(--color-paper)] text-[13px] overflow-hidden"
                >
                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                v.query
                                    ? `/boards/${boardId}?${v.query}`
                                    : `/boards/${boardId}`
                            )
                        }
                        title={v.name}
                        className="h-full max-w-32 truncate px-3 text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] transition-colors"
                    >
                        {v.name}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(v.name)}
                        aria-label={`Delete saved view ${v.name}`}
                        title="Delete saved view"
                        className="h-full w-8 flex items-center justify-center shrink-0 border-l border-[var(--color-mist)] text-[var(--color-fog)] hover:text-[var(--color-coral)] hover:bg-[var(--color-blush)] transition-colors"
                    >
                        <X size={12} strokeWidth={2} aria-hidden="true" />
                    </button>
                </span>
            ))}
            <Button
                type="button"
                variant="ghost"
                onClick={handleSave}
                title="Save the current filters as a view"
            >
                <Bookmark size={14} strokeWidth={2} aria-hidden="true" />
                Save view
            </Button>
        </div>
    )
}
