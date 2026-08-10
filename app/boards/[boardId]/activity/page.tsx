import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/app/_components/button'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getBoard } from '@/lib/queries/board'
import { listBoardActivity } from '@/lib/queries/activity'
import { BoardActivityTimeline } from './board-activity-timeline'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ boardId: string }>
}): Promise<Metadata> {
    const { boardId } = await params
    const board = await getBoard(boardId)
    return { title: board ? `Activity · ${board.name}` : 'Activity' }
}

export default async function BoardActivityPage({
    params,
}: {
    params: Promise<{ boardId: string }>
}) {
    const { boardId } = await params
    const user = await requireUser()

    const [board, membership] = await Promise.all([
        getBoard(boardId),
        getMembership(boardId, user.id),
    ])
    if (!board) notFound()
    if (!isActiveMember(membership)) {
        return (
            <div className="card-surface text-center py-16">
                <h1 className="text-[15px] font-normal tracking-[-0.1px] mb-2">
                    You don&apos;t have access to this board
                </h1>
                <p className="text-[var(--color-smoke)]">
                    Ask the board owner to invite you, or check that you&apos;re
                    logged in with the right account.
                </p>
            </div>
        )
    }

    const activity = await listBoardActivity(boardId)

    return (
        <div className="flex flex-col gap-6 max-w-[720px]">
            <div>
                <Button href={`/boards/${boardId}`} variant="ghost">
                    &larr; {board.name}
                </Button>
                <h1 className="text-[16px] font-medium tracking-[-0.2px] mt-1">
                    Activity
                </h1>
                <p className="text-[var(--color-smoke)] mt-1 text-sm">
                    Every change on this board, most recent first.
                </p>
            </div>

            <BoardActivityTimeline boardId={boardId} activity={activity} />
        </div>
    )
}

export const dynamic = 'force-dynamic'
