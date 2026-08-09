'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

type DrawerProps = {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
}

export function Drawer({
    open,
    onClose,
    title,
    description,
    children,
}: DrawerProps) {
    const [rendered, setRendered] = useState(open)
    const overlayRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    // Mount on open and stay mounted until the close animation finishes.
    // Adjusted while rendering, so the panel exists on the very first frame.
    if (open && !rendered) setRendered(true)

    useEffect(() => {
        if (!rendered) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [rendered, onClose])

    useGSAP(
        () => {
            const panel = panelRef.current
            const backdrop = backdropRef.current
            if (!rendered || !panel || !backdrop) return

            if (open) {
                gsap.set(panel, { xPercent: 100 })
                gsap.set(backdrop, { opacity: 0 })
                panel.focus()
                gsap.to(backdrop, {
                    opacity: 1,
                    duration: 0.25,
                    ease: 'power2.out',
                })
                gsap.to(panel, {
                    xPercent: 0,
                    duration: 0.4,
                    ease: 'power3.out',
                })
            } else {
                gsap.to(backdrop, {
                    opacity: 0,
                    duration: 0.2,
                    ease: 'power2.in',
                })
                gsap.to(panel, {
                    xPercent: 100,
                    duration: 0.3,
                    ease: 'power2.in',
                    onComplete: () => setRendered(false),
                })
            }
        },
        { dependencies: [open, rendered], scope: overlayRef }
    )

    if (!rendered) return null

    return createPortal(
        <div ref={overlayRef} className="fixed inset-0 z-50 flex justify-end">
            <div
                ref={backdropRef}
                className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="relative h-full w-full max-w-md flex flex-col bg-[var(--color-paper)] sm:rounded-l-[var(--radius-sheet)] shadow-[var(--shadow-sheet)] outline-none"
            >
                <header className="flex items-start justify-between gap-3 shrink-0 px-5 py-4 border-b border-[var(--color-mist)]">
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-medium tracking-[-0.1px] text-[var(--color-ink)]">
                            {title}
                        </h2>
                        {description ? (
                            <p className="text-[13px] text-[var(--color-smoke)] mt-0.5">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="btn-icon shrink-0 -mr-1.5 -mt-1"
                    >
                        <X size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                </header>
                <div className="flex-1 min-h-0 overflow-y-auto p-5">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    )
}
