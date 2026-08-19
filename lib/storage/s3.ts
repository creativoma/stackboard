import { Readable } from 'node:stream'
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import type { ObjectStorage } from './adapter'

/**
 * S3-compatible ObjectStorage (MinIO in production; any S3-compatible
 * endpoint works). Configured via S3_ENDPOINT/S3_BUCKET/S3_REGION/
 * S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY — see lib/storage/index.ts for the
 * local-disk fallback when these are unset.
 */
export class S3Storage implements ObjectStorage {
    private readonly client: S3Client
    private readonly bucket: string

    constructor() {
        const endpoint = process.env.S3_ENDPOINT
        const bucket = process.env.S3_BUCKET
        if (!endpoint || !bucket) {
            throw new Error('S3_ENDPOINT and S3_BUCKET must be set')
        }
        this.bucket = bucket
        this.client = new S3Client({
            endpoint,
            region: process.env.S3_REGION ?? 'us-east-1',
            // Required for MinIO's path-style bucket addressing
            // (https://bucket.host/key would otherwise be assumed).
            forcePathStyle: true,
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
            },
        })
    }

    async put(key: string, data: Uint8Array): Promise<void> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: data,
            })
        )
    }

    async getStream(key: string): Promise<ReadableStream<Uint8Array> | null> {
        try {
            const result = await this.client.send(
                new GetObjectCommand({ Bucket: this.bucket, Key: key })
            )
            const body = result.Body as Readable
            return Readable.toWeb(body) as ReadableStream<Uint8Array>
        } catch (err) {
            if (
                err instanceof Error &&
                (err.name === 'NoSuchKey' || err.name === 'NotFound')
            ) {
                return null
            }
            throw err
        }
    }

    async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
        )
    }
}
