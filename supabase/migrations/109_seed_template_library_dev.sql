-- ============================================================================
-- Migration 109: Seed template_library for local dev
-- Phase 166.1 — unblocks manual UAT of Phase 166 Quick Customize flow
--
-- Creates one free-license scene template per category defined in migration 080
-- (retail, restaurant, corporate, healthcare, education, hospitality, fitness,
-- events). Each template carries metadata.svgContent with a parseable SVG so
-- QuickCustomizePanel (src/components/QuickCustomizePanel.jsx) can extract
-- colors, text nodes, and a logo placeholder.
--
-- Also creates ONE additional fallback-test template with NO svgContent in
-- metadata, so the no-SVG fallback message in QuickCustomizePanel (line 167)
-- is reachable directly from seed data (closes Phase 166 UAT SC#3 without
-- requiring tester SQL surgery).
--
-- Idempotent: guarded by metadata->>'seed_source' = 'dev-166.1'.
-- ============================================================================

-- Helper: seed one template + one slide, tagged with seed_source for idempotency.
-- Pattern: INSERT ... SELECT ... WHERE NOT EXISTS, then re-select the row and
-- INSERT its slide only if absent.

DO $$
DECLARE
  v_template_id uuid;
  v_svg_retail text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#ffffff"/><rect x="60" y="60" width="1800" height="120" fill="#e63946"/><text x="960" y="140" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">Retail Sale</text><text x="960" y="540" text-anchor="middle" fill="#1d3557" font-size="120" font-family="sans-serif">50% OFF</text><text x="960" y="700" text-anchor="middle" fill="#457b9d" font-size="48" font-family="sans-serif">Limited Time Only</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_restaurant text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#f5ebe0"/><rect x="0" y="0" width="1920" height="160" fill="#6a4e3c"/><text x="960" y="110" text-anchor="middle" fill="#ffffff" font-size="80" font-family="serif">Today''s Menu</text><text x="960" y="400" text-anchor="middle" fill="#6a4e3c" font-size="56" font-family="serif">Pasta Carbonara — $18</text><text x="960" y="540" text-anchor="middle" fill="#6a4e3c" font-size="56" font-family="serif">Margherita Pizza — $16</text><text x="960" y="680" text-anchor="middle" fill="#6a4e3c" font-size="56" font-family="serif">Tiramisu — $9</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_corporate text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#f8f9fa"/><rect x="0" y="0" width="1920" height="200" fill="#003566"/><text x="960" y="130" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">Welcome</text><text x="960" y="540" text-anchor="middle" fill="#003566" font-size="96" font-family="sans-serif">Quarterly Review</text><text x="960" y="700" text-anchor="middle" fill="#6c757d" font-size="48" font-family="sans-serif">Conference Room A — 2:00 PM</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_healthcare text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#ffffff"/><rect x="0" y="0" width="1920" height="180" fill="#0077b6"/><text x="960" y="120" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">Clinic Hours</text><text x="960" y="500" text-anchor="middle" fill="#0077b6" font-size="72" font-family="sans-serif">Mon–Fri: 8:00 – 18:00</text><text x="960" y="640" text-anchor="middle" fill="#0077b6" font-size="72" font-family="sans-serif">Sat: 9:00 – 14:00</text><text x="960" y="800" text-anchor="middle" fill="#6c757d" font-size="48" font-family="sans-serif">Walk-ins Welcome</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_education text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#fff8e1"/><rect x="0" y="0" width="1920" height="180" fill="#f4a261"/><text x="960" y="120" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">Campus Events</text><text x="960" y="500" text-anchor="middle" fill="#e76f51" font-size="80" font-family="sans-serif">Science Fair Friday</text><text x="960" y="640" text-anchor="middle" fill="#264653" font-size="56" font-family="sans-serif">Main Hall — 3:00 PM</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_hospitality text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#fefae0"/><rect x="0" y="0" width="1920" height="180" fill="#606c38"/><text x="960" y="120" text-anchor="middle" fill="#ffffff" font-size="72" font-family="serif">Welcome Guests</text><text x="960" y="500" text-anchor="middle" fill="#283618" font-size="84" font-family="serif">Breakfast 6–10 AM</text><text x="960" y="640" text-anchor="middle" fill="#606c38" font-size="60" font-family="serif">Poolside Dining</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_fitness text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#0d1b2a"/><rect x="0" y="0" width="1920" height="160" fill="#e63946"/><text x="960" y="110" text-anchor="middle" fill="#ffffff" font-size="80" font-family="sans-serif">Class Schedule</text><text x="960" y="480" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">HIIT — 6:00 AM</text><text x="960" y="620" text-anchor="middle" fill="#ffffff" font-size="72" font-family="sans-serif">Yoga — 9:00 AM</text><text x="960" y="760" text-anchor="middle" fill="#e63946" font-size="56" font-family="sans-serif">Spin — 6:00 PM</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';
  v_svg_events text := '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1920 1080" width="1920" height="1080"><rect x="0" y="0" width="1920" height="1080" fill="#1a1a2e"/><rect x="0" y="0" width="1920" height="200" fill="#e94560"/><text x="960" y="130" text-anchor="middle" fill="#ffffff" font-size="80" font-family="sans-serif">Conference 2026</text><text x="960" y="520" text-anchor="middle" fill="#ffffff" font-size="96" font-family="sans-serif">Keynote 10 AM</text><text x="960" y="680" text-anchor="middle" fill="#f5f5f5" font-size="56" font-family="sans-serif">Main Auditorium</text><image data-logo-placeholder="true" x="80" y="900" width="160" height="160" href="" xlink:href=""/></svg>';

  -- Seed spec for populated SVG templates: slug, name, description, industry, featured, svg
  v_seeds jsonb := jsonb_build_array(
    jsonb_build_object('slug', 'retail',       'name', 'Retail Sale Promo',         'description', 'Eye-catching retail discount banner',       'industry', 'retail',       'featured', true,  'svg', v_svg_retail),
    jsonb_build_object('slug', 'restaurant',   'name', 'Daily Menu Board',          'description', 'Today''s specials for restaurants',          'industry', 'restaurant',   'featured', false, 'svg', v_svg_restaurant),
    jsonb_build_object('slug', 'corporate',    'name', 'Corporate Welcome',         'description', 'Lobby welcome sign for offices',             'industry', 'corporate',    'featured', false, 'svg', v_svg_corporate),
    jsonb_build_object('slug', 'healthcare',   'name', 'Clinic Hours Display',      'description', 'Opening hours for healthcare facilities',    'industry', 'healthcare',   'featured', false, 'svg', v_svg_healthcare),
    jsonb_build_object('slug', 'education',    'name', 'Campus Event Announcement', 'description', 'Upcoming campus events',                     'industry', 'education',    'featured', false, 'svg', v_svg_education),
    jsonb_build_object('slug', 'hospitality',  'name', 'Guest Welcome Board',       'description', 'Hotel guest welcome and dining hours',       'industry', 'hospitality',  'featured', false, 'svg', v_svg_hospitality),
    jsonb_build_object('slug', 'fitness',      'name', 'Gym Class Schedule',        'description', 'Daily fitness class listing',                'industry', 'fitness',      'featured', false, 'svg', v_svg_fitness),
    jsonb_build_object('slug', 'events',       'name', 'Conference Keynote Banner', 'description', 'Event schedule keynote display',             'industry', 'events',       'featured', false, 'svg', v_svg_events)
  );
  v_seed jsonb;
BEGIN
  FOR v_seed IN SELECT jsonb_array_elements(v_seeds) LOOP
    -- Insert template if not already seeded under dev-166.1
    INSERT INTO template_library (
      category_id, name, description, template_type, license, industry,
      tags, is_active, is_featured, metadata
    )
    SELECT
      (SELECT id FROM template_categories WHERE slug = v_seed->>'slug'),
      v_seed->>'name',
      v_seed->>'description',
      'scene',
      'free',
      v_seed->>'industry',
      ARRAY[v_seed->>'slug', 'dev-seed'],
      true,
      (v_seed->>'featured')::boolean,
      jsonb_build_object(
        'seed_source', 'dev-166.1',
        'svgContent', v_seed->>'svg'
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM template_library
      WHERE name = v_seed->>'name'
        AND metadata->>'seed_source' = 'dev-166.1'
    );

    -- Look up the template we just inserted (or that already existed)
    SELECT id INTO v_template_id
    FROM template_library
    WHERE name = v_seed->>'name'
      AND metadata->>'seed_source' = 'dev-166.1'
    LIMIT 1;

    -- Insert the one slide if not already present at position 0
    IF v_template_id IS NOT NULL THEN
      INSERT INTO template_library_slides (
        template_id, position, title, kind, design_json, duration_seconds
      )
      SELECT
        v_template_id,
        0,
        v_seed->>'name',
        'default',
        jsonb_build_object('svgContent', v_seed->>'svg'),
        10
      WHERE NOT EXISTS (
        SELECT 1 FROM template_library_slides
        WHERE template_id = v_template_id AND position = 0
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- Fallback-test template (9th row): NO svgContent in metadata.
-- Purpose: makes the no-SVG fallback branch in QuickCustomizePanel.jsx (line
-- 167) reachable from seed data alone — closes Phase 166 UAT SC#3 fully.
-- ============================================================================

DO $$
DECLARE
  v_template_id uuid;
BEGIN
  -- Insert fallback-test template if not already seeded
  INSERT INTO template_library (
    category_id, name, description, template_type, license, industry,
    tags, is_active, is_featured, metadata
  )
  SELECT
    (SELECT id FROM template_categories WHERE slug = 'retail'),
    'Empty Template (Fallback Test)',
    'Intentionally has no svgContent — used to exercise the no-SVG fallback message in QuickCustomizePanel',
    'scene',
    'free',
    'retail',
    ARRAY['retail', 'dev-seed', 'fallback-test'],
    true,
    false,
    jsonb_build_object(
      'seed_source', 'dev-166.1'
      -- NOTE: svgContent is intentionally OMITTED here. Do not add it.
    )
  WHERE NOT EXISTS (
    SELECT 1 FROM template_library
    WHERE name = 'Empty Template (Fallback Test)'
      AND metadata->>'seed_source' = 'dev-166.1'
  );

  SELECT id INTO v_template_id
  FROM template_library
  WHERE name = 'Empty Template (Fallback Test)'
    AND metadata->>'seed_source' = 'dev-166.1'
  LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO template_library_slides (
      template_id, position, title, kind, design_json, duration_seconds
    )
    SELECT
      v_template_id,
      0,
      'Empty Template (Fallback Test)',
      'default',
      jsonb_build_object('title', 'Empty Template (Fallback Test)'),
      -- NOTE: design_json also omits svgContent — by design.
      10
    WHERE NOT EXISTS (
      SELECT 1 FROM template_library_slides
      WHERE template_id = v_template_id AND position = 0
    );
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION (informational RAISE NOTICE — not assertions)
-- ============================================================================

DO $$
DECLARE
  v_template_count int;
  v_slide_count int;
  v_with_svg int;
  v_without_svg int;
BEGIN
  SELECT COUNT(*) INTO v_template_count
  FROM template_library WHERE metadata->>'seed_source' = 'dev-166.1';

  SELECT COUNT(*) INTO v_slide_count
  FROM template_library_slides s
  JOIN template_library t ON t.id = s.template_id
  WHERE t.metadata->>'seed_source' = 'dev-166.1';

  SELECT COUNT(*) INTO v_with_svg
  FROM template_library
  WHERE metadata->>'seed_source' = 'dev-166.1'
    AND metadata ? 'svgContent'
    AND metadata->>'svgContent' IS NOT NULL
    AND metadata->>'svgContent' <> '';

  SELECT COUNT(*) INTO v_without_svg
  FROM template_library
  WHERE metadata->>'seed_source' = 'dev-166.1'
    AND (NOT (metadata ? 'svgContent') OR metadata->>'svgContent' IS NULL);

  RAISE NOTICE 'Phase 166.1 seed: % templates, % slides with seed_source=dev-166.1 (with svg=%, without svg=%)',
    v_template_count, v_slide_count, v_with_svg, v_without_svg;
END $$;
