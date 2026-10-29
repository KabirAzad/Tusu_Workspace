import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId, note } = await req.json()
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Fetch current user profile to verify role and get sender name
    const { data: senderProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const sender = senderProfile as Profile | null
    if (!sender) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 2. Fetch target user profile
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    const target = targetProfile as Profile | null
    if (!target) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // 3. Find or create DM channel between user and targetUserId
    const { data: myMemberships } = await adminClient
      .from('channel_members')
      .select('channel_id, channel:channels!inner(*)')
      .eq('user_id', user.id)
      .eq('channel.type', 'dm')

    let channelId: string | null = null
    const myMembers = myMemberships as unknown as { channel_id: string }[] | null

    if (myMembers && myMembers.length > 0) {
      const candidateChannelIds = myMembers.map((m) => m.channel_id)

      const { data: commonMemberships } = await adminClient
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', targetUserId)
        .in('channel_id', candidateChannelIds)
        .limit(1)

      const commonMembers = commonMemberships as unknown as { channel_id: string }[] | null
      if (commonMembers && commonMembers.length > 0) {
        channelId = commonMembers[0].channel_id
      }
    }

    if (!channelId) {
      const { data: newChannel, error: channelError } = await (
        adminClient.from('channels') as any
      )
        .insert({
          name: 'dm',
          type: 'dm',
        })
        .select('*')
        .single()

      if (channelError || !newChannel) {
        throw new Error(channelError?.message || 'Failed to create DM channel')
      }

      await (adminClient.from('channel_members') as any).insert([
        { channel_id: newChannel.id, user_id: user.id },
        { channel_id: newChannel.id, user_id: targetUserId },
      ])

      channelId = newChannel.id
    }

    // 4. Post the update request message into the DM
    const messageContent =
      note?.trim() ||
      `🔔 Work Update Request: Hi ${
        target.full_name || target.email
      }, could you please share a progress update on your active tasks?`

    const { data: createdMessage, error: messageError } = await (
      adminClient.from('messages') as any
    )
      .insert({
        channel_id: channelId,
        sender_id: user.id,
        content: messageContent,
        is_update_request: true,
      })
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .single()

    if (messageError) {
      throw new Error(messageError.message)
    }

    // 5. Create in-app notification for the target user
    await (adminClient.from('notifications') as any).insert({
      user_id: targetUserId,
      type: 'update_requested',
      payload: {
        sender_id: user.id,
        sender_name: sender.full_name || sender.email,
        channel_id: channelId,
        message: messageContent,
      },
    })

    return NextResponse.json({
      success: true,
      channelId,
      message: createdMessage,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
