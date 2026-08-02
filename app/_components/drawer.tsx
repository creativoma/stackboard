'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

type DrawerProps = {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
    const [rendered, setRendered] = useState(open)
    const overlayRef = useRef<HTMLDivElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) setRendered(true)
    }, [open])

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
                className="absolute inset-0 bg-[rgba(9,30,66,0.54)]"
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className="relative h-full w-full max-w-md bg-[var(--color-paper)] shadow-[var(--shadow-sheet)] p-6 overflow-y-auto outline-none"
            >
                {children}
            </div>
        </div>,
        document.body
    )
}
