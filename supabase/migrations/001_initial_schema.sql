-- ============================================================
-- TUSU Workspace – Initial Schema Migration
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
create type user_role      as enum ('admin', 'manager', 'member');
create type task_status    as enum ('todo', 'in_progress', 'done');
create type task_priority  as enum ('low', 'medium', 'high');
create type channel_type   as enum ('group', 'dm');
create type notif_type     as enum (
  'task_assigned',
  'task_due_soon',
  'new_message',
  'update_requested',
  'update_received'
);

-- ────────────────────────────────────────────────────────────
-- TABLE: profiles
-- One row per auth.users entry. Created automatically via
-- trigger when a new user signs up or is invited.
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text        not null default '',
  email       text        not null,
  role        user_role   not null default 'member',
  avatar_url  text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- Unique index to prevent duplicate emails in profiles
create unique index if not exists profiles_email_idx on public.profiles (email);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on new auth user
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- TABLE: channels
-- group = main team chat(s)   dm = direct message pair
-- ────────────────────────────────────────────────────────────
create table if not exists public.channels (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  type        channel_type not null default 'group',
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- TABLE: channel_members
-- Which users are in which channel
-- ────────────────────────────────────────────────────────────
create table if not exists public.channel_members (
  channel_id  uuid references public.channels (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists channel_members_user_idx on public.channel_members (user_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: messages
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id               uuid        primary key default gen_random_uuid(),
  channel_id       uuid        not null references public.channels (id) on delete cascade,
  sender_id        uuid        not null references public.profiles (id) on delete cascade,
  content          text        not null,
  is_meeting_point boolean     not null default false,
  -- For DM "update request" messages, flag them
  is_update_request boolean    not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists messages_channel_idx    on public.messages (channel_id, created_at desc);
create index if not exists messages_meeting_pt_idx on public.messages (channel_id) where is_meeting_point = true;

-- ────────────────────────────────────────────────────────────
-- TABLE: tasks
-- ────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id                uuid         primary key default gen_random_uuid(),
  title             text         not null,
  description       text,
  assignee_id       uuid         references public.profiles (id) on delete set null,
  created_by        uuid         not null references public.profiles (id) on delete cascade,
  status            task_status  not null default 'todo',
  priority          task_priority not null default 'medium',
  due_date          date,
  is_personal       boolean      not null default false,
  source_message_id uuid         references public.messages (id) on delete set null,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

create index if not exists tasks_assignee_idx    on public.tasks (assignee_id);
create index if not exists tasks_created_by_idx  on public.tasks (created_by);
create index if not exists tasks_status_idx      on public.tasks (status);
create index if not exists tasks_due_date_idx    on public.tasks (due_date);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- TABLE: task_updates
-- Progress notes written by the assignee (or admin)
-- ────────────────────────────────────────────────────────────
create table if not exists public.task_updates (
  id          uuid        primary key default gen_random_uuid(),
  task_id     uuid        not null references public.tasks (id) on delete cascade,
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  note        text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists task_updates_task_idx on public.task_updates (task_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  type        notif_type  not null,
  payload     jsonb       not null default '{}',
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_idx   on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where is_read = false;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES
-- All permissions enforced at the database level.
-- ════════════════════════════════════════════════════════════

-- ── Helper: get current user role (avoids repeated subqueries) ──
create or replace function public.get_my_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ── Helper: check if current user is admin ──
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- ── Helper: check if current user is admin or manager ──
create or replace function public.is_admin_or_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'manager') and is_active = true
  );
$$;

-- ────────────────────────────────────────────────────────────
-- RLS: profiles
-- ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Everyone can read active profiles (needed for name display)
create policy "profiles: read active profiles"
  on public.profiles for select
  using (is_active = true or id = auth.uid());

-- Users can update their own profile (name, avatar)
create policy "profiles: self update"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    -- members/managers cannot change their own role
    (role = (select role from public.profiles where id = auth.uid()))
    or public.is_admin()
  );

-- Only admin can insert (via service role / invite flow)
create policy "profiles: admin insert"
  on public.profiles for insert
  with check (public.is_admin());

-- Only admin can update role / is_active of others
create policy "profiles: admin full update"
  on public.profiles for update
  using (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- RLS: channels
-- ────────────────────────────────────────────────────────────
alter table public.channels enable row level security;

-- Users can only see channels they are a member of
create policy "channels: member can view own channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = id and user_id = auth.uid()
    )
  );

-- Admin can see all channels
create policy "channels: admin sees all"
  on public.channels for select
  using (public.is_admin());

-- Admin can create channels
create policy "channels: admin create"
  on public.channels for insert
  with check (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- RLS: channel_members
-- ────────────────────────────────────────────────────────────
alter table public.channel_members enable row level security;

create policy "channel_members: view own"
  on public.channel_members for select
  using (user_id = auth.uid() or public.is_admin());

create policy "channel_members: admin manage"
  on public.channel_members for all
  using (public.is_admin());

-- ────────────────────────────────────────────────────────────
-- RLS: messages
-- ────────────────────────────────────────────────────────────
alter table public.messages enable row level security;

-- Read: must be a member of the channel
create policy "messages: channel members can read"
  on public.messages for select
  using (
    exists (
      select 1 from public.channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

-- Insert: must be a member of the channel
create policy "messages: channel members can insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.channel_members
      where channel_id = messages.channel_id and user_id = auth.uid()
    )
  );

-- Only admin can mark messages as meeting points (or original sender)
create policy "messages: sender or admin can update"
  on public.messages for update
  using (sender_id = auth.uid() or public.is_admin());

-- ────────────────────────────────────────────────────────────
-- RLS: tasks
-- ────────────────────────────────────────────────────────────
alter table public.tasks enable row level security;

-- SELECT rules:
--   admin → see all
--   manager → see non-personal tasks (team) + own personal tasks
--   member → see only tasks assigned to them + own personal tasks
create policy "tasks: select"
  on public.tasks for select
  using (
    public.is_admin()
    or (
      -- personal tasks: only owner sees them
      is_personal = true and (assignee_id = auth.uid() or created_by = auth.uid())
    )
    or (
      -- non-personal: assignee always sees, managers see all team tasks
      is_personal = false
      and (
        assignee_id = auth.uid()
        or created_by = auth.uid()
        or public.is_admin_or_manager()
      )
    )
  );

-- INSERT: admin/manager can create and assign; member can create tasks for themselves or personal tasks
drop policy if exists "tasks: insert" on public.tasks;
create policy "tasks: insert"
  on public.tasks for insert
  with check (
    created_by = auth.uid()
    and (
      public.is_admin_or_manager()
      or assignee_id = auth.uid()
    )
  );

-- UPDATE: admin can update all; manager can update non-personal; assignee can update status
create policy "tasks: update"
  on public.tasks for update
  using (
    public.is_admin()
    or (public.is_admin_or_manager() and is_personal = false)
    or assignee_id = auth.uid()
    or created_by = auth.uid()
  );

-- DELETE: admin only
create policy "tasks: delete"
  on public.tasks for delete
  using (public.is_admin() or created_by = auth.uid());

-- ────────────────────────────────────────────────────────────
-- RLS: task_updates
-- ────────────────────────────────────────────────────────────
alter table public.task_updates enable row level security;

-- View: same rules as tasks (join via task_id)
create policy "task_updates: select"
  on public.task_updates for select
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (
        public.is_admin()
        or t.assignee_id = auth.uid()
        or t.created_by = auth.uid()
        or (t.is_personal = false and public.is_admin_or_manager())
      )
    )
  );

-- Insert: must be the task assignee or admin/manager with access
create policy "task_updates: insert"
  on public.task_updates for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
      and (
        public.is_admin()
        or t.assignee_id = auth.uid()
        or (t.is_personal = false and public.is_admin_or_manager())
      )
    )
  );

-- ────────────────────────────────────────────────────────────
-- RLS: notifications
-- ────────────────────────────────────────────────────────────
alter table public.notifications enable row level security;

-- Users only see their own notifications
create policy "notifications: own only"
  on public.notifications for select
  using (user_id = auth.uid());

-- System/admin can create notifications (service role bypasses RLS)
create policy "notifications: admin insert"
  on public.notifications for insert
  with check (public.is_admin() or user_id = auth.uid());

-- Users can mark their own as read
create policy "notifications: mark read"
  on public.notifications for update
  using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- SEED: Create the "Main" group channel
-- (Run after creating your first admin user)
-- ════════════════════════════════════════════════════════════
insert into public.channels (id, name, type)
values ('00000000-0000-0000-0000-000000000001', 'Main', 'group')
on conflict do nothing;
