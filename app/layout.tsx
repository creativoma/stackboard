import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: {
        default: 'Stackboard',
        template: '%s · Stackboard',
    },
    description:
        "A focused shared board for one team's work, from idea to done.",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className="h-full antialiased">
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    )
}
