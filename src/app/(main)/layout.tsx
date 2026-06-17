import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { MainNav } from '@/components/ui/MainNav'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/sign-in')

  return (
    <div className="min-h-screen flex flex-col">
      <MainNav user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
