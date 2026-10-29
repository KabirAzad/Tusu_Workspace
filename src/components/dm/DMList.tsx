'use client'

import { useState } from 'react'
import type { Profile } from '@/types/database'
import {
  Search,
  User,
  ShieldAlert,
  Shield,
  BellRing,
  X,
  MessageSquare,
} from 'lucide-react'

interface DMListProps {
  members: Profile[]
  currentUser: Profile
  selectedUserId: string | null
  onSelectUser: (user: Profile) => void
  onRequestUpdate: (user: Profile) => void
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

export function DMList({
  members,
  currentUser,
  selectedUserId,
  onSelectUser,
  onRequestUpdate,
}: DMListProps) {
  const [search, setSearch] = useState('')
  const isManagerOrAdmin =
    currentUser.role === 'admin' || currentUser.role === 'manager'

  // Filter out self and filter by search
  const filteredMembers = members.filter((m) => {
    if (m.id === currentUser.id) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.full_name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="w-full md:w-80 h-full flex flex-col border-r border-border bg-card/40">
      {/* Header & Search */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-sm text-foreground">Direct Messages</h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teammates..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No team members found.
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isSelected = member.id === selectedUserId
            const roleBadge = ROLE_BADGES[member.role] || ROLE_BADGES.member
            const RoleIcon = roleBadge.icon

            return (
              <div
                key={member.id}
                onClick={() => onSelectUser(member)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-primary/10 border border-primary/30 shadow-2xs'
                    : 'hover:bg-secondary/40 border border-transparent'
                }`}
              >
                {/* User info */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {(member.full_name || member.email).charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {member.full_name || member.email}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full border font-medium inline-flex items-center gap-0.5 ${roleBadge.class}`}
                      >
                        <RoleIcon className="w-2 h-2" />
                        {roleBadge.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Request Update Action (Admin/Manager only) */}
                {isManagerOrAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRequestUpdate(member)
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1"
                    title={`Request work update from ${member.full_name || member.email}`}
                  >
                    <BellRing className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
