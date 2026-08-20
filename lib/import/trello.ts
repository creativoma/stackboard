import { z } from 'zod'
import type { NormalizedImport } from './types'
import { coerceDueDate } from '@/lib/domain/due'

const trelloExportSchema = z
    .object({
        name: z.string().trim().min(1).max(100),
        lists: z.array(
            z
                .object({
                    id: z.string(),
                    name: z.string(),
                    closed: z.boolean().optional(),
                    pos: z.number(),
                })
                .passthrough()
        ),
        cards: z.array(
            z
                .object({
                    id: z.string(),
                    name: z.string(),
                    desc: z.string().optional(),
                    closed: z.boolean().optional(),
                    idList: z.string(),
                    idLabels: z.array(z.string()).optional(),
                    pos: z.number(),
                    due: z.string().nullable().optional(),
                })
                .passthrough()
        ),
        labels: z
            .array(
                z
                    .object({
                        id: z.string(),
                        name: z.string().optional(),
                        color: z.string().nullable().optional(),
                    })
                    .passthrough()
            )
            .optional(),
        checklists: z
            .array(
                z
                    .object({
                        id: z.string(),
                        idCard: z.string(),
                        pos: z.number(),
                        checkItems: z.array(
                            z
                                .object({
                                    name: z.string(),
                                    state: z.string(),
                                    pos: z.number(),
                                })
                                .passthrough()
                        ),
                    })
                    .passthrough()
            )
            .optional(),
        actions: z
            .array(
                z
                    .object({
                        type: z.string(),
                        date: z.string(),
                        data: z
                            .object({
                                text: z.string().optional(),
                                card: z.object({ id: z.string() }).optional(),
                            })
                            .passthrough()
                            .optional(),
                        memberCreator: z
                            .object({ fullName: z.string().optional() })
                            .passthrough()
                            .optional(),
                    })
                    .passthrough()
            )
            .optional(),
    })
    .passthrough()

export function parseTrelloExport(raw: unknown): NormalizedImport {
    const parsed = trelloExportSchema.safeParse(raw)
    if (!parsed.success) {
        throw new Error(
            "This doesn't look like a Trello board export (Menu → Print and Export → Export as JSON)."
        )
    }
    const trello = parsed.data

    const sortedLists = [...trello.lists].sort((a, b) => a.pos - b.pos)
    const listIndexById = new Map(sortedLists.map((l, i) => [l.id, i]))

    const labels = trello.labels ?? []
    const labelIndexById = new Map(labels.map((l, i) => [l.id, i]))

    const checklistItemsByCard = new Map<
        string,
        { text: string; done: boolean; checklistPos: number; itemPos: number }[]
    >()
    for (const checklist of trello.checklists ?? []) {
        const list = checklistItemsByCard.get(checklist.idCard) ?? []
        for (const item of checklist.checkItems) {
            list.push({
                text: item.name,
                done: item.state === 'complete',
                checklistPos: checklist.pos,
                itemPos: item.pos,
            })
        }
        checklistItemsByCard.set(checklist.idCard, list)
    }

    const commentsByCard = new Map<string, { body: string; date: string }[]>()
    for (const action of trello.actions ?? []) {
        if (action.type !== 'commentCard') continue
        const cardId = action.data?.card?.id
        const text = action.data?.text
        if (!cardId || !text) continue
        const author = action.memberCreator?.fullName ?? 'Trello user'
        const list = commentsByCard.get(cardId) ?? []
        list.push({
            body: `*Imported from Trello, originally by ${author}:*\n\n${text}`,
            date: action.date,
        })
        commentsByCard.set(cardId, list)
    }

    const cardsByList = new Map<string, typeof trello.cards>()
    for (const card of trello.cards) {
        const list = cardsByList.get(card.idList) ?? []
        list.push(card)
        cardsByList.set(card.idList, list)
    }

    const cards: NormalizedImport['cards'] = []
    for (const [idList, listCards] of cardsByList) {
        const columnIndex = listIndexById.get(idList)
        if (columnIndex === undefined) continue
        const sortedCards = [...listCards].sort((a, b) => a.pos - b.pos)
        sortedCards.forEach((card, position) => {
            const checklist = (checklistItemsByCard.get(card.id) ?? [])
                .sort(
                    (a, b) =>
                        a.checklistPos - b.checklistPos || a.itemPos - b.itemPos
                )
                .map((item) => ({ text: item.text, done: item.done }))

            const comments = (commentsByCard.get(card.id) ?? [])
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((c) => ({ body: c.body }))

            cards.push({
                columnIndex,
                position,
                title: card.name,
                description: card.desc ?? '',
                status: card.closed ? 'archived' : 'active',
                dueDate: coerceDueDate(card.due),
                labelIndexes: (card.idLabels ?? [])
                    .map((id) => labelIndexById.get(id))
                    .filter((i): i is number => i !== undefined),
                checklist,
                comments,
            })
        })
    }

    return {
        boardName: trello.name,
        columns: sortedLists.map((l) => ({
            name: l.name,
            status: l.closed ? 'archived' : 'active',
        })),
        labels: labels.map((l) => ({
            name: l.name?.trim() || l.color || 'Label',
            color: l.color ?? 'gray',
        })),
        cards,
    }
}
