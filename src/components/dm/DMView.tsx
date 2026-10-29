'use client'

import { useEffect, useState } from 'react'
import type { Channel, Profile } from '@/types/database'
import { DMList } from './DMList'
import { DMConversation } from './DMConversation'
import { RequestUpdateModal } from './RequestUpdateModal'

interface DMViewProps {
  members: Profile[]
  currentUser: Profile
  initialTargetUserId?: string
}

export function DMView({
  members,
  currentUser,
  initialTargetUserId,
}: DMViewProps) {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(() => {
    if (initialTargetUserId) {
      return members.find((m) => m.id === initialTargetUserId) || null
    }
    // Default to first teammate if available
    const firstTeammate = members.find((m) => m.id !== currentUser.id)
    return firstTeammate || null
  })

  const [channel, setChannel] = useState<Channel | null>(null)
  const [loadingChannel, setLoadingChannel] = useState(false)

  // Request update modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestTargetUser, setRequestTargetUser] = useState<Profile | null>(null)

  // Fetch or create DM channel whenever selectedUser changes
  useEffect(() => {
    if (!selectedUser) {
      setChannel(null)
      return
    }

    let isMounted = true
    async function getOrCreateChannel() {
      setLoadingChannel(true)
      try {
        const res = await fetch('/api/dm/get-or-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: selectedUser!.id }),
        })

        const data = await res.json()
        if (isMounted) {
          if (res.ok && data.channel) {
            setChannel(data.channel)
          } else {
            console.error('Failed to get or create DM channel:', data.error)
          }
          setLoadingChannel(false)
        }
      } catch (err) {
        console.error('Error fetching DM channel:', err)
        if (isMounted) setLoadingChannel(false)
      }
    }

    getOrCreateChannel()

    return () => {
      isMounted = false
    }
  }, [selectedUser?.id])

  const handleOpenRequestUpdate = (user: Profile) => {
    setRequestTargetUser(user)
    setRequestModalOpen(true)
  }

  const handleRequestSuccess = (channelId: string) => {
    if (requestTargetUser && requestTargetUser.id !== selectedUser?.id) {
      setSelectedUser(requestTargetUser)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl border border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
      {/* Teammates List Sidebar */}
      <DMList
        members={members}
        currentUser={currentUser}
        selectedUserId={selectedUser?.id || null}
        onSelectUser={setSelectedUser}
        onRequestUpdate={handleOpenRequestUpdate}
      />

      {/* Conversation View */}
      <DMConversation
        channel={channel}
        targetUser={selectedUser}
        currentUser={currentUser}
        onRequestUpdate={handleOpenRequestUpdate}
        loadingChannel={loadingChannel}
      />

      {/* Request Update Dialog */}
      <RequestUpdateModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        targetUser={requestTargetUser}
        onSuccess={handleRequestSuccess}
      />
    </div>
  )
}
