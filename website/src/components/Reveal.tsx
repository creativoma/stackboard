import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Reveal({
    children,
    delay = 0,
    className = '',
    as: Tag = 'div',
}: {
    children: ReactNode
    delay?: number
    className?: string
    as?: 'div' | 'li'
}) {
    const ref = useRef<HTMLDivElement & HTMLLIElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const node = ref.current
        if (!node) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    observer.disconnect()
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        )
        observer.observe(node)
        return () => observer.disconnect()
    }, [])

    return (
        <Tag
            ref={ref}
            className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
            style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
        >
            {children}
        </Tag>
    )
}
