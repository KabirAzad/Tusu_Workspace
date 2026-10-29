import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ChatWindow } from '@/components/chat/ChatWindow'
import type { Channel, Message, Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Main Chat' }

const MAIN_CHANNEL_ID = '00000000-0000-0000-0000-000000000001'

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch current user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  // Use admin client to ensure channel and membership exist without RLS friction
  const adminClient = createAdminClient()

  // 1. Ensure Main channel exists
  let channel: Channel | null = null
  const { data: existingChannel } = await adminClient
    .from('channels')
    .select('*')
    .eq('id', MAIN_CHANNEL_ID)
    .single()

  if (existingChannel) {
    channel = existingChannel as Channel
  } else {
    // Fallback: create Main channel if not seeded
    const { data: createdChannel } = await (adminClient.from('channels') as any)
      .insert({
        id: MAIN_CHANNEL_ID,
        name: 'Main',
        type: 'group',
      })
      .select('*')
      .single()

    channel = (createdChannel as Channel) || {
      id: MAIN_CHANNEL_ID,
      name: 'Main',
      type: 'group',
      created_at: new Date().toISOString(),
    }
  }

  // 2. Auto-enroll user into the Main channel if not already enrolled
  await (adminClient.from('channel_members') as any)
    .upsert(
      {
        channel_id: channel.id,
        user_id: user.id,
      },
      { onConflict: 'channel_id,user_id' }
    )

  // 3. Fetch initial messages with sender profile
  const { data: messagesData, error: messagesError } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(*)')
    .eq('channel_id', channel.id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    console.error('Error fetching chat messages:', messagesError.message)
  }

  // 4. Fetch active team members
  const { data: membersData } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  const initialMessages = (messagesData as unknown as Message[]) || []
  const members = (membersData as unknown as Profile[]) || []

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Main Chat
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          Real-time team chat, meeting point summaries, and action items.
        </p>
      </div>

      <ChatWindow
        channel={channel}
        initialMessages={initialMessages}
        currentUser={profile}
        members={members}
      />
    </div>
  )
}
