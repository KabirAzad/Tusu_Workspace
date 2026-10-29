import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Channel } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await req.json()
    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Valid target user ID required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Check if a DM channel already exists between these two users
    // Find DM channels where current user is a member
    const { data: myMemberships } = await adminClient
      .from('channel_members')
      .select('channel_id, channel:channels!inner(*)')
      .eq('user_id', user.id)
      .eq('channel.type', 'dm')

    let existingChannelId: string | null = null
    const myMembers = myMemberships as unknown as { channel_id: string }[] | null

    if (myMembers && myMembers.length > 0) {
      const candidateChannelIds = myMembers.map((m) => m.channel_id)

      // Check if target user is also in any of these candidate channels
      const { data: commonMemberships } = await adminClient
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', targetUserId)
        .in('channel_id', candidateChannelIds)
        .limit(1)

      const commonMembers = commonMemberships as unknown as { channel_id: string }[] | null
      if (commonMembers && commonMembers.length > 0) {
        existingChannelId = commonMembers[0].channel_id
      }
    }

    if (existingChannelId) {
      const { data: existingChannel } = await adminClient
        .from('channels')
        .select('*')
        .eq('id', existingChannelId)
        .single()

      return NextResponse.json({ channel: existingChannel as unknown as Channel })
    }

    // 2. If no channel exists, create a new DM channel
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

    // 3. Add both users to channel_members
    const { error: membersError } = await (
      adminClient.from('channel_members') as any
    ).insert([
      { channel_id: newChannel.id, user_id: user.id },
      { channel_id: newChannel.id, user_id: targetUserId },
    ])

    if (membersError) {
      throw new Error(membersError.message)
    }

    return NextResponse.json({ channel: newChannel as Channel })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
