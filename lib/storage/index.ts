import 'server-only'
import type { ObjectStorage } from './adapter'
import { LocalDiskStorage } from './local'

let storage: ObjectStorage | null = null

/** The app's configured object storage. Local disk today; see adapter.ts. */
export function getStorage(): ObjectStorage {
    if (!storage) storage = new LocalDiskStorage()
    return storage
}
