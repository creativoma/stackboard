'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Globe } from 'lucide-react'
import {
    generatePublicLinkAction,
    revokePublicLinkAction,
} from '@/lib/actions/public-links'
import { Button } from '@/app/_components/button'

export function PublicLinkForm({
    boardId,
    url,
}: {
    boardId: string
    url: string | null
}) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const router = useRouter()

    async function handleGenerate() {
        setBusy(true)
        setError(null)
        const result = await generatePublicLinkAction(boardId)
        setBusy(false)
        if (result?.error) setError(result.error)
        else router.refresh()
    }

    async function handleRevoke() {
        if (
            !confirm(
                'Turn off the public link? The current link will stop working immediately.'
            )
        )
            return
        setBusy(true)
        setError(null)
        const result = await revokePublicLinkAction(boardId)
        setBusy(false)
        if (result?.error) setError(result.error)
        else router.refresh()
    }

    async function handleCopy() {
        if (!url) return
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }

    if (!url) {
        return (
            <div className="flex flex-col gap-2">
                <p className="text-sm text-[var(--color-smoke)]">
                    Off. Nobody can view this board without an account.
                </p>
                <Button
                    variant="secondary"
                    onClick={handleGenerate}
                    disabled={busy}
                    className="w-fit"
                >
                    <Globe size={14} strokeWidth={2} aria-hidden="true" />
                    Create public link
                </Button>
                {error ? (
                    <p
                        role="alert"
                        className="text-sm text-[var(--color-coral)]"
                    >
                        {error}
                    </p>
                ) : null}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--color-smoke)]">
                Anyone with this link can view the board, read-only — no account
                needed. Assignees, comments, and attachments aren&apos;t shown.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
                <input
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Public board link"
                    className="input flex-1 min-w-0"
                />
                <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="shrink-0"
                >
                    {copied ? (
                        <Check size={14} strokeWidth={2} aria-hidden="true" />
                    ) : (
                        <Copy size={14} strokeWidth={2} aria-hidden="true" />
                    )}
                    {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={busy}
                >
                    Regenerate
                </Button>
                <Button
                    variant="destructive"
                    onClick={handleRevoke}
                    disabled={busy}
                >
                    Turn off
                </Button>
            </div>
            {error ? (
                <p role="alert" className="text-sm text-[var(--color-coral)]">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
