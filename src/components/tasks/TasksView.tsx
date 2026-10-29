'use client'

import { useMemo, useState } from 'react'
import type { Profile, Task, TaskStatus } from '@/types/database'
import { TaskFilters, type FilterStatus } from './TaskFilters'
import { TaskKanban } from './TaskKanban'
import { TaskList } from './TaskList'
import { CreateTaskDialog } from './CreateTaskDialog'
import { TaskDetailDialog } from './TaskDetailDialog'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface TasksViewProps {
  initialTasks: Task[]
  currentUser: Profile
  members: Profile[]
  mode: 'my-tasks' | 'team-tasks'
}

export function TasksView({
  initialTasks,
  currentUser,
  members,
  mode,
}: TasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isManagerOrAdmin =
    currentUser.role === 'admin' || currentUser.role === 'manager'

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search by title or description
      if (search) {
        const q = search.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(q)
        const matchesDesc = task.description?.toLowerCase().includes(q)
        if (!matchesTitle && !matchesDesc) return false
      }

      // Status filter
      if (statusFilter === 'overdue') {
        const isOverdue =
          task.due_date &&
          task.status !== 'done' &&
          new Date(task.due_date).setHours(23, 59, 59, 999) < Date.now()
        if (!isOverdue) return false
      } else if (statusFilter !== 'all') {
        if (task.status !== statusFilter) return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false
      }

      // Assignee filter
      if (assigneeFilter === 'unassigned') {
        if (task.assignee_id !== null) return false
      } else if (assigneeFilter !== 'all') {
        if (task.assignee_id !== assigneeFilter) return false
      }

      return true
    })
  }, [tasks, search, statusFilter, priorityFilter, assigneeFilter])

  // Status change handler (optimistic)
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const previousTasks = [...tasks]

    // Optimistically update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    setSelectedTask((prev) =>
      prev && prev.id === taskId ? { ...prev, status: newStatus } : prev
    )

    const supabase = createClient()
    const { error } = await (supabase.from('tasks') as any)
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      console.error('Failed to update task status:', error.message)
      // Revert on error
      setTasks(previousTasks)
      setSelectedTask((prev) =>
        prev && prev.id === taskId ? previousTasks.find((t) => t.id === taskId) || null : prev
      )
    }
  }

  // Create or update task success handler
  const handleTaskSaved = (savedTask: Task) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === savedTask.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = savedTask
        return copy
      } else {
        return [savedTask, ...prev]
      }
    })
    setSelectedTask((prev) =>
      prev && prev.id === savedTask.id ? savedTask : prev
    )
    setEditingTask(null)
  }

  // Delete task handler
  const confirmDelete = async () => {
    if (!deleteTaskId) return
    setDeleting(true)

    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', deleteTaskId)

    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId))
      if (selectedTask?.id === deleteTaskId) {
        setSelectedTask(null)
        setDetailOpen(false)
      }
      setDeleteTaskId(null)
    } else {
      console.error('Failed to delete task:', error.message)
    }
    setDeleting(false)
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task)
    setDetailOpen(true)
  }

  const handleNewTaskWithStatus = (presetStatus?: TaskStatus) => {
    setEditingTask(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <TaskFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        priority={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assignee={assigneeFilter}
        onAssigneeChange={setAssigneeFilter}
        members={mode === 'team-tasks' ? members : []}
        view={view}
        onViewChange={setView}
        onNewTask={() => handleNewTaskWithStatus()}
        taskCount={filteredTasks.length}
      />

      {/* Main Task View (Kanban or List) */}
      {view === 'kanban' ? (
        <TaskKanban
          tasks={filteredTasks}
          currentUserId={currentUser.id}
          canEdit={true}
          canDelete={isManagerOrAdmin}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTaskId(id)}
          onSelect={handleSelectTask}
          onNewTaskWithStatus={handleNewTaskWithStatus}
        />
      ) : (
        <TaskList
          tasks={filteredTasks}
          currentUserId={currentUser.id}
          canEdit={true}
          canDelete={isManagerOrAdmin}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteTaskId(id)}
          onSelect={handleSelectTask}
        />
      )}

      {/* Task Detail Dialog (Phase 3) */}
      <TaskDetailDialog
        task={selectedTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onDelete={(id) => setDeleteTaskId(id)}
      />

      {/* Create / Edit Dialog */}
      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
        currentUser={currentUser}
        members={members}
        editingTask={editingTask}
        onSuccess={handleTaskSaved}
      />

      {/* Delete Confirmation Modal */}
      {deleteTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card rounded-2xl w-full max-w-sm p-6 relative shadow-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              Delete Task?
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              This action cannot be undone. All comments and progress updates on this task will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                disabled={deleting}
                onClick={() => setDeleteTaskId(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
