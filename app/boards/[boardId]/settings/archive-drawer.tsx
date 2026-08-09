'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive } from 'lucide-react'
import { Button } from '@/app/_components/button'
import { Drawer } from '@/app/_components/drawer'
import { ArchiveRestoreControls } from '../cards/[cardId]/card-fields'
import { RestoreColumnButton } from './restore-column-button'

type ArchivedColumn = { id: string; name: string }
type ArchivedCard = { id: string; title: string }
type ActiveColumn = { id: string; name: string }

export function ArchiveDrawer({
    boardId,
    archivedColumns,
    archivedCards,
    activeColumns,
}: {
    boardId: string
    archivedColumns: ArchivedColumn[]
    archivedCards: ArchivedCard[]
    activeColumns: ActiveColumn[]
}) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Archive size={13} strokeWidth={2} aria-hidden="true" />
                View archive
            </Button>
            <Drawer
                open={open}
                onClose={() => setOpen(false)}
                title="Archive"
                description="Restore archived columns and cards back onto the board."
            >
                {archivedColumns.length > 0 ? (
                    <div className="mb-6">
                        <h3 className="eyebrow mb-2">Columns</h3>
                        <ul>
                            {archivedColumns.map((col) => (
                                <li
                                    key={col.id}
                                    className="flex items-center justify-between py-2 border-b border-[var(--color-mist)] last:border-0"
                                >
                                    <span className="text-sm">{col.name}</span>
                                    <RestoreColumnButton
                                        boardId={boardId}
                                        columnId={col.id}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {archivedCards.length > 0 ? (
                    <div>
                        <h3 className="eyebrow mb-2">Cards</h3>
                        <ul className="flex flex-col gap-3">
                            {archivedCards.map((card) => (
                                <li
                                    key={card.id}
                                    className="flex items-center justify-between gap-3 py-2 border-b border-[var(--color-mist)] last:border-0"
                                >
                                    <Link
                                        href={`/boards/${boardId}/cards/${card.id}`}
                                        className="text-sm font-medium hover:underline min-w-0 truncate"
                                    >
                                        {card.title}
                                    </Link>
                                    <ArchiveRestoreControls
                                        boardId={boardId}
                                        cardId={card.id}
                                        status="archived"
                                        activeColumns={activeColumns}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </Drawer>
        </>
    )
}
