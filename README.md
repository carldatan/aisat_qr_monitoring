# AISAT COLLEGE DASMA — QR Code Tools Monitoring System

A full-stack Next.js 14 + Supabase rewrite of the original single-file HTML application.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| Backend / DB | Supabase (PostgreSQL + Auth) |
| QR Generation | qrcode.react |
| QR Scanning | html5-qrcode |
| Dates | date-fns |

---

## Folder Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (HTML shell)
│   ├── page.tsx                # Redirects → /dashboard
│   ├── globals.css             # Global styles + Tailwind
│   ├── login/
│   │   └── page.tsx            # Login + Sign-up page
│   ├── dashboard/
│   │   ├── layout.tsx          # Auth guard + Header + Nav
│   │   └── page.tsx            # Dashboard (activity log, QR pass)
│   ├── admin/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Admin tools (scanner, inventory, users)
│   ├── borrow/
│   │   ├── layout.tsx
│   │   └── page.tsx            # Student borrowing page
│   └── library/
│       ├── layout.tsx
│       └── page.tsx            # QR scan history (admin only)
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx          # Reusable button (variants: primary/success/danger/ghost/outline)
│   │   ├── Input.tsx           # Styled text input
│   │   ├── PasswordInput.tsx   # Input with show/hide toggle
│   │   ├── Panel.tsx           # Card/panel wrapper
│   │   ├── Badge.tsx           # Count badge
│   │   └── DataTable.tsx       # Generic sortable table
│   ├── layout/
│   │   ├── AppHeader.tsx       # Top header with user info + logout
│   │   └── AppNav.tsx          # Tab navigation bar
│   ├── modals/
│   │   └── QRReturnModal.tsx   # QR code modal for students
│   └── scanner/
│       └── QRScanner.tsx       # Camera QR scanner (html5-qrcode)
│
├── contexts/
│   └── store.ts                # Zustand global state
│
├── hooks/                      # (extend with custom hooks as needed)
│
├── lib/
│   ├── auth.ts                 # Login / signup / logout helpers
│   ├── db.ts                   # All Supabase query functions
│   ├── utils.ts                # cn(), formatDateTime(), groupBy()
│   └── supabase/
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server Component Supabase client
│       └── middleware.ts       # Session refresh middleware
│
├── middleware.ts               # Next.js edge middleware (route protection)
└── types/
    └── index.ts                # All TypeScript interfaces and types
```

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account and project

### 2. Clone and Install

```bash
git clone <your-repo>
cd aisat-qr-monitoring
npm install
```

### 3. Set up Supabase

1. Go to your Supabase project → **SQL Editor**
2. Paste and run the full contents of `supabase-schema.sql`
3. This creates all tables, indexes, triggers, and RLS policies

### 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # optional, server-only
```

Find these in Supabase Dashboard → **Settings → API**.

### 5. Create the Admin Account

Option A — via Supabase Dashboard:
1. Go to **Authentication → Users → Add User**
2. Set email: `admin@aisat.edu`, password: `admin` (or whatever you prefer)
3. Copy the generated UUID
4. In SQL Editor, run:
   ```sql
   INSERT INTO public.profiles (id, username, full_name, id_number, email, role)
   VALUES ('YOUR-UUID-HERE', 'admin', 'System Admin', '000', 'admin@aisat.edu', 'admin')
   ON CONFLICT (id) DO UPDATE SET role = 'admin';
   ```

Option B — via the app's sign-up form:
1. Register normally, then promote via SQL.

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Required npm Packages

```
next@14.2.5
react@^18
react-dom@^18
@supabase/supabase-js@^2.44.2
@supabase/ssr@^0.4.0
qrcode.react@^3.1.0
html5-qrcode@^2.3.8
zustand@^4.5.4
date-fns@^3.6.0
clsx@^2.1.1
tailwind-merge@^2.3.0
```

---

## Key Behavioral Differences from Original

| Feature | Original | New |
|---|---|---|
| Storage | `localStorage` | Supabase PostgreSQL |
| Auth | Username/password array | Supabase Auth (JWT sessions) |
| Admin seed | Hardcoded `admin/admin` | Created via Supabase Dashboard |
| Session | Lost on refresh | Persisted via cookies |
| Data sharing | Single browser only | Multi-device, real-time capable |
| Security | None (client-only) | Row Level Security (RLS) |
| Routes | Single-page tabs | Next.js App Router pages |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | For admin server operations |

---

## Supabase RLS Summary

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | All authenticated | via trigger | Own row + admins | Admins only |
| `equipment` | All authenticated | All authenticated | Borrower + admins | Admins only |
| `history_logs` | All authenticated | All authenticated | — | — |
| `scanned_library` | All authenticated | Admins only | — | — |

---

## Deployment

### Vercel (recommended)

```bash
npm run build   # verify locally first
```

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker / Self-hosted

```bash
npm run build
npm start
```

---

## Migration Notes

1. **localStorage → Supabase**: All data previously in localStorage is now in PostgreSQL. There is no migration path for existing localStorage data; start fresh with a clean Supabase project.

2. **Authentication**: The original app stored passwords in plaintext in localStorage. Supabase Auth handles this securely with bcrypt hashing and JWT sessions.

3. **QR format preserved**: QR codes still encode `BATCH|{username}` — compatible with the original format.

4. **Admin detection**: Instead of checking `users[u].role`, the app checks the `profiles.role` column from Supabase.

5. **Realtime**: The app does not currently use Supabase Realtime subscriptions, but `refreshAll()` can be called after mutations. Adding realtime is straightforward — subscribe to the `equipment` table changes.
