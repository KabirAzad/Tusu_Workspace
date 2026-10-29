'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAppContext } from './AppContext'
import { playMessageSound, playAlertSound } from '@/lib/sound'
import type { Message, Profile } from '@/types/database'

export const MAIN_CHANNEL_ID = '00000000-0000-0000-0000-000000000001'

export interface ToastItem {
  id: string
  type: 'dm' | 'update_request' | 'update_response' | 'chat' | 'system'
  title: string
  message: string
  senderName?: string
  senderAvatar?: string | null
  linkUrl?: string
  timestamp: string
}

export interface AppNotificationItem {
  id: string
  user_id?: string
  type:
    | 'update_requested'
    | 'update_received'
    | 'new_message'
    | 'task_assigned'
    | 'chat_message'
  payload: {
    sender_id?: string
    sender_name?: string
    sender_avatar?: string | null
    channel_id?: string
    message?: string
    note?: string
    task_id?: string | null
    [key: string]: unknown
  }
  is_read: boolean
  created_at: string
}

interface NotificationContextValue {
  toasts: ToastItem[]
  dismissToast: (id: string) => void
  unreadDMCount: number
  unreadChatCount: number
  pendingTaskCount: number
  refreshPendingTaskCount: () => Promise<void>
  recentNotifications: AppNotificationItem[]
  soundEnabled: boolean
  setSoundEnabled: (val: boolean) => void
  markAllNotificationsAsRead: () => Promise<void>
  clearUnreadDM: () => void
  clearUnreadChat: () => void
  broadcastNotification: (
    recipientUserId: string,
    payload: Omit<ToastItem, 'id' | 'timestamp'>
  ) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAppContext()
  const pathname = usePathname()

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [unreadDMCount, setUnreadDMCount] = useState<number>(0)
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0)
  const [pendingTaskCount, setPendingTaskCount] = useState<number>(0)
  const [recentNotifications, setRecentNotifications] = useState<
    AppNotificationItem[]
  >([])
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)

  const shownToastIdsRef = useRef<Set<string>>(new Set())
  const pathnameRef = useRef<string>(pathname)
  pathnameRef.current = pathname

  // Fetch pending tasks count for the current user
  const fetchPendingTasksCount = useCallback(async () => {
    if (!profile?.id) return
    try {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', profile.id)
        .neq('status', 'done')

      if (!error && typeof count === 'number') {
        setPendingTaskCount(count)
      }
    } catch (e) {
      console.error('Failed to fetch pending tasks count:', e)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchPendingTasksCount()
  }, [fetchPendingTasksCount])

  // Clear badges when visiting respective sections
  useEffect(() => {
    if (pathname.startsWith('/messages')) {
      setUnreadDMCount(0)
    }
    if (pathname.startsWith('/chat')) {
      setUnreadChatCount(0)
      if (typeof window !== 'undefined' && profile?.id) {
        localStorage.setItem(
          `last_read_main_chat_${profile.id}`,
          new Date().toISOString()
        )
      }
      setRecentNotifications((prev) =>
        prev.map((n) =>
          n.type === 'chat_message' ? { ...n, is_read: true } : n
        )
      )
    }
  }, [pathname, profile?.id])

  // Dismiss a toast
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // Push a new toast with sound & auto-dismiss
  const addToast = useCallback(
    (item: Omit<ToastItem, 'id' | 'timestamp'> & { id?: string }) => {
      const id =
        item.id ||
        `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      if (shownToastIdsRef.current.has(id)) return
      shownToastIdsRef.current.add(id)

      const toastItem: ToastItem = {
        ...item,
        id,
        timestamp: new Date().toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        }),
      }

      setToasts((prev) => [toastItem, ...prev.slice(0, 4)])

      // Play sound
      if (soundEnabled) {
        if (item.type === 'update_request') {
          playAlertSound()
        } else {
          playMessageSound()
        }
      }

      // Auto dismiss after 6 seconds
      setTimeout(() => {
        dismissToast(id)
      }, 6000)
    },
    [dismissToast, soundEnabled]
  )

  // Fetch initial notifications from DB + unread Main Chat messages
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()

    async function loadNotificationsAndUnreadChat() {
      // 1. Fetch DB notifications
      const { data: dbNotifs } = await (supabase
        .from('notifications') as any)
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const formattedDbNotifs: AppNotificationItem[] = (dbNotifs || []).map(
        (n: any) => ({
          id: n.id,
          user_id: n.user_id,
          type: n.type,
          payload: n.payload || {},
          is_read: n.is_read,
          created_at: n.created_at,
        })
      )

      // 2. Fetch recent Main Chat messages
      const lastRead =
        typeof window !== 'undefined'
          ? localStorage.getItem(`last_read_main_chat_${profile.id}`)
          : null

      const { data: mainMessages } = await (supabase
        .from('messages') as any)
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .eq('channel_id', MAIN_CHANNEL_ID)
        .order('created_at', { ascending: false })
        .limit(15)

      let unreadMainCount = 0
      const formattedChatNotifs: AppNotificationItem[] = []

      if (mainMessages) {
        mainMessages.forEach((msg: any) => {
          if (msg.sender_id === profile.id) return
          const isUnread = lastRead ? new Date(msg.created_at) > new Date(lastRead) : true
          if (isUnread) unreadMainCount++

          formattedChatNotifs.push({
            id: `chat_msg_${msg.id}`,
            type: 'chat_message',
            payload: {
              sender_id: msg.sender_id,
              sender_name: msg.sender?.full_name || msg.sender?.email || 'Teammate',
              sender_avatar: msg.sender?.avatar_url || null,
              channel_id: MAIN_CHANNEL_ID,
              message: msg.content,
            },
            is_read: !isUnread,
            created_at: msg.created_at,
          })
        })
      }

      // If user is not currently in /chat, show the calculated unread chat count
      if (!pathnameRef.current.startsWith('/chat')) {
        setUnreadChatCount(unreadMainCount)
      }

      // Calculate unread DMs
      const unreadDbCount = formattedDbNotifs.filter((n) => !n.is_read).length
      if (!pathnameRef.current.startsWith('/messages')) {
        setUnreadDMCount(unreadDbCount)
      }

      // Merge and sort all notifications by date descending
      const combined = [...formattedDbNotifs, ...formattedChatNotifs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setRecentNotifications(combined.slice(0, 25))
    }

    loadNotificationsAndUnreadChat()
  }, [profile?.id])

  // Direct DM broadcast sender helper
  const broadcastNotification = useCallback(
    (recipientUserId: string, payload: Omit<ToastItem, 'id' | 'timestamp'>) => {
      try {
        const supabase = createClient()
        const channel = supabase.channel(`user_notifications_${recipientUserId}`)
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'new_notification',
              payload: {
                ...payload,
                id: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              },
            })
            setTimeout(() => {
              supabase.removeChannel(channel)
            }, 1000)
          }
        })
      } catch (e) {
        console.error('Failed to broadcast notification:', e)
      }
    },
    []
  )

  // Real-time Subscriptions (Personal DMs + Main Chat Broadcast + DB Changes)
  useEffect(() => {
    if (!profile?.id) return
    const supabase = createClient()

    // 1. Personal Direct Message Notifications
    const personalChannel = supabase
      .channel(`user_notifications_${profile.id}`)
      .on(
        'broadcast',
        { event: 'new_notification' },
        ({ payload }: { payload: ToastItem }) => {
          addToast({
            id: payload.id,
            type: payload.type,
            title: payload.title,
            message: payload.message,
            senderName: payload.senderName,
            senderAvatar: payload.senderAvatar,
            linkUrl: payload.linkUrl,
          })

          if (!pathnameRef.current.startsWith('/messages')) {
            setUnreadDMCount((c) => c + 1)
          }

          // Add to recent notifications list in bell
          setRecentNotifications((prev) => [
            {
              id: payload.id,
              type: payload.type === 'update_request' ? 'update_requested' : 'new_message',
              payload: {
                sender_name: payload.senderName,
                sender_avatar: payload.senderAvatar,
                message: payload.message,
                channel_id: payload.linkUrl,
              },
              is_read: false,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ])
        }
      )
      .subscribe()

    // 2. Main Chat Broadcast Channel (chat_00000000-0000-0000-0000-000000000001)
    // Listens to messages broadcasted live by ChatWindow from any teammate
    const mainChatChannel = supabase
      .channel(`chat_${MAIN_CHANNEL_ID}`)
      .on(
        'broadcast',
        { event: 'new_message' },
        (payload: { payload: Message }) => {
          const newMsg = payload.payload
          if (newMsg.sender_id === profile.id) return

          const senderName =
            newMsg.sender?.full_name || newMsg.sender?.email || 'Teammate'

          // If user is NOT currently inside /chat, pop up toast, chime, and badge!
          if (!pathnameRef.current.startsWith('/chat')) {
            setUnreadChatCount((c) => c + 1)

            addToast({
              id: `chat_${newMsg.id}`,
              type: 'chat',
              title: `#Main • ${senderName}`,
              message: newMsg.content,
              senderName,
              senderAvatar: newMsg.sender?.avatar_url,
              linkUrl: '/chat',
            })

            setRecentNotifications((prev) => [
              {
                id: `chat_live_${newMsg.id}`,
                type: 'chat_message',
                payload: {
                  sender_id: newMsg.sender_id,
                  sender_name: senderName,
                  sender_avatar: newMsg.sender?.avatar_url,
                  channel_id: MAIN_CHANNEL_ID,
                  message: newMsg.content,
                },
                is_read: false,
                created_at: newMsg.created_at || new Date().toISOString(),
              },
              ...prev.filter((item) => item.id !== `chat_live_${newMsg.id}`),
            ])
          } else {
            // User is on /chat, but if window/tab is blurred or hidden, play audio cue
            if (typeof document !== 'undefined' && document.hidden) {
              if (soundEnabled) playMessageSound()
            }
          }
        }
      )
      .subscribe()

    // 3. PostgreSQL Database Realtime Changes on `notifications` table
    const dbNotifChannel = supabase
      .channel(`db_notifications_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as any
          const p = (newNotif.payload || {}) as Record<string, any>
          const title =
            newNotif.type === 'update_requested'
              ? `🔔 Work Update Requested`
              : newNotif.type === 'update_received'
              ? `✅ Work Update Submitted`
              : `💬 Message from ${p.sender_name || 'Teammate'}`

          const message =
            p.message || p.note || 'You have received a new notification.'

          addToast({
            id: newNotif.id,
            type:
              newNotif.type === 'update_requested'
                ? 'update_request'
                : newNotif.type === 'update_received'
                ? 'update_response'
                : 'dm',
            title,
            message,
            senderName: p.sender_name,
            linkUrl: `/messages${p.sender_id ? `?userId=${p.sender_id}` : ''}`,
          })

          setRecentNotifications((prev) => [
            {
              id: newNotif.id,
              type: newNotif.type,
              payload: p,
              is_read: false,
              created_at: newNotif.created_at,
            },
            ...prev,
          ])

          if (!pathnameRef.current.startsWith('/messages')) {
            setUnreadDMCount((c) => c + 1)
          }
        }
      )
      .subscribe()

    // 4. PostgreSQL Realtime Changes on `messages` table for `#Main`
    const dbMessagesChannel = supabase
      .channel('db_main_chat_messages_global')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${MAIN_CHANNEL_ID}`,
        },
        async (payload) => {
          const newMsg = payload.new as any
          if (newMsg.sender_id === profile.id) return

          if (!pathnameRef.current.startsWith('/chat')) {
            let senderName = 'Teammate'
            let senderAvatar: string | null = null

            const { data: sender } = await (supabase
              .from('profiles') as any)
              .select('full_name, email, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()

            if (sender) {
              senderName = sender.full_name || sender.email
              senderAvatar = sender.avatar_url
            }

            addToast({
              id: `db_msg_${newMsg.id}`,
              type: 'chat',
              title: `#Main • ${senderName}`,
              message: newMsg.content,
              senderName,
              senderAvatar,
              linkUrl: '/chat',
            })

            setUnreadChatCount((c) => c + 1)

            setRecentNotifications((prev) => [
              {
                id: `chat_db_${newMsg.id}`,
                type: 'chat_message',
                payload: {
                  sender_id: newMsg.sender_id,
                  sender_name: senderName,
                  sender_avatar: senderAvatar,
                  channel_id: MAIN_CHANNEL_ID,
                  message: newMsg.content,
                },
                is_read: false,
                created_at: newMsg.created_at,
              },
              ...prev.filter((item) => item.id !== `chat_db_${newMsg.id}`),
            ])
          }
        }
      )
      .subscribe()

    // 5. Tasks Realtime Channel (Updates pending task badge live)
    const tasksChannel = supabase
      .channel(`tasks_pending_sync_${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchPendingTasksCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(personalChannel)
      supabase.removeChannel(mainChatChannel)
      supabase.removeChannel(dbNotifChannel)
      supabase.removeChannel(dbMessagesChannel)
      supabase.removeChannel(tasksChannel)
    }
  }, [profile?.id, addToast, soundEnabled, fetchPendingTasksCount])

  // Mark all notifications as read in DB and locally
  const markAllNotificationsAsRead = async () => {
    if (!profile?.id) return
    const supabase = createClient()

    // Mark DB notifications read
    await (supabase.from('notifications') as any)
      .update({ is_read: true })
      .eq('user_id', profile.id)

    // Mark Main Chat as read in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `last_read_main_chat_${profile.id}`,
        new Date().toISOString()
      )
    }

    setRecentNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )
    setUnreadDMCount(0)
    setUnreadChatCount(0)
  }

  const clearUnreadDM = () => setUnreadDMCount(0)
  const clearUnreadChat = () => {
    setUnreadChatCount(0)
    if (typeof window !== 'undefined' && profile?.id) {
      localStorage.setItem(
        `last_read_main_chat_${profile.id}`,
        new Date().toISOString()
      )
    }
  }

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        dismissToast,
        unreadDMCount,
        unreadChatCount,
        pendingTaskCount,
        refreshPendingTaskCount: fetchPendingTasksCount,
        recentNotifications,
        soundEnabled,
        setSoundEnabled,
        markAllNotificationsAsRead,
        clearUnreadDM,
        clearUnreadChat,
        broadcastNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    )
  }
  return ctx
}
