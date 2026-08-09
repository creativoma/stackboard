import { createReadStream } from 'node:fs'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import type { ObjectStorage } from './adapter'

/**
 * Local-disk ObjectStorage under UPLOAD_DIR (default ./var/uploads,
 * gitignored). Suitable for dev and single-host deployments; swap for an
 * S3-compatible adapter to scale out.
 */
export class LocalDiskStorage implements ObjectStorage {
    private readonly root: string

    constructor(root = process.env.UPLOAD_DIR ?? './var/uploads') {
        this.root = resolve(root)
    }

    /** Resolve a key inside the root, refusing anything that escapes it. */
    private pathFor(key: string): string {
        const full = resolve(join(this.root, normalize(key)))
        if (full !== this.root && !full.startsWith(this.root + sep)) {
            throw new Error(`Invalid storage key: ${key}`)
        }
        return full
    }

    async put(key: string, data: Uint8Array): Promise<void> {
        const path = this.pathFor(key)
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, data)
    }

    async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
        const path = this.pathFor(key)
        try {
            await stat(path)
        } catch {
            return null
        }
        return Readable.toWeb(
            createReadStream(path)
        ) as ReadableStream<Uint8Array>
    }

    async delete(key: string): Promise<void> {
        await rm(this.pathFor(key), { force: true })
    }
}
