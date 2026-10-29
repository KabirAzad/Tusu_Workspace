import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root page – redirect to /dashboard if logged in,
 * otherwise middleware will redirect to /login.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
