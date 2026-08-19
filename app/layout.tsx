import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { appUrl } from '@/lib/app-url'

// Inter is the brand's open-source SF Pro Display substitute (DESIGN.md,
// Typography).
const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
})

export const metadata: Metadata = {
    metadataBase: new URL(appUrl),
    title: {
        default: 'Stackboard',
        template: '%s · Stackboard',
    },
    description:
        "A focused shared board for one team's work, from idea to done.",
    keywords: [
        'Stackboard',
        'kanban board',
        'project management',
        'team collaboration',
        'Trello alternative',
    ],
    openGraph: {
        title: 'Stackboard',
        description:
            "A focused shared board for one team's work, from idea to done.",
        url: appUrl,
        siteName: 'Stackboard',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Stackboard',
        description:
            "A focused shared board for one team's work, from idea to done.",
    },
}

export const viewport: Viewport = {
    themeColor: '#1868db',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            className={`h-full antialiased ${inter.variable}`}
            suppressHydrationWarning
        >
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    )
}
