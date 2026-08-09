import type { NormalizedImport } from './types'
import { coerceDueDate } from '@/lib/domain/due'

const CSV_HEADER = [
    'Type',
    'Name',
    'Status',
    'Color',
    'Column',
    'Labels',
    'Description',
    'DueDate',
    'Checklist',
    'Comments',
] as const

type BoardExportData = {
    board: { name: string }
    columns: { name: string; status: 'active' | 'archived' }[]
    labels: { name: string; color: string }[]
    cards: {
        columnIndex: number
        title: string
        description: string
        status: 'active' | 'archived'
        dueDate: string | null
        labelIndexes: number[]
        checklist: { text: string; done: boolean }[]
        comments: { body: string }[]
    }[]
}

function csvEscape(value: string): string {
    if (/[",\n\r]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function toCsvLine(fields: string[]): string {
    return fields.map(csvEscape).join(',')
}

// One row per board/column/label/card, discriminated by the "Type" column,
// so the file stays a single flat table (importable in any spreadsheet app)
// while still round-tripping through parseCsvImport below. Checklist items
// and comments are joined with newlines inside their (quoted) cell, since
// CSV natively supports embedded newlines in quoted fields.
export function boardExportToCsv(data: BoardExportData): string {
    const lines = [toCsvLine([...CSV_HEADER])]

    lines.push(
        toCsvLine(['board', data.board.name, '', '', '', '', '', '', '', ''])
    )

    for (const column of data.columns) {
        lines.push(
            toCsvLine([
                'column',
                column.name,
                column.status,
                '',
                '',
                '',
                '',
                '',
                '',
                '',
            ])
        )
    }

    for (const label of data.labels) {
        lines.push(
            toCsvLine([
                'label',
                label.name,
                '',
                label.color,
                '',
                '',
                '',
                '',
                '',
                '',
            ])
        )
    }

    for (const card of data.cards) {
        const column = data.columns[card.columnIndex]
        const labelNames = card.labelIndexes
            .map((i) => data.labels[i]?.name)
            .filter((name): name is string => Boolean(name))
        const checklist = card.checklist
            .map((item) => (item.done ? `${item.text} (done)` : item.text))
            .join('\n')
        const comments = card.comments.map((c) => c.body).join('\n')

        lines.push(
            toCsvLine([
                'card',
                card.title,
                card.status,
                '',
                column?.name ?? '',
                labelNames.join('; '),
                card.description,
                card.dueDate ?? '',
                checklist,
                comments,
            ])
        )
    }

    return lines.join('\r\n')
}

function parseCsvText(text: string): string[][] {
    const rows: string[][] = []
    let row: string[] = []
    let field = ''
    let inQuotes = false
    let i = 0

    while (i < text.length) {
        const char = text[i]

        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"'
                    i += 2
                    continue
                }
                inQuotes = false
                i++
                continue
            }
            field += char
            i++
            continue
        }

        if (char === '"') {
            inQuotes = true
            i++
            continue
        }
        if (char === ',') {
            row.push(field)
            field = ''
            i++
            continue
        }
        if (char === '\r') {
            i++
            continue
        }
        if (char === '\n') {
            row.push(field)
            rows.push(row)
            row = []
            field = ''
            i++
            continue
        }
        field += char
        i++
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field)
        rows.push(row)
    }
    return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

export function parseCsvImport(text: string): NormalizedImport {
    const rows = parseCsvText(text)
    if (rows.length === 0) throw new Error('This CSV file is empty.')

    const [header, ...dataRows] = rows
    const col = (name: (typeof CSV_HEADER)[number]) => header.indexOf(name)
    const typeIdx = col('Type')
    const nameIdx = col('Name')
    if (typeIdx === -1 || nameIdx === -1) {
        throw new Error('This does not look like a stackboard CSV export.')
    }
    const statusIdx = col('Status')
    const colorIdx = col('Color')
    const columnIdx = col('Column')
    const labelsIdx = col('Labels')
    const descriptionIdx = col('Description')
    const dueDateIdx = col('DueDate')
    const checklistIdx = col('Checklist')
    const commentsIdx = col('Comments')

    let boardName = 'Imported board'
    const columns: NormalizedImport['columns'] = []
    const labels: NormalizedImport['labels'] = []
    const tooLong = (value: string, max: number, field: string) => {
        if (value.length > max) {
            throw new Error(`${field} is too long (max ${max} characters).`)
        }
    }
    const rawCards: {
        columnName: string
        title: string
        status: 'active' | 'archived'
        labelNames: string[]
        description: string
        dueDate: string
        checklist: string
        comments: string
    }[] = []

    for (const row of dataRows) {
        const type = row[typeIdx]?.trim()
        if (type === 'board') {
            boardName = row[nameIdx]?.trim() || boardName
            tooLong(boardName, 100, 'Board name')
        } else if (type === 'column') {
            const name = row[nameIdx]?.trim() ?? ''
            tooLong(name, 60, 'Column name')
            columns.push({
                name,
                status:
                    row[statusIdx]?.trim() === 'archived'
                        ? 'archived'
                        : 'active',
            })
        } else if (type === 'label') {
            const name = row[nameIdx]?.trim() ?? ''
            tooLong(name, 60, 'Label name')
            labels.push({
                name,
                color: row[colorIdx]?.trim() || 'gray',
            })
        } else if (type === 'card') {
            const title = row[nameIdx]?.trim() ?? ''
            tooLong(title, 200, 'Card title')
            rawCards.push({
                columnName: row[columnIdx]?.trim() ?? '',
                title,
                status:
                    row[statusIdx]?.trim() === 'archived'
                        ? 'archived'
                        : 'active',
                labelNames: (row[labelsIdx] ?? '')
                    .split(';')
                    .map((s) => s.trim())
                    .filter(Boolean),
                description: row[descriptionIdx] ?? '',
                dueDate: row[dueDateIdx]?.trim() ?? '',
                checklist: row[checklistIdx] ?? '',
                comments: row[commentsIdx] ?? '',
            })
        }
    }

    if (columns.length === 0) {
        throw new Error('This CSV file has no columns to import.')
    }

    const columnIndexByName = new Map(columns.map((c, i) => [c.name, i]))
    const labelIndexByName = new Map(labels.map((l, i) => [l.name, i]))
    const positionByColumn = new Map<number, number>()

    const cards: NormalizedImport['cards'] = []
    for (const raw of rawCards) {
        const columnIndex = columnIndexByName.get(raw.columnName)
        if (columnIndex === undefined || !raw.title) continue
        const position = positionByColumn.get(columnIndex) ?? 0
        positionByColumn.set(columnIndex, position + 1)

        const checklist = raw.checklist
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => ({
                text: line.replace(/\s*\(done\)\s*$/, ''),
                done: /\(done\)\s*$/.test(line),
            }))

        const comments = raw.comments
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((body) => ({ body }))

        cards.push({
            columnIndex,
            position,
            title: raw.title,
            description: raw.description,
            status: raw.status,
            dueDate: coerceDueDate(raw.dueDate),
            labelIndexes: raw.labelNames
                .map((name) => labelIndexByName.get(name))
                .filter((i): i is number => i !== undefined),
            checklist,
            comments,
        })
    }

    return { boardName, columns, labels, cards }
}
