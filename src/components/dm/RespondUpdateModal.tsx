'use client'

import { useEffect, useState } from 'react'
import type { Profile, Task, TaskStatus } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  CheckSquare,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react'

interface RespondUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channelId: string
  requesterUser: Profile | null
  currentUser: Profile
  onSuccess?: () => void
}

export function RespondUpdateModal({
  open,
  onOpenChange,
  channelId,
  requesterUser,
  currentUser,
  onSuccess,
}: RespondUpdateModalProps) {
  const { broadcastNotification } = useNotifications()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('in_progress')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load user's tasks when opened
  useEffect(() => {
    if (!open) return

    let isMounted = true
    async function loadUserTasks() {
      setLoadingTasks(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assignee_id.eq.${currentUser.id},created_by.eq.${currentUser.id}`)
        .order('created_at', { ascending: false })

      if (isMounted) {
        if (!error && data) {
          const userTasks = data as unknown as Task[]
          setTasks(userTasks)
          if (userTasks.length > 0) {
            setSelectedTaskId(userTasks[0].id)
            setTaskStatus(userTasks[0].status)
          }
        }
        setLoadingTasks(false)
      }
    }

    loadUserTasks()

    return () => {
      isMounted = false
    }
  }, [open, currentUser.id])

  if (!open) return null

  const handleTaskChange = (taskId: string) => {
    setSelectedTaskId(taskId)
    const found = tasks.find((t) => t.id === taskId)
    if (found) {
      setTaskStatus(found.status)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) {
      setError('Please provide details on what work was done.')
      return
    }

    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const selectedTask = tasks.find((t) => t.id === selectedTaskId)

    try {
      // 1. If a task was selected, post a progress note to task_updates
      if (selectedTask) {
        await (supabase.from('task_updates') as any).insert({
          task_id: selectedTask.id,
          user_id: currentUser.id,
          note: note.trim(),
        })

        // Also update task status if changed
        if (taskStatus !== selectedTask.status) {
          await (supabase.from('tasks') as any)
            .update({ status: taskStatus })
            .eq('id', selectedTask.id)
        }
      }

      // 2. Post response message in this DM channel so the Admin sees it immediately
      const formattedMessage = selectedTask
        ? `✅ Work Update on "${selectedTask.title}" (${taskStatus.replace('_', ' ')}):\n${note.trim()}`
        : `✅ Work Update:\n${note.trim()}`

      const { error: msgError } = await (supabase.from('messages') as any).insert({
        channel_id: channelId,
        sender_id: currentUser.id,
        content: formattedMessage,
        is_update_request: false,
      })

      if (msgError) throw msgError

      // 3. Send notification to the requester if available
      if (requesterUser) {
        await (supabase.from('notifications') as any).insert({
          user_id: requesterUser.id,
          type: 'update_received',
          payload: {
            sender_id: currentUser.id,
            sender_name: currentUser.full_name || currentUser.email,
            channel_id: channelId,
            task_id: selectedTask?.id || null,
            message: formattedMessage,
          },
        })

        // Instant notification popup to the requester
        broadcastNotification(requesterUser.id, {
          type: 'update_response',
          title: `✅ Work Update from ${currentUser.full_name || currentUser.email}`,
          message: formattedMessage,
          senderName: currentUser.full_name || currentUser.email,
          senderAvatar: currentUser.avatar_url,
          linkUrl: `/messages?userId=${currentUser.id}`,
        })
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setNote('')
        onOpenChange(false)
        onSuccess?.()
      }, 1000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit update'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl w-full max-w-lg p-6 relative shadow-2xl bg-card border border-border">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Provide Work Update
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Log progress on your tasks and respond directly to the request.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-in zoom-in" />
            <p className="text-sm font-semibold text-foreground">
              Update Successfully Submitted!
            </p>
            <p className="text-xs text-muted-foreground">
              Progress note logged to your task and sent to the conversation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Selector */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Related Task <span className="text-muted-foreground">(Optional)</span>
              </label>
              {loadingTasks ? (
                <div className="p-2 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading tasks...</span>
                </div>
              ) : (
                <select
                  value={selectedTaskId}
                  onChange={(e) => handleTaskChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
                >
                  <option value="none">General Update (No specific task)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} [{t.status}]
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* If task selected, allow updating status */}
            {selectedTaskId !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Update Task Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTaskStatus(st)}
                      className={`py-1.5 px-3 text-xs rounded-lg border font-medium transition-colors capitalize ${
                        taskStatus === st
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note Textarea */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Work Summary / Accomplishments <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe what work was done (e.g., 'Implemented email integration, tested against test server, awaiting review')..."
                className="w-full p-3 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !note.trim()}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Work Update</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
