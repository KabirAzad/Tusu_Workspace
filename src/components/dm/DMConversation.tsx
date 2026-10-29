'use client'

import { useEffect, useRef, useState } from 'react'
import type { Channel, Message, Profile } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useNotifications } from '@/contexts/NotificationContext'
import { RespondUpdateModal } from './RespondUpdateModal'
import {
  Send,
  BellRing,
  Loader2,
  CheckSquare,
  ArrowRight,
  Shield,
  ShieldAlert,
  User,
  Clock,
  MessageSquare,
} from 'lucide-react'

interface DMConversationProps {
  channel: Channel | null
  targetUser: Profile | null
  currentUser: Profile
  onRequestUpdate: (user: Profile) => void
  loadingChannel: boolean
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

export function DMConversation({
  channel,
  targetUser,
  currentUser,
  onRequestUpdate,
  loadingChannel,
}: DMConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [respondModalOpen, setRespondModalOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isManagerOrAdmin =
    currentUser.role === 'admin' || currentUser.role === 'manager'

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  // Load initial messages for this channel
  useEffect(() => {
    if (!channel) {
      setMessages([])
      return
    }

    let isMounted = true
    async function loadMessages() {
      setLoadingMessages(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('channel_id', channel!.id)
        .order('created_at', { ascending: true })

      if (isMounted) {
        if (!error && data) {
          setMessages(data as unknown as Message[])
        }
        setLoadingMessages(false)
        setTimeout(() => scrollToBottom('auto'), 50)
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [channel?.id])

  const { broadcastNotification } = useNotifications()
  const realtimeChannelRef = useRef<any>(null)

  // Realtime subscription (Dual: Broadcast + Postgres Changes)
  useEffect(() => {
    if (!channel) return

    const supabase = createClient()
    const channelInstance = supabase
      .channel(`dm_${channel.id}`)
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload: { payload: Message }) => {
          const newMsg = payload.payload
          if (!newMsg.sender) {
            newMsg.sender =
              newMsg.sender_id === currentUser.id
                ? currentUser
                : targetUser || undefined
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom('smooth')
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          if (!newMsg.sender) {
            newMsg.sender =
              newMsg.sender_id === currentUser.id
                ? currentUser
                : targetUser || undefined
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom('smooth')
        }
      )
      .subscribe()

    realtimeChannelRef.current = channelInstance

    return () => {
      supabase.removeChannel(channelInstance)
    }
  }, [channel?.id, currentUser, targetUser])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || !channel) return

    const content = input.trim()
    setInput('')
    setSending(true)

    const supabase = createClient()
    const { data, error } = await (supabase.from('messages') as any)
      .insert({
        channel_id: channel.id,
        sender_id: currentUser.id,
        content,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single()

    if (error) {
      console.error('Failed to send DM:', error.message)
      setInput(content)
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data as Message]
      })
      scrollToBottom('smooth')

      // 1. Instant broadcast to any other client viewing this DM
      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: data,
      })

      // 2. Instant notification popup to the recipient wherever they are in the app
      if (targetUser) {
        broadcastNotification(targetUser.id, {
          type: 'dm',
          title: `💬 ${currentUser.full_name || currentUser.email}`,
          message: data.content,
          senderName: currentUser.full_name || currentUser.email,
          senderAvatar: currentUser.avatar_url,
          linkUrl: `/messages?userId=${currentUser.id}`,
        })
      }
    }

    setSending(false)
  }

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

  // If no user selected
  if (!targetUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card/20">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-foreground">
            No Conversation Selected
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Choose a team member from the left panel to start a direct message or request a progress update.
          </p>
        </div>
      </div>
    )
  }

  const roleBadge = ROLE_BADGES[targetUser.role] || ROLE_BADGES.member
  const RoleIcon = roleBadge.icon

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-card/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0 select-none">
            {(targetUser.full_name || targetUser.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm text-foreground">
                {targetUser.full_name || targetUser.email}
              </h2>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full border font-medium inline-flex items-center gap-0.5 ${roleBadge.class}`}
              >
                <RoleIcon className="w-2.5 h-2.5" />
                {roleBadge.label}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{targetUser.email}</p>
          </div>
        </div>

        {/* Request Update Button */}
        {isManagerOrAdmin && (
          <button
            onClick={() => onRequestUpdate(targetUser)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Request Update</span>
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loadingChannel || loadingMessages ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-muted-foreground">
            <p className="text-xs">This is the start of your direct conversation with {targetUser.full_name || targetUser.email}.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser.id

            // Render Update Request message distinctly
            if (msg.is_update_request) {
              return (
                <div
                  key={msg.id}
                  className="my-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 shadow-xs max-w-lg mx-auto space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <div className="flex items-center gap-1.5">
                      <BellRing className="w-4 h-4 text-amber-500" />
                      <span>Work Update Requested</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>

                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      Requested by {isMe ? 'You' : msg.sender?.full_name || 'Admin'}
                    </span>
                    {!isMe && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInput('Update: ')
                            inputRef.current?.focus()
                          }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground transition-colors flex items-center gap-1 font-medium border border-border"
                        >
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                          <span>Reply</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRespondModalOpen(true)}
                          className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5 font-medium shadow-2xs"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Provide Work Update</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            // Normal Message Bubble
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] shrink-0 select-none">
                  {(msg.sender?.full_name || msg.sender?.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div
                  className={`max-w-[75%] rounded-2xl p-3 text-xs space-y-1 shadow-2xs ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-xs'
                      : 'bg-secondary/70 text-foreground border border-border/60 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                  <span
                    className={`block text-[9px] text-right ${
                      isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="p-4 border-t border-border bg-card/40">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage(e)
              }
            }}
            placeholder={`Message ${targetUser.full_name || targetUser.email}...`}
            rows={1}
            disabled={!channel || loadingChannel}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none leading-relaxed disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={sending || !input.trim() || !channel || loadingChannel}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-40 shadow-sm shrink-0"
            title="Send message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>

      {/* Respond to Update Request Modal */}
      {channel && (
        <RespondUpdateModal
          open={respondModalOpen}
          onOpenChange={setRespondModalOpen}
          channelId={channel.id}
          requesterUser={targetUser}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}
