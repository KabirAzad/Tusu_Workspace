'use client'

import { useState } from 'react'
import type { Task, TaskPriority, TaskStatus, Profile } from '@/types/database'
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Circle,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'

interface TaskCardProps {
  task: Task
  currentUserId: string
  canEdit: boolean
  canDelete: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onSelect?: (task: Task) => void
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  high: {
    label: 'High',
    badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dotClass: 'bg-rose-500',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dotClass: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dotClass: 'bg-emerald-500',
  },
}

export function TaskCard({
  task,
  currentUserId,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
  onSelect,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  // Due date calculations
  const isOverdue =
    task.due_date &&
    task.status !== 'done' &&
    new Date(task.due_date).setHours(23, 59, 59, 999) < Date.now()

  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const handleStatusClick = async (newStatus: TaskStatus) => {
    setUpdating(true)
    try {
      await onStatusChange(task.id, newStatus)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div
      className={`glass-card rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:border-primary/40 relative group ${
        task.status === 'done' ? 'opacity-70 bg-card/40' : ''
      }`}
    >
      {/* Header: Priority & Tags */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium inline-flex items-center gap-1.5 ${priority.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dotClass}`} />
            {priority.label}
          </span>

          {task.is_personal && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground inline-flex items-center gap-1 border border-border">
              <Lock className="w-2.5 h-2.5" />
              Personal
            </span>
          )}
        </div>

        {/* Action Menu button */}
        {(canEdit || canDelete) && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              title="Task options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-32 rounded-lg bg-popover border border-border shadow-lg py-1 z-30 text-xs">
                  {canEdit && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onEdit(task)
                      }}
                      className="w-full px-3 py-1.5 text-left text-popover-foreground hover:bg-accent flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      Edit Task
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
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
      </div>

      {/* Card Clickable Content */}
      <div
        onClick={() => onSelect?.(task)}
        className="cursor-pointer group/content"
      >
        {/* Title */}
        <h3
          className={`text-sm font-semibold text-foreground line-clamp-2 mb-1.5 group-hover/content:text-primary transition-colors ${
            task.status === 'done' ? 'line-through text-muted-foreground' : ''
          }`}
        >
          {task.title}
        </h3>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer: Due date + Assignee */}
      <div
        onClick={() => onSelect?.(task)}
        className="cursor-pointer flex items-center justify-between gap-2 text-xs text-muted-foreground pt-2.5 border-t border-border/40 mt-2"
      >
        {/* Due date */}
        {task.due_date ? (
          <div
            className={`flex items-center gap-1 font-medium ${
              isOverdue
                ? 'text-rose-500 overdue-pulse'
                : 'text-muted-foreground'
            }`}
            title={isOverdue ? 'Overdue!' : `Due ${task.due_date}`}
          >
            {isOverdue ? (
              <Clock className="w-3.5 h-3.5" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>{formatDueDate(task.due_date)}</span>
            {isOverdue && <span className="font-semibold">(Overdue)</span>}
          </div>
        ) : (
          <span className="text-muted-foreground/50 text-[11px]">No due date</span>
        )}

        {/* Assignee Avatar */}
        <div className="flex items-center gap-1.5">
          {task.assignee ? (
            <div
              className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 max-w-[120px] truncate"
              title={`Assigned to ${task.assignee.full_name || task.assignee.email}`}
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {(task.assignee.full_name || task.assignee.email)
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <span className="truncate">
                {task.assignee.id === currentUserId
                  ? 'You'
                  : task.assignee.full_name || task.assignee.email}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
              <User className="w-3 h-3" />
              Unassigned
            </span>
          )}
        </div>
      </div>

      {/* Quick Move Action buttons */}
      <div className="flex items-center justify-between gap-1 mt-3 pt-2 border-t border-border/20">
        {task.status !== 'todo' && (
          <button
            disabled={updating}
            onClick={() => handleStatusClick('todo')}
            className="text-[11px] px-2 py-1 rounded bg-secondary/70 hover:bg-secondary text-secondary-foreground flex items-center gap-1 transition-colors"
            title="Move back to To Do"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            To Do
          </button>
        )}

        {task.status === 'todo' && (
          <button
            disabled={updating}
            onClick={() => handleStatusClick('in_progress')}
            className="text-[11px] px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 transition-colors font-medium"
            title="Start progress"
          >
            Start
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        )}

        {task.status === 'in_progress' && (
          <button
            disabled={updating}
            onClick={() => handleStatusClick('done')}
            className="text-[11px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 transition-colors font-medium ml-auto"
            title="Mark as completed"
          >
            <CheckCircle2 className="w-3 h-3" />
            Complete
          </button>
        )}

        {task.status === 'done' && (
          <button
            disabled={updating}
            onClick={() => handleStatusClick('in_progress')}
            className="text-[11px] px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground flex items-center gap-1 transition-colors ml-auto"
            title="Reopen task"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reopen
          </button>
        )}
      </div>
    </div>
  )
}
