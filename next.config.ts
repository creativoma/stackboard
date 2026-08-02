import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    experimental: {
        useTypeScriptCli: true,
        serverActions: {
            bodySizeLimit: '25mb',
        },
    },
}

export default nextConfig
