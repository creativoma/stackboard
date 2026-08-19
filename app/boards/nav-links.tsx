'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, LayoutGrid, Search, UserSquare2 } from 'lucide-react'
import { useUnreadCount } from './notifications-live'

const LINKS = [
    { href: '/boards', label: 'Boards', icon: LayoutGrid, exact: true },
    {
        href: '/boards/my-cards',
        label: 'My cards',
        icon: UserSquare2,
        exact: false,
    },
    { href: '/boards/search', label: 'Search', icon: Search, exact: false },
    {
        href: '/boards/notifications',
        label: 'Notifications',
        icon: Bell,
        exact: false,
    },
] as const

export function NavLinks() {
    const pathname = usePathname()
    const unreadCount = useUnreadCount()

    return (
        <nav aria-label="Main" className="px-2 flex flex-col gap-0.5">
            {LINKS.map(({ href, label, icon: Icon, exact }) => {
                const active = exact
                    ? pathname === href
                    : pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded-buttons px-3 py-2 text-sm font-medium transition-colors ${
                            active
                                ? 'text-electric-blue bg-(--color-electric-blue-tint)'
                                : 'text-smoke hover:text-ink hover:bg-snow'
                        }`}
                    >
                        <Icon
                            size={17}
                            strokeWidth={2}
                            className="shrink-0"
                            aria-hidden="true"
                        />
                        {label}
                        {label === 'Notifications' && unreadCount > 0 ? (
                            <span
                                key={unreadCount}
                                className="badge-pop tabular ml-auto text-[10px] font-semibold text-white bg-(--color-coral-solid) rounded-[var(--radius-tags)] min-w-[18px] h-[18px] px-1 flex items-center justify-center"
                                aria-label={`${unreadCount} unread`}
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        ) : null}
                    </Link>
                )
            })}
        </nav>
    )
}
