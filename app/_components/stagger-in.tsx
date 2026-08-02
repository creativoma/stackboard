'use client'

import { useRef, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

gsap.registerPlugin(useGSAP)

export function StaggerIn({
    children,
    className,
    as: Tag = 'div',
}: {
    children: ReactNode
    className?: string
    as?: 'div' | 'ul'
}) {
    const ref = useRef<HTMLDivElement & HTMLUListElement>(null)

    useGSAP(
        () => {
            if (!ref.current) return
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                return
            const items = ref.current.children
            if (items.length === 0) return
            // Opacity-only: a y-offset here can be left mid-tween by fast
            // navigation or Strict Mode's double effect invocation, which
            // freezes each card at a different residual transform and
            // misaligns the grid. Opacity has no such failure mode.
            gsap.from(items, {
                opacity: 0,
                duration: 0.35,
                stagger: 0.05,
                ease: 'power1.out',
                clearProps: 'opacity',
            })
        },
        { scope: ref }
    )

    return (
        <Tag ref={ref} className={className}>
            {children}
        </Tag>
    )
}
