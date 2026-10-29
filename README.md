# TUSU Workspace

Internal team management web app for **tusuexplore** — tasks, real-time chat, direct messages, and role-based collaboration in one place.

> Built with Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase

---

## Local Setup

### Prerequisites
- Node.js 18+
- A free [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
cd tusu-workspace
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the file `supabase/migrations/001_initial_schema.sql`
3. Go to **Authentication → Email Templates** and customise the invite email if you want

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role (secret) key |

> ⚠️ **Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.**

### 4. Create the first admin user

1. Go to **Supabase Dashboard → Authentication → Users → Add user**
2. Enter an email and password, click **Create user**
3. Copy the UUID of the new user
4. Open `supabase/seed.sql`, replace `YOUR_ADMIN_USER_UUID` with the UUID
5. Run the seed file in the SQL Editor

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with your admin email/password.

---

## Project Structure

```
src/
├── app/
│   ├── (app)/               # Protected routes (require login)
│   │   ├── layout.tsx       # Auth guard + sidebar
│   │   ├── dashboard/       # Admin dashboard (Phase 6)
│   │   ├── tasks/           # My Tasks (Phase 2)
│   │   ├── team-tasks/      # Team Tasks – admin/manager (Phase 2)
│   │   ├── chat/            # Main group chat (Phase 4)
│   │   ├── messages/        # Direct messages (Phase 5)
│   │   ├── members/         # Admin member management
│   │   └── profile/         # Profile edit
│   ├── api/
│   │   └── admin/
│   │       ├── invite/      # POST – invite a new member
│   │       └── members/[id] # PATCH – update role/status
│   ├── login/               # Login page
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Root redirect
├── components/
│   ├── layout/              # Sidebar, TopBar
│   ├── members/             # InviteMemberDialog, MembersTable
│   └── profile/             # ProfileForm
├── contexts/
│   └── AppContext.tsx        # Current user profile provider
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser Supabase client
│   │   └── server.ts        # Server + admin Supabase clients
│   └── utils.ts             # Shared helpers
├── middleware.ts             # Session refresh + route protection
└── types/
    └── database.ts          # TypeScript types for all DB tables
supabase/
├── migrations/
│   └── 001_initial_schema.sql  # All tables, indexes, RLS policies
└── seed.sql                    # Admin user setup
```

---

## Build Phases

| Phase | Feature | Status |
|---|---|---|
| **1** | Setup, Auth, Roles, Invite | ✅ Done |
| **2** | Tasks (CRUD, Kanban, filters) | ✅ Done |
| **3** | Task detail + comments + progress updates | ✅ Done |
| **4** | Real-time group chat + meeting points | ✅ Done |
| **5** | Direct messages + "Request update" flow | ✅ Done |
| **6** | Admin dashboard | ✅ Done |
| **7** | Notifications (in-app bell & live chat) | ✅ Done |
| **8** | Polish + Vercel deployment | ⏳ Next |

---

## Vercel Deployment

1. Push the repo to GitHub
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add the three environment variables from `.env.example` in the Vercel dashboard
4. Deploy — Vercel auto-detects Next.js

---

## Roles & Permissions Summary

| Action | Admin | Manager | Member |
|---|:---:|:---:|:---:|
| Invite / remove members | ✅ | ❌ | ❌ |
| Create & assign team tasks | ✅ | ✅ | ❌ |
| See all team tasks | ✅ | Own team | Only assigned |
| See others' personal tasks | ✅ | ❌ | ❌ |
| Create personal tasks | ✅ | ✅ | ✅ |
| Post in Main chat | ✅ | ✅ | ✅ |
| DM anyone | ✅ | Admin + own team | Admin + managers |
| Request status update | ✅ | ❌ | ❌ |
| View admin dashboard | ✅ | ❌ | ❌ |

All rules are enforced at the **database level** via Supabase Row Level Security, not just in the UI.
