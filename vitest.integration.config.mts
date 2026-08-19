import { defineConfig } from 'vitest/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// __dirname isn't available in an ESM config file (this is .mts so it's
// always loaded as a module, regardless of the package's CommonJS default).
const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/integration/**/*.test.ts'],
        testTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': path.resolve(dirname, '.'),
            'server-only': path.resolve(dirname, 'test/stubs/server-only.ts'),
        },
    },
})
