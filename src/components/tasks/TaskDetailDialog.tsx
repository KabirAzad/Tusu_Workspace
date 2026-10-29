'use client'

import { useEffect, useState } from 'react'
import type { Task, TaskPriority, TaskStatus, Profile, TaskUpdate } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Circle,
  X,
  Pencil,
  Trash2,
  Lock,
  Send,
  MessageSquare,
  Loader2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: Profile
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  high: {
    label: 'High Priority',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dotClass: 'bg-rose-500',
  },
  medium: {
    label: 'Medium Priority',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  low: {
    label: 'Low Priority',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
}

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  currentUser,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskDetailDialogProps) {
  const [updates, setUpdates] = useState<TaskUpdate[]>([])
  const [loadingUpdates, setLoadingUpdates] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)

  const isManagerOrAdmin =
    currentUser.role === 'admin' || currentUser.role === 'manager'

  // Fetch progress updates for this task
  useEffect(() => {
    if (!task || !open) {
      setUpdates([])
      return
    }

    let isMounted = true

    async function fetchTaskUpdates() {
      setLoadingUpdates(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('task_updates')
        .select('*, user:profiles!task_updates_user_id_fkey(*)')
        .eq('task_id', task!.id)
        .order('created_at', { ascending: true })

      if (isMounted) {
        if (!error && data) {
          setUpdates(data as unknown as TaskUpdate[])
        } else {
          console.error('Failed to load task updates:', error?.message)
        }
        setLoadingUpdates(false)
      }
    }

    fetchTaskUpdates()

    return () => {
      isMounted = false
    }
  }, [task, open])

  if (!open || !task) return null

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date).setHours(23, 59, 59, 999) < Date.now()

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setChangingStatus(true)
    try {
      await onStatusChange(task.id, newStatus)
    } finally {
      setChangingStatus(false)
    }
  }

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSubmittingNote(true)
    setNoteError(null)

    const supabase = createClient()
    const payload = {
      task_id: task.id,
      user_id: currentUser.id,
      note: newNote.trim(),
    }

    const { data, error } = await (supabase.from('task_updates') as any)
      .insert(payload)
      .select('*, user:profiles!task_updates_user_id_fkey(*)')
      .single()

    if (error) {
      console.error('Failed to post progress update:', error.message)
      setNoteError(error.message)
    } else if (data) {
      setUpdates((prev) => [...prev, data as unknown as TaskUpdate])
      setNewNote('')
    }

    setSubmittingNote(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative shadow-2xl bg-card border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div className="space-y-1 pr-6 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {/* Priority badge */}
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium inline-flex items-center gap-1.5 ${priority.badgeClass}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
                {priority.label}
              </span>

              {/* Personal badge */}
              {task.is_personal && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1 border border-border">
                  <Lock className="w-3 h-3" />
                  Personal Task
                </span>
              )}

              {/* Due date badge */}
              {task.due_date && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 font-medium ${
                    isOverdue
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 overdue-pulse'
                      : 'bg-secondary/60 text-muted-foreground border-border'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Due {task.due_date} {isOverdue ? '(Overdue)' : ''}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onOpenChange(false)
                onEdit(task)
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Edit Task"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => {
                  onOpenChange(false)
                  onDelete(task.id)
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-secondary/30 border border-border/60 text-xs">
            {/* Status */}
            <div>
              <span className="text-muted-foreground block mb-1">Status</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground capitalize">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Assignee */}
            <div>
              <span className="text-muted-foreground block mb-1">Assignee</span>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                {task.assignee ? (
                  <>
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                      {(task.assignee.full_name || task.assignee.email)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="truncate">
                      {task.assignee.id === currentUser.id
                        ? 'You'
                        : task.assignee.full_name || task.assignee.email}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>

            {/* Created By */}
            <div>
              <span className="text-muted-foreground block mb-1">Created By</span>
              <span className="font-medium text-foreground truncate block">
                {task.creator
                  ? task.creator.id === currentUser.id
                    ? 'You'
                    : task.creator.full_name || task.creator.email
                  : 'System'}
              </span>
            </div>
          </div>

          {/* Quick Status Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Move to:</span>
            {task.status !== 'todo' && (
              <button
                disabled={changingStatus}
                onClick={() => handleStatusChange('todo')}
                className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-1.5 border border-border transition-colors font-medium"
              >
                <Circle className="w-3.5 h-3.5" />
                To Do
              </button>
            )}

            {task.status !== 'in_progress' && (
              <button
                disabled={changingStatus}
                onClick={() => handleStatusChange('in_progress')}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1.5 border border-primary/20 transition-colors font-medium"
              >
                <Clock className="w-3.5 h-3.5" />
                In Progress
              </button>
            )}

            {task.status !== 'done' && (
              <button
                disabled={changingStatus}
                onClick={() => handleStatusChange('done')}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20 transition-colors font-medium"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Completed
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Description
            </h3>
            {task.description ? (
              <p className="text-sm text-foreground bg-secondary/20 p-4 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                {task.description}
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground/60">
                No description provided for this task.
              </p>
            )}
          </div>

          {/* Activity & Progress Updates Timeline */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Progress Updates & Comments ({updates.length})
              </h3>
            </div>

            {/* Updates list */}
            <div className="space-y-3 mb-4">
              {loadingUpdates ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading progress updates...
                </div>
              ) : updates.length === 0 ? (
                <div className="p-4 rounded-xl bg-secondary/20 border border-dashed border-border/60 text-center text-xs text-muted-foreground">
                  No progress updates posted yet. Write an update below to log work done.
                </div>
              ) : (
                updates.map((update) => (
                  <div
                    key={update.id}
                    className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                          {(update.user?.full_name || update.user?.email || 'U')
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span>
                          {update.user_id === currentUser.id
                            ? 'You'
                            : update.user?.full_name || update.user?.email}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(update.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 whitespace-pre-wrap pl-6 leading-relaxed">
                      {update.note}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Note Composer */}
            <form onSubmit={handlePostNote} className="space-y-2">
              {noteError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{noteError}</span>
                </div>
              )}
              <div className="relative">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Post a progress note (e.g. 'Drafted initial design, awaiting client feedback')..."
                  rows={2}
                  className="w-full p-3 pr-20 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="absolute right-2.5 bottom-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  {submittingNote ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Post</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
