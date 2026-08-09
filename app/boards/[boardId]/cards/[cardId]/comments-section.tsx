'use client'

import { useActionState, useRef } from 'react'
import { addCommentAction } from '@/lib/actions/comments'
import { SubmitButton } from '@/app/(auth)/submit-button'
import { CommentBody } from '@/app/_components/comment-body'
import { MentionTextarea } from '@/app/_components/mention-textarea'
import type { MentionableMember } from '@/lib/domain/mentions'
import { formatDateTime } from '@/lib/format'

type Comment = {
    comment: { id: string; body: string; createdAt: Date }
    author: { id: string; name: string }
}

export function CommentsSection({
    boardId,
    cardId,
    comments,
    members,
}: {
    boardId: string
    cardId: string
    comments: Comment[]
    members: MentionableMember[]
}) {
    const boundAction = addCommentAction.bind(null, boardId, cardId)
    const [state, formAction] = useActionState(boundAction, undefined)
    const formRef = useRef<HTMLFormElement>(null)

    return (
        <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Comments</h2>
            <ul className="flex flex-col gap-3">
                {comments.map(({ comment, author }) => (
                    <li key={comment.id} className="card-surface p-3">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium">
                                {author.name}
                            </span>
                            <time
                                dateTime={comment.createdAt.toISOString()}
                                className="text-xs text-[var(--color-fog)]"
                            >
                                {formatDateTime(comment.createdAt)}
                            </time>
                        </div>
                        <CommentBody body={comment.body} members={members} />
                    </li>
                ))}
                {comments.length === 0 ? (
                    <p className="text-sm text-[var(--color-fog)]">
                        No comments yet.
                    </p>
                ) : null}
            </ul>

            <form
                ref={formRef}
                action={(formData) => {
                    formAction(formData)
                    formRef.current?.reset()
                }}
                className="flex flex-col gap-2"
            >
                <label htmlFor="body" className="sr-only">
                    Add a comment
                </label>
                <MentionTextarea
                    id="body"
                    name="body"
                    members={members}
                    maxLength={4000}
                    rows={3}
                    required
                    placeholder="Post an update… (@name to mention a member)"
                    className="input"
                />
                {state?.error ? (
                    <p
                        role="alert"
                        className="text-sm text-[var(--color-coral)]"
                    >
                        {state.error}
                    </p>
                ) : null}
                <SubmitButton pendingText="Posting…">Comment</SubmitButton>
            </form>
        </div>
    )
}
