'use client'

import { useRouter } from 'next/navigation'
import { useNotifications, type ToastItem } from '@/contexts/NotificationContext'
import { getInitials } from '@/lib/utils'
import {
  MessageSquare,
  BellRing,
  CheckCircle2,
  Hash,
  X,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react'

export function NotificationToaster() {
  const { toasts, dismissToast, soundEnabled, setSoundEnabled } = useNotifications()
  const router = useRouter()

  if (toasts.length === 0) return null

  const handleToastClick = (toast: ToastItem) => {
    if (toast.linkUrl) {
      router.push(toast.linkUrl)
      dismissToast(toast.id)
    }
  }

  const getToastIcon = (type: ToastItem['type']) => {
    switch (type) {
      case 'update_request':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 ring-1 ring-amber-500/20">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
        )
      case 'update_response':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        )
      case 'chat':
        return (
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0 ring-1 ring-violet-500/20">
            <Hash className="w-4 h-4" />
          </div>
        )
      case 'dm':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/20">
            <MessageSquare className="w-4 h-4" />
          </div>
        )
    }
  }

  return (
    <aside
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {/* Sound toggle button pill */}
      <div className="flex justify-end pointer-events-auto">
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-card/80 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground shadow-sm transition-all"
          title={soundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-3 h-3 text-primary" />
              <span>Sound On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3 h-3 text-muted-foreground" />
              <span>Muted</span>
            </>
          )}
        </button>
      </div>

      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleToastClick(toast)}
          className="pointer-events-auto relative flex items-start gap-3 p-3.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl hover:border-primary/40 hover:shadow-primary/5 transition-all cursor-pointer group animate-in slide-in-from-top-3 fade-in duration-200 overflow-hidden"
          role="alert"
        >
          {/* Avatar or Icon */}
          {toast.senderAvatar ? (
            <img
              src={toast.senderAvatar}
              alt={toast.senderName || 'Sender'}
              className="w-9 h-9 rounded-xl object-cover ring-1 ring-border shrink-0"
            />
          ) : toast.senderName ? (
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20 shrink-0">
              {getInitials(toast.senderName)}
            </div>
          ) : (
            getToastIcon(toast.type)
          )}

          {/* Body */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-foreground truncate">
                {toast.title}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-auto mr-1">
                {toast.timestamp}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {toast.message}
            </p>
            {toast.linkUrl && (
              <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium mt-1.5 group-hover:underline">
                Open conversation <ExternalLink className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={(e) => {
              e.stopPropagation()
              dismissToast(toast.id)
            }}
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Auto-dismiss timer progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
            <div
              className="h-full bg-primary origin-left animate-[shrink_6s_linear_forwards]"
              style={{
                animationDuration: '6s',
              }}
            />
          </div>
        </div>
      ))}
    </aside>
  )
}
