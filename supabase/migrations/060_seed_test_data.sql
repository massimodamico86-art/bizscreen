-- ============================================================================
-- Phase 2: Test Users, Tenant Bootstrapping & Comprehensive Seed Data
-- ============================================================================
--
-- This migration:
-- 1. Fixes tv_devices to support owner_id pattern (frontend compatibility)
-- 2. Creates 3 test users: super_admin, admin, client
-- 3. Sets up tenant relationships via organization_members
-- 4. Seeds sample data: screens, media, playlists, schedules
-- 5. Creates subscriptions and onboarding progress
--
-- IMPORTANT: Run with superuser privileges. RLS is temporarily disabled for seeding.
-- ============================================================================

-- ============================================================================
-- A. FIX TV_DEVICES SCHEMA
-- Add owner_id column and make listing_id nullable for modern screen creation
-- ============================================================================

-- Add owner_id column if not exists
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Make listing_id nullable (screens can exist without listings in new architecture)
ALTER TABLE public.tv_devices
ALTER COLUMN listing_id DROP NOT NULL;

-- Add index for owner_id lookups
CREATE INDEX IF NOT EXISTS idx_tv_devices_owner_id ON public.tv_devices(owner_id);

-- Update RLS policies to support owner_id pattern
DROP POLICY IF EXISTS "tv_devices_select_policy" ON public.tv_devices;
CREATE POLICY "tv_devices_select_policy" ON public.tv_devices
FOR SELECT USING (
  is_super_admin()
  -- Direct owner access (new pattern)
  OR owner_id = auth.uid()
  -- Team member access
  OR is_tenant_member(owner_id)
  -- Legacy listing-based access
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  -- Admin access to managed clients
  OR (is_admin() AND (
    owner_id IN (SELECT client_id FROM get_my_client_ids())
    OR listing_id IN (SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids()))
  ))
);

DROP POLICY IF EXISTS "tv_devices_insert_policy" ON public.tv_devices;
CREATE POLICY "tv_devices_insert_policy" ON public.tv_devices
FOR INSERT WITH CHECK (
  is_super_admin()
  -- Direct owner can insert (new pattern)
  OR owner_id = auth.uid()
  -- Team member can insert
  OR is_tenant_member(owner_id)
  -- Legacy listing-based insert
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  -- Admin access
  OR (is_admin() AND (
    owner_id IN (SELECT client_id FROM get_my_client_ids())
    OR listing_id IN (SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids()))
  ))
);

DROP POLICY IF EXISTS "tv_devices_update_policy" ON public.tv_devices;
CREATE POLICY "tv_devices_update_policy" ON public.tv_devices
FOR UPDATE USING (
  is_super_admin()
  OR owner_id = auth.uid()
  OR is_tenant_member(owner_id)
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND (
    owner_id IN (SELECT client_id FROM get_my_client_ids())
    OR listing_id IN (SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids()))
  ))
);

DROP POLICY IF EXISTS "tv_devices_delete_policy" ON public.tv_devices;
CREATE POLICY "tv_devices_delete_policy" ON public.tv_devices
FOR DELETE USING (
  is_super_admin()
  OR owner_id = auth.uid()
  OR is_tenant_member(owner_id)
  OR listing_id IN (SELECT id FROM listings WHERE owner_id = auth.uid())
  OR (is_admin() AND (
    owner_id IN (SELECT client_id FROM get_my_client_ids())
    OR listing_id IN (SELECT l.id FROM listings l WHERE l.owner_id IN (SELECT client_id FROM get_my_client_ids()))
  ))
);

-- Backfill owner_id from listings for existing tv_devices
UPDATE public.tv_devices td
SET owner_id = l.owner_id
FROM public.listings l
WHERE td.listing_id = l.id AND td.owner_id IS NULL;

-- ============================================================================
-- B. CREATE TEST USERS
-- Fixed UUIDs for consistent testing
-- ============================================================================

-- User UUIDs (fixed for reproducibility)
-- super_admin: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- admin:       bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- client:      cccccccc-cccc-cccc-cccc-cccccccccccc
-- client2:     dddddddd-dddd-dddd-dddd-dddddddddddd (extra client for admin to manage)

-- 1. SUPER ADMIN USER
-- NOTE: token columns must be empty strings, not NULL - GoTrueAuth requires non-NULL strings
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current,
  email_change,
  phone_change,
  phone_change_token,
  reauthentication_token
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '00000000-0000-0000-0000-000000000000',
  'superadmin@bizscreen.test',
  crypt('TestSuperAdmin123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Super Admin"}',
  'authenticated',
  'authenticated',
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  confirmation_token = '',
  recovery_token = '',
  email_change_token_new = '',
  email_change_token_current = '',
  email_change = '',
  phone_change = '',
  phone_change_token = '',
  reauthentication_token = '';

-- Super Admin Profile
INSERT INTO public.profiles (id, email, full_name, role, business_name)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'superadmin@bizscreen.test',
  'Super Admin',
  'super_admin',
  'BizScreen Platform'
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- 2. ADMIN USER
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token
) VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '00000000-0000-0000-0000-000000000000',
  'admin@bizscreen.test',
  crypt('TestAdmin123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Admin User"}',
  'authenticated', 'authenticated',
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  confirmation_token = '', recovery_token = '', email_change_token_new = '',
  email_change_token_current = '', email_change = '', phone_change = '',
  phone_change_token = '', reauthentication_token = '';

-- Admin Profile
INSERT INTO public.profiles (id, email, full_name, role, business_name)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'admin@bizscreen.test',
  'Admin User',
  'admin',
  'Admin Agency'
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- 3. CLIENT USER (primary test client)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '00000000-0000-0000-0000-000000000000',
  'client@bizscreen.test',
  crypt('TestClient123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Client User"}',
  'authenticated', 'authenticated',
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  confirmation_token = '', recovery_token = '', email_change_token_new = '',
  email_change_token_current = '', email_change = '', phone_change = '',
  phone_change_token = '', reauthentication_token = '';

-- Client Profile
INSERT INTO public.profiles (id, email, full_name, role, business_name)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'client@bizscreen.test',
  'Client User',
  'client',
  'Demo Business'
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- 4. CLIENT2 USER (secondary client for admin management testing)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
  email_change, phone_change, phone_change_token, reauthentication_token
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '00000000-0000-0000-0000-000000000000',
  'client2@bizscreen.test',
  crypt('TestClient123!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Second Client"}',
  'authenticated', 'authenticated',
  '', '', '', '', '', '', '', ''
) ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  confirmation_token = '', recovery_token = '', email_change_token_new = '',
  email_change_token_current = '', email_change = '', phone_change = '',
  phone_change_token = '', reauthentication_token = '';

-- Client2 Profile
INSERT INTO public.profiles (id, email, full_name, role, business_name)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'client2@bizscreen.test',
  'Second Client',
  'client',
  'Second Business'
) ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- ============================================================================
-- C. ORGANIZATION MEMBERSHIPS
-- Each client is the owner of their own tenant
-- Admin manages client and client2
-- ============================================================================

-- Client owns their tenant
INSERT INTO public.organization_members (tenant_id, user_id, role, status)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- tenant_id = client's profile id
  'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- user_id = client
  'owner',
  'active'
) ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Client2 owns their tenant
INSERT INTO public.organization_members (tenant_id, user_id, role, status)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'owner',
  'active'
) ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- Admin manages Client and Client2
-- The admin-client relationship is via profiles.managed_by column
-- admin_clients is a VIEW that reads from profiles where managed_by = admin_id
UPDATE public.profiles
SET managed_by = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'  -- admin
WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',   -- client
  'dddddddd-dddd-dddd-dddd-dddddddddddd'    -- client2
);

-- ============================================================================
-- D. SUBSCRIPTIONS
-- Each client has an active subscription
-- Plans already exist from migration 017 (free, starter, pro, enterprise)
-- ============================================================================

-- Client subscription (Starter plan - use existing plan by slug)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.plans WHERE slug = 'starter'
ON CONFLICT (owner_id) DO UPDATE SET
  status = 'active';

-- Client2 subscription (Pro plan)
INSERT INTO public.subscriptions (owner_id, plan_id, status, current_period_start, current_period_end)
SELECT
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  id,
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
FROM public.plans WHERE slug = 'pro'
ON CONFLICT (owner_id) DO UPDATE SET
  status = 'active';

-- ============================================================================
-- E. USER SETTINGS
-- Each user has settings (columns from migration 008)
-- ============================================================================

INSERT INTO public.user_settings (user_id, theme, language, email_notifications)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'light', 'en', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'light', 'en', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'light', 'en', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dark', 'en', false)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- F. ONBOARDING PROGRESS
-- Client has completed onboarding, others skipped
-- Columns from migration 034
-- ============================================================================

INSERT INTO public.onboarding_progress (
  owner_id, is_complete, completed_at,
  completed_welcome, completed_logo, completed_first_screen,
  completed_first_playlist, completed_first_media, completed_screen_pairing
)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true, NOW(), true, true, true, true, true, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true, NOW(), true, true, true, true, true, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', true, NOW(), true, true, true, true, true, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', true, NOW(), true, true, true, true, true, true)
ON CONFLICT (owner_id) DO UPDATE SET
  is_complete = EXCLUDED.is_complete,
  completed_at = EXCLUDED.completed_at;

-- ============================================================================
-- G. SAMPLE MEDIA ASSETS
-- 3 media items for Client tenant
-- ============================================================================

INSERT INTO public.media_assets (id, owner_id, name, type, url, thumbnail_url, mime_type, file_size, width, height, description, tags)
VALUES
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Welcome Banner',
    'image',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400',
    'image/jpeg',
    245000,
    1920,
    1080,
    'Welcome banner for lobby display',
    '["welcome", "banner", "lobby"]'::jsonb
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Product Showcase',
    'image',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
    'image/jpeg',
    320000,
    1920,
    1080,
    'Product showcase image',
    '["products", "showcase"]'::jsonb
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Company Logo',
    'image',
    'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=800',
    'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200',
    'image/png',
    45000,
    800,
    600,
    'Company logo for branding',
    '["logo", "branding"]'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- H. SAMPLE PLAYLISTS
-- 1 playlist with 2 items for Client tenant
-- ============================================================================

INSERT INTO public.playlists (id, owner_id, name, description, default_duration, transition_effect, shuffle)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Lobby Display',
  'Main lobby digital signage playlist',
  10,  -- 10 seconds default
  'fade',
  false
) ON CONFLICT (id) DO NOTHING;

-- Playlist items
INSERT INTO public.playlist_items (id, playlist_id, item_type, item_id, position, duration)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'media',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',  -- Welcome Banner
    1,
    15
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'media',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',  -- Product Showcase
    2,
    12
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- I. SAMPLE SCREENS (TV DEVICES)
-- 2 screens for Client tenant
-- ============================================================================

INSERT INTO public.tv_devices (id, owner_id, device_name, otp_code, is_paired, is_online, last_seen_at, assigned_playlist_id, timezone)
VALUES
  (
    '33333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Lobby Screen',
    'ABC123',
    true,
    true,
    NOW() - INTERVAL '2 minutes',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',  -- Lobby Display playlist
    'America/New_York'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Meeting Room',
    'XYZ789',
    true,
    false,
    NOW() - INTERVAL '2 hours',
    NULL,
    'America/New_York'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- J. SAMPLE SCHEDULES
-- 1 schedule with 1 entry for Client tenant
-- ============================================================================

INSERT INTO public.schedules (id, owner_id, name, description, is_active)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Business Hours',
  'Standard business hours schedule',
  true
) ON CONFLICT (id) DO NOTHING;

-- Schedule entry: Weekdays 9 AM - 6 PM
-- schedule_entries uses content_type/content_id pattern (from migration 014)
INSERT INTO public.schedule_entries (id, schedule_id, target_type, target_id, content_type, content_id, days_of_week, start_time, end_time, priority)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  'all',                                     -- Apply to all screens
  NULL,                                      -- No specific target
  'playlist',                                -- Content type
  'ffffffff-ffff-ffff-ffff-ffffffffffff',    -- Lobby Display playlist
  '{1,2,3,4,5}'::integer[],                  -- Monday-Friday
  '09:00:00',
  '18:00:00',
  1
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- K. SAMPLE BRANDING
-- Client branding configuration
-- ============================================================================

-- Check if client_branding table exists and insert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_branding') THEN
    INSERT INTO public.client_branding (profile_id, primary_color, secondary_color, company_name)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '#3B82F6',  -- Blue
      '#1E40AF',  -- Darker blue
      'Demo Business'
    )
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- L. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  user_count INTEGER;
  profile_count INTEGER;
  screen_count INTEGER;
  media_count INTEGER;
  playlist_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users WHERE email LIKE '%@bizscreen.test';
  SELECT COUNT(*) INTO profile_count FROM public.profiles WHERE email LIKE '%@bizscreen.test';
  SELECT COUNT(*) INTO screen_count FROM public.tv_devices WHERE owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  SELECT COUNT(*) INTO media_count FROM public.media_assets WHERE owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  SELECT COUNT(*) INTO playlist_count FROM public.playlists WHERE owner_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  RAISE NOTICE 'Phase 2 Seed Data Verification:';
  RAISE NOTICE '  - Test users in auth.users: %', user_count;
  RAISE NOTICE '  - Test profiles: %', profile_count;
  RAISE NOTICE '  - Client screens: %', screen_count;
  RAISE NOTICE '  - Client media assets: %', media_count;
  RAISE NOTICE '  - Client playlists: %', playlist_count;

  IF user_count < 4 THEN
    RAISE WARNING 'Expected 4 test users, found %', user_count;
  END IF;

  RAISE NOTICE 'Phase 2 seed data migration completed successfully!';
END $$;
