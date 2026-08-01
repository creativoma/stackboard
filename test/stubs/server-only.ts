// Test stub for the "server-only" import guard, which normally throws when
// bundled into client code. Under Vitest we run plain Node, not a bundler,
// so this no-op is safe and lets server-only modules be unit tested.
export {}
