'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, Settings } from 'lucide-react'
import { useUnreadCount } from './notifications-live'

/** Bell + settings, sitting beside the avatar the way most apps place them. */
export function HeaderActions() {
    const pathname = usePathname()
    const unread = useUnreadCount()

    return (
        <>
            <Link
                href="/boards/notifications"
                title="Notifications"
                aria-label={
                    unread > 0
                        ? `Notifications, ${unread} unread`
                        : 'Notifications'
                }
                aria-current={
                    pathname.startsWith('/boards/notifications')
                        ? 'page'
                        : undefined
                }
                className="header-icon"
            >
                <Bell size={17} strokeWidth={2} aria-hidden="true" />
                {unread > 0 ? (
                    <span
                        key={unread}
                        aria-hidden="true"
                        className="badge-pop tabular absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-[var(--radius-tags)] bg-(--color-coral) text-white text-[10px] font-semibold flex items-center justify-center"
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                ) : null}
            </Link>

            <Link
                href="/boards/account"
                title="Settings"
                aria-label="Settings"
                aria-current={
                    pathname.startsWith('/boards/account') ? 'page' : undefined
                }
                className="header-icon"
            >
                <Settings size={17} strokeWidth={2} aria-hidden="true" />
            </Link>
        </>
    )
}
