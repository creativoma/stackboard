import type { MembershipRole, MembershipStatus } from '@/db/schema'

export type MembershipLike =
    | {
          role: MembershipRole
          status: MembershipStatus
      }
    | null
    | undefined

/** Base gate for every board mutation: must be an active member. */
export function isActiveMember(
    membership: MembershipLike
): membership is { role: MembershipRole; status: 'active' } {
    return !!membership && membership.status === 'active'
}

export function isBoardOwner(membership: MembershipLike): boolean {
    return isActiveMember(membership) && membership.role === 'owner'
}

/**
 * Owners and members may create/edit/move/comment/checklist within a board.
 * Observers are active members (they can read everything) but never mutate.
 */
export function canMutateBoardContent(membership: MembershipLike): boolean {
    return isActiveMember(membership) && membership.role !== 'observer'
}

/** Only the owner may invite members, reorder/rename/close the board, or archive columns. */
export function canManageBoard(membership: MembershipLike): boolean {
    return isBoardOwner(membership)
}

/** Archiving/restoring cards follows the same rule as any content mutation. */
export function canArchiveCard(membership: MembershipLike): boolean {
    return canMutateBoardContent(membership)
}

/** Only the owner may permanently close a board — a terminal, irreversible action. */
export function canCloseBoard(membership: MembershipLike): boolean {
    return isBoardOwner(membership)
}
