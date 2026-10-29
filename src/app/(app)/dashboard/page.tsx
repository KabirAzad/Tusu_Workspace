import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardView } from '@/components/dashboard/DashboardView'
import type { Profile, Task, TaskUpdate } from '@/types/database'

export const metadata: Metadata = { title: 'Executive Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch current user full profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  if (!profile) redirect('/login')

  // 1. Fetch all tasks with assignee and creator
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select(
      '*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)'
    )
    .order('created_at', { ascending: false })

  if (tasksError) {
    console.error('Failed to load dashboard tasks:', tasksError.message)
  }

  // 2. Fetch all active members
  const { data: membersData, error: membersError } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (membersError) {
    console.error('Failed to load dashboard members:', membersError.message)
  }

  // 3. Fetch recent progress updates with task details
  const { data: updatesData, error: updatesError } = await supabase
    .from('task_updates')
    .select('*, user:profiles!task_updates_user_id_fkey(*), task:tasks(*)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (updatesError) {
    console.error('Failed to load task updates:', updatesError.message)
  }

  const initialTasks = (tasksData as unknown as Task[]) || []
  const initialMembers = (membersData as unknown as Profile[]) || []
  const initialUpdates =
    (updatesData as unknown as (TaskUpdate & { task?: Task })[]) || []

  return (
    <DashboardView
      initialTasks={initialTasks}
      initialMembers={initialMembers}
      initialUpdates={initialUpdates}
      currentUser={profile}
    />
  )
}
