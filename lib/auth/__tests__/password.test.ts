import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../password'

describe('password hashing', () => {
    it('round-trips a correct password', async () => {
        const hash = await hashPassword('correct horse battery staple')
        expect(await verifyPassword('correct horse battery staple', hash)).toBe(
            true
        )
    })

    it('rejects an incorrect password', async () => {
        const hash = await hashPassword('correct horse battery staple')
        expect(await verifyPassword('wrong password', hash)).toBe(false)
    })

    it('produces a different hash each time due to a random salt', async () => {
        const a = await hashPassword('same-password')
        const b = await hashPassword('same-password')
        expect(a).not.toBe(b)
    })

    it('rejects a malformed stored hash instead of throwing', async () => {
        expect(await verifyPassword('anything', 'not-a-valid-hash')).toBe(false)
    })
})
