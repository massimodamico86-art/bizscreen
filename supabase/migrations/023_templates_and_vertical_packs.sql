-- =============================================
-- Migration: 023_templates_and_vertical_packs.sql
-- Description: Templates and Vertical Packs for quick-start content
-- =============================================

-- =============================================
-- 1. Template Categories
-- =============================================

CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon key for frontend (e.g., 'utensils', 'scissors')
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_template_categories_sort ON public.template_categories(sort_order);

-- =============================================
-- 2. Content Templates
-- =============================================

CREATE TABLE IF NOT EXISTS public.content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES public.template_categories(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('playlist', 'layout', 'pack')),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_templates_category ON public.content_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_type ON public.content_templates(type);
CREATE INDEX IF NOT EXISTS idx_content_templates_active ON public.content_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_content_templates_sort ON public.content_templates(sort_order);

-- =============================================
-- 3. Content Template Blueprints
-- =============================================

CREATE TABLE IF NOT EXISTS public.content_template_blueprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.content_templates(id) ON DELETE CASCADE NOT NULL,
  blueprint_type TEXT NOT NULL CHECK (blueprint_type IN ('playlist', 'layout', 'schedule', 'pack')),
  blueprint JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for template lookup
CREATE INDEX IF NOT EXISTS idx_template_blueprints_template ON public.content_template_blueprints(template_id);

-- =============================================
-- 4. RLS Policies
-- =============================================

ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_template_blueprints ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read templates (they're global)
CREATE POLICY "Authenticated users can view template categories"
  ON public.template_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view content templates"
  ON public.content_templates FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view template blueprints"
  ON public.content_template_blueprints FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- 5. Apply Template RPC
-- =============================================

CREATE OR REPLACE FUNCTION public.apply_template(p_template_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_template RECORD;
  v_blueprint RECORD;
  v_result JSONB := '{"playlists": [], "layouts": [], "schedules": []}';
  v_new_playlist_id UUID;
  v_new_layout_id UUID;
  v_new_schedule_id UUID;
  v_playlist_data JSONB;
  v_layout_data JSONB;
  v_item JSONB;
  v_zone JSONB;
  v_item_order INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  SELECT COALESCE(
    (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
    v_user_id::TEXT
  )::UUID INTO v_tenant_id;

  -- Fetch template
  SELECT * INTO v_template
  FROM content_templates
  WHERE slug = p_template_slug AND is_active = true AND type != 'pack';

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_slug;
  END IF;

  -- Process each blueprint for this template
  FOR v_blueprint IN
    SELECT * FROM content_template_blueprints WHERE template_id = v_template.id
  LOOP
    -- Handle playlist blueprints
    IF v_blueprint.blueprint_type = 'playlist' THEN
      v_playlist_data := v_blueprint.blueprint;

      -- Create the playlist
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle,
        loop,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist_data->>'name', v_template.name),
        COALESCE(v_playlist_data->>'description', v_template.description),
        COALESCE((v_playlist_data->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist_data->>'transition_effect', 'fade'),
        COALESCE((v_playlist_data->>'shuffle')::BOOLEAN, false),
        COALESCE((v_playlist_data->>'loop')::BOOLEAN, true),
        jsonb_build_object(
          'template_slug', p_template_slug,
          'created_from_template', true
        )
      )
      RETURNING id INTO v_new_playlist_id;

      -- Insert playlist items from blueprint
      v_item_order := 0;
      IF v_playlist_data->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist_data->'items')
        LOOP
          v_item_order := v_item_order + 1;

          -- For now, create placeholder items with config_json containing placeholder info
          -- These can be media placeholders or app configs
          IF (v_item->>'kind') = 'app' THEN
            INSERT INTO playlist_items (
              playlist_id,
              item_order,
              app_id,
              duration,
              config_json
            ) VALUES (
              v_new_playlist_id,
              v_item_order,
              NULL, -- Will be set when user configures
              COALESCE((v_item->>'duration')::INTEGER, 30),
              jsonb_build_object(
                'app_type', v_item->>'app_type',
                'placeholder', true,
                'placeholder_key', v_item->>'placeholder_key',
                'default_config', v_item->'default_config'
              )
            );
          ELSE
            -- Media placeholder
            INSERT INTO playlist_items (
              playlist_id,
              item_order,
              media_id,
              duration,
              config_json
            ) VALUES (
              v_new_playlist_id,
              v_item_order,
              NULL, -- Will be set when user adds media
              COALESCE((v_item->>'duration')::INTEGER, 10),
              jsonb_build_object(
                'placeholder', true,
                'placeholder_key', v_item->>'placeholder_key',
                'placeholder_label', v_item->>'label',
                'placeholder_hint', v_item->>'hint'
              )
            );
          END IF;
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{playlists}',
        v_result->'playlists' || jsonb_build_array(
          jsonb_build_object('id', v_new_playlist_id, 'name', COALESCE(v_playlist_data->>'name', v_template.name))
        )
      );

    -- Handle layout blueprints
    ELSIF v_blueprint.blueprint_type = 'layout' THEN
      v_layout_data := v_blueprint.blueprint;

      -- Create the layout
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout_data->>'name', v_template.name),
        COALESCE(v_layout_data->>'description', v_template.description),
        COALESCE((v_layout_data->>'width')::INTEGER, 1920),
        COALESCE((v_layout_data->>'height')::INTEGER, 1080),
        COALESCE(v_layout_data->>'background_color', '#000000'),
        jsonb_build_object(
          'template_slug', p_template_slug,
          'created_from_template', true
        )
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones from blueprint
      IF v_layout_data->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout_data->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type,
            config_json
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist'),
            jsonb_build_object(
              'placeholder', true,
              'placeholder_key', v_zone->>'placeholder_key',
              'placeholder_label', v_zone->>'label'
            )
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{layouts}',
        v_result->'layouts' || jsonb_build_array(
          jsonb_build_object('id', v_new_layout_id, 'name', COALESCE(v_layout_data->>'name', v_template.name))
        )
      );

    -- Handle schedule blueprints
    ELSIF v_blueprint.blueprint_type = 'schedule' THEN
      -- Create schedule (simplified)
      INSERT INTO schedules (
        owner_id,
        name,
        description,
        is_default,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_blueprint.blueprint->>'name', 'Template Schedule'),
        COALESCE(v_blueprint.blueprint->>'description', 'Created from template'),
        false,
        jsonb_build_object(
          'template_slug', p_template_slug,
          'created_from_template', true
        )
      )
      RETURNING id INTO v_new_schedule_id;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{schedules}',
        v_result->'schedules' || jsonb_build_array(
          jsonb_build_object('id', v_new_schedule_id, 'name', COALESCE(v_blueprint.blueprint->>'name', 'Template Schedule'))
        )
      );
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

-- =============================================
-- 6. Apply Pack Template RPC
-- =============================================

CREATE OR REPLACE FUNCTION public.apply_pack_template(p_pack_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_template RECORD;
  v_blueprint RECORD;
  v_result JSONB := '{"playlists": [], "layouts": [], "schedules": []}';
  v_pack_data JSONB;
  v_playlist JSONB;
  v_layout JSONB;
  v_schedule JSONB;
  v_new_playlist_id UUID;
  v_new_layout_id UUID;
  v_new_schedule_id UUID;
  v_item JSONB;
  v_zone JSONB;
  v_item_order INTEGER;
  v_created_playlists JSONB := '{}'; -- Map of placeholder_key -> playlist_id
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  SELECT COALESCE(
    (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
    v_user_id::TEXT
  )::UUID INTO v_tenant_id;

  -- Fetch pack template
  SELECT * INTO v_template
  FROM content_templates
  WHERE slug = p_pack_slug AND is_active = true AND type = 'pack';

  IF v_template IS NULL THEN
    RAISE EXCEPTION 'Pack template not found: %', p_pack_slug;
  END IF;

  -- Fetch pack blueprint
  SELECT * INTO v_blueprint
  FROM content_template_blueprints
  WHERE template_id = v_template.id AND blueprint_type = 'pack'
  LIMIT 1;

  IF v_blueprint IS NULL THEN
    RAISE EXCEPTION 'Pack blueprint not found for: %', p_pack_slug;
  END IF;

  v_pack_data := v_blueprint.blueprint;

  -- Create playlists first (so we can reference them in layouts)
  IF v_pack_data->'playlists' IS NOT NULL THEN
    FOR v_playlist IN SELECT * FROM jsonb_array_elements(v_pack_data->'playlists')
    LOOP
      -- Create playlist
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle,
        loop,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist->>'name', 'Untitled Playlist'),
        v_playlist->>'description',
        COALESCE((v_playlist->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist->>'transition_effect', 'fade'),
        COALESCE((v_playlist->>'shuffle')::BOOLEAN, false),
        COALESCE((v_playlist->>'loop')::BOOLEAN, true),
        jsonb_build_object(
          'pack_slug', p_pack_slug,
          'created_from_pack', true,
          'playlist_key', v_playlist->>'key'
        )
      )
      RETURNING id INTO v_new_playlist_id;

      -- Store reference for layout assignment
      IF v_playlist->>'key' IS NOT NULL THEN
        v_created_playlists := v_created_playlists || jsonb_build_object(v_playlist->>'key', v_new_playlist_id);
      END IF;

      -- Insert playlist items
      v_item_order := 0;
      IF v_playlist->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist->'items')
        LOOP
          v_item_order := v_item_order + 1;

          IF (v_item->>'kind') = 'app' THEN
            INSERT INTO playlist_items (
              playlist_id,
              item_order,
              duration,
              config_json
            ) VALUES (
              v_new_playlist_id,
              v_item_order,
              COALESCE((v_item->>'duration')::INTEGER, 30),
              jsonb_build_object(
                'app_type', v_item->>'app_type',
                'placeholder', true,
                'placeholder_key', v_item->>'placeholder_key',
                'default_config', v_item->'default_config'
              )
            );
          ELSE
            INSERT INTO playlist_items (
              playlist_id,
              item_order,
              duration,
              config_json
            ) VALUES (
              v_new_playlist_id,
              v_item_order,
              COALESCE((v_item->>'duration')::INTEGER, 10),
              jsonb_build_object(
                'placeholder', true,
                'placeholder_key', v_item->>'placeholder_key',
                'placeholder_label', v_item->>'label',
                'placeholder_hint', v_item->>'hint'
              )
            );
          END IF;
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{playlists}',
        v_result->'playlists' || jsonb_build_array(
          jsonb_build_object('id', v_new_playlist_id, 'name', COALESCE(v_playlist->>'name', 'Untitled Playlist'))
        )
      );
    END LOOP;
  END IF;

  -- Create layouts with zone assignments
  IF v_pack_data->'layouts' IS NOT NULL THEN
    FOR v_layout IN SELECT * FROM jsonb_array_elements(v_pack_data->'layouts')
    LOOP
      -- Create layout
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout->>'name', 'Untitled Layout'),
        v_layout->>'description',
        COALESCE((v_layout->>'width')::INTEGER, 1920),
        COALESCE((v_layout->>'height')::INTEGER, 1080),
        COALESCE(v_layout->>'background_color', '#000000'),
        jsonb_build_object(
          'pack_slug', p_pack_slug,
          'created_from_pack', true
        )
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones
      IF v_layout->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type,
            playlist_id,
            config_json
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist'),
            -- Link to created playlist if key matches
            CASE
              WHEN v_zone->>'playlist_key' IS NOT NULL
              THEN (v_created_playlists->>( v_zone->>'playlist_key'))::UUID
              ELSE NULL
            END,
            jsonb_build_object(
              'placeholder_key', v_zone->>'placeholder_key',
              'placeholder_label', v_zone->>'label'
            )
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{layouts}',
        v_result->'layouts' || jsonb_build_array(
          jsonb_build_object('id', v_new_layout_id, 'name', COALESCE(v_layout->>'name', 'Untitled Layout'))
        )
      );
    END LOOP;
  END IF;

  -- Create schedules
  IF v_pack_data->'schedules' IS NOT NULL THEN
    FOR v_schedule IN SELECT * FROM jsonb_array_elements(v_pack_data->'schedules')
    LOOP
      INSERT INTO schedules (
        owner_id,
        name,
        description,
        is_default,
        config_json
      ) VALUES (
        v_tenant_id,
        COALESCE(v_schedule->>'name', 'Default Schedule'),
        v_schedule->>'description',
        COALESCE((v_schedule->>'is_default')::BOOLEAN, false),
        jsonb_build_object(
          'pack_slug', p_pack_slug,
          'created_from_pack', true
        )
      )
      RETURNING id INTO v_new_schedule_id;

      v_result := jsonb_set(
        v_result,
        '{schedules}',
        v_result->'schedules' || jsonb_build_array(
          jsonb_build_object('id', v_new_schedule_id, 'name', COALESCE(v_schedule->>'name', 'Default Schedule'))
        )
      );
    END LOOP;
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================
-- 7. Seed Template Categories
-- =============================================

INSERT INTO template_categories (slug, name, description, icon, sort_order) VALUES
  ('restaurant', 'Restaurant & Café', 'Menu boards, daily specials, and promotions for food service', 'utensils', 1),
  ('salon', 'Salon & Spa', 'Service menus, pricing, and promotional content for beauty businesses', 'scissors', 2),
  ('gym', 'Gym & Fitness', 'Class schedules, announcements, and motivational content for fitness centers', 'dumbbell', 3),
  ('retail', 'Retail & Store', 'Product showcases, sales, and promotional displays for retail', 'shopping-bag', 4),
  ('generic', 'General Business', 'Welcome screens, announcements, and multipurpose templates', 'building', 5)
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- 8. Seed Content Templates
-- =============================================

-- Get category IDs for reference
DO $$
DECLARE
  v_restaurant_cat UUID;
  v_salon_cat UUID;
  v_gym_cat UUID;
  v_retail_cat UUID;
  v_generic_cat UUID;
  v_template_id UUID;
BEGIN
  SELECT id INTO v_restaurant_cat FROM template_categories WHERE slug = 'restaurant';
  SELECT id INTO v_salon_cat FROM template_categories WHERE slug = 'salon';
  SELECT id INTO v_gym_cat FROM template_categories WHERE slug = 'gym';
  SELECT id INTO v_retail_cat FROM template_categories WHERE slug = 'retail';
  SELECT id INTO v_generic_cat FROM template_categories WHERE slug = 'generic';

  -- ========================================
  -- RESTAURANT TEMPLATES
  -- ========================================

  -- Restaurant Promo Playlist
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_restaurant_cat,
    'playlist',
    'restaurant_promo_playlist',
    'Restaurant Promos',
    'Showcase daily specials, promotions, and featured dishes with eye-catching visuals',
    '/templates/restaurant-promo.jpg',
    1,
    '{"recommended_for": "16:9 screens", "estimated_items": 5}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'playlist', '{
      "name": "Daily Specials & Promos",
      "description": "Feature your restaurant specials and promotions",
      "default_duration": 10,
      "transition_effect": "fade",
      "shuffle": false,
      "loop": true,
      "items": [
        {"kind": "media", "placeholder_key": "hero_dish", "label": "Hero Dish Photo", "hint": "Your signature dish or daily special", "duration": 12},
        {"kind": "media", "placeholder_key": "special_1", "label": "Special #1", "hint": "Today''s appetizer or starter", "duration": 10},
        {"kind": "media", "placeholder_key": "special_2", "label": "Special #2", "hint": "Main course special", "duration": 10},
        {"kind": "media", "placeholder_key": "dessert", "label": "Dessert Feature", "hint": "Sweet treats or drinks", "duration": 10},
        {"kind": "media", "placeholder_key": "promo_banner", "label": "Promotion Banner", "hint": "Happy hour, discounts, or events", "duration": 8}
      ]
    }');
  END IF;

  -- Restaurant Two-Zone Layout
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_restaurant_cat,
    'layout',
    'restaurant_two_zone_layout',
    'Menu & Promo Split',
    'Two-zone layout: main area for menu/specials, sidebar for promotions',
    '/templates/restaurant-layout.jpg',
    2,
    '{"zones": 2, "orientation": "landscape"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'layout', '{
      "name": "Menu & Promo Display",
      "description": "Split screen with menu on left, promos on right",
      "width": 1920,
      "height": 1080,
      "background_color": "#1a1a1a",
      "zones": [
        {"name": "Main Content", "x_percent": 0, "y_percent": 0, "width_percent": 70, "height_percent": 100, "z_index": 0, "content_type": "playlist", "placeholder_key": "main_zone", "label": "Menu or main content"},
        {"name": "Sidebar Promos", "x_percent": 70, "y_percent": 0, "width_percent": 30, "height_percent": 100, "z_index": 0, "content_type": "playlist", "placeholder_key": "promo_zone", "label": "Promotions and specials"}
      ]
    }');
  END IF;

  -- Restaurant Starter Pack
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_restaurant_cat,
    'pack',
    'restaurant_starter_pack',
    'Restaurant Starter Pack',
    'Complete setup with menu playlist, promo playlist, and split-screen layout',
    '/templates/restaurant-pack.jpg',
    0,
    '{"includes": ["2 playlists", "1 layout"], "best_for": "New restaurants"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'pack', '{
      "playlists": [
        {
          "key": "menu_playlist",
          "name": "Menu Board",
          "description": "Your restaurant menu and dishes",
          "default_duration": 12,
          "items": [
            {"kind": "media", "placeholder_key": "menu_page_1", "label": "Menu Page 1", "hint": "Appetizers and starters", "duration": 15},
            {"kind": "media", "placeholder_key": "menu_page_2", "label": "Menu Page 2", "hint": "Main courses", "duration": 15},
            {"kind": "media", "placeholder_key": "menu_page_3", "label": "Menu Page 3", "hint": "Desserts and drinks", "duration": 15}
          ]
        },
        {
          "key": "promo_playlist",
          "name": "Daily Specials",
          "description": "Today''s specials and promotions",
          "default_duration": 10,
          "items": [
            {"kind": "media", "placeholder_key": "daily_special", "label": "Daily Special", "hint": "Chef''s recommendation", "duration": 10},
            {"kind": "media", "placeholder_key": "happy_hour", "label": "Happy Hour", "hint": "Drink specials", "duration": 10},
            {"kind": "media", "placeholder_key": "promo", "label": "Current Promotion", "hint": "Discounts or events", "duration": 8}
          ]
        }
      ],
      "layouts": [
        {
          "name": "Restaurant Display",
          "description": "Menu on left, specials on right",
          "width": 1920,
          "height": 1080,
          "background_color": "#1a1a1a",
          "zones": [
            {"name": "Menu", "x_percent": 0, "y_percent": 0, "width_percent": 65, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "menu_playlist"},
            {"name": "Specials", "x_percent": 65, "y_percent": 0, "width_percent": 35, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "promo_playlist"}
          ]
        }
      ],
      "schedules": [
        {
          "name": "All Day Display",
          "description": "Runs content all day",
          "is_default": true
        }
      ]
    }');
  END IF;

  -- ========================================
  -- SALON TEMPLATES
  -- ========================================

  -- Salon Services Playlist
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_salon_cat,
    'playlist',
    'salon_services_playlist',
    'Services & Pricing',
    'Display your salon services, pricing, and stylists',
    '/templates/salon-services.jpg',
    1,
    '{"recommended_for": "Waiting areas", "estimated_items": 4}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'playlist', '{
      "name": "Salon Services",
      "description": "Showcase your services and pricing",
      "default_duration": 12,
      "items": [
        {"kind": "media", "placeholder_key": "services_menu", "label": "Services Menu", "hint": "List of services with prices", "duration": 15},
        {"kind": "media", "placeholder_key": "stylist_1", "label": "Featured Stylist", "hint": "Highlight your team", "duration": 10},
        {"kind": "media", "placeholder_key": "before_after", "label": "Before & After", "hint": "Showcase transformations", "duration": 10},
        {"kind": "media", "placeholder_key": "special_offer", "label": "Special Offer", "hint": "Current promotions", "duration": 8}
      ]
    }');
  END IF;

  -- Salon Starter Pack
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_salon_cat,
    'pack',
    'salon_starter_pack',
    'Salon Starter Pack',
    'Complete setup for salons with services display and promotional content',
    '/templates/salon-pack.jpg',
    0,
    '{"includes": ["2 playlists", "1 layout"], "best_for": "Hair salons, spas, nail studios"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'pack', '{
      "playlists": [
        {
          "key": "services_playlist",
          "name": "Services Menu",
          "description": "Your salon services and pricing",
          "default_duration": 15,
          "items": [
            {"kind": "media", "placeholder_key": "hair_services", "label": "Hair Services", "hint": "Cuts, colors, styling", "duration": 15},
            {"kind": "media", "placeholder_key": "nail_services", "label": "Nail Services", "hint": "Manicures, pedicures", "duration": 15},
            {"kind": "media", "placeholder_key": "spa_services", "label": "Spa Services", "hint": "Facials, massages", "duration": 15}
          ]
        },
        {
          "key": "promo_playlist",
          "name": "Promotions & Looks",
          "description": "Featured styles and offers",
          "default_duration": 10,
          "items": [
            {"kind": "media", "placeholder_key": "featured_look", "label": "Featured Look", "hint": "Trending styles", "duration": 10},
            {"kind": "media", "placeholder_key": "team_photo", "label": "Meet the Team", "hint": "Your stylists", "duration": 10},
            {"kind": "media", "placeholder_key": "offer", "label": "Special Offer", "hint": "Current promotion", "duration": 8}
          ]
        }
      ],
      "layouts": [
        {
          "name": "Salon Display",
          "description": "Services with promotional sidebar",
          "width": 1920,
          "height": 1080,
          "background_color": "#f5f0eb",
          "zones": [
            {"name": "Services", "x_percent": 0, "y_percent": 0, "width_percent": 60, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "services_playlist"},
            {"name": "Promotions", "x_percent": 60, "y_percent": 0, "width_percent": 40, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "promo_playlist"}
          ]
        }
      ]
    }');
  END IF;

  -- ========================================
  -- GYM TEMPLATES
  -- ========================================

  -- Gym Class Schedule Playlist
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_gym_cat,
    'playlist',
    'gym_schedule_playlist',
    'Class Schedule Board',
    'Display your gym class schedule and trainer information',
    '/templates/gym-schedule.jpg',
    1,
    '{"recommended_for": "Gym lobbies", "estimated_items": 4}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'playlist', '{
      "name": "Today''s Classes",
      "description": "Gym class schedule and announcements",
      "default_duration": 15,
      "items": [
        {"kind": "media", "placeholder_key": "schedule_today", "label": "Today''s Schedule", "hint": "Today''s class lineup", "duration": 20},
        {"kind": "media", "placeholder_key": "featured_class", "label": "Featured Class", "hint": "Highlight a popular class", "duration": 12},
        {"kind": "media", "placeholder_key": "trainer_spotlight", "label": "Trainer Spotlight", "hint": "Feature a trainer", "duration": 10},
        {"kind": "media", "placeholder_key": "motivation", "label": "Motivational Quote", "hint": "Inspire your members", "duration": 8}
      ]
    }');
  END IF;

  -- Gym Starter Pack
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_gym_cat,
    'pack',
    'gym_starter_pack',
    'Gym & Fitness Pack',
    'Complete digital signage for gyms with schedules, announcements, and motivation',
    '/templates/gym-pack.jpg',
    0,
    '{"includes": ["2 playlists", "1 layout"], "best_for": "Gyms, fitness studios, yoga centers"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'pack', '{
      "playlists": [
        {
          "key": "schedule_playlist",
          "name": "Class Schedule",
          "description": "Daily classes and schedules",
          "default_duration": 20,
          "items": [
            {"kind": "media", "placeholder_key": "morning_classes", "label": "Morning Classes", "hint": "6AM-12PM schedule", "duration": 20},
            {"kind": "media", "placeholder_key": "afternoon_classes", "label": "Afternoon Classes", "hint": "12PM-6PM schedule", "duration": 20},
            {"kind": "media", "placeholder_key": "evening_classes", "label": "Evening Classes", "hint": "6PM-10PM schedule", "duration": 20}
          ]
        },
        {
          "key": "motivation_playlist",
          "name": "Motivation & Announcements",
          "description": "Motivational content and gym news",
          "default_duration": 10,
          "items": [
            {"kind": "media", "placeholder_key": "quote_1", "label": "Quote #1", "hint": "Motivational message", "duration": 8},
            {"kind": "media", "placeholder_key": "announcement", "label": "Gym Announcement", "hint": "News and updates", "duration": 10},
            {"kind": "media", "placeholder_key": "member_spotlight", "label": "Member Spotlight", "hint": "Feature a member", "duration": 10}
          ]
        }
      ],
      "layouts": [
        {
          "name": "Gym Lobby Display",
          "description": "Schedule with motivation sidebar",
          "width": 1920,
          "height": 1080,
          "background_color": "#1a1a2e",
          "zones": [
            {"name": "Schedule", "x_percent": 0, "y_percent": 0, "width_percent": 70, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "schedule_playlist"},
            {"name": "Motivation", "x_percent": 70, "y_percent": 0, "width_percent": 30, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "motivation_playlist"}
          ]
        }
      ]
    }');
  END IF;

  -- ========================================
  -- RETAIL TEMPLATES
  -- ========================================

  -- Retail Product Showcase
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_retail_cat,
    'playlist',
    'retail_showcase_playlist',
    'Product Showcase',
    'Highlight products, sales, and new arrivals',
    '/templates/retail-showcase.jpg',
    1,
    '{"recommended_for": "Store windows, displays", "estimated_items": 5}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'playlist', '{
      "name": "Featured Products",
      "description": "Showcase your products and deals",
      "default_duration": 10,
      "items": [
        {"kind": "media", "placeholder_key": "new_arrivals", "label": "New Arrivals", "hint": "Latest products", "duration": 12},
        {"kind": "media", "placeholder_key": "bestseller", "label": "Best Seller", "hint": "Top selling item", "duration": 10},
        {"kind": "media", "placeholder_key": "sale_item", "label": "On Sale", "hint": "Current discounts", "duration": 10},
        {"kind": "media", "placeholder_key": "seasonal", "label": "Seasonal Feature", "hint": "Seasonal products", "duration": 10},
        {"kind": "media", "placeholder_key": "store_promo", "label": "Store Promotion", "hint": "Special offers", "duration": 8}
      ]
    }');
  END IF;

  -- Retail Starter Pack
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_retail_cat,
    'pack',
    'retail_starter_pack',
    'Retail Store Pack',
    'Complete signage for retail with product showcases and promotions',
    '/templates/retail-pack.jpg',
    0,
    '{"includes": ["2 playlists", "1 layout"], "best_for": "Shops, boutiques, stores"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'pack', '{
      "playlists": [
        {
          "key": "products_playlist",
          "name": "Featured Products",
          "description": "Showcase your products",
          "default_duration": 10,
          "items": [
            {"kind": "media", "placeholder_key": "product_1", "label": "Product #1", "hint": "Featured product", "duration": 10},
            {"kind": "media", "placeholder_key": "product_2", "label": "Product #2", "hint": "Featured product", "duration": 10},
            {"kind": "media", "placeholder_key": "product_3", "label": "Product #3", "hint": "Featured product", "duration": 10}
          ]
        },
        {
          "key": "sales_playlist",
          "name": "Sales & Offers",
          "description": "Current promotions",
          "default_duration": 8,
          "items": [
            {"kind": "media", "placeholder_key": "sale_banner", "label": "Sale Banner", "hint": "Current sale", "duration": 10},
            {"kind": "media", "placeholder_key": "clearance", "label": "Clearance", "hint": "Clearance items", "duration": 8},
            {"kind": "media", "placeholder_key": "loyalty", "label": "Loyalty Program", "hint": "Rewards info", "duration": 8}
          ]
        }
      ],
      "layouts": [
        {
          "name": "Store Display",
          "description": "Products with sales sidebar",
          "width": 1920,
          "height": 1080,
          "background_color": "#ffffff",
          "zones": [
            {"name": "Products", "x_percent": 0, "y_percent": 0, "width_percent": 65, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "products_playlist"},
            {"name": "Sales", "x_percent": 65, "y_percent": 0, "width_percent": 35, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "sales_playlist"}
          ]
        }
      ]
    }');
  END IF;

  -- ========================================
  -- GENERIC TEMPLATES
  -- ========================================

  -- Generic Welcome Playlist
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_generic_cat,
    'playlist',
    'generic_welcome_playlist',
    'Welcome Screen',
    'Simple welcome display with logo and key messages',
    '/templates/generic-welcome.jpg',
    1,
    '{"recommended_for": "Lobbies, reception areas", "estimated_items": 3}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'playlist', '{
      "name": "Welcome Display",
      "description": "Welcome visitors to your business",
      "default_duration": 15,
      "items": [
        {"kind": "media", "placeholder_key": "welcome_logo", "label": "Welcome + Logo", "hint": "Your logo and welcome message", "duration": 20},
        {"kind": "media", "placeholder_key": "about_us", "label": "About Us", "hint": "Company information", "duration": 15},
        {"kind": "media", "placeholder_key": "contact", "label": "Contact Info", "hint": "How to reach you", "duration": 10}
      ]
    }');
  END IF;

  -- Generic Clock Corner Layout
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_generic_cat,
    'layout',
    'generic_clock_corner_layout',
    'Content with Clock',
    'Main content area with a clock widget in the corner',
    '/templates/generic-clock.jpg',
    2,
    '{"zones": 2, "includes_app": true}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'layout', '{
      "name": "Content with Clock",
      "description": "Main content with clock in corner",
      "width": 1920,
      "height": 1080,
      "background_color": "#000000",
      "zones": [
        {"name": "Main Content", "x_percent": 0, "y_percent": 0, "width_percent": 100, "height_percent": 85, "z_index": 0, "content_type": "playlist", "placeholder_key": "main_content"},
        {"name": "Clock Bar", "x_percent": 0, "y_percent": 85, "width_percent": 100, "height_percent": 15, "z_index": 1, "content_type": "app", "placeholder_key": "clock_widget", "label": "Clock and date display"}
      ]
    }');
  END IF;

  -- Generic Starter Pack
  INSERT INTO content_templates (category_id, type, slug, name, description, thumbnail_url, sort_order, meta)
  VALUES (
    v_generic_cat,
    'pack',
    'generic_starter_pack',
    'Quick Start Pack',
    'Basic setup for any business with welcome content and announcements',
    '/templates/generic-pack.jpg',
    0,
    '{"includes": ["2 playlists", "1 layout"], "best_for": "Any business type"}'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO v_template_id;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO content_template_blueprints (template_id, blueprint_type, blueprint)
    VALUES (v_template_id, 'pack', '{
      "playlists": [
        {
          "key": "welcome_playlist",
          "name": "Welcome & Info",
          "description": "Welcome visitors and share information",
          "default_duration": 15,
          "items": [
            {"kind": "media", "placeholder_key": "welcome", "label": "Welcome Screen", "hint": "Logo and welcome message", "duration": 20},
            {"kind": "media", "placeholder_key": "info_1", "label": "Information #1", "hint": "Key information", "duration": 15},
            {"kind": "media", "placeholder_key": "info_2", "label": "Information #2", "hint": "More details", "duration": 15}
          ]
        },
        {
          "key": "announcements_playlist",
          "name": "Announcements",
          "description": "News and updates",
          "default_duration": 10,
          "items": [
            {"kind": "media", "placeholder_key": "announcement_1", "label": "Announcement #1", "hint": "News or update", "duration": 10},
            {"kind": "media", "placeholder_key": "announcement_2", "label": "Announcement #2", "hint": "News or update", "duration": 10}
          ]
        }
      ],
      "layouts": [
        {
          "name": "Standard Display",
          "description": "Main content with announcements sidebar",
          "width": 1920,
          "height": 1080,
          "background_color": "#1e293b",
          "zones": [
            {"name": "Main", "x_percent": 0, "y_percent": 0, "width_percent": 70, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "welcome_playlist"},
            {"name": "Sidebar", "x_percent": 70, "y_percent": 0, "width_percent": 30, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "announcements_playlist"}
          ]
        }
      ]
    }');
  END IF;

END $$;

-- =============================================
-- 9. Update timestamps trigger
-- =============================================

CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_template_categories_updated_at ON template_categories;
CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON template_categories
  FOR EACH ROW EXECUTE FUNCTION update_template_updated_at();

DROP TRIGGER IF EXISTS update_content_templates_updated_at ON content_templates;
CREATE TRIGGER update_content_templates_updated_at
  BEFORE UPDATE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION update_template_updated_at();

DROP TRIGGER IF EXISTS update_template_blueprints_updated_at ON content_template_blueprints;
CREATE TRIGGER update_template_blueprints_updated_at
  BEFORE UPDATE ON content_template_blueprints
  FOR EACH ROW EXECUTE FUNCTION update_template_updated_at();

-- =============================================
-- Done!
-- =============================================
