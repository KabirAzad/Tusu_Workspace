import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppProvider } from '@/contexts/AppContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { NotificationToaster } from '@/components/notifications/NotificationToaster'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { Profile } from '@/types/database'

export const dynamic = 'force-dynamic'

/**
 * Protected layout for all app pages.
 * Loads the current user's profile from Supabase and provides
 * it via AppContext and NotificationProvider to all child components.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = data as Profile | null

  if (!profile) {
    redirect('/login')
  }

  if (!profile.is_active) {
    const client = await createClient()
    await client.auth.signOut()
    redirect('/login?reason=deactivated')
  }

  return (
    <AppProvider profile={profile}>
      <NotificationProvider>
        <div className="flex h-screen bg-background overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
        <NotificationToaster />
      </NotificationProvider>
    </AppProvider>
  )
}

