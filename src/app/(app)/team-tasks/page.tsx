import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { TasksView } from '@/components/tasks/TasksView'
import type { Profile, Task } from '@/types/database'

export const metadata: Metadata = { title: 'Team Tasks' }

export default async function TeamTasksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  // Members cannot view team tasks page
  if (profile.role === 'member') {
    redirect('/tasks')
  }

  // Fetch all team tasks (non-personal)
  const { data: tasksData, error } = await supabase
    .from('tasks')
    .select(
      '*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)'
    )
    .eq('is_personal', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching team tasks:', error.message)
  }

  // Fetch active team members
  const { data: membersData } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  const tasks = (tasksData as unknown as Task[]) || []
  const members = (membersData as unknown as Profile[]) || []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Team Tasks
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Complete workspace task overview for Admins and Managers.
        </p>
      </div>

      <TasksView
        initialTasks={tasks}
        currentUser={profile}
        members={members}
        mode="team-tasks"
      />
    </div>
  )
}
