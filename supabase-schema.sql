-- ============================================================
-- AISAT QR Monitoring System — Supabase SQL Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. Profiles ─────────────────────────────────────────────────────────────
-- Mirrors auth.users; populated automatically via trigger on sign-up.

CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT        UNIQUE NOT NULL,
    full_name   TEXT        NOT NULL DEFAULT '',
    id_number   TEXT        NOT NULL DEFAULT '',
    email       TEXT        NOT NULL DEFAULT '',
    role        TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, id_number, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'id_number', ''),
        NEW.email,
        'user'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. Equipment ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.equipment (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    base_name           TEXT        NOT NULL,
    category            TEXT        NOT NULL DEFAULT '',
    location            TEXT        NOT NULL DEFAULT '',
    status              TEXT        NOT NULL DEFAULT 'Available'
                                    CHECK (status IN ('Available', 'Pending', 'Borrowed', 'Maintenance', 'Lost')),
    borrower_id         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    borrower_username   TEXT,
    borrower_name       TEXT,
    borrower_id_number  TEXT,
    lender_username     TEXT,
    borrow_item_photo_url TEXT,
    borrower_borrow_photo_url TEXT,
    return_item_photo_url TEXT,
    borrower_return_photo_url TEXT,
    borrow_time         TIMESTAMPTZ,
    return_time         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '';
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS borrower_name TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS borrower_id_number TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS lender_username TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS borrow_item_photo_url TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS borrower_borrow_photo_url TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS return_item_photo_url TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS borrower_return_photo_url TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS return_time TIMESTAMPTZ;

DO $$
BEGIN
    ALTER TABLE public.equipment DROP CONSTRAINT IF EXISTS equipment_status_check;
    ALTER TABLE public.equipment
        ADD CONSTRAINT equipment_status_check
        CHECK (status IN ('Available', 'Pending', 'Borrowed', 'Maintenance', 'Lost'));
END $$;

CREATE INDEX IF NOT EXISTS idx_equipment_base_name  ON public.equipment (base_name);
CREATE INDEX IF NOT EXISTS idx_equipment_category   ON public.equipment (category);
CREATE INDEX IF NOT EXISTS idx_equipment_location   ON public.equipment (location);
CREATE INDEX IF NOT EXISTS idx_equipment_status     ON public.equipment (status);
CREATE INDEX IF NOT EXISTS idx_equipment_borrower   ON public.equipment (borrower_username);
CREATE INDEX IF NOT EXISTS idx_equipment_borrower_id ON public.equipment (borrower_id);

-- ─── 3. History Logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.history_logs (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    username    TEXT        NOT NULL,
    item        TEXT        NOT NULL,
    event       TEXT        NOT NULL,
    description TEXT,
    item_photo_url TEXT,
    borrower_photo_url TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.history_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.history_logs ADD COLUMN IF NOT EXISTS item_photo_url TEXT;
ALTER TABLE public.history_logs ADD COLUMN IF NOT EXISTS borrower_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_history_username   ON public.history_logs (username);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON public.history_logs (created_at DESC);

-- ─── 4. Scanned Library ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.scanned_library (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_time           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    student_name        TEXT        NOT NULL,
    student_id_number   TEXT        NOT NULL DEFAULT '',
    items_count         INTEGER     NOT NULL DEFAULT 0,
    processed_by        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scanned_library_created ON public.scanned_library (created_at DESC);

-- ─── 5. updated_at triggers ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_equipment_updated_at ON public.equipment;
CREATE TRIGGER trg_equipment_updated_at
    BEFORE UPDATE ON public.equipment
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 6. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanned_library ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──
-- Any authenticated user can read all profiles (needed for username lookup)
CREATE POLICY "profiles_select_auth"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete profiles
CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── Equipment ──
-- All authenticated users can read equipment
CREATE POLICY "equipment_select_auth"
    ON public.equipment FOR SELECT
    TO authenticated
    USING (true);

-- All authenticated users can insert (for requesting)
CREATE POLICY "equipment_insert_auth"
    ON public.equipment FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update equipment they borrowed (request); admins can update anything
CREATE POLICY "equipment_update_auth"
    ON public.equipment FOR UPDATE
    TO authenticated
    USING (
        borrower_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete equipment
CREATE POLICY "equipment_delete_admin"
    ON public.equipment FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── History Logs ──
CREATE POLICY "history_select_auth"
    ON public.history_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "history_insert_auth"
    ON public.history_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ── Scanned Library ──
CREATE POLICY "library_select_auth"
    ON public.scanned_library FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "library_insert_admin"
    ON public.scanned_library FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─── 7. Seed: Admin user (run AFTER creating the auth user via dashboard) ─────
-- Replace the UUID below with the actual UUID from auth.users after you create
-- the admin account through the Supabase Auth dashboard or signUp API.
--
-- INSERT INTO public.profiles (id, username, full_name, id_number, email, role)
-- VALUES (
--     'YOUR-ADMIN-UUID-HERE',
--     'admin',
--     'System Admin',
--     '000',
--     'admin@aisat.edu',
--     'admin'
-- )
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';
