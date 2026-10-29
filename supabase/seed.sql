-- ============================================================
-- TUSU Workspace – Seed Script
-- Run AFTER the schema migration and AFTER you create your
-- admin user through Supabase Auth (Dashboard → Auth → Users
-- → "Add user" with email/password).
--
-- Replace 'YOUR_ADMIN_USER_UUID' with the actual UUID that
-- Supabase assigned when you created the auth user.
-- ============================================================

-- Step 1: Upsert the admin profile
-- (The trigger may have already created the row; this ensures
--  the role is set to 'admin' and the name is correct.)
update public.profiles
set
  full_name = 'Admin',    -- change to your actual name
  role      = 'admin',
  is_active = true
where id = 'YOUR_ADMIN_USER_UUID';  -- ← paste your UUID here

-- Step 2: Add the admin to the Main channel
insert into public.channel_members (channel_id, user_id)
values (
  '00000000-0000-0000-0000-000000000001',   -- Main channel (from migration)
  'YOUR_ADMIN_USER_UUID'                     -- ← paste your UUID here
)
on conflict do nothing;
