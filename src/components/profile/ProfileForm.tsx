'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'
import { getInitials } from '@/lib/utils'
import { Loader2, Save, Shield, UserCheck, User } from 'lucide-react'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', member: 'Member' }
const ROLE_ICONS = {
  admin: Shield,
  manager: UserCheck,
  member: User,
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [saved, setSaved] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: profile.full_name },
  })

  const onSubmit = async (data: ProfileFormData) => {
    setServerError(null)
    setSaved(false)
    const supabase = createClient()

    const { error } = await (supabase
      .from('profiles') as any)
      .update({ full_name: data.full_name })
      .eq('id', profile.id)

    if (error) {
      setServerError(error.message)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const RoleIcon = ROLE_ICONS[profile.role]

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6">
      {/* Avatar display */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center ring-2 ring-primary/20">
          <span className="text-xl font-bold text-primary">
            {getInitials(profile.full_name || profile.email)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-foreground">{profile.full_name || '(No name set)'}</p>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900">
            <RoleIcon className="h-3 w-3" />
            {ROLE_LABELS[profile.role]}
          </span>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Edit form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="profile-full-name" className="block text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="profile-full-name"
            type="text"
            placeholder="Your full name"
            {...register('full_name')}
            className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Role</label>
            <input
              type="text"
              value={ROLE_LABELS[profile.role]}
              disabled
              className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-muted/50 text-sm text-muted-foreground cursor-not-allowed capitalize"
            />
            <p className="text-xs text-muted-foreground">Contact your admin to change your role.</p>
          </div>
        </div>

        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5">
            <p className="text-sm text-destructive">{serverError}</p>
          </div>
        )}

        {saved && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-3.5 py-2.5">
            <p className="text-sm text-emerald-600">Profile saved successfully!</p>
          </div>
        )}

        <button
          id="save-profile-btn"
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
