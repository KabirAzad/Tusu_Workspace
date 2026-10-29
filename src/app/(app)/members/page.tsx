import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddMemberDialog } from '@/components/members/InviteMemberDialog'
import { MembersTable } from '@/components/members/MembersTable'
import type { Metadata } from 'next'
import type { Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Members' }

export default async function MembersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only admins can view this page
  const { data: currentData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const currentProfile = currentData as Pick<Profile, 'role'> | null

  if (currentProfile?.role !== 'admin') {
    redirect('/tasks')
  }

  // Load all members
  const { data: membersData } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  const members = (membersData as Profile[]) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Members</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage team members, roles and access.
          </p>
        </div>
        <AddMemberDialog
          buttonLabel="Add Member"
          triggerClassName="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 shadow-sm shadow-primary/25 transition-all cursor-pointer"
        />
      </div>

      {/* Members list */}
      <MembersTable members={members} />
    </div>
  )
}
