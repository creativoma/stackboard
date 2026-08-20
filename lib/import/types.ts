type NormalizedImportColumn = {
    name: string
    status: 'active' | 'archived'
}

type NormalizedImportLabel = {
    name: string
    color: string
}

type NormalizedImportCard = {
    columnIndex: number
    position: number
    title: string
    description: string
    status: 'active' | 'archived'
    dueDate: Date | null
    labelIndexes: number[]
    checklist: { text: string; done: boolean }[]
    comments: { body: string }[]
}

export type NormalizedImport = {
    boardName: string
    columns: NormalizedImportColumn[]
    labels: NormalizedImportLabel[]
    cards: NormalizedImportCard[]
}
