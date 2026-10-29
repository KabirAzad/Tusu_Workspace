'use client'

import { useState, useTransition } from 'react'
import { getInitials, formatDate } from '@/lib/utils'
import type { Profile, UserRole } from '@/types/database'
import { Shield, UserCheck, User, Ban, CheckCircle2, Loader2 } from 'lucide-react'

interface MembersTableProps {
  members: Profile[]
}

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-3.5 w-3.5" />,
  manager: <UserCheck className="h-3.5 w-3.5" />,
  member: <User className="h-3.5 w-3.5" />,
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
  manager: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
  member: 'text-stone-600 bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700',
}

export function MembersTable({ members: initialMembers }: MembersTableProps) {
  const [members, setMembers] = useState(initialMembers)
  const [isPending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateMember = async (
    memberId: string,
    updates: { role?: UserRole; is_active?: boolean },
  ) => {
    setError(null)
    setLoadingId(memberId)

    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error || 'Failed to update member')
        return
      }

      // Optimistic update
      startTransition(() => {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m,
          ),
        )
      })
    } catch {
      setError('Network error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Member</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-5 py-3.5 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    No members found. Invite someone to get started.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const isLoading = loadingId === member.id

                  return (
                    <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-primary">
                                {getInitials(member.full_name || member.email)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {member.full_name || '(No name)'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role selector */}
                      <td className="px-5 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${ROLE_COLORS[member.role]}`}>
                          {ROLE_ICONS[member.role]}
                          <span className="capitalize">{member.role}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {member.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <Ban className="h-3.5 w-3.5" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4 text-muted-foreground text-xs">
                        {formatDate(member.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              {/* Change role dropdown */}
                              <select
                                id={`member-role-${member.id}`}
                                defaultValue={member.role}
                                onChange={(e) =>
                                  updateMember(member.id, { role: e.target.value as UserRole })
                                }
                                className="text-xs px-2 py-1.5 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              >
                                <option value="member">Member</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                              </select>

                              {/* Toggle active / deactivate */}
                              <button
                                id={`member-toggle-active-${member.id}`}
                                onClick={() =>
                                  updateMember(member.id, { is_active: !member.is_active })
                                }
                                className={`text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors ${
                                  member.is_active
                                    ? 'border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                              >
                                {member.is_active ? 'Deactivate' : 'Reactivate'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
