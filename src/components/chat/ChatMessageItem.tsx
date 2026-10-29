'use client'

import { useState } from 'react'
import type { Message, Profile } from '@/types/database'
import {
  Pin,
  Star,
  CheckSquare,
  Clock,
  Shield,
  ShieldAlert,
  User,
  MoreHorizontal,
} from 'lucide-react'

interface ChatMessageItemProps {
  message: Message
  currentUser: Profile
  onToggleMeetingPoint: (messageId: string, currentVal: boolean) => Promise<void>
  onConvertToTask: (message: Message) => void
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

export function ChatMessageItem({
  message,
  currentUser,
  onToggleMeetingPoint,
  onConvertToTask,
}: ChatMessageItemProps) {
  const [toggling, setToggling] = useState(false)
  const isMe = message.sender_id === currentUser.id
  const isAdmin = currentUser.role === 'admin'
  const canToggleMeetingPoint = isAdmin || isMe

  const senderRole = message.sender?.role || 'member'
  const roleBadge = ROLE_BADGES[senderRole] || ROLE_BADGES.member
  const RoleIcon = roleBadge.icon

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const handleToggle = async () => {
    if (toggling) return
    setToggling(true)
    try {
      await onToggleMeetingPoint(message.id, message.is_meeting_point)
    } finally {
      setToggling(false)
    }
  }

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex items-start gap-3 p-3.5 rounded-2xl transition-all duration-200 ${
        message.is_meeting_point
          ? 'bg-amber-500/10 border border-amber-500/30 shadow-xs'
          : 'hover:bg-secondary/30 border border-transparent'
      }`}
    >
      {/* Sender Avatar */}
      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 select-none">
        {(message.sender?.full_name || message.sender?.email || 'U')
          .charAt(0)
          .toUpperCase()}
      </div>

      {/* Message Body */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name, Role & Timestamp */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-xs text-foreground">
            {isMe ? 'You' : message.sender?.full_name || message.sender?.email}
          </span>

          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full border font-medium inline-flex items-center gap-0.5 ${roleBadge.class}`}
          >
            <RoleIcon className="w-2.5 h-2.5" />
            {roleBadge.label}
          </span>

          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Meeting Point Highlight Banner */}
        {message.is_meeting_point && (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-semibold tracking-wide">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            Meeting Point
          </div>
        )}

        {/* Message Content */}
        <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">
          {message.content}
        </p>
      </div>

      {/* Hover Actions Toolbar */}
      <div className="absolute right-3 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover/90 backdrop-blur-xs border border-border rounded-lg shadow-sm p-0.5 flex items-center gap-0.5 z-10">
        {/* Toggle Meeting Point Button */}
        {canToggleMeetingPoint && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              message.is_meeting_point
                ? 'text-amber-500 hover:bg-amber-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={
              message.is_meeting_point
                ? 'Remove from meeting points'
                : 'Mark as meeting point'
            }
          >
            <Star
              className={`w-3.5 h-3.5 ${
                message.is_meeting_point ? 'fill-amber-500 text-amber-500' : ''
              }`}
            />
          </button>
        )}

        {/* Convert to Task Button */}
        <button
          onClick={() => onConvertToTask(message)}
          className="p-1.5 rounded-md text-xs text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
          title="Convert this message into a task"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
