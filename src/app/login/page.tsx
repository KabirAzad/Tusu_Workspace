'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginFormInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      setServerError(error.message)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative background blobs */}
      <div
        className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(243 75% 59%), transparent)' }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(280 65% 60%), transparent)' }}
      />

      <div className="w-full max-w-md mx-auto px-4">
        {/* Logo + header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/80 mb-4 shadow-xl shadow-primary/10">
            <Image
              src="/tusu.png"
              alt="TUSU Explore"
              width={80}
              height={80}
              className="w-16 h-16 object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome to TUSU Workspace
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Sign in to access your team&apos;s workspace
          </p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8 shadow-xl">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@tusuexplore.com"
                {...register('email')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  id="toggle-password-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3.5 py-2.5">
                <p className="text-sm text-destructive">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            No account? Contact your admin to be invited.
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6 opacity-60">
          © {new Date().getFullYear()} tusuexplore · Internal use only
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginFormInner />
    </Suspense>
  )
}
