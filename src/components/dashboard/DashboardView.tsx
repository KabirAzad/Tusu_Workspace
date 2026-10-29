'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Profile, Task, TaskStatus, TaskUpdate } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog'
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog'
import { RequestUpdateModal } from '@/components/dm/RequestUpdateModal'
import { AddMemberDialog } from '@/components/members/InviteMemberDialog'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Plus,
  Send,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Shield,
  ShieldAlert,
  User,
  Sparkles,
  Calendar,
  Activity,
  Layers,
} from 'lucide-react'

interface DashboardViewProps {
  initialTasks: Task[]
  initialMembers: Profile[]
  initialUpdates: (TaskUpdate & { task?: Task })[]
  currentUser: Profile
}

const ROLE_BADGES: Record<
  string,
  { label: string; class: string; icon: typeof Shield }
> = {
  admin: {
    label: 'Admin',
    class: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    icon: ShieldAlert,
  },
  manager: {
    label: 'Manager',
    class: 'bg-primary/10 text-primary border-primary/20',
    icon: Shield,
  },
  member: {
    label: 'Member',
    class: 'bg-secondary text-secondary-foreground border-border',
    icon: User,
  },
}

export function DashboardView({
  initialTasks,
  initialMembers,
  initialUpdates,
  currentUser,
}: DashboardViewProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [members, setMembers] = useState<Profile[]>(initialMembers)
  const [updates, setUpdates] = useState<(TaskUpdate & { task?: Task })[]>(
    initialUpdates
  )

  // Modals state
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [requestUpdateTarget, setRequestUpdateTarget] =
    useState<Profile | null>(null)
  const [requestUpdateOpen, setRequestUpdateOpen] = useState(false)

  // Real-time listener for tasks & updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('dashboard_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        async () => {
          // Refetch tasks
          const { data } = await supabase
            .from('tasks')
            .select(
              '*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)'
            )
            .order('created_at', { ascending: false })
          if (data) setTasks(data as unknown as Task[])
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_updates' },
        async (payload) => {
          const newUpdate = payload.new as TaskUpdate
          const { data } = await supabase
            .from('task_updates')
            .select(
              '*, user:profiles!task_updates_user_id_fkey(*), task:tasks(*)'
            )
            .eq('id', newUpdate.id)
            .single()
          if (data) {
            setUpdates((prev) => [
              data as TaskUpdate & { task?: Task },
              ...prev.slice(0, 14),
            ])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Metrics computation
  const now = new Date()
  const totalTasks = tasks.length
  const todoTasks = tasks.filter((t) => t.status === 'todo')
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'done' || !t.due_date) return false
    return new Date(t.due_date) < now
  })

  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0

  // High priority tasks needing attention
  const criticalTasks = tasks
    .filter(
      (t) =>
        t.status !== 'done' &&
        (t.priority === 'high' || (t.due_date && new Date(t.due_date) < now))
    )
    .slice(0, 5)

  // Workload per member
  const memberWorkload = members.map((m) => {
    const assigned = tasks.filter((t) => t.assignee_id === m.id)
    const inProg = assigned.filter((t) => t.status === 'in_progress').length
    const done = assigned.filter((t) => t.status === 'done').length
    const overdue = assigned.filter((t) => {
      if (t.status === 'done' || !t.due_date) return false
      return new Date(t.due_date) < now
    }).length

    return {
      profile: m,
      total: assigned.length,
      inProgress: inProg,
      done,
      overdue,
      completionRate:
        assigned.length > 0 ? Math.round((done / assigned.length) * 100) : 0,
    }
  })

  // Sort by highest workload first
  memberWorkload.sort((a, b) => b.total - a.total)

  // Current user's specific tasks and pending workload
  const myTasks = tasks.filter((t) => t.assignee_id === currentUser.id)
  const myPendingTasks = myTasks.filter((t) => t.status !== 'done')
  const myInProgressTasks = myTasks.filter((t) => t.status === 'in_progress')
  const myTodoTasks = myTasks.filter((t) => t.status === 'todo')
  const myDoneTasks = myTasks.filter((t) => t.status === 'done')

  const isAdmin = currentUser.role === 'admin'
  const isManagerOrAdmin = ['admin', 'manager'].includes(currentUser.role)

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const supabase = createClient()
    await (supabase.from('tasks') as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    if (selectedTask?.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null))
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    const supabase = createClient()
    await (supabase.from('tasks') as any).delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTask(null)
    setDetailOpen(false)
  }

  const handleEditTask = () => {
    router.push('/team-tasks')
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-zinc-900 border border-border/80 shadow-md shadow-primary/10 p-1.5 shrink-0 flex items-center justify-center">
            <Image
              src="/tusu.png"
              alt="TUSU Explore"
              width={56}
              height={56}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Workspace Active
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {currentUser.role}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {isAdmin ? 'Executive Admin Dashboard' : 'Team Workspace Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground">
              Welcome back, {currentUser.full_name || currentUser.email}. Here is
              your workspace summary and pending tasks overview.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isManagerOrAdmin && (
            <button
              onClick={() => setCreateTaskOpen(true)}
              id="dashboard-new-task-btn"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          )}

          {isAdmin && (
            <AddMemberDialog
              buttonLabel="Add Member"
              onSuccess={() => {
                router.refresh()
              }}
            />
          )}

          {isManagerOrAdmin && (
            <Link
              href="/team-tasks"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-all"
            >
              <Layers className="w-4 h-4" />
              Team Tasks
            </Link>
          )}

          <Link
            href="/tasks"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-all"
          >
            <CheckSquare className="w-4 h-4 text-amber-500" />
            <span>My Tasks</span>
            {myPendingTasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {myPendingTasks.length}
              </span>
            )}
          </Link>

          <Link
            href="/chat"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground border border-border hover:bg-accent transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Main Chat
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* My Pending Deliverables (Special Card for Current User) */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/35 bg-amber-500/[0.04] relative overflow-hidden group hover:border-amber-500/50 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              My Pending Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {myPendingTasks.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              for {currentUser.full_name?.split(' ')[0] || 'you'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              {myInProgressTasks.length} active · {myTodoTasks.length} to do
            </span>
            <Link
              href="/tasks"
              className="text-primary font-semibold hover:underline flex items-center gap-0.5"
            >
              Open <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="glass-card rounded-2xl p-5 border border-border/70 relative overflow-hidden group hover:border-primary/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Workspace Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {totalTasks}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              across {members.length} members
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-primary">
              {completionRate}% done
            </span>
          </div>
        </div>

        {/* In Progress */}
        <div className="glass-card rounded-2xl p-5 border border-border/70 relative overflow-hidden group hover:border-blue-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Active In Progress
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {inProgressTasks.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              tasks in flight
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span>Currently being executed</span>
          </p>
        </div>

        {/* Overdue Attention */}
        <div
          className={`glass-card rounded-2xl p-5 border relative overflow-hidden transition-all shadow-xs ${
            overdueTasks.length > 0
              ? 'border-rose-500/30 bg-rose-500/[0.03]'
              : 'border-border/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Overdue Tasks
            </span>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                overdueTasks.length > 0
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                overdueTasks.length > 0 ? 'text-rose-500' : 'text-foreground'
              }`}
            >
              {overdueTasks.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              past deadline
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            {overdueTasks.length > 0 ? (
              <span className="text-rose-500 font-medium">
                Requires manager follow-up
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">
                All deadlines on track
              </span>
            )}
          </p>
        </div>

        {/* Tasks Completed */}
        <div className="glass-card rounded-2xl p-5 border border-border/70 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Completed Tasks
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground tracking-tight">
              {doneTasks.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              marked done
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>{completionRate}% of all deliverables closed</span>
          </p>
        </div>
      </div>

      {/* Dedicated My Pending Tasks Section for Current User */}
      <div className="glass-card rounded-2xl border border-amber-500/25 shadow-xs overflow-hidden bg-card/60">
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <CheckSquare className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  My Pending Deliverables
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {myPendingTasks.length} pending
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deliverables assigned to you requiring attention or execution
              </p>
            </div>
          </div>

          <Link
            href="/tasks"
            className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 transition-all cursor-pointer"
          >
            <span>Open Full My Tasks View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-border/40">
          {myPendingTasks.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-foreground">
                You have no pending tasks!
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                All tasks assigned to you have been marked as done. Great work!
              </p>
            </div>
          ) : (
            myPendingTasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  setSelectedTask(task)
                  setDetailOpen(true)
                }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-accent/40 transition-colors cursor-pointer group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        task.status === 'in_progress'
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                      }`}
                    >
                      {task.status === 'in_progress' ? 'In Progress' : 'To Do'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        task.priority === 'high'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : task.priority === 'medium'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-zinc-500/10 text-muted-foreground border border-zinc-500/20'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {task.title}
                    </p>
                  </div>
                  {task.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details →
                  </span>
                </div>
              </div>
            ))
          )}
          {myPendingTasks.length > 5 && (
            <div className="p-3 bg-muted/20 text-center">
              <Link
                href="/tasks"
                className="text-xs font-semibold text-primary hover:underline"
              >
                + {myPendingTasks.length - 5} more pending tasks in My Tasks view
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Task Distribution & Status Proportions */}
      <div className="glass-card rounded-2xl p-6 border border-border/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Task Status Distribution
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live breakdown of all deliverables across statuses
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {totalTasks} total tasks
          </span>
        </div>

        {/* Visual Progress Stack */}
        <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden flex gap-0.5 p-0.5">
          {doneTasks.length > 0 && (
            <div
              className="h-full bg-emerald-500 rounded-sm transition-all"
              style={{
                width: `${(doneTasks.length / (totalTasks || 1)) * 100}%`,
              }}
              title={`Done: ${doneTasks.length}`}
            />
          )}
          {inProgressTasks.length > 0 && (
            <div
              className="h-full bg-blue-500 rounded-sm transition-all"
              style={{
                width: `${(inProgressTasks.length / (totalTasks || 1)) * 100}%`,
              }}
              title={`In Progress: ${inProgressTasks.length}`}
            />
          )}
          {todoTasks.length > 0 && (
            <div
              className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-sm transition-all"
              style={{
                width: `${(todoTasks.length / (totalTasks || 1)) * 100}%`,
              }}
              title={`To Do: ${todoTasks.length}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              Done:{' '}
              <strong className="text-foreground">{doneTasks.length}</strong> (
              {completionRate}%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              In Progress:{' '}
              <strong className="text-foreground">
                {inProgressTasks.length}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400 dark:bg-zinc-600 shrink-0" />
            <span className="text-xs text-muted-foreground">
              To Do:{' '}
              <strong className="text-foreground">{todoTasks.length}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
            <span className="text-xs text-muted-foreground">
              Overdue:{' '}
              <strong className="text-foreground">{overdueTasks.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Team Workload (Left) & Critical/Activity (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Team Workload Matrix */}
        <div className="lg:col-span-2 glass-card rounded-2xl border border-border/80 shadow-xs overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border/60 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Team Workload & Accountability
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Current tasks assigned per member with instant check-in actions
              </p>
            </div>
            <Link
              href="/members"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Manage Members <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/40 overflow-y-auto max-h-[460px]">
            {memberWorkload.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No active team members registered yet.
              </div>
            ) : (
              memberWorkload.map(({ profile, total, inProgress, done, overdue, completionRate }) => {
                const roleBadge =
                  ROLE_BADGES[profile.role] || ROLE_BADGES.member
                const RoleIcon = roleBadge.icon

                return (
                  <div
                    key={profile.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-accent/40 transition-colors"
                  >
                    {/* User Profile */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.full_name || profile.email}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20 shrink-0">
                          {getInitials(profile.full_name || profile.email)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {profile.full_name || 'Member'}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-medium border ${roleBadge.class}`}
                          >
                            <RoleIcon className="w-2.5 h-2.5" />
                            {roleBadge.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {profile.email}
                        </p>
                      </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="flex-1 max-w-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">
                          {done}/{total} Done ({completionRate}%)
                        </span>
                        <div className="flex items-center gap-2">
                          {inProgress > 0 && (
                            <span className="text-blue-500 font-medium">
                              {inProgress} active
                            </span>
                          )}
                          {overdue > 0 && (
                            <span className="text-rose-500 font-bold animate-pulse">
                              {overdue} overdue!
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setRequestUpdateTarget(profile)
                          setRequestUpdateOpen(true)
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Request task progress update"
                      >
                        <Send className="w-3 h-3" />
                        Request Update
                      </button>

                      <Link
                        href={`/messages?userId=${profile.id}`}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Direct Message"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Urgent Tasks & Recent Activity */}
        <div className="space-y-6">
          {/* Urgent / Overdue Tasks */}
          <div className="glass-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Critical & Overdue Attention
              </h3>
              <Link
                href="/team-tasks"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {criticalTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-1.5" />
                  No critical or overdue tasks pending.
                </div>
              ) : (
                criticalTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTask(t)
                      setDetailOpen(true)
                    }}
                    className="p-3 rounded-xl bg-card border border-border/60 hover:border-primary/40 cursor-pointer transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {t.title}
                      </p>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-rose-500/10 text-rose-500 border border-rose-500/20 shrink-0">
                        {t.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{t.assignee?.full_name || 'Unassigned'}</span>
                      {t.due_date && (
                        <span
                          className={`font-medium ${
                            new Date(t.due_date) < now
                              ? 'text-rose-500 font-bold'
                              : ''
                          }`}
                        >
                          Due {new Date(t.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Member Task Updates Stream */}
          <div className="glass-card rounded-2xl border border-border/80 shadow-xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary" />
              Recent Progress Updates
            </h3>

            <div className="space-y-2.5 max-h-64 overflow-y-auto divide-y divide-border/30">
              {updates.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No task updates posted yet.
                </div>
              ) : (
                updates.slice(0, 6).map((u) => (
                  <div key={u.id} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground truncate">
                        {u.user?.full_name || 'Teammate'}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(u.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {u.task && (
                      <p className="text-[11px] font-medium text-primary truncate">
                        Task: {u.task.title}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded-lg">
                      {u.note}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Creation Modal */}
      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        currentUser={currentUser}
        members={members}
        onSuccess={() => router.refresh()}
      />

      {/* Task Detail Modal */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        onDelete={handleDeleteTask}
        onEdit={handleEditTask}
      />

      {/* Request Work Update Modal */}
      <RequestUpdateModal
        open={requestUpdateOpen}
        onOpenChange={setRequestUpdateOpen}
        targetUser={requestUpdateTarget}
        onSuccess={(channelId) => {
          router.push('/messages')
        }}
      />
    </div>
  )
}
