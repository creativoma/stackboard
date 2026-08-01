import { describeActivity } from '@/lib/domain/activity'
import { formatDateTime } from '@/lib/format'

type ActivityRow = {
    event: {
        id: string
        type: string
        field: string | null
        oldValue: string | null
        newValue: string | null
        createdAt: Date
    }
    actor: { name: string }
}

export function ActivityTimeline({ activity }: { activity: ActivityRow[] }) {
    if (activity.length === 0) {
        return (
            <p className="text-sm text-[var(--color-fog)]">No activity yet.</p>
        )
    }

    return (
        <ol className="flex flex-col gap-2">
            {activity.map(({ event, actor }) => (
                <li key={event.id} className="text-sm flex gap-2">
                    <span className="text-[var(--color-fog)] shrink-0">
                        {formatDateTime(event.createdAt)}
                    </span>
                    <span>
                        <strong className="font-medium">{actor.name}</strong>{' '}
                        {describeActivity(event)}
                    </span>
                </li>
            ))}
        </ol>
    )
}
