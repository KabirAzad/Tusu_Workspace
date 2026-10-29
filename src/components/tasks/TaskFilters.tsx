'use client'

import type { Profile, TaskPriority, TaskStatus } from '@/types/database'
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Filter,
  X,
} from 'lucide-react'

export type FilterStatus = 'all' | TaskStatus | 'overdue'

interface TaskFiltersProps {
  search: string
  onSearchChange: (val: string) => void
  status: FilterStatus
  onStatusChange: (status: FilterStatus) => void
  priority: string
  onPriorityChange: (val: string) => void
  assignee: string
  onAssigneeChange: (val: string) => void
  members?: Profile[]
  view: 'kanban' | 'list'
  onViewChange: (view: 'kanban' | 'list') => void
  onNewTask: () => void
  taskCount: number
}

const STATUS_TABS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done', label: 'Completed' },
  { id: 'overdue', label: 'Overdue' },
]

export function TaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  priority,
  onPriorityChange,
  assignee,
  onAssigneeChange,
  members = [],
  view,
  onViewChange,
  onNewTask,
  taskCount,
}: TaskFiltersProps) {
  return (
    <div className="space-y-3">
      {/* Top row: Search, Dropdowns, View Switcher & New Task button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tasks by title..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {/* Priority filter */}
          <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="px-2.5 py-2 text-xs rounded-xl bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Assignee filter (if team view) */}
          {members.length > 0 && (
            <select
              value={assignee}
              onChange={(e) => onAssigneeChange(e.target.value)}
              className="px-2.5 py-2 text-xs rounded-xl bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[140px] truncate"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
            </select>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-secondary/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => onViewChange('kanban')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                view === 'kanban'
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewChange('list')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                view === 'list'
                  ? 'bg-card text-primary shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Table List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>

          {/* New Task button */}
          <button
            onClick={onNewTask}
            className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onStatusChange(tab.id)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium whitespace-nowrap ${
              status === tab.id
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <span className="text-[11px] text-muted-foreground ml-auto pl-2 whitespace-nowrap">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
      </div>
    </div>
  )
}
