// ============================================================
// Supabase Database Types
// Structured to match @supabase/supabase-js generic expectations
// ============================================================

export type UserRole = 'admin' | 'manager' | 'member'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type ChannelType = 'group' | 'dm'
export type NotifType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'new_message'
  | 'update_requested'
  | 'update_received'

// ── Entity interfaces ──────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface Channel {
  id: string
  name: string
  type: ChannelType
  created_at: string
}

export interface ChannelMember {
  channel_id: string
  user_id: string
  joined_at: string
}

export interface Message {
  id: string
  channel_id: string
  sender_id: string
  content: string
  is_meeting_point: boolean
  is_update_request: boolean
  created_at: string
  sender?: Profile
}

export interface Task {
  id: string
  title: string
  description: string | null
  assignee_id: string | null
  created_by: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  is_personal: boolean
  source_message_id: string | null
  created_at: string
  updated_at: string
  assignee?: Profile
  creator?: Profile
}

export interface TaskUpdate {
  id: string
  task_id: string
  user_id: string
  note: string
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: NotifType
  payload: Record<string, unknown>
  is_read: boolean
  created_at: string
}

// ── Supabase Database generic ─────────────────────────────
// The Row/Insert/Update types must match the Supabase client's
// expected generic shape for typed queries to work correctly.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          full_name?: string
          email: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          full_name?: string
          email?: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      channels: {
        Row: Channel
        Insert: {
          id?: string
          name: string
          type?: ChannelType
          created_at?: string
        }
        Update: {
          name?: string
          type?: ChannelType
        }
        Relationships: []
      }
      channel_members: {
        Row: ChannelMember
        Insert: {
          channel_id: string
          user_id: string
          joined_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      messages: {
        Row: Omit<Message, 'sender'>
        Insert: {
          id?: string
          channel_id: string
          sender_id: string
          content: string
          is_meeting_point?: boolean
          is_update_request?: boolean
          created_at?: string
        }
        Update: {
          is_meeting_point?: boolean
        }
        Relationships: []
      }
      tasks: {
        Row: Omit<Task, 'assignee' | 'creator'>
        Insert: {
          id?: string
          title: string
          description?: string | null
          assignee_id?: string | null
          created_by: string
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          is_personal?: boolean
          source_message_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          assignee_id?: string | null
          status?: TaskStatus
          priority?: TaskPriority
          due_date?: string | null
          is_personal?: boolean
        }
        Relationships: []
      }
      task_updates: {
        Row: Omit<TaskUpdate, 'user'>
        Insert: {
          id?: string
          task_id: string
          user_id: string
          note: string
          created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: {
          id?: string
          user_id: string
          type: NotifType
          payload?: Record<string, unknown>
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_admin_or_manager: { Args: Record<string, never>; Returns: boolean }
      get_my_role: { Args: Record<string, never>; Returns: UserRole }
    }
    Enums: {
      user_role: UserRole
      task_status: TaskStatus
      task_priority: TaskPriority
      channel_type: ChannelType
      notif_type: NotifType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
