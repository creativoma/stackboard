import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/session'
import { getMembership } from '@/lib/auth/membership'
import { isActiveMember } from '@/lib/domain/authorization'
import { getBoard } from '@/lib/queries/board'
import { getBoardExportData } from '@/lib/queries/export'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ boardId: string }> }
) {
    const { boardId } = await params

    let userId: string
    try {
        userId = (await requireUser()).id
    } catch {
        return NextResponse.json(
            { error: 'Please log in again' },
            { status: 401 }
        )
    }

    const [board, membership] = await Promise.all([
        getBoard(boardId),
        getMembership(boardId, userId),
    ])
    if (!board || !isActiveMember(membership)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data = await getBoardExportData(boardId)
    const filename = `${board.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}-export.json`

    return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    })
}
