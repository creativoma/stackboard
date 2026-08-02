'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical } from 'lucide-react'
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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

type ColumnItem = { id: string; name: string }

function SortableColumnRow({ column }: { column: ColumnItem }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id })

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
            className="flex items-center gap-2 py-2 border-b border-[var(--color-mist)] last:border-0"
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab active:cursor-grabbing text-[var(--color-fog)] focus-visible:outline-2 focus-visible:outline-[var(--color-electric-blue)] rounded"
                aria-label={`Reorder ${column.name}`}
            >
                <GripVertical size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="text-sm font-medium">{column.name}</span>
        </li>
    )
}

export function ColumnOrderList({
    boardId,
    columns,
}: {
    boardId: string
    columns: ColumnItem[]
}) {
    const [items, setItems] = useState(columns)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        setItems(columns)
    }, [columns])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const from = items.findIndex((c) => c.id === active.id)
        const to = items.findIndex((c) => c.id === over.id)
        if (from === -1 || to === -1) return

        const reordered = [...items]
        const [moved] = reordered.splice(from, 1)
        reordered.splice(to, 0, moved)
        setItems(reordered)
        setError(null)

        reorderColumnsAction(boardId, String(active.id), to).then((result) => {
            if (result?.error) {
                setError(result.error)
                setItems(columns)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            {error ? (
                <p
                    role="alert"
                    className="text-xs text-[var(--color-coral)] mb-2"
                >
                    {error}
                </p>
            ) : null}
            <SortableContext
                items={items.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
            >
                <ul>
                    {items.map((column) => (
                        <SortableColumnRow key={column.id} column={column} />
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
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
