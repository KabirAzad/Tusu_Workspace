'use client'

import type { Message, Profile } from '@/types/database'
import {
  Star,
  CheckSquare,
  X,
  User,
  ArrowUpRight,
  Trash2,
} from 'lucide-react'

interface MeetingPointsPanelProps {
  meetingPoints: Message[]
  currentUser: Profile
  onClose: () => void
  onToggleMeetingPoint: (messageId: string, currentVal: boolean) => Promise<void>
  onConvertToTask: (message: Message) => void
  onJumpToMessage: (messageId: string) => void
}

export function MeetingPointsPanel({
  meetingPoints,
  currentUser,
  onClose,
  onToggleMeetingPoint,
  onConvertToTask,
  onJumpToMessage,
}: MeetingPointsPanelProps) {
  const isAdmin = currentUser.role === 'admin'

  return (
    <div className="w-full md:w-80 h-full flex flex-col border-l border-border bg-card/60 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          <h3 className="font-bold text-sm text-foreground">Meeting Points</h3>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {meetingPoints.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meeting Points List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {meetingPoints.length === 0 ? (
          <div className="h-48 rounded-xl border border-dashed border-border/70 flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground space-y-2">
            <Star className="w-6 h-6 text-muted-foreground/40" />
            <p className="font-medium text-foreground/80">No Meeting Points Yet</p>
            <p className="text-[11px] text-muted-foreground">
              Hover over important discussion points or meeting summaries in chat and click the star to save them here for the whole team.
            </p>
          </div>
        ) : (
          meetingPoints.map((msg) => {
            const isAuthor = msg.sender_id === currentUser.id
            const canUnpin = isAdmin || isAuthor

            return (
              <div
                key={msg.id}
                className="p-3 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 transition-all space-y-2 group relative"
              >
                {/* Author info */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground truncate max-w-[150px]">
                    <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                      {(msg.sender?.full_name || msg.sender?.email || 'U')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="truncate">
                      {msg.sender?.full_name || msg.sender?.email}
                    </span>
                  </div>

                  {canUnpin && (
                    <button
                      onClick={() => onToggleMeetingPoint(msg.id, true)}
                      className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Unpin meeting point"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-amber-500/10">
                  <button
                    onClick={() => onJumpToMessage(msg.id)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <span>View in chat</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => onConvertToTask(msg)}
                    className="text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 transition-colors font-medium shadow-2xs"
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Create Task</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
