'use client'

import type { Task, TaskPriority, TaskStatus } from '@/types/database'
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  User,
} from 'lucide-react'
import { useState } from 'react'

interface TaskListProps {
  tasks: Task[]
  currentUserId: string
  canEdit: boolean
  canDelete: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onSelect?: (task: Task) => void
}

const PRIORITY_BADGES: Record<TaskPriority, { label: string; class: string }> = {
  high: { label: 'High', class: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  medium: { label: 'Med', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  low: { label: 'Low', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

const STATUS_BADGES: Record<TaskStatus, { label: string; class: string }> = {
  todo: { label: 'To Do', class: 'bg-secondary text-secondary-foreground border-border' },
  in_progress: { label: 'In Progress', class: 'bg-primary/10 text-primary border-primary/20' },
  done: { label: 'Completed', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
}

export function TaskList({
  tasks,
  currentUserId,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
  onSelect,
}: TaskListProps) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-border">
        <p className="text-sm text-muted-foreground">No tasks match your current filters.</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl border border-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30 text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
              <th className="py-3 px-4 w-10">Done</th>
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {tasks.map((task) => {
              const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium
              const status = STATUS_BADGES[task.status] || STATUS_BADGES.todo
              const isDone = task.status === 'done'
              const isOverdue =
                task.due_date &&
                !isDone &&
                new Date(task.due_date).setHours(23, 59, 59, 999) < Date.now()

              return (
                <tr
                  key={task.id}
                  className={`hover:bg-secondary/20 transition-colors group ${
                    isDone ? 'opacity-60 bg-secondary/10' : ''
                  }`}
                >
                  {/* Done Checkbox */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() =>
                        onStatusChange(task.id, isDone ? 'todo' : 'done')
                      }
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={isDone ? 'Mark as incomplete' : 'Mark as completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  {/* Title & Description */}
                  <td
                    onClick={() => onSelect?.(task)}
                    className="py-3 px-4 max-w-xs sm:max-w-md cursor-pointer group/title"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-medium text-foreground group-hover/title:text-primary transition-colors ${
                          isDone ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.is_personal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground border border-border flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Personal
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-sm mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${priority.class}`}
                    >
                      {priority.label}
                    </span>
                  </td>

                  {/* Status Dropdown/Badge */}
                  <td className="py-3 px-4">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        onStatusChange(task.id, e.target.value as TaskStatus)
                      }
                      className={`text-[11px] font-medium px-2 py-1 rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary ${status.class}`}
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Completed</option>
                    </select>
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-4">
                    {task.due_date ? (
                      <div
                        className={`flex items-center gap-1 font-medium ${
                          isOverdue ? 'text-rose-500 overdue-pulse' : 'text-muted-foreground'
                        }`}
                      >
                        {isOverdue ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5" />
                        )}
                        <span>{formatDueDate(task.due_date)}</span>
                        {isOverdue && <span className="font-bold">!</span>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-4">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5 max-w-[130px] truncate">
                        <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(task.assignee.full_name || task.assignee.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="truncate text-foreground/80">
                          {task.assignee.id === currentUserId
                            ? 'You'
                            : task.assignee.full_name || task.assignee.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    {(canEdit || canDelete) && (
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActiveMenuId(
                              activeMenuId === task.id ? null : task.id
                            )
                          }
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === task.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-28 rounded-lg bg-popover border border-border shadow-lg py-1 z-30 text-xs">
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null)
                                    onEdit(task)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-popover-foreground hover:bg-accent flex items-center gap-2"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                  Edit
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null)
                                    onDelete(task.id)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-destructive hover:bg-destructive/10 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
