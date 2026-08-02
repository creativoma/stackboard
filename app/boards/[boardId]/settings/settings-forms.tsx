'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp } from 'lucide-react'
import {
    renameBoardAction,
    closeBoardAction,
    type SettingsActionState,
} from '@/lib/actions/boards'
import { reorderColumnsAction } from '@/lib/actions/columns'
import {
    inviteMemberAction,
    revokeInvitationAction,
    removeMemberAction,
    type InviteActionState,
} from '@/lib/actions/invitations'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { Button } from '@/app/_components/button'

export function RenameBoardForm({
    boardId,
    name,
}: {
    boardId: string
    name: string
}) {
    const boundAction = renameBoardAction.bind(null, boardId)
    const [state, formAction] = useActionState(boundAction, undefined)

    return (
        <form action={formAction} className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className="text-sm font-medium">
                    Board name
                </label>
                <input
                    id="name"
                    name="name"
                    defaultValue={name}
                    maxLength={100}
                    required
                    className="input w-[280px]"
                />
            </div>
            <SubmitButton pendingText="Saving…">Save</SubmitButton>
            {state?.error ? (
                <p
                    role="alert"
                    className="text-sm text-[var(--color-coral)] w-full"
                >
                    {state.error}
                </p>
            ) : null}
        </form>
    )
}

export function InviteMemberForm({ boardId }: { boardId: string }) {
    const boundAction = inviteMemberAction.bind(null, boardId)
    const [state, formAction] = useActionState(boundAction, undefined)

    return (
        <form action={formAction} className="flex items-end gap-2 flex-wrap">
            <div className="flex flex-col gap-1.5">
                <label htmlFor="invite-email" className="text-sm font-medium">
                    Invite by email
                </label>
                <input
                    id="invite-email"
                    name="email"
                    type="email"
                    required
                    maxLength={200}
                    className="input w-[280px]"
                    placeholder="teammate@example.com"
                />
            </div>
            <SubmitButton pendingText="Sending…">Send invite</SubmitButton>
            {state?.error ? (
                <p
                    role="alert"
                    className="text-sm text-[var(--color-coral)] w-full"
                >
                    {state.error}
                </p>
            ) : null}
            {state?.ok ? (
                <p
                    role="status"
                    className="text-sm text-[var(--color-leaf)] w-full"
                >
                    Invitation sent.
                </p>
            ) : null}
        </form>
    )
}

export function RevokeInvitationButton({
    boardId,
    invitationId,
}: {
    boardId: string
    invitationId: string
}) {
    const [state, setState] = useState<InviteActionState>(undefined)
    const [busy, setBusy] = useState(false)
    const router = useRouter()

    async function handleClick() {
        setBusy(true)
        const result = await revokeInvitationAction(boardId, invitationId)
        setState(result)
        setBusy(false)
        if (!result?.error) router.refresh()
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                variant="destructive"
                size="sm"
                onClick={handleClick}
                disabled={busy}
            >
                Revoke
            </Button>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </div>
    )
}

export function RemoveMemberButton({
    boardId,
    userId,
    userName,
}: {
    boardId: string
    userId: string
    userName: string
}) {
    const [state, setState] = useState<InviteActionState>(undefined)
    const [busy, setBusy] = useState(false)
    const router = useRouter()

    async function handleClick() {
        if (
            !confirm(
                `Remove ${userName} from this board? They will lose access immediately.`
            )
        )
            return
        setBusy(true)
        const result = await removeMemberAction(boardId, userId)
        setState(result)
        setBusy(false)
        if (!result?.error) router.refresh()
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <Button
                variant="destructive"
                size="sm"
                onClick={handleClick}
                disabled={busy}
            >
                Remove
            </Button>
            {state?.error ? (
                <p role="alert" className="text-xs text-[var(--color-coral)]">
                    {state.error}
                </p>
            ) : null}
        </div>
    )
}

export function ColumnOrderRow({
    boardId,
    columnId,
    name,
    index,
    count,
}: {
    boardId: string
    columnId: string
    name: string
    index: number
    count: number
}) {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    async function move(destIndex: number) {
        setBusy(true)
        const result = await reorderColumnsAction(boardId, columnId, destIndex)
        if (result?.error) setError(result.error)
        else router.refresh()
        setBusy(false)
    }

    return (
        <li className="flex items-center justify-between py-2 border-b border-[var(--color-mist)] last:border-0">
            <span className="text-sm font-medium">{name}</span>
            <div className="flex items-center gap-1">
                {error ? (
                    <span className="text-xs text-[var(--color-coral)]">
                        {error}
                    </span>
                ) : null}
                <Button
                    variant="icon"
                    size="sm"
                    disabled={busy || index === 0}
                    onClick={() => move(index - 1)}
                    aria-label={`Move ${name} earlier`}
                >
                    <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
                <Button
                    variant="icon"
                    size="sm"
                    disabled={busy || index === count - 1}
                    onClick={() => move(index + 1)}
                    aria-label={`Move ${name} later`}
                >
                    <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
                </Button>
            </div>
        </li>
    )
}

export function CloseBoardButton({ boardId }: { boardId: string }) {
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function handleClick() {
        if (!confirm('Permanently close this board? This cannot be undone.'))
            return
        setBusy(true)
        const result: SettingsActionState = await closeBoardAction(boardId)
        if (result?.error) {
            setError(result.error)
            setBusy(false)
        }
    }

    return (
        <div>
            <Button variant="destructive" onClick={handleClick} disabled={busy}>
                Close this board permanently
            </Button>
            {error ? (
                <p
                    role="alert"
                    className="text-sm text-[var(--color-coral)] mt-2"
                >
                    {error}
                </p>
            ) : null}
        </div>
    )
}
