import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DMView } from '@/components/dm/DMView'
import type { Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Direct Messages' }

interface MessagesPageProps {
  searchParams: Promise<{ userId?: string }>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch current user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  // Fetch active team members
  const { data: membersData } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  const members = (membersData as unknown as Profile[]) || []
  const resolvedSearchParams = await searchParams

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Direct Messages
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          1-to-1 private messaging, work updates, and check-ins.
        </p>
      </div>

      <DMView
        members={members}
        currentUser={profile}
        initialTargetUserId={resolvedSearchParams.userId}
      />
    </div>
  )
}
