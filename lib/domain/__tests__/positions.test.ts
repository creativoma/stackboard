import { describe, expect, it } from 'vitest'
import {
    clampIndex,
    moveBetweenLists,
    reorderWithinList,
    toPositionRows,
    nextPosition,
} from '../positions'

describe('reorderWithinList', () => {
    it('moves an item to a later index without duplicating it', () => {
        const result = reorderWithinList(['a', 'b', 'c'], 'a', 2)
        expect(result).toEqual(['b', 'c', 'a'])
    })

    it('moves an item to an earlier index', () => {
        const result = reorderWithinList(['a', 'b', 'c'], 'c', 0)
        expect(result).toEqual(['c', 'a', 'b'])
    })

    it('clamps an out-of-range destination index to the end of the list', () => {
        const result = reorderWithinList(['a', 'b', 'c'], 'a', 99)
        expect(result).toEqual(['b', 'c', 'a'])
    })

    it('inserts an id not previously in the list at the destination index', () => {
        const result = reorderWithinList(['a', 'b'], 'z', 0)
        expect(result).toEqual(['z', 'a', 'b'])
    })
})

describe('moveBetweenLists', () => {
    it('removes from source and inserts into dest at the given index, never duplicating the id', () => {
        const { source, dest } = moveBetweenLists(
            ['a', 'b'],
            ['c', 'd'],
            'a',
            1
        )
        expect(source).toEqual(['b'])
        expect(dest).toEqual(['c', 'a', 'd'])
        const allIds = [...source, ...dest]
        expect(new Set(allIds).size).toBe(allIds.length)
    })

    it('clamps destIndex beyond the destination length', () => {
        const { dest } = moveBetweenLists(['a'], ['b'], 'a', 50)
        expect(dest).toEqual(['b', 'a'])
    })
})

describe('clampIndex', () => {
    it('never returns a negative index', () => {
        expect(clampIndex(-5, 3)).toBe(0)
    })

    it('never exceeds the list length', () => {
        expect(clampIndex(10, 3)).toBe(3)
    })
})

describe('toPositionRows / nextPosition', () => {
    it('produces contiguous zero-based positions matching array order', () => {
        expect(toPositionRows(['x', 'y', 'z'])).toEqual([
            { id: 'x', position: 0 },
            { id: 'y', position: 1 },
            { id: 'z', position: 2 },
        ])
    })

    it('appends a new item after the existing count', () => {
        expect(nextPosition(4)).toBe(4)
        expect(nextPosition(0)).toBe(0)
    })
})
