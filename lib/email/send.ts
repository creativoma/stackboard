import { Resend } from 'resend'

export type SendEmailInput = {
    to: string
    subject: string
    html: string
    text: string
}

export class EmailDeliveryError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown
    ) {
        super(message)
        this.name = 'EmailDeliveryError'
    }
}

const TIMEOUT_MS = 8000

/**
 * Sends via Resend when RESEND_API_KEY is configured. Otherwise falls back to
 * a deterministic local "fake" that logs the message — this is the
 * development path and keeps the invite flow usable without any credentials.
 */
export async function sendEmail(
    input: SendEmailInput
): Promise<{ id: string }> {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM ?? 'Stackboard <onboarding@resend.dev>'

    if (!apiKey) {
        console.log(
            `[email:dev-fake] to=${input.to} subject="${input.subject}"\n${input.text}`
        )
        return { id: `dev-fake-${Date.now()}` }
    }

    const resend = new Resend(apiKey)

    let timeoutHandle: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new EmailDeliveryError('Email provider timed out')),
            TIMEOUT_MS
        )
    })

    try {
        const result = await Promise.race([
            resend.emails.send({
                from,
                to: input.to,
                subject: input.subject,
                html: input.html,
                text: input.text,
            }),
            timeoutPromise,
        ])
        if (result.error) {
            throw new EmailDeliveryError(
                `Resend rejected the message: ${result.error.message}`,
                result.error
            )
        }
        return { id: result.data?.id ?? 'unknown' }
    } catch (err) {
        if (err instanceof EmailDeliveryError) throw err
        throw new EmailDeliveryError('Failed to send email', err)
    } finally {
        clearTimeout(timeoutHandle!)
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function notificationEmailContent(params: {
    title: string
    boardName: string
    cardUrl: string
}) {
    const safeTitle = escapeHtml(params.title)
    const safeBoardName = escapeHtml(params.boardName)
    const safeUrl = escapeHtml(params.cardUrl)
    return {
        subject: `${params.title} — ${params.boardName}`,
        text: `${params.title}\n\nBoard: ${params.boardName}\nOpen the card: ${params.cardUrl}`,
        html: `<p>${safeTitle}</p><p>Board: <strong>${safeBoardName}</strong></p><p><a href="${safeUrl}">Open the card</a></p>`,
    }
}

export function inviteEmailContent(params: {
    boardName: string
    inviterName: string
    acceptUrl: string
}) {
    const { boardName, inviterName, acceptUrl } = params
    const safeBoardName = escapeHtml(boardName)
    const safeInviterName = escapeHtml(inviterName)
    const safeUrl = escapeHtml(acceptUrl)
    return {
        subject: `${inviterName} invited you to "${boardName}" on Stackboard`,
        text: `${inviterName} invited you to join the board "${boardName}" on Stackboard.\n\nAccept the invite: ${acceptUrl}\n\nThis link expires in 7 days.`,
        html: `<p>${safeInviterName} invited you to join the board <strong>${safeBoardName}</strong> on Stackboard.</p><p><a href="${safeUrl}">Accept the invite</a></p><p>This link expires in 7 days.</p>`,
    }
}
