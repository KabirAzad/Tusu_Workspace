'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { createClient } from '@/lib/supabase/client'
import {
  Menu,
  X,
  LayoutDashboard,
  CheckSquare,
  Users2,
  MessageSquare,
  Mail,
  User,
  LogOut,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: Array<'admin' | 'manager' | 'member'>
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'My Tasks', icon: CheckSquare },
  { href: '/team-tasks', label: 'Team Tasks', icon: Users2, roles: ['admin', 'manager'] },
  { href: '/chat', label: 'Main Chat', icon: MessageSquare },
  { href: '/messages', label: 'Messages', icon: Mail },
  { href: '/members', label: 'Members', icon: Users2, roles: ['admin'] },
  { href: '/profile', label: 'Profile', icon: User },
]

import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useNotifications } from '@/contexts/NotificationContext'

/** Mobile-friendly top bar with hamburger drawer */
export function TopBar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAppContext()
  const { unreadDMCount, unreadChatCount, pendingTaskCount } = useNotifications()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile.role),
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Current page label
  const current = visibleItems.find(
    (item) => pathname === item.href || pathname.startsWith(item.href),
  )

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/90 dark:bg-zinc-900 border border-border/80 flex items-center justify-center p-0.5 shrink-0 shadow-xs">
            <Image
              src="/tusu.png"
              alt="TUSU Explore"
              width={28}
              height={28}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <span className="font-bold text-sm text-foreground">
            {current?.label ?? 'TUSU Workspace'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationBell align="right" />
          <button
            id="mobile-menu-toggle"
            onClick={() => setOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle navigation"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <nav
            className="absolute left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border py-6 px-3 space-y-0.5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-900 border border-border/80 flex items-center justify-center p-1 shadow-xs">
                <Image
                  src="/tusu.png"
                  alt="TUSU Explore"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">TUSU Workspace</p>
                <p className="text-xs text-muted-foreground">tusuexplore</p>
              </div>
            </div>

            {visibleItems.map((item) => {
              const isActive =
                pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/')
              const Icon = item.icon
              const isMessages = item.href === '/messages'
              const isChat = item.href === '/chat'
              const isTasks = item.href === '/tasks'

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'nav-item-active'
                      : 'text-sidebar-foreground/70 hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className="flex-1">{item.label}</span>

                  {/* Real-time Task Pending Badge */}
                  {isTasks && pendingTaskCount > 0 && (
                    <span
                      title={`${pendingTaskCount} pending tasks assigned to you`}
                      className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1 shadow-2xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {pendingTaskCount}
                    </span>
                  )}

                  {/* Real-time Unread Badges */}
                  {isMessages && unreadDMCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full animate-pulse shadow-sm">
                      {unreadDMCount}
                    </span>
                  )}
                  {isChat && unreadChatCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded-full animate-pulse shadow-sm">
                      {unreadChatCount}
                    </span>
                  )}
                </Link>
              )
            })}

            <div className="pt-4 border-t border-sidebar-border mt-4 space-y-1">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {getInitials(profile.full_name || profile.email)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
