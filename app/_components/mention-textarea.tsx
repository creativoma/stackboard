'use client'

import { useId, useRef, useState, type ComponentPropsWithoutRef } from 'react'
import {
    mentionToken,
    searchMentionables,
    type MentionableMember,
} from '@/lib/domain/mentions'

/**
 * The `@…` token being typed, anchored to the caret. Same shape as
 * MENTION_PATTERN but allows an empty token so the list opens on a bare `@`.
 */
const ACTIVE_MENTION = /(?<![\w.@-])@([\w.-]{0,30})$/

/**
 * Textarea with @mention autocomplete. Stays uncontrolled — insertions write
 * through the ref — so `form.reset()` still clears it after a submit.
 */
export function MentionTextarea({
    members,
    className,
    ...rest
}: { members: MentionableMember[] } & ComponentPropsWithoutRef<'textarea'>) {
    const ref = useRef<HTMLTextAreaElement>(null)
    const [matches, setMatches] = useState<MentionableMember[]>([])
    const [active, setActive] = useState(0)
    const tokenStart = useRef(0)
    const listId = useId()

    const close = () => setMatches([])

    function sync() {
        const el = ref.current
        if (!el) return
        const caret = el.selectionStart ?? 0
        const found = ACTIVE_MENTION.exec(el.value.slice(0, caret))
        if (!found) return close()
        tokenStart.current = caret - found[0].length
        setMatches(searchMentionables(found[1], members))
        setActive(0)
    }

    function insert(member: MentionableMember) {
        const el = ref.current
        if (!el) return
        const caret = el.selectionStart ?? 0
        const token = `@${mentionToken(member)} `
        el.value =
            el.value.slice(0, tokenStart.current) +
            token +
            el.value.slice(caret)
        const pos = tokenStart.current + token.length
        el.setSelectionRange(pos, pos)
        close()
        el.focus()
    }

    function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (!matches.length) return
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((i) => (i + 1) % matches.length)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((i) => (i - 1 + matches.length) % matches.length)
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            insert(matches[active])
        } else if (event.key === 'Escape') {
            event.preventDefault()
            close()
        }
    }

    return (
        <div className="relative">
            <textarea
                {...rest}
                ref={ref}
                className={className}
                onChange={sync}
                onClick={sync}
                onKeyUp={(e) => {
                    if (e.key.startsWith('Arrow') || e.key === 'Home') sync()
                }}
                onKeyDown={onKeyDown}
                onBlur={close}
                role="combobox"
                aria-expanded={matches.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                    matches.length ? `${listId}-${active}` : undefined
                }
            />

            {matches.length > 0 ? (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Board members"
                    className="menu-pop absolute left-0 bottom-full mb-1 z-20 w-full max-w-[260px] elevated-surface shadow-[var(--shadow-dragging)] overflow-hidden py-1"
                >
                    {matches.map((member, index) => (
                        <li key={member.id}>
                            <button
                                type="button"
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === active}
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseEnter={() => setActive(index)}
                                onClick={() => insert(member)}
                                className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-[13px] transition-colors ${
                                    index === active
                                        ? 'bg-[var(--color-sunken)] text-[var(--color-ink)]'
                                        : 'text-[var(--color-ink-secondary)]'
                                }`}
                            >
                                <span className="font-medium truncate">
                                    {member.name}
                                </span>
                                <span className="text-xs text-[var(--color-fog)] truncate">
                                    @{mentionToken(member)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    )
}
