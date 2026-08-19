import 'server-only'
import type { ObjectStorage } from './adapter'
import { LocalDiskStorage } from './local'
import { S3Storage } from './s3'

let storage: ObjectStorage | null = null

/**
 * The app's configured object storage: S3-compatible (MinIO in production)
 * when S3_ENDPOINT is set, local disk otherwise. See adapter.ts.
 */
export function getStorage(): ObjectStorage {
    if (!storage) {
        storage = process.env.S3_ENDPOINT
            ? new S3Storage()
            : new LocalDiskStorage()
    }
    return storage
}
