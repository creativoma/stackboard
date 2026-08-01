const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function invitationExpiresAt(now: Date = new Date()): Date {
    return new Date(now.getTime() + INVITE_TTL_MS)
}

export function isInvitationUsable(
    invitation: {
        status: string
        expiresAt: Date
    },
    now: Date = new Date()
): boolean {
    return (
        invitation.status === 'pending' &&
        invitation.expiresAt.getTime() > now.getTime()
    )
}

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
