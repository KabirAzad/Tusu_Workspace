'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { useAppContext } from '@/contexts/AppContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  MessageSquare,
  Mail,
  User,
  LogOut,
  ChevronRight,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** Only show for these roles (undefined = all roles) */
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

export function Sidebar() {
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

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border sticky top-0 shrink-0 z-40">
      {/* Brand & Notification Bell */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/90 dark:bg-zinc-900 border border-border/80 shadow-md shadow-primary/10 p-1 shrink-0">
            <Image
              src="/tusu.png"
              alt="TUSU Explore"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground leading-none">TUSU Workspace</p>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">tusuexplore</p>
          </div>
        </Link>

        <NotificationBell align="left" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
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
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'nav-item-active'
                  : 'text-sidebar-foreground/70 hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <span className="flex-1">{item.label}</span>

              {/* Real-time Task Pending Badge */}
              {isTasks && pendingTaskCount > 0 && (
                <span
                  id="sidebar-pending-tasks-badge"
                  title={`${pendingTaskCount} pending task${pendingTaskCount === 1 ? '' : 's'} assigned to you`}
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

              {isActive && (
                <ChevronRight className="h-3 w-3 text-primary/60 shrink-0" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/profile"
          id="nav-user-profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors group"
        >
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center ring-2 ring-primary/20 shrink-0">
              <span className="text-xs font-semibold text-primary">
                {getInitials(profile.full_name || profile.email)}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {profile.full_name || 'Set your name'}
            </p>
            <p className="text-xs text-muted-foreground capitalize truncate">{profile.role}</p>
          </div>
        </Link>

        <button
          id="sidebar-logout"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
