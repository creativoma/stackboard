import 'server-only'

// The actual implementation lives in ./send, which has no `server-only`
// import so it can also be loaded by the standalone jobs worker script
// (db/jobs-worker.ts), which runs outside Next's server bundling context
// where `server-only` isn't resolvable.
export * from './send'
