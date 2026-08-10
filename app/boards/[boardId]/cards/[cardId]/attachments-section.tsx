'use client'

import { useActionState, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Paperclip, Trash2, X } from 'lucide-react'
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
    mimeType: string
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
    const [previewId, setPreviewId] = useState<string | null>(null)
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
                    {attachments.map((a) => {
                        const url = `/boards/${boardId}/attachments/${a.id}`
                        const isImage = a.mimeType.startsWith('image/')
                        const isPdf = a.mimeType === 'application/pdf'
                        const previewable = isImage || isPdf
                        const isOpen = previewId === a.id

                        return (
                            <li
                                key={a.id}
                                className="elevated-surface overflow-hidden"
                            >
                                <div className="flex items-center justify-between gap-3 p-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button
                                            type="button"
                                            disabled={!previewable}
                                            onClick={() =>
                                                setPreviewId(
                                                    isOpen ? null : a.id
                                                )
                                            }
                                            aria-label={
                                                previewable
                                                    ? `${isOpen ? 'Hide' : 'Show'} preview of ${a.filename}`
                                                    : undefined
                                            }
                                            aria-expanded={
                                                previewable ? isOpen : undefined
                                            }
                                            className={`shrink-0 rounded-[var(--radius-inputs)] border border-[var(--color-mist)] overflow-hidden ${previewable ? 'cursor-pointer hover:border-[var(--color-electric-blue)] transition-colors' : 'cursor-default'}`}
                                        >
                                            {isImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={url}
                                                    alt=""
                                                    className="w-10 h-10 object-cover"
                                                />
                                            ) : (
                                                <span
                                                    className={`w-10 h-10 flex items-center justify-center ${isPdf ? 'text-[var(--color-coral)]' : 'text-[var(--color-fog)]'} bg-[var(--color-sunken)]`}
                                                >
                                                    {isPdf ? (
                                                        <FileText
                                                            size={16}
                                                            strokeWidth={2}
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Paperclip
                                                            size={16}
                                                            strokeWidth={2}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </span>
                                            )}
                                        </button>
                                        <div className="min-w-0">
                                            <a
                                                href={url}
                                                className="block text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-electric-blue)] truncate"
                                            >
                                                {a.filename}
                                            </a>
                                            <p className="tabular text-xs text-[var(--color-fog)] truncate">
                                                {formatBytes(a.sizeBytes)} ·{' '}
                                                {a.uploaderName} ·{' '}
                                                {formatDate(
                                                    a.createdAt.toISOString()
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {previewable ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setPreviewId(
                                                        isOpen ? null : a.id
                                                    )
                                                }
                                            >
                                                {isOpen ? 'Hide' : 'Preview'}
                                            </Button>
                                        ) : null}
                                        {canEdit &&
                                        (a.uploaderId === currentUserId ||
                                            isOwner) ? (
                                            <Button
                                                variant="icon"
                                                size="sm"
                                                onClick={() =>
                                                    handleDelete(a.id)
                                                }
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
                                    </div>
                                </div>

                                {isOpen ? (
                                    <div className="relative border-t border-[var(--color-mist)] bg-[var(--color-snow)] p-2">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewId(null)}
                                            aria-label="Close preview"
                                            title="Close preview"
                                            className="absolute top-3.5 right-3.5 z-10 w-6 h-6 rounded-[var(--radius-inputs)] bg-[var(--color-paper)] border border-[var(--color-mist)] flex items-center justify-center text-[var(--color-smoke)] hover:text-[var(--color-ink)] transition-colors"
                                        >
                                            <X
                                                size={13}
                                                strokeWidth={2}
                                                aria-hidden="true"
                                            />
                                        </button>
                                        {isImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={url}
                                                alt={a.filename}
                                                className="w-full max-h-[480px] object-contain rounded-[var(--radius-inputs)]"
                                            />
                                        ) : (
                                            <iframe
                                                src={url}
                                                title={a.filename}
                                                className="w-full h-[480px] rounded-[var(--radius-inputs)] border border-[var(--color-mist)] bg-[var(--color-paper)]"
                                            />
                                        )}
                                    </div>
                                ) : null}
                            </li>
                        )
                    })}
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
