'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/app/_components/button'
import { markNotificationReadAction } from '@/lib/actions/notifications'

export function MarkReadButton({ notificationId }: { notificationId: string }) {
    const [pending, startTransition] = useTransition()
    const router = useRouter()

    return (
        <Button
            variant="icon"
            size="sm"
            disabled={pending}
            aria-label="Mark as read"
            title="Mark as read"
            onClick={() =>
                startTransition(async () => {
                    await markNotificationReadAction(notificationId)
                    router.refresh()
                })
            }
        >
            <Check size={14} strokeWidth={2} aria-hidden="true" />
        </Button>
    )
}
