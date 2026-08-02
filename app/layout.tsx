import type { Metadata, Viewport } from 'next'
import './globals.css'

const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

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
    themeColor: '#0079BF',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="h-full antialiased" suppressHydrationWarning>
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    )
}
