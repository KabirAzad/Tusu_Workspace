import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TasksView } from '@/components/tasks/TasksView'
import type { Profile, Task } from '@/types/database'

export const metadata: Metadata = { title: 'My Tasks' }

export default async function TasksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  // Fetch tasks for current user:
  // - tasks assigned to the user
  // - OR tasks created by the user where is_personal = true
  const { data: tasksData, error } = await supabase
    .from('tasks')
    .select(
      '*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)'
    )
    .or(`assignee_id.eq.${user.id},and(created_by.eq.${user.id},is_personal.eq.true)`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error.message)
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
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          My Tasks
        </h1>
        <p className="text-muted-foreground text-xs mt-1">
          Manage your personal tasks and items assigned to you.
        </p>
      </div>

      <TasksView
        initialTasks={tasks}
        currentUser={profile}
        members={members}
        mode="my-tasks"
      />
    </div>
  )
}
