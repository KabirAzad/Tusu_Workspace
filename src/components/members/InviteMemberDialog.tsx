'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  UserPlus,
  X,
  Mail,
  User,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'

const addMemberSchema = z.object({
  email: z.string().email('Please enter a valid work email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'member']),
  password: z.string().optional(),
})

type AddMemberForm = z.infer<typeof addMemberSchema>

interface AddMemberDialogProps {
  onSuccess?: () => void
  triggerClassName?: string
  buttonLabel?: string
}

export function AddMemberDialog({
  onSuccess,
  triggerClassName,
  buttonLabel = 'Add Member',
}: AddMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdData, setCreatedData] = useState<{
    email: string
    fullName: string
    role: string
    password: string
    emailSent: boolean
    emailError?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { role: 'member', password: '' },
  })

  const selectedRole = watch('role')
  const currentPassword = watch('password')

  const handleGeneratePassword = () => {
    const randomPass = `Tusu@${Math.floor(1000 + Math.random() * 9000)}!`
    setValue('password', randomPass)
  }

  const onSubmit = async (data: AddMemberForm) => {
    setServerError(null)

    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const body = await res.json()

      if (!res.ok) {
        setServerError(body.error || 'Failed to create member')
        return
      }

      setCreatedData({
        email: body.user.email,
        fullName: body.user.full_name,
        role: body.user.role,
        password: body.user.password,
        emailSent: Boolean(body.emailSent),
        emailError: body.emailError,
      })

      onSuccess?.()
    } catch {
      setServerError('Network error – please try again')
    }
  }

  const handleClose = () => {
    setOpen(false)
    setServerError(null)
    setCreatedData(null)
    setCopied(false)
    setShowPassword(false)
    reset()
  }

  const handleCopyCredentials = () => {
    if (!createdData) return
    const text = `TUSU Workspace Account Credentials\n\nLogin URL: ${window.location.origin}/login\nAccount ID: ${createdData.email}\nPassword: ${createdData.password}\nRole: ${createdData.role}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modalContent = open && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Dialog Card */}
      <div
        className="relative bg-card/95 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="add-member-dialog-close"
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20 shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Add Team Member
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Directly create a user account and send login credentials.
            </p>
          </div>
        </div>

        {createdData ? (
          /* Success Screen with Credentials */
          <div className="space-y-4 animate-in zoom-in-95 duration-200">
            {createdData.emailSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1.5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm text-foreground">
                  Member Created & Email Sent!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Login credentials have been delivered to <strong className="font-medium text-foreground">{createdData.email}</strong>.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto text-base font-bold">
                  !
                </div>
                <p className="font-bold text-sm text-foreground">
                  Member Created Successfully!
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Email was not delivered: SMTP / email service is not configured in <span className="font-mono font-medium">.env.local</span>.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Please copy the credentials below and share them with the user manually.
                </p>
              </div>
            )}

            {/* Credentials Card */}
            <div className="p-4 rounded-xl bg-background border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Full Name:
                </span>
                <span className="font-semibold text-foreground">
                  {createdData.fullName}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Role:</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary/10 text-primary">
                  {createdData.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Account ID (Email):
                </span>
                <span className="font-semibold text-foreground">
                  {createdData.email}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <span className="text-muted-foreground font-medium">
                  Password:
                </span>
                <code className="px-2 py-1 rounded bg-primary/10 text-primary font-mono font-bold text-xs">
                  {createdData.password}
                </code>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Credentials</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Member Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="add-full-name"
                className="block text-xs font-semibold text-foreground"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="add-full-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  {...register('full_name')}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-input bg-background/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-destructive">
                  {errors.full_name.message}
                </p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="add-email"
                className="block text-xs font-semibold text-foreground"
              >
                Work Email Address (Account ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="add-email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-input bg-background/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field with Generate Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="add-password"
                  className="block text-xs font-semibold text-foreground"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Auto-generate
                </button>
              </div>

              <div className="relative">
                <Key className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="add-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Auto-generated if left blank"
                  {...register('password')}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-input bg-background/80 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Leave blank to automatically create a secure random password.
              </p>
            </div>

            {/* Role Selection Cards */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-foreground">
                Role & Permissions
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    value: 'member',
                    label: 'Member',
                    icon: User,
                    desc: 'Tasks & Chat',
                  },
                  {
                    value: 'manager',
                    label: 'Manager',
                    icon: Shield,
                    desc: 'Assign Tasks',
                  },
                  {
                    value: 'admin',
                    label: 'Admin',
                    icon: ShieldAlert,
                    desc: 'Full Access',
                  },
                ].map((item) => {
                  const Icon = item.icon
                  const isSelected = selectedRole === item.value

                  return (
                    <div
                      key={item.value}
                      onClick={() =>
                        setValue(
                          'role',
                          item.value as 'member' | 'manager' | 'admin'
                        )
                      }
                      className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary/30 shadow-xs'
                          : 'bg-background/60 border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <p className="text-xs font-bold leading-none">
                        {item.label}
                      </p>
                      <p className="text-[10px] mt-1 opacity-80 line-clamp-1">
                        {item.desc}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {serverError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="add-member-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isSubmitting ? 'Creating Member…' : 'Add Member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Trigger Button */}
      <button
        id="add-member-btn"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ||
          'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary text-secondary-foreground border border-border text-xs font-semibold hover:bg-accent transition-all cursor-pointer'
        }
      >
        <UserPlus className="h-4 w-4" />
        {buttonLabel}
      </button>

      {/* Portal directly to document.body */}
      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  )
}

// Backward-compatible alias
export const InviteMemberDialog = AddMemberDialog
