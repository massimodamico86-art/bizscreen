-- Migration 064: Fix UUID function and update template functions
--
-- Problems fixed:
-- 1. uuid_generate_v4() not accessible in SECURITY DEFINER functions with search_path = public
-- 2. Template functions still reference incorrect columns from schema mismatch
-- 3. Need to use gen_random_uuid() (built-in pgcrypto) instead of uuid_generate_v4() (uuid-ossp)

-- ============================================================================
-- 1. Ensure pgcrypto extension is available (provides gen_random_uuid)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 2. Fix apply_template function - use gen_random_uuid() and correct columns
-- ============================================================================

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
  v_item_position INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  BEGIN
    SELECT COALESCE(
      (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
      v_user_id::TEXT
    )::UUID INTO v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := v_user_id;
  END;

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

      -- Create the playlist (using actual columns that exist)
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist_data->>'name', v_template.name),
        COALESCE(v_playlist_data->>'description', v_template.description),
        COALESCE((v_playlist_data->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist_data->>'transition_effect', 'fade'),
        COALESCE((v_playlist_data->>'shuffle')::BOOLEAN, false)
      )
      RETURNING id INTO v_new_playlist_id;

      -- Insert playlist items from blueprint (using actual columns)
      v_item_position := 0;
      IF v_playlist_data->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist_data->'items')
        LOOP
          v_item_position := v_item_position + 1;

          -- Insert placeholder item - will be configured by user later
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            COALESCE(v_item->>'item_type', 'media'),
            COALESCE((v_item->>'item_id')::UUID, gen_random_uuid()), -- Use gen_random_uuid
            v_item_position,
            COALESCE((v_item->>'duration')::INTEGER, 10)
          );
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

      -- Create the layout (using actual columns that exist)
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout_data->>'name', v_template.name),
        COALESCE(v_layout_data->>'description', v_template.description),
        COALESCE((v_layout_data->>'width')::INTEGER, 1920),
        COALESCE((v_layout_data->>'height')::INTEGER, 1080),
        COALESCE(v_layout_data->>'background_color', '#000000')
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones from blueprint (using actual columns)
      IF v_layout_data->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout_data->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            zone_name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist')
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
      -- Create schedule (using actual columns)
      INSERT INTO schedules (
        owner_id,
        name,
        description,
        is_default
      ) VALUES (
        v_tenant_id,
        COALESCE(v_blueprint.blueprint->>'name', 'Template Schedule'),
        COALESCE(v_blueprint.blueprint->>'description', 'Created from template'),
        false
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

-- ============================================================================
-- 3. Fix apply_pack_template function - use gen_random_uuid() and correct columns
-- ============================================================================

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
  v_item_position INTEGER;
  v_created_playlists JSONB := '{}'; -- Map of key -> playlist_id
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get tenant ID (owner_id) - check if impersonating
  BEGIN
    SELECT COALESCE(
      (SELECT value FROM user_preferences WHERE user_id = v_user_id AND key = 'impersonating_tenant_id'),
      v_user_id::TEXT
    )::UUID INTO v_tenant_id;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := v_user_id;
  END;

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
      -- Create playlist using actual columns
      INSERT INTO playlists (
        owner_id,
        name,
        description,
        default_duration,
        transition_effect,
        shuffle
      ) VALUES (
        v_tenant_id,
        COALESCE(v_playlist->>'name', 'Pack Playlist'),
        COALESCE(v_playlist->>'description', ''),
        COALESCE((v_playlist->>'default_duration')::INTEGER, 10),
        COALESCE(v_playlist->>'transition_effect', 'fade'),
        COALESCE((v_playlist->>'shuffle')::BOOLEAN, false)
      )
      RETURNING id INTO v_new_playlist_id;

      -- Track created playlists by key
      IF v_playlist->>'key' IS NOT NULL THEN
        v_created_playlists := v_created_playlists || jsonb_build_object(v_playlist->>'key', v_new_playlist_id);
      END IF;

      -- Insert playlist items using actual columns
      v_item_position := 0;
      IF v_playlist->'items' IS NOT NULL THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_playlist->'items')
        LOOP
          v_item_position := v_item_position + 1;
          INSERT INTO playlist_items (
            playlist_id,
            item_type,
            item_id,
            position,
            duration
          ) VALUES (
            v_new_playlist_id,
            COALESCE(v_item->>'item_type', 'media'),
            COALESCE((v_item->>'item_id')::UUID, gen_random_uuid()), -- Use gen_random_uuid
            v_item_position,
            COALESCE((v_item->>'duration')::INTEGER, 10)
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{playlists}',
        v_result->'playlists' || jsonb_build_array(
          jsonb_build_object('id', v_new_playlist_id, 'name', COALESCE(v_playlist->>'name', 'Pack Playlist'))
        )
      );
    END LOOP;
  END IF;

  -- Create layouts (can reference created playlists)
  IF v_pack_data->'layouts' IS NOT NULL THEN
    FOR v_layout IN SELECT * FROM jsonb_array_elements(v_pack_data->'layouts')
    LOOP
      -- Create layout using actual columns
      INSERT INTO layouts (
        owner_id,
        name,
        description,
        width,
        height,
        background_color
      ) VALUES (
        v_tenant_id,
        COALESCE(v_layout->>'name', 'Pack Layout'),
        COALESCE(v_layout->>'description', ''),
        COALESCE((v_layout->>'width')::INTEGER, 1920),
        COALESCE((v_layout->>'height')::INTEGER, 1080),
        COALESCE(v_layout->>'background_color', '#000000')
      )
      RETURNING id INTO v_new_layout_id;

      -- Insert layout zones using actual columns
      IF v_layout->'zones' IS NOT NULL THEN
        FOR v_zone IN SELECT * FROM jsonb_array_elements(v_layout->'zones')
        LOOP
          INSERT INTO layout_zones (
            layout_id,
            name,
            zone_name,
            x_percent,
            y_percent,
            width_percent,
            height_percent,
            z_index,
            content_type,
            assigned_playlist_id
          ) VALUES (
            v_new_layout_id,
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE(v_zone->>'name', 'Zone'),
            COALESCE((v_zone->>'x_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'y_percent')::NUMERIC, 0),
            COALESCE((v_zone->>'width_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'height_percent')::NUMERIC, 100),
            COALESCE((v_zone->>'z_index')::INTEGER, 0),
            COALESCE(v_zone->>'content_type', 'playlist'),
            -- Link to created playlist if key matches
            (v_created_playlists->>(v_zone->>'playlist_key'))::UUID
          );
        END LOOP;
      END IF;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{layouts}',
        v_result->'layouts' || jsonb_build_array(
          jsonb_build_object('id', v_new_layout_id, 'name', COALESCE(v_layout->>'name', 'Pack Layout'))
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
        is_default
      ) VALUES (
        v_tenant_id,
        COALESCE(v_schedule->>'name', 'Pack Schedule'),
        COALESCE(v_schedule->>'description', ''),
        false
      )
      RETURNING id INTO v_new_schedule_id;

      -- Add to result
      v_result := jsonb_set(
        v_result,
        '{schedules}',
        v_result->'schedules' || jsonb_build_array(
          jsonb_build_object('id', v_new_schedule_id, 'name', COALESCE(v_schedule->>'name', 'Pack Schedule'))
        )
      );
    END LOOP;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. Update template content with more realistic data
-- ============================================================================

-- Update Restaurant Starter Pack with better content
UPDATE content_template_blueprints
SET blueprint = '{
  "playlists": [
    {
      "key": "menu_playlist",
      "name": "Digital Menu Board",
      "description": "Your complete restaurant menu with categories and pricing",
      "default_duration": 15,
      "items": [
        {"item_type": "media", "placeholder_key": "appetizers", "label": "Appetizers & Starters", "hint": "Soups, salads, and small plates - $8-$16", "duration": 15},
        {"item_type": "media", "placeholder_key": "entrees", "label": "Main Courses", "hint": "Signature dishes and entrees - $18-$35", "duration": 15},
        {"item_type": "media", "placeholder_key": "sides", "label": "Sides & Extras", "hint": "Side dishes and add-ons - $4-$8", "duration": 12},
        {"item_type": "media", "placeholder_key": "desserts", "label": "Desserts & Drinks", "hint": "Sweet endings and beverages - $6-$12", "duration": 12}
      ]
    },
    {
      "key": "specials_playlist",
      "name": "Daily Specials & Promos",
      "description": "Rotating specials, happy hour, and promotional content",
      "default_duration": 10,
      "items": [
        {"item_type": "media", "placeholder_key": "todays_special", "label": "Today''s Special", "hint": "Chef''s daily recommendation with photo", "duration": 12},
        {"item_type": "media", "placeholder_key": "happy_hour", "label": "Happy Hour (4-7pm)", "hint": "Drink specials: $5 wells, $6 wine, $4 drafts", "duration": 10},
        {"item_type": "media", "placeholder_key": "weekend_brunch", "label": "Weekend Brunch", "hint": "Saturday & Sunday 10am-2pm", "duration": 10},
        {"item_type": "media", "placeholder_key": "catering", "label": "Catering Available", "hint": "Book your private events", "duration": 8}
      ]
    }
  ],
  "layouts": [
    {
      "name": "Restaurant Split Screen",
      "description": "Menu on left (65%), specials on right (35%)",
      "width": 1920,
      "height": 1080,
      "background_color": "#1a1a1a",
      "zones": [
        {"name": "Menu Board", "x_percent": 0, "y_percent": 0, "width_percent": 65, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "menu_playlist"},
        {"name": "Specials & Promos", "x_percent": 65, "y_percent": 0, "width_percent": 35, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "specials_playlist"}
      ]
    }
  ],
  "schedules": [
    {
      "name": "Restaurant Hours",
      "description": "Display content during business hours",
      "is_default": true
    }
  ]
}'
WHERE template_id = (SELECT id FROM content_templates WHERE slug = 'restaurant_starter_pack')
  AND blueprint_type = 'pack';

-- Update Salon Starter Pack with better content
UPDATE content_template_blueprints
SET blueprint = '{
  "playlists": [
    {
      "key": "services_playlist",
      "name": "Services & Pricing Menu",
      "description": "Complete list of salon services with pricing",
      "default_duration": 15,
      "items": [
        {"item_type": "media", "placeholder_key": "hair_cuts", "label": "Haircuts & Styling", "hint": "Women''s Cut $45+, Men''s Cut $30+, Kids $20+", "duration": 15},
        {"item_type": "media", "placeholder_key": "color_services", "label": "Color Services", "hint": "Single Process $85+, Highlights $120+, Balayage $180+", "duration": 15},
        {"item_type": "media", "placeholder_key": "treatments", "label": "Treatments & Add-ons", "hint": "Deep Conditioning $25, Keratin $250+, Blowout $45+", "duration": 12},
        {"item_type": "media", "placeholder_key": "nail_services", "label": "Nail Services", "hint": "Manicure $35, Pedicure $50, Gel Polish $20+", "duration": 12}
      ]
    },
    {
      "key": "style_playlist",
      "name": "Style Gallery & Team",
      "description": "Showcase your work and introduce stylists",
      "default_duration": 10,
      "items": [
        {"item_type": "media", "placeholder_key": "before_after_1", "label": "Transformation #1", "hint": "Before/after color transformation", "duration": 10},
        {"item_type": "media", "placeholder_key": "before_after_2", "label": "Transformation #2", "hint": "Before/after cut & style", "duration": 10},
        {"item_type": "media", "placeholder_key": "meet_team", "label": "Meet Our Stylists", "hint": "Team photo with names and specialties", "duration": 12},
        {"item_type": "media", "placeholder_key": "first_visit", "label": "First Visit Special", "hint": "20% off for new clients", "duration": 8}
      ]
    }
  ],
  "layouts": [
    {
      "name": "Salon Waiting Area Display",
      "description": "Services on left, style gallery on right",
      "width": 1920,
      "height": 1080,
      "background_color": "#f5f0eb",
      "zones": [
        {"name": "Services Menu", "x_percent": 0, "y_percent": 0, "width_percent": 55, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "services_playlist"},
        {"name": "Style Gallery", "x_percent": 55, "y_percent": 0, "width_percent": 45, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "style_playlist"}
      ]
    }
  ],
  "schedules": [
    {
      "name": "Salon Hours",
      "description": "Display during business hours",
      "is_default": true
    }
  ]
}'
WHERE template_id = (SELECT id FROM content_templates WHERE slug = 'salon_starter_pack')
  AND blueprint_type = 'pack';

-- Update Gym Starter Pack with better content
UPDATE content_template_blueprints
SET blueprint = '{
  "playlists": [
    {
      "key": "schedule_playlist",
      "name": "Class Schedule Board",
      "description": "Daily fitness class schedule with times and instructors",
      "default_duration": 20,
      "items": [
        {"item_type": "media", "placeholder_key": "morning_schedule", "label": "Morning Classes (6-11am)", "hint": "6am Spin, 7am Yoga, 8am HIIT, 9am Pilates, 10am Strength", "duration": 20},
        {"item_type": "media", "placeholder_key": "afternoon_schedule", "label": "Afternoon Classes (12-5pm)", "hint": "12pm Power Lunch, 4pm After Work Burn, 5pm CrossFit", "duration": 20},
        {"item_type": "media", "placeholder_key": "evening_schedule", "label": "Evening Classes (6-9pm)", "hint": "6pm Boxing, 7pm Yoga Flow, 8pm Stretch & Recovery", "duration": 20}
      ]
    },
    {
      "key": "promo_playlist",
      "name": "Motivation & Announcements",
      "description": "Motivational content, membership info, and gym news",
      "default_duration": 10,
      "items": [
        {"item_type": "media", "placeholder_key": "quote_1", "label": "Motivation Quote", "hint": "\"The only bad workout is the one that didn''t happen\"", "duration": 8},
        {"item_type": "media", "placeholder_key": "membership", "label": "Membership Options", "hint": "Monthly $49, Annual $449 (save 2 months!)", "duration": 12},
        {"item_type": "media", "placeholder_key": "personal_training", "label": "Personal Training", "hint": "1-on-1 sessions starting at $60/hour", "duration": 10},
        {"item_type": "media", "placeholder_key": "member_spotlight", "label": "Member of the Month", "hint": "Celebrate member achievements", "duration": 10}
      ]
    }
  ],
  "layouts": [
    {
      "name": "Gym Lobby Display",
      "description": "Schedule grid with motivation sidebar",
      "width": 1920,
      "height": 1080,
      "background_color": "#1a1a2e",
      "zones": [
        {"name": "Class Schedule", "x_percent": 0, "y_percent": 0, "width_percent": 70, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "schedule_playlist"},
        {"name": "Motivation & News", "x_percent": 70, "y_percent": 0, "width_percent": 30, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "promo_playlist"}
      ]
    }
  ],
  "schedules": [
    {
      "name": "Gym Hours (5am-10pm)",
      "description": "Display during gym operating hours",
      "is_default": true
    }
  ]
}'
WHERE template_id = (SELECT id FROM content_templates WHERE slug = 'gym_starter_pack')
  AND blueprint_type = 'pack';

-- Update Retail Starter Pack with better content
UPDATE content_template_blueprints
SET blueprint = '{
  "playlists": [
    {
      "key": "products_playlist",
      "name": "Featured Products",
      "description": "Showcase your best-selling and featured products",
      "default_duration": 10,
      "items": [
        {"item_type": "media", "placeholder_key": "new_arrivals", "label": "New Arrivals", "hint": "Just in! Latest products for the season", "duration": 12},
        {"item_type": "media", "placeholder_key": "bestseller_1", "label": "Best Seller #1", "hint": "Your top-selling product with price", "duration": 10},
        {"item_type": "media", "placeholder_key": "bestseller_2", "label": "Best Seller #2", "hint": "Second most popular item", "duration": 10},
        {"item_type": "media", "placeholder_key": "staff_pick", "label": "Staff Pick", "hint": "Recommended by our team", "duration": 10}
      ]
    },
    {
      "key": "promos_playlist",
      "name": "Sales & Promotions",
      "description": "Current sales, discounts, and loyalty program info",
      "default_duration": 8,
      "items": [
        {"item_type": "media", "placeholder_key": "current_sale", "label": "Current Sale", "hint": "20% OFF all items this weekend!", "duration": 10},
        {"item_type": "media", "placeholder_key": "clearance", "label": "Clearance Section", "hint": "Up to 50% off select items", "duration": 8},
        {"item_type": "media", "placeholder_key": "loyalty", "label": "Loyalty Rewards", "hint": "Earn points on every purchase!", "duration": 8},
        {"item_type": "media", "placeholder_key": "store_info", "label": "Store Hours & Contact", "hint": "Open 10am-8pm daily | (555) 123-4567", "duration": 8}
      ]
    }
  ],
  "layouts": [
    {
      "name": "Store Window Display",
      "description": "Products showcase with promotions sidebar",
      "width": 1920,
      "height": 1080,
      "background_color": "#ffffff",
      "zones": [
        {"name": "Featured Products", "x_percent": 0, "y_percent": 0, "width_percent": 65, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "products_playlist"},
        {"name": "Sales & Promos", "x_percent": 65, "y_percent": 0, "width_percent": 35, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "promos_playlist"}
      ]
    }
  ],
  "schedules": [
    {
      "name": "Store Hours",
      "description": "Display during store operating hours",
      "is_default": true
    }
  ]
}'
WHERE template_id = (SELECT id FROM content_templates WHERE slug = 'retail_starter_pack')
  AND blueprint_type = 'pack';

-- Update Generic/Quick Start Pack with better content
UPDATE content_template_blueprints
SET blueprint = '{
  "playlists": [
    {
      "key": "welcome_playlist",
      "name": "Welcome & Company Info",
      "description": "Welcome visitors and share company information",
      "default_duration": 15,
      "items": [
        {"item_type": "media", "placeholder_key": "welcome_logo", "label": "Welcome Screen", "hint": "Your logo with \"Welcome to [Company Name]\"", "duration": 20},
        {"item_type": "media", "placeholder_key": "about_us", "label": "About Us", "hint": "Brief company description and mission", "duration": 15},
        {"item_type": "media", "placeholder_key": "services", "label": "Our Services", "hint": "What you offer to customers", "duration": 15},
        {"item_type": "media", "placeholder_key": "contact", "label": "Contact Information", "hint": "Phone, email, website, social media", "duration": 12}
      ]
    },
    {
      "key": "announcements_playlist",
      "name": "News & Announcements",
      "description": "Keep visitors informed with latest updates",
      "default_duration": 10,
      "items": [
        {"item_type": "media", "placeholder_key": "announcement_1", "label": "Announcement #1", "hint": "Current news or update", "duration": 10},
        {"item_type": "media", "placeholder_key": "announcement_2", "label": "Announcement #2", "hint": "Upcoming event or reminder", "duration": 10},
        {"item_type": "media", "placeholder_key": "social_media", "label": "Follow Us", "hint": "Social media handles and QR codes", "duration": 8}
      ]
    }
  ],
  "layouts": [
    {
      "name": "Lobby Display",
      "description": "Main content with announcements sidebar",
      "width": 1920,
      "height": 1080,
      "background_color": "#1e293b",
      "zones": [
        {"name": "Main Content", "x_percent": 0, "y_percent": 0, "width_percent": 70, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "welcome_playlist"},
        {"name": "Announcements", "x_percent": 70, "y_percent": 0, "width_percent": 30, "height_percent": 100, "z_index": 0, "content_type": "playlist", "playlist_key": "announcements_playlist"}
      ]
    }
  ],
  "schedules": [
    {
      "name": "Business Hours",
      "description": "Display during operating hours",
      "is_default": true
    }
  ]
}'
WHERE template_id = (SELECT id FROM content_templates WHERE slug = 'generic_starter_pack')
  AND blueprint_type = 'pack';

-- ============================================================================
-- 5. Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.apply_template(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_pack_template(TEXT) TO authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION apply_template IS 'Instantiate a content template for the current user - uses gen_random_uuid() and correct schema';
COMMENT ON FUNCTION apply_pack_template IS 'Instantiate a starter pack template for the current user - uses gen_random_uuid() and correct schema';

DO $$ BEGIN RAISE NOTICE 'Migration 064 completed: UUID function fixed and template content updated'; END $$;
