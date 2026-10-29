import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/profile/ProfileForm'
import type { Metadata } from 'next'
import type { Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Update your name and avatar. Your role is set by your admin.
        </p>
      </div>

      <ProfileForm profile={profile as Profile} />
    </div>
  )
}
