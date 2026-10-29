import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names with conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a date string to a readable date */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Check if a due date has passed */
export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Get a color class based on task priority */
export function priorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900'
    case 'medium':
      return 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
    case 'low':
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
    default:
      return 'text-stone-500 bg-stone-50 dark:bg-stone-900'
  }
}

/** Get a color class based on task status */
export function statusColor(status: string): string {
  switch (status) {
    case 'todo':
      return 'text-stone-600 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
    case 'in_progress':
      return 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
    case 'done':
      return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
    default:
      return ''
  }
}

/** Human-readable status labels */
export function statusLabel(status: string): string {
  switch (status) {
    case 'todo':       return 'To Do'
    case 'in_progress': return 'In Progress'
    case 'done':       return 'Done'
    default:           return status
  }
}
