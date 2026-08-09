'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '../_components/button'

export function SubmitButton({
    children,
    pendingText,
    className,
}: {
    children: React.ReactNode
    pendingText: string
    className?: string
}) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            className={className}
            disabled={pending}
            aria-busy={pending}
        >
            {pending ? pendingText : children}
        </Button>
    )
}
