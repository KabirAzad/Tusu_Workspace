'use client'

import { useEffect, useRef, useState } from 'react'
import type { Channel, Message, Profile, Task } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { ChatMessageItem } from './ChatMessageItem'
import { MeetingPointsPanel } from './MeetingPointsPanel'
import { CreateTaskDialog } from '../tasks/CreateTaskDialog'
import {
  Send,
  Star,
  Users,
  Hash,
  Loader2,
  Sparkles,
  ArrowDown,
} from 'lucide-react'

interface ChatWindowProps {
  channel: Channel
  initialMessages: Message[]
  currentUser: Profile
  members: Profile[]
}

export function ChatWindow({
  channel,
  initialMessages,
  currentUser,
  members,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [asMeetingPoint, setAsMeetingPoint] = useState(false)
  const [sending, setSending] = useState(false)
  const [showMeetingPoints, setShowMeetingPoints] = useState(false)

  // Task creation state from a meeting point
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskInitialTitle, setTaskInitialTitle] = useState('')
  const [taskSourceMessageId, setTaskSourceMessageId] = useState('')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const membersMap = useRef<Map<string, Profile>>(new Map())
  useEffect(() => {
    const map = new Map<string, Profile>()
    members.forEach((m) => map.set(m.id, m))
    membersMap.current = map
  }, [members])

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }

  useEffect(() => {
    scrollToBottom('auto')
  }, [])

  const realtimeChannelRef = useRef<any>(null)

  // Realtime subscription to messages (Dual: Broadcast + Postgres Changes)
  useEffect(() => {
    const supabase = createClient()

    const channelInstance = supabase
      .channel(`chat_${channel.id}`)
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload: { payload: Message }) => {
          const newMsg = payload.payload
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom('smooth')
        }
      )
      .on(
        'broadcast',
        { event: 'message_updated' },
        (payload: { payload: { id: string; is_meeting_point: boolean } }) => {
          const { id, is_meeting_point } = payload.payload
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, is_meeting_point } : m))
          )
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
          // Attach sender profile if missing
          if (!newMsg.sender) {
            newMsg.sender = membersMap.current.get(newMsg.sender_id)
            if (!newMsg.sender) {
              const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newMsg.sender_id)
                .single()
              if (data) {
                newMsg.sender = data as Profile
                membersMap.current.set(newMsg.sender_id, data as Profile)
              }
            }
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
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const updated = payload.new as Message
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const deletedId = payload.old.id
          setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        }
      )
      .subscribe()

    realtimeChannelRef.current = channelInstance

    return () => {
      supabase.removeChannel(channelInstance)
    }
  }, [channel.id])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const content = input.trim()
    const isMeetingPt = asMeetingPoint
    setInput('')
    setAsMeetingPoint(false)
    setSending(true)

    const supabase = createClient()
    const { data, error } = await (supabase.from('messages') as any)
      .insert({
        channel_id: channel.id,
        sender_id: currentUser.id,
        content,
        is_meeting_point: isMeetingPt,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single()

    if (error) {
      console.error('Failed to send message:', error.message)
      setInput(content)
      setAsMeetingPoint(isMeetingPt)
    } else if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data as Message]
      })
      scrollToBottom('smooth')

      // Broadcast immediately to all active participants in this channel
      realtimeChannelRef.current?.send({
        type: 'broadcast',
        event: 'new_message',
        payload: data,
      })
    }

    setSending(false)
  }

  // Toggle Meeting Point
  const handleToggleMeetingPoint = async (
    messageId: string,
    currentVal: boolean
  ) => {
    // Optimistic
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, is_meeting_point: !currentVal } : m
      )
    )

    // Broadcast change
    realtimeChannelRef.current?.send({
      type: 'broadcast',
      event: 'message_updated',
      payload: { id: messageId, is_meeting_point: !currentVal },
    })

    const supabase = createClient()
    const { error } = await (supabase.from('messages') as any)
      .update({ is_meeting_point: !currentVal })
      .eq('id', messageId)

    if (error) {
      console.error('Failed to update meeting point status:', error.message)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_meeting_point: currentVal } : m
        )
      )
    }
  }

  // Convert meeting point message to a Task
  const handleConvertToTask = (message: Message) => {
    setTaskInitialTitle(message.content)
    setTaskSourceMessageId(message.id)
    setTaskDialogOpen(true)
  }

  // Jump to message in chat feed
  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary')
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2000)
    }
  }

  const meetingPoints = messages.filter((m) => m.is_meeting_point)

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-foreground flex items-center gap-2">
                <span>{channel.name}</span>
              </h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3 h-3" />
                <span>{members.length} team members</span>
              </p>
            </div>
          </div>

          {/* Meeting Points Toggle Button */}
          <button
            onClick={() => setShowMeetingPoints(!showMeetingPoints)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              showMeetingPoints || meetingPoints.length > 0
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-secondary/60 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                meetingPoints.length > 0 ? 'fill-amber-500 text-amber-500' : ''
              }`}
            />
            <span>Meeting Points</span>
            {meetingPoints.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center">
                {meetingPoints.length}
              </span>
            )}
          </button>
        </div>

        {/* Message Feed */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-1.5"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Welcome to #{channel.name}!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  This is the main workspace channel. Post meeting points, daily priorities, or questions for the whole team.
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                currentUser={currentUser}
                onToggleMeetingPoint={handleToggleMeetingPoint}
                onConvertToTask={handleConvertToTask}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Composer */}
        <div className="p-4 border-t border-border bg-card/40 space-y-2">
          {/* Options toolbar above textarea */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground transition-colors">
              <input
                type="checkbox"
                checked={asMeetingPoint}
                onChange={(e) => setAsMeetingPoint(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 border-border focus:ring-amber-500"
              />
              <span className="flex items-center gap-1 font-medium text-[11px]">
                <Star
                  className={`w-3 h-3 ${
                    asMeetingPoint ? 'fill-amber-500 text-amber-500' : ''
                  }`}
                />
                Post as Meeting Point
              </span>
            </label>

            <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
              Press Enter to send · Shift+Enter for new line
            </span>
          </div>

          {/* Input box */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage(e)
                }
              }}
              placeholder={`Message #${channel.name}...`}
              rows={1}
              className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground resize-none leading-relaxed"
            />

            <button
              type="submit"
              disabled={sending || !input.trim()}
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
      </div>

      {/* Meeting Points Side Panel */}
      {showMeetingPoints && (
        <MeetingPointsPanel
          meetingPoints={meetingPoints}
          currentUser={currentUser}
          onClose={() => setShowMeetingPoints(false)}
          onToggleMeetingPoint={handleToggleMeetingPoint}
          onConvertToTask={handleConvertToTask}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      {/* Convert to Task Modal */}
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        currentUser={currentUser}
        members={members}
        initialTitle={taskInitialTitle}
        sourceMessageId={taskSourceMessageId}
        onSuccess={() => {
          setTaskDialogOpen(false)
        }}
      />
    </div>
  )
}
