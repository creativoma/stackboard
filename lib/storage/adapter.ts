/**
 * Object-storage contract for attachments (per the working agreement in
 * README Security decisions: server-only adapter, bytes never flow through
 * client-writable paths). Keys are server-generated (`boardId/attachmentId`)
 * and never contain user input.
 *
 * lib/storage/index.ts picks between the S3-compatible implementation
 * (lib/storage/s3.ts, MinIO in production) and local disk
 * (lib/storage/local.ts, the dev/no-S3-configured fallback) without callers
 * knowing which one they got.
 */
export interface ObjectStorage {
    put(key: string, data: Uint8Array): Promise<void>
    /** Returns null when the object does not exist. */
    getStream(key: string): Promise<ReadableStream<Uint8Array> | null>
    delete(key: string): Promise<void>
}
