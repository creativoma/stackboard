import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    // Override default ignores of eslint-config-next.
    globalIgnores([
        // Default ignores of eslint-config-next:
        '.next/**',
        'out/**',
        'build/**',
        'next-env.d.ts',
        // website/ is a separate Vite project with its own lint toolchain
        // (oxlint, see website/package.json) — Next-specific rules like
        // no-img-element don't apply to it (no next/image there).
        'website/**',
    ]),
])

export default eslintConfig
