import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/app-url'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/login', '/signup'],
            disallow: ['/boards', '/invite'],
        },
        sitemap: `${appUrl}/sitemap.xml`,
    }
}
