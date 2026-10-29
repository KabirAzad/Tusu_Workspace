'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/contexts/NotificationContext'
import { getInitials } from '@/lib/utils'
import {
  Bell,
  BellRing,
  CheckCheck,
  MessageSquare,
  CheckCircle2,
  Hash,
  Sparkles,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  Inbox,
} from 'lucide-react'

interface NotificationBellProps {
  align?: 'left' | 'right'
}

export function NotificationBell({ align = 'left' }: NotificationBellProps) {
  const {
    recentNotifications,
    unreadDMCount,
    unreadChatCount,
    markAllNotificationsAsRead,
    soundEnabled,
    setSoundEnabled,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount =
    recentNotifications.filter((n) => !n.is_read).length +
    unreadDMCount +
    unreadChatCount

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notif: (typeof recentNotifications)[0]) => {
    const p = (notif.payload || {}) as Record<string, any>
    setOpen(false)
    if (
      notif.type === 'chat_message' ||
      p.channel_id === '00000000-0000-0000-0000-000000000001'
    ) {
      router.push('/chat')
    } else if (p.channel_id || p.sender_id) {
      router.push(`/messages?userId=${p.sender_id || ''}`)
    } else {
      router.push('/tasks')
    }
  }

  const formatTimestamp = (dateStr?: string) => {
    if (!dateStr) return 'Just now'
    try {
      const d = new Date(dateStr)
      const diffMs = Date.now() - d.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
  }

  // Filtered notifications
  const displayedNotifications =
    filter === 'unread'
      ? recentNotifications.filter((n) => !n.is_read)
      : recentNotifications

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        id="notification-bell-btn"
        aria-label="View notifications"
        aria-expanded={open}
        className={`relative p-2 rounded-xl text-muted-foreground hover:text-foreground transition-all flex items-center justify-center ${
          open ? 'bg-accent text-foreground' : 'hover:bg-accent'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full animate-pulse shadow-sm ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          className={`absolute mt-2.5 z-50 w-80 sm:w-96 rounded-2xl bg-card/95 backdrop-blur-2xl border border-border/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            align === 'right' ? 'right-0' : 'left-0 sm:left-0'
          }`}
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div className="px-4 pt-3.5 pb-2.5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-sm text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={() => markAllNotificationsAsRead()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                All ({recentNotifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'unread'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                Unread
                {unreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      filter === 'unread'
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40 overscroll-contain">
            {displayedNotifications.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground/60 flex items-center justify-center mx-auto ring-1 ring-border">
                  <Inbox className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[220px] mx-auto leading-relaxed">
                    {filter === 'unread'
                      ? 'You have read all your messages and task updates.'
                      : 'Activity and direct updates will appear here in real-time.'}
                  </p>
                </div>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const p = (n.payload || {}) as Record<string, any>
                const isChat =
                  n.type === 'chat_message' ||
                  p.channel_id === '00000000-0000-0000-0000-000000000001'
                const isUpdateRequest = n.type === 'update_requested'
                const isUpdateResponse = n.type === 'update_received'

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 flex items-start gap-3 hover:bg-accent/60 cursor-pointer transition-all group relative ${
                      !n.is_read ? 'bg-primary/[0.04]' : ''
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!n.is_read && (
                      <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
                    )}

                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ring-1 ${
                        isChat
                          ? 'bg-violet-500/15 text-violet-500 ring-violet-500/20'
                          : isUpdateRequest
                          ? 'bg-amber-500/15 text-amber-500 ring-amber-500/20'
                          : isUpdateResponse
                          ? 'bg-emerald-500/15 text-emerald-500 ring-emerald-500/20'
                          : 'bg-primary/15 text-primary ring-primary/20'
                      }`}
                    >
                      {isChat ? (
                        <Hash className="w-4 h-4" />
                      ) : isUpdateRequest ? (
                        <BellRing className="w-4 h-4 animate-bounce" />
                      ) : isUpdateResponse ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {isChat
                            ? `#Main • ${p.sender_name || 'Teammate'}`
                            : p.sender_name || (isUpdateRequest ? 'Manager' : 'System')}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTimestamp(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                        {p.message || p.note || (isUpdateRequest ? 'Work update requested' : 'Update received')}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary group-hover:underline">
                          {isChat
                            ? 'Open #Main chat'
                            : isUpdateRequest
                            ? 'Respond in DM'
                            : 'Open message'}
                          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs">
            {/* Sound toggle button */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              title={soundEnabled ? 'Mute audio alerts' : 'Enable audio alerts'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                  <span>Audio on</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Muted</span>
                </>
              )}
            </button>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/messages')
                }}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Messages
              </button>
              <span className="text-border">•</span>
              <button
                onClick={() => {
                  setOpen(false)
                  router.push('/chat')
                }}
                className="text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                Main Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
