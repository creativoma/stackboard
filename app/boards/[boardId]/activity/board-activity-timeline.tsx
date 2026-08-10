import Link from 'next/link'
import {
    Archive,
    ArrowRightLeft,
    CheckSquare,
    Columns3,
    Gauge,
    Globe,
    Link2,
    Link2Off,
    LayoutGrid,
    MessageSquare,
    Paperclip,
    Pencil,
    Plus,
    RotateCcw,
    Tag,
    UserPlus,
    type LucideIcon,
} from 'lucide-react'
import { describeActivity, type ActivityType } from '@/lib/domain/activity'
import { formatDateTime } from '@/lib/format'

type BoardActivityRow = {
    event: {
        id: string
        type: string
        field: string | null
        oldValue: string | null
        newValue: string | null
        createdAt: Date
        cardId: string | null
    }
    actor: { name: string }
    cardTitle: string | null
}

const EVENT_ICONS: Record<ActivityType, LucideIcon> = {
    'board.created': LayoutGrid,
    'board.member_invited': UserPlus,
    'board.member_joined': UserPlus,
    'board.closed': Archive,
    'board.public_link_enabled': Globe,
    'board.public_link_disabled': Globe,
    'column.created': Columns3,
    'column.archived': Archive,
    'column.restored': RotateCcw,
    'column.wip_limit_changed': Gauge,
    'label.created': Tag,
    'label.updated': Tag,
    'label.deleted': Tag,
    'card.created': Plus,
    'card.moved': ArrowRightLeft,
    'card.field_changed': Pencil,
    'card.archived': Archive,
    'card.restored': RotateCcw,
    'card.attachment_added': Paperclip,
    'card.attachment_removed': Paperclip,
    'checklist.item_added': CheckSquare,
    'checklist.item_toggled': CheckSquare,
    'comment.added': MessageSquare,
    'card.dependency_added': Link2,
    'card.dependency_removed': Link2Off,
}

export function BoardActivityTimeline({
    boardId,
    activity,
}: {
    boardId: string
    activity: BoardActivityRow[]
}) {
    if (activity.length === 0) {
        return (
            <div className="card-surface text-center py-12">
                <p className="text-[var(--color-smoke)]">
                    No activity yet. Every move, edit, and comment on this board
                    will show up here.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-[var(--color-paper)] border border-[var(--color-mist)] rounded-[var(--radius-largecards)] overflow-hidden">
            <ul className="divide-y divide-[var(--color-mist)]">
                {activity.map(({ event, actor, cardTitle }) => {
                    const Icon = EVENT_ICONS[event.type as ActivityType]
                    return (
                        <li
                            key={event.id}
                            className="flex items-start gap-3 px-4 py-3"
                        >
                            <span
                                className="w-7 h-7 rounded-[var(--radius-inputs)] flex items-center justify-center shrink-0 bg-[var(--color-sunken)] text-[var(--color-smoke)]"
                                aria-hidden="true"
                            >
                                {Icon ? (
                                    <Icon size={13} strokeWidth={2.25} />
                                ) : null}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm leading-normal">
                                    <strong className="font-medium">
                                        {actor.name}
                                    </strong>{' '}
                                    {describeActivity(event)}
                                    {event.cardId && cardTitle ? (
                                        <>
                                            {' '}
                                            on{' '}
                                            <Link
                                                href={`/boards/${boardId}/cards/${event.cardId}`}
                                                className="font-medium text-[var(--color-electric-blue)] hover:underline"
                                            >
                                                {cardTitle}
                                            </Link>
                                        </>
                                    ) : null}
                                </p>
                                <p className="tabular text-xs text-[var(--color-fog)] mt-0.5">
                                    {formatDateTime(event.createdAt)}
                                </p>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
