'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskPriority, TaskStatus, Profile } from '@/types/database'
import { Loader2, Plus, X, Lock, CheckSquare } from 'lucide-react'

const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['todo', 'in_progress', 'done']),
  due_date: z.string().optional(),
  assignee_id: z.string().optional(),
  is_personal: z.boolean(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: Profile
  members: Profile[]
  editingTask?: Task | null
  initialTitle?: string
  sourceMessageId?: string
  onSuccess: (task: Task) => void
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  currentUser,
  members,
  editingTask,
  initialTitle,
  sourceMessageId,
  onSuccess,
}: CreateTaskDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager'

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
      assignee_id: currentUser.id,
      is_personal: !isManagerOrAdmin,
    },
  })

  const isPersonal = watch('is_personal')

  // Populate on edit
  useEffect(() => {
    if (editingTask) {
      reset({
        title: editingTask.title,
        description: editingTask.description || '',
        priority: editingTask.priority,
        status: editingTask.status,
        due_date: editingTask.due_date || '',
        assignee_id: editingTask.assignee_id || currentUser.id,
        is_personal: editingTask.is_personal,
      })
    } else {
      reset({
        title: initialTitle || '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        assignee_id: currentUser.id,
        is_personal: !isManagerOrAdmin,
      })
    }
  }, [editingTask, open, reset, currentUser.id, isManagerOrAdmin, initialTitle])

  if (!open) return null

  const onSubmit = async (data: TaskFormData) => {
    setServerError(null)

    const supabase = createClient()

    try {
      // For members, assignee is always themselves.
      // For managers/admins, they can assign to any member or leave unassigned.
      const resolvedAssigneeId = !isManagerOrAdmin
        ? currentUser.id
        : data.is_personal
        ? currentUser.id
        : data.assignee_id && data.assignee_id !== 'none'
        ? data.assignee_id
        : null

      // If user is member, ensure is_personal is true if RLS strictly requires it
      const resolvedIsPersonal = !isManagerOrAdmin ? true : data.is_personal

      const payload: Record<string, unknown> = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        priority: data.priority,
        status: data.status,
        due_date: data.due_date || null,
        is_personal: resolvedIsPersonal,
        assignee_id: resolvedAssigneeId,
      }

      if (sourceMessageId && !editingTask) {
        payload.source_message_id = sourceMessageId
      }

      if (editingTask) {
        // UPDATE existing task
        const { data: updated, error } = await (supabase.from('tasks') as any)
          .update(payload)
          .eq('id', editingTask.id)
          .select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
          .single()

        if (error) throw error

        onSuccess(updated as unknown as Task)
      } else {
        // INSERT new task
        payload.created_by = currentUser.id

        const { data: created, error } = await (supabase.from('tasks') as any)
          .insert(payload)
          .select('*, assignee:profiles!tasks_assignee_id_fkey(*), creator:profiles!tasks_created_by_fkey(*)')
          .single()

        if (error) throw error

        onSuccess(created as unknown as Task)
      }

      onOpenChange(false)
      reset()
    } catch (err: unknown) {
      console.error('Error saving task:', err)
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
          ? err.message
          : 'Failed to save task'
      setServerError(message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl w-full max-w-lg p-6 relative shadow-2xl bg-card border border-border">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingTask
                ? 'Update task details and assignments'
                : 'Add a new action item to the workspace'}
            </p>
          </div>
        </div>

        {serverError && (
          <div className="p-3 mb-5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Task Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Prepare monthly revenue report"
              {...register('title')}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Description <span className="text-muted-foreground">(Optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Provide extra context, requirements, or links..."
              {...register('description')}
              className="w-full px-3.5 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none"
            />
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          {/* Due Date & Assignee Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                {...register('due_date')}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              >
              </input>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Assignee
              </label>
              {isPersonal ? (
                <div className="px-3 py-2 text-sm rounded-lg bg-secondary/50 border border-border text-muted-foreground flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Assigned to You</span>
                </div>
              ) : isManagerOrAdmin ? (
                <select
                  {...register('assignee_id')}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  <option value="none">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name || m.email} {m.id === currentUser.id ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 text-sm rounded-lg bg-secondary/50 border border-border text-foreground flex items-center gap-1.5">
                  <span>{currentUser.full_name || currentUser.email} (You)</span>
                </div>
              )}
            </div>
          </div>

          {/* Personal Task Checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_personal"
              {...register('is_personal')}
              className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
            />
            <label
              htmlFor="is_personal"
              className="text-xs text-foreground cursor-pointer select-none"
            >
              Mark as personal task (visible only to you)
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
