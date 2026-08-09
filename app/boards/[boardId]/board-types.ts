export type CardSummary = {
    id: string
    boardId: string
    columnId: string
    title: string
    description: string
    assigneeId: string | null
    dueDate: string | null // ISO
    priority: string | null
    position: number
    labelIds: string[]
    checklist: { total: number; done: number }
}

export type ColumnSummary = {
    id: string
    boardId: string
    name: string
    position: number
    wipLimit: number | null
}

export type MemberSummary = {
    id: string
    name: string
    email: string
    role?: string
    joinedAt?: Date
}
export type LabelSummary = { id: string; name: string; color: string }
