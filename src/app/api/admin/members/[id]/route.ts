import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types/database'

/**
 * PATCH /api/admin/members/[id]
 * Body: { role?: UserRole, is_active?: boolean }
 *
 * Allows admins to update another member's role or active status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: memberId } = await params

  // Verify admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  const callerProfile = data as Pick<Profile, 'role' | 'is_active'> | null

  if (callerProfile?.role !== 'admin' || !callerProfile?.is_active) {
    return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 })
  }

  // Parse body
  let body: { role?: UserRole; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (body.role !== undefined) {
    if (!['admin', 'manager', 'member'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    updates.role = body.role
  }

  if (body.is_active !== undefined) {
    updates.is_active = body.is_active
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Use admin client to bypass RLS
  const adminClient = createAdminClient()

  const { error } = await (adminClient
    .from('profiles') as any)
    .update(updates)
    .eq('id', memberId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
