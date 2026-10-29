'use client'

import { useState } from 'react'
import type { Profile } from '@/types/database'
import { useAppContext } from '@/contexts/AppContext'
import { useNotifications } from '@/contexts/NotificationContext'
import {
  BellRing,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface RequestUpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUser: Profile | null
  onSuccess: (channelId: string) => void
}

export function RequestUpdateModal({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: RequestUpdateModalProps) {
  const { profile: currentUser } = useAppContext()
  const { broadcastNotification } = useNotifications()
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!open || !targetUser) return null

  const defaultNote = `Hi ${
    targetUser.full_name || targetUser.email
  }, could you please share a quick update on your current tasks and progress?`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const finalNote = note.trim() || defaultNote

    try {
      const res = await fetch('/api/dm/request-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          note: finalNote,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request update')
      }

      // Broadcast instant notification popup to target user
      broadcastNotification(targetUser.id, {
        type: 'update_request',
        title: `🔔 Work Update Requested by ${currentUser.full_name || currentUser.email}`,
        message: finalNote,
        senderName: currentUser.full_name || currentUser.email,
        senderAvatar: currentUser.avatar_url,
        linkUrl: `/messages?userId=${currentUser.id}`,
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setNote('')
        onOpenChange(false)
        onSuccess(data.channelId)
      }, 1000)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to request update'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card rounded-2xl w-full max-w-md p-6 relative shadow-2xl bg-card border border-border">
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
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Request Work Update
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Send an official update request notification and direct message.
            </p>
          </div>
        </div>

        {/* Member preview card */}
        <div className="p-3 mb-4 rounded-xl bg-secondary/30 border border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {(targetUser.full_name || targetUser.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {targetUser.full_name || targetUser.email}
            </p>
            <p className="text-[11px] text-muted-foreground truncate capitalize">
              Role: {targetUser.role}
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
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />
            <p className="text-sm font-semibold text-foreground">
              Update Request Sent!
            </p>
            <p className="text-xs text-muted-foreground">
              The member has been notified in their direct messages.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Message / Prompt
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={defaultNote}
                className="w-full p-3 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none leading-relaxed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Leave blank to send the default update request message.
              </p>
            </div>

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
                disabled={loading}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
