import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/app-url'

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: appUrl,
            changeFrequency: 'yearly',
            priority: 1,
        },
        {
            url: `${appUrl}/login`,
            changeFrequency: 'yearly',
            priority: 0.8,
        },
        {
            url: `${appUrl}/signup`,
            changeFrequency: 'yearly',
            priority: 0.8,
        },
    ]
}
