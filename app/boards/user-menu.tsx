'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, FileText, LogOut, Sparkles, UserRound } from 'lucide-react'
import { logoutAction } from '../(auth)/actions'

const itemClass =
    'flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-[var(--color-ink-secondary)] hover:bg-[var(--color-sunken)] hover:text-[var(--color-ink)] transition-colors'

export function UserMenu({ name, email }: { name: string; email: string }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function onPointerDown(e: MouseEvent) {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Account menu"
                className="w-8 h-8 rounded-full bg-[var(--color-electric-blue-tint)] text-[var(--color-electric-blue)] text-[12px] font-semibold flex items-center justify-center hover:ring-2 hover:ring-[var(--color-mist)] transition-shadow"
            >
                {name.slice(0, 1).toUpperCase()}
            </button>

            {open ? (
                <div
                    role="menu"
                    className="menu-pop absolute right-0 top-full mt-2 w-60 elevated-surface shadow-[var(--shadow-dragging)] overflow-hidden z-20"
                >
                    <div className="px-3 py-2.5 border-b border-[var(--color-mist)]">
                        <p className="text-[13px] font-medium text-[var(--color-ink)] truncate">
                            {name}
                        </p>
                        <p className="text-xs text-[var(--color-fog)] truncate">
                            {email}
                        </p>
                    </div>
                    <div className="py-1" role="none">
                        <Link
                            href="/boards/account"
                            role="menuitem"
                            className={itemClass}
                            onClick={() => setOpen(false)}
                        >
                            <UserRound size={15} strokeWidth={2} />
                            Account
                        </Link>
                        <Link
                            href="/boards/notifications"
                            role="menuitem"
                            className={itemClass}
                            onClick={() => setOpen(false)}
                        >
                            <Bell size={15} strokeWidth={2} />
                            Notifications
                        </Link>
                        <Link
                            href="/boards/changelog"
                            role="menuitem"
                            className={itemClass}
                            onClick={() => setOpen(false)}
                        >
                            <Sparkles size={15} strokeWidth={2} />
                            What&apos;s new
                        </Link>
                        <Link
                            href="/privacy"
                            role="menuitem"
                            className={itemClass}
                            onClick={() => setOpen(false)}
                        >
                            <FileText size={15} strokeWidth={2} />
                            Privacy
                        </Link>
                    </div>
                    <form
                        action={logoutAction}
                        className="py-1 border-t border-[var(--color-mist)]"
                    >
                        <button
                            type="submit"
                            role="menuitem"
                            className={itemClass}
                        >
                            <LogOut size={15} strokeWidth={2} />
                            Log out
                        </button>
                    </form>
                </div>
            ) : null}
        </div>
    )
}
