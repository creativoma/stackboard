/**
 * Object-storage contract for attachments (per the working agreement in
 * README Security decisions: server-only adapter, bytes never flow through
 * client-writable paths). Keys are server-generated (`boardId/attachmentId`)
 * and never contain user input.
 *
 * The default implementation is local disk (lib/storage/local.ts). An
 * S3-compatible backend with short-lived signed URLs can implement this
 * same interface later without touching callers.
 */
export interface ObjectStorage {
    put(key: string, data: Uint8Array): Promise<void>
    /** Returns null when the object does not exist. */
    getStream(key: string): Promise<ReadableStream<Uint8Array> | null>
    delete(key: string): Promise<void>
}
