'use client'

import { useActionState, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip, Trash2 } from 'lucide-react'
import {
    addAttachmentAction,
    deleteAttachmentAction,
} from '@/lib/actions/attachments'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { Button } from '@/app/_components/button'
import { formatDate } from '@/lib/format'

type Attachment = {
    id: string
    filename: string
    sizeBytes: number
    uploaderId: string
    uploaderName: string
    createdAt: Date
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsSection({
    boardId,
    cardId,
    attachments,
    canEdit,
    currentUserId,
    isOwner,
}: {
    boardId: string
    cardId: string
    attachments: Attachment[]
    canEdit: boolean
    currentUserId: string
    isOwner: boolean
}) {
    const boundAction = addAttachmentAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const router = useRouter()

    async function handleDelete(attachmentId: string) {
        setDeleteError(null)
        const result = await deleteAttachmentAction(
            boardId,
            cardId,
            attachmentId
        )
        if (result?.error) setDeleteError(result.error)
        else router.refresh()
    }

    return (
        <div className="flex flex-col gap-3">
            <h2 className="eyebrow flex items-center gap-1.5">
                <Paperclip size={13} strokeWidth={2.5} aria-hidden="true" />
                Attachments
            </h2>

            {attachments.length === 0 ? (
                <p className="text-sm text-[var(--color-fog)]">
                    No attachments yet.
                </p>
            ) : (
                <ul className="flex flex-col gap-2">
                    {attachments.map((a) => (
                        <li
                            key={a.id}
                            className="elevated-surface flex items-center justify-between gap-3 p-3"
                        >
                            <div className="min-w-0">
                                <a
                                    href={`/boards/${boardId}/attachments/${a.id}`}
                                    className="block text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] truncate"
                                >
                                    {a.filename}
                                </a>
                                <p className="tabular text-xs text-[var(--color-fog)] truncate">
                                    {formatBytes(a.sizeBytes)} ·{' '}
                                    {a.uploaderName} ·{' '}
                                    {formatDate(a.createdAt.toISOString())}
                                </p>
                            </div>
                            {canEdit &&
                            (a.uploaderId === currentUserId || isOwner) ? (
                                <Button
                                    variant="icon"
                                    size="sm"
                                    onClick={() => handleDelete(a.id)}
                                    aria-label={`Delete attachment ${a.filename}`}
                                    title="Delete attachment"
                                >
                                    <Trash2
                                        size={14}
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    />
                                </Button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
            {deleteError ? (
                <p role="alert" className="text-sm text-[var(--color-coral)]">
                    {deleteError}
                </p>
            ) : null}

            {canEdit ? (
                <form
                    ref={formRef}
                    action={(formData) => {
                        formAction(formData)
                        formRef.current?.reset()
                    }}
                    className="flex items-center gap-2 flex-wrap"
                >
                    <label htmlFor="attachment-file" className="sr-only">
                        Attach a file
                    </label>
                    <input
                        id="attachment-file"
                        name="file"
                        type="file"
                        required
                        className="text-sm"
                    />
                    <SubmitButton pendingText="Uploading…">Attach</SubmitButton>
                    {state?.error ? (
                        <p
                            role="alert"
                            className="text-sm text-[var(--color-coral)] w-full"
                        >
                            {state.error}
                        </p>
                    ) : null}
                </form>
            ) : null}
        </div>
    )
}
