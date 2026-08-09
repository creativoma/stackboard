import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

export default async function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getCurrentUser()
    if (user) redirect('/boards')
    return <div className="flex-1 flex flex-col bg-snow">{children}</div>
}
