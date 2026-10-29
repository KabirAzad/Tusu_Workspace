import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendMemberCredentialsEmail } from '@/lib/email'
import type { Profile, UserRole } from '@/types/database'

/**
 * POST /api/admin/invite
 * Direct member creation by admin.
 * Body: { email: string, full_name: string, role: UserRole, password?: string }
 *
 * 1. Verifies caller is active Admin.
 * 2. Directly creates the user in Supabase Auth (email_confirm: true).
 * 3. Upserts profile in public.profiles.
 * 4. Adds to the #Main channel.
 * 5. Automatically sends email with login credentials (or logs for dev).
 */
export async function POST(request: NextRequest) {
  // 1. Verify admin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    return NextResponse.json(
      { error: 'Forbidden: admin access required' },
      { status: 403 }
    )
  }

  // 2. Parse request
  let body: {
    email: string
    full_name: string
    role: UserRole
    password?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, full_name, role } = body

  if (!email || !full_name || !role) {
    return NextResponse.json(
      { error: 'email, full_name, and role are required' },
      { status: 400 }
    )
  }

  if (!['admin', 'manager', 'member'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Generate a secure password if not provided
  const temporaryPassword =
    body.password && body.password.length >= 6
      ? body.password
      : `Tusu@${Math.floor(1000 + Math.random() * 9000)}!`

  const adminClient = createAdminClient()

  // 3. Create the user directly in Supabase Auth
  const { data: userData, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    })

  if (createError) {
    // If user already exists in auth, handle gracefully
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  const newUserId = userData.user.id

  // 4. Upsert profile with full details
  const { error: profileError } = await (adminClient
    .from('profiles') as any)
    .upsert({
      id: newUserId,
      email,
      full_name,
      role,
      is_active: true,
    })

  if (profileError) {
    console.error('Profile upsert error:', profileError.message)
  }

  // 5. Enroll into #Main group channel
  await (adminClient.from('channel_members') as any).upsert({
    channel_id: '00000000-0000-0000-0000-000000000001',
    user_id: newUserId,
  })

  // 6. Send email notification with login ID and password
  const origin = request.nextUrl.origin || 'http://localhost:3000'
  const emailResult = await sendMemberCredentialsEmail({
    to: email,
    fullName: full_name,
    password: temporaryPassword,
    role,
    loginUrl: `${origin}/login`,
  })

  return NextResponse.json({
    success: true,
    message: `Member ${full_name} created successfully!`,
    user: {
      id: newUserId,
      email,
      full_name,
      role,
      password: temporaryPassword,
    },
    emailSent: emailResult.sent,
    emailError: emailResult.error,
  })
}
