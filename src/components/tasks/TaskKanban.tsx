'use client'

import type { Task, TaskStatus } from '@/types/database'
import { TaskCard } from './TaskCard'
import { Circle, Clock, CheckCircle2, Plus } from 'lucide-react'

interface TaskKanbanProps {
  tasks: Task[]
  currentUserId: string
  canEdit: boolean
  canDelete: boolean
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onSelect?: (task: Task) => void
  onNewTaskWithStatus?: (status: TaskStatus) => void
}

const COLUMNS: {
  status: TaskStatus
  label: string
  icon: typeof Circle
  badgeColor: string
  headerBg: string
}[] = [
  {
    status: 'todo',
    label: 'To Do',
    icon: Circle,
    badgeColor: 'bg-secondary text-secondary-foreground border-border',
    headerBg: 'bg-secondary/40',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    icon: Clock,
    badgeColor: 'bg-primary/10 text-primary border-primary/20',
    headerBg: 'bg-primary/5',
  },
  {
    status: 'done',
    label: 'Completed',
    icon: CheckCircle2,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    headerBg: 'bg-emerald-500/5',
  },
]

export function TaskKanban({
  tasks,
  currentUserId,
  canEdit,
  canDelete,
  onStatusChange,
  onEdit,
  onDelete,
  onSelect,
  onNewTaskWithStatus,
}: TaskKanbanProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.status)
        const ColIcon = col.icon

        return (
          <div
            key={col.status}
            className="flex flex-col rounded-2xl bg-secondary/30 border border-border/60 p-4 min-h-[480px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <ColIcon className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  {col.label}
                </h3>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${col.badgeColor}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {onNewTaskWithStatus && (
                <button
                  onClick={() => onNewTaskWithStatus(col.status)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  title={`Add ${col.label} task`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Cards List */}
            <div className="space-y-3 flex-1">
              {colTasks.length === 0 ? (
                <div className="h-36 rounded-xl border border-dashed border-border flex flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground/70">
                  <span>No tasks</span>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUserId}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onStatusChange={onStatusChange}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSelect={onSelect}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
