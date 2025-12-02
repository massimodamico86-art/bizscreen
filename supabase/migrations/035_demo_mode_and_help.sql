-- =====================================================
-- Phase 25: Demo Mode, In-App Help, and Sales Enablement
-- =====================================================
-- Adds demo tenant support with auto-reset capability,
-- help center infrastructure, and sales demo tools.
-- =====================================================

-- =====================================================
-- 1. DEMO TENANT FIELDS ON PROFILES
-- =====================================================

-- Add demo-related fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_demo_tenant BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS demo_reset_interval_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS demo_last_reset_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS demo_business_type TEXT, -- restaurant, salon, gym, retail, other
ADD COLUMN IF NOT EXISTS demo_protected_assets JSONB DEFAULT '[]'::jsonb;

-- Index for finding stale demo tenants
CREATE INDEX IF NOT EXISTS idx_profiles_demo_tenants
ON public.profiles(is_demo_tenant, demo_last_reset_at)
WHERE is_demo_tenant = true;

-- =====================================================
-- 2. DEMO CONTENT TEMPLATES
-- =====================================================

-- Demo content packs - pre-built content for different business types
CREATE TABLE IF NOT EXISTS public.demo_content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type TEXT NOT NULL, -- restaurant, salon, gym, retail, other
  name TEXT NOT NULL,
  description TEXT,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Content structure:
  -- {
  --   "media": [{ "name": "...", "url": "...", "type": "image" }],
  --   "playlists": [{ "name": "...", "items": [...] }],
  --   "layouts": [{ "name": "...", "template": "..." }],
  --   "screens": [{ "name": "...", "location": "..." }]
  -- }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create demo packs for each business type
INSERT INTO public.demo_content_packs (business_type, name, description, content) VALUES
('restaurant', 'Restaurant Demo Pack', 'Menu displays, specials, and promotions for restaurants', '{
  "media": [
    {"name": "Daily Specials", "type": "image", "placeholder": true},
    {"name": "Menu Board", "type": "image", "placeholder": true},
    {"name": "Happy Hour", "type": "image", "placeholder": true},
    {"name": "Welcome Video", "type": "video", "placeholder": true}
  ],
  "playlists": [
    {"name": "Main Menu Loop", "description": "Primary menu display rotation", "protected": true},
    {"name": "Specials & Promos", "description": "Daily specials and promotions"}
  ],
  "layouts": [
    {"name": "Menu Layout", "template": "split_horizontal", "protected": true}
  ],
  "screens": [
    {"name": "Front Counter", "location": "Entrance"},
    {"name": "Drive-Thru", "location": "Drive-Through Window"}
  ]
}'::jsonb),
('salon', 'Salon Demo Pack', 'Service menus and styling content for salons', '{
  "media": [
    {"name": "Services Menu", "type": "image", "placeholder": true},
    {"name": "Style Gallery", "type": "image", "placeholder": true},
    {"name": "Promotions", "type": "image", "placeholder": true}
  ],
  "playlists": [
    {"name": "Service Display", "description": "Services and pricing", "protected": true},
    {"name": "Style Inspiration", "description": "Styling examples and trends"}
  ],
  "layouts": [
    {"name": "Salon Layout", "template": "single_zone", "protected": true}
  ],
  "screens": [
    {"name": "Reception", "location": "Front Desk"},
    {"name": "Waiting Area", "location": "Lounge"}
  ]
}'::jsonb),
('gym', 'Gym Demo Pack', 'Class schedules and fitness content for gyms', '{
  "media": [
    {"name": "Class Schedule", "type": "image", "placeholder": true},
    {"name": "Workout Tips", "type": "video", "placeholder": true},
    {"name": "Membership Promo", "type": "image", "placeholder": true}
  ],
  "playlists": [
    {"name": "Class Schedule", "description": "Weekly class timetable", "protected": true},
    {"name": "Fitness Tips", "description": "Workout and nutrition content"}
  ],
  "layouts": [
    {"name": "Gym Layout", "template": "grid_2x2", "protected": true}
  ],
  "screens": [
    {"name": "Lobby Display", "location": "Entrance"},
    {"name": "Cardio Area", "location": "Cardio Section"}
  ]
}'::jsonb),
('retail', 'Retail Demo Pack', 'Product displays and promotions for retail stores', '{
  "media": [
    {"name": "Featured Products", "type": "image", "placeholder": true},
    {"name": "Sale Banner", "type": "image", "placeholder": true},
    {"name": "Brand Video", "type": "video", "placeholder": true}
  ],
  "playlists": [
    {"name": "Product Showcase", "description": "Featured products rotation", "protected": true},
    {"name": "Sales & Deals", "description": "Current promotions"}
  ],
  "layouts": [
    {"name": "Retail Layout", "template": "split_vertical", "protected": true}
  ],
  "screens": [
    {"name": "Storefront", "location": "Window Display"},
    {"name": "Checkout", "location": "Register Area"}
  ]
}'::jsonb),
('other', 'General Demo Pack', 'General purpose digital signage content', '{
  "media": [
    {"name": "Welcome Message", "type": "image", "placeholder": true},
    {"name": "Announcements", "type": "image", "placeholder": true},
    {"name": "Company Video", "type": "video", "placeholder": true}
  ],
  "playlists": [
    {"name": "Main Display", "description": "Primary content rotation", "protected": true},
    {"name": "Announcements", "description": "News and updates"}
  ],
  "layouts": [
    {"name": "Standard Layout", "template": "single_zone", "protected": true}
  ],
  "screens": [
    {"name": "Main Screen", "location": "Lobby"},
    {"name": "Secondary", "location": "Conference Room"}
  ]
}'::jsonb)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. RPC: CREATE DEMO TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_demo_tenant(
  p_business_type TEXT DEFAULT 'other',
  p_plan_level TEXT DEFAULT 'starter',
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_plan_id UUID;
  v_pack JSONB;
  v_result JSONB;
BEGIN
  -- Check caller is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Generate demo email if not provided
  v_email := COALESCE(p_email, 'demo-' || p_business_type || '-' || substr(gen_random_uuid()::text, 1, 8) || '@demo.bizscreen.io');

  -- Get plan ID
  SELECT id INTO v_plan_id FROM plans WHERE slug = p_plan_level AND is_active = true LIMIT 1;
  IF v_plan_id IS NULL THEN
    SELECT id INTO v_plan_id FROM plans WHERE slug = 'starter' LIMIT 1;
  END IF;

  -- Get demo content pack
  SELECT content INTO v_pack FROM demo_content_packs
  WHERE business_type = p_business_type AND is_active = true
  LIMIT 1;

  IF v_pack IS NULL THEN
    SELECT content INTO v_pack FROM demo_content_packs WHERE business_type = 'other' LIMIT 1;
  END IF;

  -- Create user via auth admin functions would be done via API
  -- For now, create profile entry (actual user creation via API)
  v_user_id := gen_random_uuid();

  -- Create profile
  INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    is_demo_tenant,
    demo_business_type,
    demo_reset_interval_minutes,
    demo_last_reset_at,
    demo_protected_assets,
    business_name
  ) VALUES (
    v_user_id,
    v_email,
    'Demo ' || initcap(p_business_type) || ' User',
    'client',
    true,
    p_business_type,
    60,
    now(),
    COALESCE(v_pack->'playlists', '[]'::jsonb) || COALESCE(v_pack->'layouts', '[]'::jsonb),
    'Demo ' || initcap(p_business_type) || ' Business'
  );

  -- Create subscription
  INSERT INTO subscriptions (owner_id, plan_id, status, trial_ends_at)
  VALUES (
    v_user_id,
    v_plan_id,
    'trialing',
    now() + INTERVAL '14 days'
  );

  -- Return result with user details (actual auth user creation via API)
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_email,
    'business_type', p_business_type,
    'plan_level', p_plan_level,
    'note', 'Profile created. Use API to create auth user with this ID.'
  );
END;
$$;

-- =====================================================
-- 4. RPC: RESET DEMO TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.reset_demo_tenant(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_pack JSONB;
  v_protected JSONB;
BEGIN
  -- Check caller is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get tenant profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_tenant_id AND is_demo_tenant = true;
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Demo tenant not found');
  END IF;

  -- Get demo content pack
  SELECT content INTO v_pack FROM demo_content_packs
  WHERE business_type = v_profile.demo_business_type AND is_active = true
  LIMIT 1;

  -- Store protected asset names
  v_protected := COALESCE(v_profile.demo_protected_assets, '[]'::jsonb);

  -- Delete non-protected content (cascade will handle related records)
  DELETE FROM campaigns WHERE owner_id = p_tenant_id;
  DELETE FROM schedules WHERE owner_id = p_tenant_id;

  -- Delete playlists except protected ones
  DELETE FROM playlists WHERE owner_id = p_tenant_id
  AND name NOT IN (SELECT jsonb_array_elements_text(v_protected));

  -- Delete layouts except protected ones
  DELETE FROM layouts WHERE owner_id = p_tenant_id
  AND name NOT IN (SELECT jsonb_array_elements_text(v_protected));

  -- Delete all screens (they get re-created)
  DELETE FROM tv_devices WHERE owner_id = p_tenant_id;

  -- Delete media assets
  DELETE FROM media_assets WHERE owner_id = p_tenant_id;

  -- Reset activity log
  DELETE FROM activity_log WHERE user_id = p_tenant_id;

  -- Update reset timestamp
  UPDATE profiles
  SET demo_last_reset_at = now()
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'reset_at', now(),
    'business_type', v_profile.demo_business_type
  );
END;
$$;

-- =====================================================
-- 5. RPC: LIST DEMO TENANTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.list_demo_tenants()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  business_name TEXT,
  demo_business_type TEXT,
  demo_reset_interval_minutes INTEGER,
  demo_last_reset_at TIMESTAMPTZ,
  is_stale BOOLEAN,
  plan_slug TEXT,
  plan_name TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.full_name,
    p.business_name,
    p.demo_business_type,
    p.demo_reset_interval_minutes,
    p.demo_last_reset_at,
    CASE
      WHEN p.demo_last_reset_at IS NULL THEN true
      WHEN p.demo_last_reset_at < now() - (p.demo_reset_interval_minutes || ' minutes')::INTERVAL THEN true
      ELSE false
    END AS is_stale,
    pl.slug AS plan_slug,
    pl.name AS plan_name,
    s.status,
    p.created_at
  FROM profiles p
  LEFT JOIN subscriptions s ON s.owner_id = p.id
  LEFT JOIN plans pl ON pl.id = s.plan_id
  WHERE p.is_demo_tenant = true
  ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- 6. RPC: GET STALE DEMO TENANTS (for cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_stale_demo_tenants()
RETURNS TABLE (
  id UUID,
  email TEXT,
  demo_business_type TEXT,
  demo_last_reset_at TIMESTAMPTZ,
  minutes_since_reset INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.demo_business_type,
    p.demo_last_reset_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(p.demo_last_reset_at, p.created_at)))::INTEGER / 60 AS minutes_since_reset
  FROM profiles p
  WHERE p.is_demo_tenant = true
  AND (
    p.demo_last_reset_at IS NULL
    OR p.demo_last_reset_at < now() - (p.demo_reset_interval_minutes || ' minutes')::INTERVAL
  );
END;
$$;

-- =====================================================
-- 7. RPC: CHECK IF ASSET IS PROTECTED (for demo mode)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_demo_protected_asset(
  p_asset_type TEXT,  -- 'playlist', 'layout', 'screen'
  p_asset_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get current user's profile
  SELECT * INTO v_profile FROM profiles WHERE id = auth.uid();

  -- Not a demo tenant, nothing is protected
  IF v_profile IS NULL OR v_profile.is_demo_tenant = false THEN
    RETURN false;
  END IF;

  -- Check if asset name is in protected list
  RETURN EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(COALESCE(v_profile.demo_protected_assets, '[]'::jsonb)) AS protected_name
    WHERE protected_name->>'name' = p_asset_name
  );
END;
$$;

-- =====================================================
-- 8. HELP CENTER CONTENT TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.help_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL, -- getting_started, screens, playlists, layouts, campaigns, templates, billing
  title TEXT NOT NULL,
  short_description TEXT,
  content TEXT, -- Markdown content
  related_routes TEXT[] DEFAULT '{}', -- Internal routes
  search_keywords TEXT[] DEFAULT '{}', -- For fuzzy search
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert help topics
INSERT INTO public.help_topics (slug, category, title, short_description, content, related_routes, search_keywords, display_order) VALUES
-- Getting Started
('getting-started-overview', 'getting_started', 'Getting Started with BizScreen', 'Learn the basics of setting up your digital signage',
'## Welcome to BizScreen

BizScreen makes it easy to manage digital signage across all your locations.

### Quick Start Guide

1. **Add Your Media** - Upload images, videos, and other content to your Media Library
2. **Create a Playlist** - Organize your media into playlists for playback
3. **Set Up a Screen** - Register your display screens
4. **Pair Your Device** - Connect your TV or display to start showing content

### Key Concepts

- **Media Assets**: The images, videos, and web content you display
- **Playlists**: Ordered collections of media with timing controls
- **Layouts**: Multi-zone templates for complex displays
- **Screens**: Your physical display devices
- **Schedules**: Time-based content automation',
ARRAY['dashboard', 'media-all', 'playlists', 'screens'],
ARRAY['start', 'begin', 'setup', 'first', 'new'], 1),

('uploading-media', 'getting_started', 'Uploading Media', 'How to add images, videos, and other content',
'## Uploading Media

### Supported File Types

- **Images**: JPG, PNG, GIF, WebP (up to 50MB)
- **Videos**: MP4, WebM, MOV (up to 500MB)
- **Audio**: MP3, WAV (up to 50MB)
- **Documents**: PDF (up to 20MB)

### How to Upload

1. Go to **Media Library** from the sidebar
2. Click **Upload** or drag and drop files
3. Wait for processing to complete
4. Add tags and descriptions for organization

### Tips

- Use high-resolution images (1920x1080 or higher)
- Compress videos before uploading for faster processing
- Organize with folders and tags for easy finding',
ARRAY['media-all', 'media-images', 'media-videos'],
ARRAY['upload', 'add', 'image', 'video', 'file'], 2),

-- Screens & Players
('managing-screens', 'screens', 'Managing Screens', 'Register and manage your display devices',
'## Managing Screens

### Adding a New Screen

1. Go to **Screens** from the sidebar
2. Click **Add Screen**
3. Enter a name and location
4. A pairing code will be generated

### Pairing a Device

1. Install the BizScreen Player app on your device
2. Open the app and enter the pairing code
3. Your screen will appear as "Online" once connected

### Screen Status

- **Online**: Device is connected and playing content
- **Offline**: Device is not connected
- **Pending**: Waiting for pairing

### Assigning Content

1. Select a screen from the list
2. Choose a playlist, layout, or schedule
3. Content will sync automatically',
ARRAY['screens'],
ARRAY['screen', 'tv', 'display', 'device', 'pair', 'connect'], 1),

-- Playlists
('creating-playlists', 'playlists', 'Creating Playlists', 'Build and manage content playlists',
'## Creating Playlists

Playlists are ordered collections of media that play in sequence.

### Create a Playlist

1. Go to **Playlists** from the sidebar
2. Click **Create Playlist**
3. Name your playlist and add a description
4. Drag media items into the playlist

### Playlist Settings

- **Default Duration**: How long each item displays
- **Transition Effect**: Fade, slide, or instant
- **Shuffle**: Randomize playback order

### Managing Items

- Drag items to reorder
- Set custom durations per item
- Remove items with the delete button

### Tips

- Group related content together
- Test playback in preview mode
- Use schedules for time-based playlists',
ARRAY['playlists'],
ARRAY['playlist', 'content', 'loop', 'sequence'], 1),

-- Layouts
('using-layouts', 'layouts', 'Using Layouts', 'Create multi-zone displays with layouts',
'## Using Layouts

Layouts let you display multiple content zones on a single screen.

### Layout Templates

- **Single Zone**: Full-screen content
- **Split Horizontal**: Two horizontal zones
- **Split Vertical**: Two vertical zones
- **Grid 2x2**: Four equal zones
- **L-Shape**: Main zone with sidebar

### Creating a Layout

1. Go to **Layouts** from the sidebar
2. Click **Create Layout**
3. Choose a template
4. Assign content to each zone

### Zone Content

Each zone can display:
- A playlist
- A single media item
- An app widget (clock, weather, etc.)

### Tips

- Use consistent content across zones
- Test on actual screen dimensions
- Consider viewing distance when sizing zones',
ARRAY['layouts'],
ARRAY['layout', 'zone', 'template', 'split', 'grid'], 1),

-- Campaigns
('running-campaigns', 'campaigns', 'Running Campaigns', 'Create time-limited promotional campaigns',
'## Running Campaigns

Campaigns are time-limited content promotions with tracking.

### Creating a Campaign

1. Go to **Campaigns** from the sidebar
2. Click **Create Campaign**
3. Set name, dates, and target screens
4. Add campaign content

### Campaign Settings

- **Start/End Dates**: When the campaign runs
- **Priority**: Higher priority overrides regular content
- **Target Screens**: Which screens show the campaign
- **Screen Groups**: Target by group

### Tracking Results

- View impressions and playtime
- Compare performance across screens
- Export campaign reports

### Tips

- Plan campaigns in advance
- Use eye-catching visuals
- Track results to optimize future campaigns',
ARRAY['campaigns'],
ARRAY['campaign', 'promotion', 'promo', 'advertise', 'schedule'], 1),

-- Templates
('using-templates', 'templates', 'Using Templates', 'Start faster with pre-built templates',
'## Using Templates

Templates give you pre-designed starting points for common use cases.

### Template Categories

- **Menu Boards**: Restaurant and cafe menus
- **Retail**: Product displays and sales
- **Corporate**: Meeting rooms and lobbies
- **Events**: Conferences and exhibitions

### Using a Template

1. Go to **Templates** from the sidebar
2. Browse or search for templates
3. Click **Use Template**
4. Customize colors, text, and images

### Creating Custom Templates

1. Create a playlist or layout
2. Click **Save as Template**
3. Add description and category
4. Share with your team

### Tips

- Start with a template, then customize
- Match templates to your brand colors
- Preview before publishing',
ARRAY['templates'],
ARRAY['template', 'design', 'start', 'preset'], 1),

-- Billing
('billing-overview', 'billing', 'Billing & Plans', 'Manage your subscription and billing',
'## Billing & Plans

### Available Plans

- **Free**: 1 screen, basic features
- **Starter**: Up to 5 screens, all core features
- **Pro**: Unlimited screens, advanced features

### Managing Your Subscription

1. Go to **Plan & Limits** from the sidebar
2. View current usage and limits
3. Click **Manage Billing** for payment options

### Upgrading

1. Compare plan features
2. Click **Upgrade** on your chosen plan
3. Complete payment via Stripe
4. New limits apply immediately

### Payment Methods

- Credit/debit cards
- Automatic monthly billing
- Invoices available for download

### Cancellation

- Cancel anytime from billing portal
- Access continues until period end
- Data retained for 30 days after cancellation',
ARRAY['account-plan'],
ARRAY['billing', 'payment', 'plan', 'subscribe', 'upgrade', 'price'], 1)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  short_description = EXCLUDED.short_description,
  content = EXCLUDED.content,
  related_routes = EXCLUDED.related_routes,
  updated_at = now();

-- =====================================================
-- 9. RPC: SEARCH HELP TOPICS
-- =====================================================

CREATE OR REPLACE FUNCTION public.search_help_topics(
  p_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  category TEXT,
  title TEXT,
  short_description TEXT,
  related_routes TEXT[],
  relevance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.slug,
    h.category,
    h.title,
    h.short_description,
    h.related_routes,
    CASE
      WHEN p_query IS NULL THEN 100
      WHEN h.title ILIKE '%' || p_query || '%' THEN 100
      WHEN h.short_description ILIKE '%' || p_query || '%' THEN 80
      WHEN EXISTS (SELECT 1 FROM unnest(h.search_keywords) k WHERE k ILIKE '%' || p_query || '%') THEN 60
      WHEN h.content ILIKE '%' || p_query || '%' THEN 40
      ELSE 0
    END AS relevance
  FROM help_topics h
  WHERE h.is_active = true
  AND (p_category IS NULL OR h.category = p_category)
  AND (
    p_query IS NULL
    OR h.title ILIKE '%' || p_query || '%'
    OR h.short_description ILIKE '%' || p_query || '%'
    OR h.content ILIKE '%' || p_query || '%'
    OR EXISTS (SELECT 1 FROM unnest(h.search_keywords) k WHERE k ILIKE '%' || p_query || '%')
  )
  ORDER BY relevance DESC, h.display_order ASC;
END;
$$;

-- =====================================================
-- 10. RPC: GET HELP TOPIC BY SLUG
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_help_topic(p_slug TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  category TEXT,
  title TEXT,
  short_description TEXT,
  content TEXT,
  related_routes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.slug,
    h.category,
    h.title,
    h.short_description,
    h.content,
    h.related_routes
  FROM help_topics h
  WHERE h.slug = p_slug AND h.is_active = true;
END;
$$;

-- =====================================================
-- 11. RPC: GET CONTEXTUAL HELP FOR PAGE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_contextual_help(p_route TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  short_description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.slug,
    h.title,
    h.short_description
  FROM help_topics h
  WHERE h.is_active = true
  AND p_route = ANY(h.related_routes)
  ORDER BY h.display_order ASC
  LIMIT 5;
END;
$$;

-- =====================================================
-- GRANTS
-- =====================================================

-- Demo functions - super_admin only (enforced in function)
GRANT EXECUTE ON FUNCTION public.create_demo_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_demo_tenant TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_demo_tenants TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stale_demo_tenants TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_protected_asset TO authenticated;

-- Help functions - all authenticated users
GRANT EXECUTE ON FUNCTION public.search_help_topics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_help_topic TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_contextual_help TO authenticated;

-- Help topics read access
GRANT SELECT ON public.help_topics TO authenticated;
GRANT SELECT ON public.demo_content_packs TO authenticated;
