'use client'

import { useFormStatus } from 'react-dom'
import { Button } from '../_components/button'

export function SubmitButton({
    children,
    pendingText,
}: {
    children: React.ReactNode
    pendingText: string
}) {
    const { pending } = useFormStatus()
    return (
        <Button
            type="submit"
            className="justify-center w-full"
            disabled={pending}
            aria-busy={pending}
        >
            {pending ? pendingText : children}
        </Button>
    )
}
