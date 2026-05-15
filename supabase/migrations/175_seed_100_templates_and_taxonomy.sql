-- ============================================================================
-- Migration 175: Seed 100+ Templates + Taxonomy CHECK Constraints
-- Phase 175 — New Template Content + Quality Pass (v20.0 Templates Reimagined)
--
-- Addresses:
--   TCTN-01 — At least 100 net-new SVG templates queryable
--             (Plan 04 ships 30 rows; Plan 05 extends to 100+)
--   TCTN-02 — Validator gate runs in CI/admin (not in this migration; see Plan 02)
--   TCTN-03 — Taxonomy enforced at admin-upload time (CHECK constraint floor)
--
-- Pattern references:
--   migration 167 — UUID v5 seed pattern, ON CONFLICT (slug) DO NOTHING,
--                   DO $$ ASSERT $$ self-verification block,
--                   `tenant_id IS NULL` + `created_by IS NULL` for global rows
--   migration 094 — base svg_templates table + tags GIN index
--
-- Idempotent. No DOWN migration. RLS Pitfall 2: tenant_id = NULL,
-- created_by = NULL on all rows (global content visibility predicate from
-- migration 167:39-45 — `is_active = TRUE AND (tenant_id IS NULL OR
-- created_by = auth.uid())`).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Taxonomy CHECK constraint (TCTN-03 floor)
-- Snapshot of 15 category values at migration time. Adding a category requires
-- a follow-up migration that DROPs and re-CREATEs the constraint — explicit by
-- design (taxonomy changes are reviewed). Defense-in-depth: Plan 02's
-- application-layer validator already enforces categorical hygiene, but the
-- DB CHECK is the irreversible floor (Pitfall 5 / threat T-175-04-05).
-- ----------------------------------------------------------------------------
ALTER TABLE svg_templates
  DROP CONSTRAINT IF EXISTS chk_svg_templates_category_enum;

ALTER TABLE svg_templates
  ADD CONSTRAINT chk_svg_templates_category_enum
  CHECK (category IN (
    'Restaurant',
    'Retail',
    'Corporate',
    'Healthcare',
    'Hospitality',
    'Real Estate',
    'Education',
    'Events',
    'Fitness',
    'Entertainment',
    'Beauty',
    'Automotive',
    'Technology',
    'Finance',
    'general'
  ));

COMMENT ON CONSTRAINT chk_svg_templates_category_enum ON svg_templates
  IS 'Phase 175 — TCTN-03 taxonomy floor; snapshot of template_categories enum.';

-- ----------------------------------------------------------------------------
-- 2. Tags column hardening
-- The existing 12 rows from migration 167 all set `tags`, but some legacy
-- inserts may have omitted it. Default to empty array, backfill nulls, lock
-- the column so future bulk inserts cannot drop it silently.
-- ----------------------------------------------------------------------------
ALTER TABLE svg_templates
  ALTER COLUMN tags SET DEFAULT '{}'::TEXT[];

UPDATE svg_templates SET tags = '{}'::TEXT[] WHERE tags IS NULL;

ALTER TABLE svg_templates
  ALTER COLUMN tags SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. Seed rows — 1 representative template per category (Task 1 ships 15 rows;
--    Task 2 extends to 30 with 15 more variants spanning all categories;
--    Plan 05 extends to 100+).
-- All rows: tenant_id = NULL, created_by = NULL, is_active = TRUE
-- (RLS predicate from migration 167:43; Pitfall 2 mitigation).
-- ----------------------------------------------------------------------------

-- Restaurant
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'bistro-daily-special'),
  'bistro-daily-special',
  'Bistro Daily Special',
  'Elegant bistro menu featuring daily specials and chef recommendations',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/bistro-daily-special/design.svg',
  1920, 1080,
  ARRAY['restaurant','bistro','menu','daily','specials']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Retail
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'flash-sale-banner'),
  'flash-sale-banner',
  'Flash Sale Banner',
  'High-impact retail flash sale display with bold typography',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/flash-sale-banner/design.svg',
  1920, 1080,
  ARRAY['retail','sale','promotion','discount','flash']::TEXT[],
  TRUE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Corporate
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'office-welcome-board'),
  'office-welcome-board',
  'Office Welcome Board',
  'Professional welcome display for office reception areas',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/office-welcome-board/design.svg',
  1920, 1080,
  ARRAY['corporate','welcome','office','reception','professional']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Healthcare
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'clinic-hours-info'),
  'clinic-hours-info',
  'Clinic Hours Info',
  'Healthcare clinic operating hours and contact information display',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/clinic-hours-info/design.svg',
  1920, 1080,
  ARRAY['healthcare','clinic','hours','medical','info']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Hospitality
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'hotel-lobby-info'),
  'hotel-lobby-info',
  'Hotel Lobby Info',
  'Hotel lobby information display with guest amenities',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/hotel-lobby-info/design.svg',
  1920, 1080,
  ARRAY['hospitality','hotel','lobby','amenities','info']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Real Estate
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'open-house-listing'),
  'open-house-listing',
  'Open House Listing',
  'Real estate open house event listing with property details',
  'Real Estate', 'portrait',
  NULL,
  '/templates/svg/open-house-listing/design.svg',
  1080, 1920,
  ARRAY['real-estate','open-house','listing','property']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Education
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'class-schedule-board'),
  'class-schedule-board',
  'Class Schedule Board',
  'Education class schedule display for hallways and lobbies',
  'Education', 'landscape',
  NULL,
  '/templates/svg/class-schedule-board/design.svg',
  1920, 1080,
  ARRAY['education','school','class','schedule','academic']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Events
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'conference-agenda'),
  'conference-agenda',
  'Conference Agenda',
  'Event agenda display for conferences and meetings',
  'Events', 'landscape',
  NULL,
  '/templates/svg/conference-agenda/design.svg',
  1920, 1080,
  ARRAY['events','conference','agenda','meeting']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Fitness
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'gym-class-times'),
  'gym-class-times',
  'Gym Class Times',
  'Fitness gym class schedule and instructor information',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/gym-class-times/design.svg',
  1920, 1080,
  ARRAY['fitness','gym','classes','schedule','workout']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Entertainment
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'movie-night-promo'),
  'movie-night-promo',
  'Movie Night Promo',
  'Entertainment movie night promotional display',
  'Entertainment', 'landscape',
  NULL,
  '/templates/svg/movie-night-promo/design.svg',
  1920, 1080,
  ARRAY['entertainment','movie','cinema','promo']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Beauty
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'salon-services-menu'),
  'salon-services-menu',
  'Salon Services Menu',
  'Beauty salon service offerings and pricing display',
  'Beauty', 'portrait',
  NULL,
  '/templates/svg/salon-services-menu/design.svg',
  1080, 1920,
  ARRAY['beauty','salon','services','spa']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Automotive
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'auto-service-special'),
  'auto-service-special',
  'Auto Service Special',
  'Automotive service center promotional display',
  'Automotive', 'landscape',
  NULL,
  '/templates/svg/auto-service-special/design.svg',
  1920, 1080,
  ARRAY['automotive','auto','service','garage','repair']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Technology
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'tech-product-launch'),
  'tech-product-launch',
  'Tech Product Launch',
  'Technology product launch announcement display',
  'Technology', 'landscape',
  NULL,
  '/templates/svg/tech-product-launch/design.svg',
  1920, 1080,
  ARRAY['technology','tech','launch','product']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Finance
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'banking-rates-board'),
  'banking-rates-board',
  'Banking Rates Board',
  'Financial institution rates and services display',
  'Finance', 'landscape',
  NULL,
  '/templates/svg/banking-rates-board/design.svg',
  1920, 1080,
  ARRAY['finance','banking','rates','financial']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- general (catchall — useful for templates that don't fit narrower categories)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'minimal-quote-display'),
  'minimal-quote-display',
  'Minimal Quote Display',
  'Generic minimalist inspirational quote display',
  'general', 'landscape',
  NULL,
  '/templates/svg/minimal-quote-display/design.svg',
  1920, 1080,
  ARRAY['general','minimal','quote','inspirational']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3b. Variant rows — 15 additional templates (Task 2 extends Task 1 from 15 to 30).
-- Two templates per category for full coverage; mix of landscape and portrait.
-- ----------------------------------------------------------------------------

-- Restaurant (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'cafe-coffee-menu'),
  'cafe-coffee-menu',
  'Cafe Coffee Menu',
  'Warm cafe coffee menu board with espresso and pour-over selections',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/cafe-coffee-menu/design.svg',
  1920, 1080,
  ARRAY['restaurant','cafe','coffee','menu','espresso']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Retail (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'bakery-product-list'),
  'bakery-product-list',
  'Bakery Product List',
  'Artisan bakery product display with fresh-baked offerings and prices',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/bakery-product-list/design.svg',
  1920, 1080,
  ARRAY['retail','bakery','products','fresh','artisan']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Corporate (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'corporate-meeting-agenda'),
  'corporate-meeting-agenda',
  'Corporate Meeting Agenda',
  'Boardroom meeting agenda display with timeline and presenter info',
  'Corporate', 'portrait',
  NULL,
  '/templates/svg/corporate-meeting-agenda/design.svg',
  1080, 1920,
  ARRAY['corporate','meeting','agenda','boardroom','schedule']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Healthcare (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'dental-office-info'),
  'dental-office-info',
  'Dental Office Info',
  'Dental practice services display with hours and contact information',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/dental-office-info/design.svg',
  1920, 1080,
  ARRAY['healthcare','dental','services','hours','office']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Hospitality (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'resort-pool-hours'),
  'resort-pool-hours',
  'Resort Pool Hours',
  'Resort pool and activities schedule display for guests',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/resort-pool-hours/design.svg',
  1920, 1080,
  ARRAY['hospitality','resort','pool','spa','activities']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Real Estate (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'property-feature-grid'),
  'property-feature-grid',
  'Property Feature Grid',
  'Real estate listing with feature tiles for beds, baths, and square footage',
  'Real Estate', 'landscape',
  NULL,
  '/templates/svg/property-feature-grid/design.svg',
  1920, 1080,
  ARRAY['real-estate','property','features','listing','grid']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Education (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'university-event-board'),
  'university-event-board',
  'University Event Board',
  'Campus event board displaying upcoming lectures, sports, and concerts',
  'Education', 'landscape',
  NULL,
  '/templates/svg/university-event-board/design.svg',
  1920, 1080,
  ARRAY['education','university','events','campus','academic']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Events (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'tradeshow-booth-info'),
  'tradeshow-booth-info',
  'Tradeshow Booth Info',
  'Trade show booth promotional display with location and demo schedule',
  'Events', 'portrait',
  NULL,
  '/templates/svg/tradeshow-booth-info/design.svg',
  1080, 1920,
  ARRAY['events','tradeshow','booth','expo','conference']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Fitness (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'yoga-class-schedule'),
  'yoga-class-schedule',
  'Yoga Class Schedule',
  'Yoga studio weekly class schedule with instructors and times',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/yoga-class-schedule/design.svg',
  1920, 1080,
  ARRAY['fitness','yoga','schedule','classes','wellness']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Entertainment (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'concert-lineup-poster'),
  'concert-lineup-poster',
  'Concert Lineup Poster',
  'Live music event poster with band lineup and showtime details',
  'Entertainment', 'portrait',
  NULL,
  '/templates/svg/concert-lineup-poster/design.svg',
  1080, 1920,
  ARRAY['entertainment','concert','music','live','poster']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Beauty (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'spa-treatment-menu'),
  'spa-treatment-menu',
  'Spa Treatment Menu',
  'Day spa treatment menu with massage, facial, and wellness offerings',
  'Beauty', 'landscape',
  NULL,
  '/templates/svg/spa-treatment-menu/design.svg',
  1920, 1080,
  ARRAY['beauty','spa','treatments','massage','wellness']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Automotive (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'dealership-promo-banner'),
  'dealership-promo-banner',
  'Dealership Promo Banner',
  'Auto dealership year-end financing promotion banner',
  'Automotive', 'landscape',
  NULL,
  '/templates/svg/dealership-promo-banner/design.svg',
  1920, 1080,
  ARRAY['automotive','dealership','promo','financing','sale']::TEXT[],
  TRUE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Technology (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'startup-launch-board'),
  'startup-launch-board',
  'Startup Launch Board',
  'Tech startup product launch announcement with feature highlights',
  'Technology', 'portrait',
  NULL,
  '/templates/svg/startup-launch-board/design.svg',
  1080, 1920,
  ARRAY['technology','startup','launch','saas','product']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Finance (variant)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'financial-advisor-intro'),
  'financial-advisor-intro',
  'Financial Advisor Intro',
  'Financial advisor profile and services display for office lobbies',
  'Finance', 'landscape',
  NULL,
  '/templates/svg/financial-advisor-intro/design.svg',
  1920, 1080,
  ARRAY['finance','advisor','wealth','planning','retirement']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- general (variant — abstract pattern showcase)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'abstract-pattern-display'),
  'abstract-pattern-display',
  'Abstract Pattern Display',
  'Bold abstract design showcase highlighting brand customization possibilities',
  'general', 'landscape',
  NULL,
  '/templates/svg/abstract-pattern-display/design.svg',
  1920, 1080,
  ARRAY['general','abstract','pattern','design','showcase']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3b. Plan 05 batch 1 — 35 first-party variant rows (Plan 04 Task 1+Task 2: 30,
--     Plan 05 Task 1: +35 → running total 65 first-party rows). Each is a
--     small palette/copy/layout variation of an existing Plan 04 template.
-- ----------------------------------------------------------------------------

-- Restaurant variants (4)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'bistro-daily-special-evening'),
  'bistro-daily-special-evening',
  'Bistro Evening Special',
  'Evening menu variant — late-service highlight with deep-blue palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/bistro-daily-special-evening/design.svg',
  1920, 1080,
  ARRAY['restaurant','bistro','evening','dinner','specials']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'cafe-coffee-menu-seasonal'),
  'cafe-coffee-menu-seasonal',
  'Cafe Seasonal Coffee Menu',
  'Seasonal limited-time coffee specials — autumn warm-tone palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/cafe-coffee-menu-seasonal/design.svg',
  1920, 1080,
  ARRAY['restaurant','cafe','coffee','seasonal','menu']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'food-truck-promo'),
  'food-truck-promo',
  'Food Truck Promo',
  'Bold street-food location announcement — high-contrast orange-and-black palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/food-truck-promo/design.svg',
  1920, 1080,
  ARRAY['restaurant','food-truck','street-food','promo','location']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'sushi-restaurant-menu'),
  'sushi-restaurant-menu',
  'Sushi Restaurant Menu',
  'Omakase-style nightly sushi selection — black-and-red Japanese-inspired palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/sushi-restaurant-menu/design.svg',
  1920, 1080,
  ARRAY['restaurant','sushi','japanese','omakase','menu']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Retail variants (4)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'flash-sale-banner-weekend'),
  'flash-sale-banner-weekend',
  'Weekend Flash Sale Banner',
  'Weekend-specific flash sale variant — crimson and gold high-impact palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/flash-sale-banner-weekend/design.svg',
  1920, 1080,
  ARRAY['retail','sale','weekend','flash','promo']::TEXT[],
  TRUE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'bakery-product-list-holiday'),
  'bakery-product-list-holiday',
  'Holiday Bakery Box',
  'Seasonal bakery price list — cream-and-cinnamon holiday palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/bakery-product-list-holiday/design.svg',
  1920, 1080,
  ARRAY['retail','bakery','holiday','seasonal','menu']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'boutique-storefront'),
  'boutique-storefront',
  'Boutique Storefront',
  'Elegant curated-style boutique announcement — soft warm-neutral palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/boutique-storefront/design.svg',
  1920, 1080,
  ARRAY['retail','boutique','fashion','storefront','curated']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'outlet-clearance-promo'),
  'outlet-clearance-promo',
  'Outlet Clearance Promo',
  'Final clearance markdown — teal-and-orange high-energy outlet palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/outlet-clearance-promo/design.svg',
  1920, 1080,
  ARRAY['retail','outlet','clearance','sale','markdown']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Corporate variants (3)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'office-welcome-board-quarterly'),
  'office-welcome-board-quarterly',
  'Quarterly Office Welcome Board',
  'Quarterly all-hands welcome — navy/blue corporate palette with KPI bullets',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/office-welcome-board-quarterly/design.svg',
  1920, 1080,
  ARRAY['corporate','quarterly','all-hands','welcome','kpi']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'corporate-meeting-agenda-allhands'),
  'corporate-meeting-agenda-allhands',
  'All-Hands Meeting Agenda',
  'All-hands six-row schedule — split layout with navy sidebar',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/corporate-meeting-agenda-allhands/design.svg',
  1920, 1080,
  ARRAY['corporate','meeting','agenda','all-hands','schedule']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'executive-suite-info'),
  'executive-suite-info',
  'Executive Suite Info',
  'Top-floor executive suite directory — slate and gold accent palette',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/executive-suite-info/design.svg',
  1920, 1080,
  ARRAY['corporate','executive','suite','directory','wayfinding']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Healthcare variants (3)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'clinic-hours-info-pediatric'),
  'clinic-hours-info-pediatric',
  'Pediatric Clinic Hours',
  'Pediatric-specific weekly hours — soft pink palette',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/clinic-hours-info-pediatric/design.svg',
  1920, 1080,
  ARRAY['healthcare','clinic','pediatric','hours','schedule']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'dental-office-info-promo'),
  'dental-office-info-promo',
  'Dental Office New Patient Promo',
  'New-patient $99 cleaning special — light blue dental palette',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/dental-office-info-promo/design.svg',
  1920, 1080,
  ARRAY['healthcare','dental','promo','new-patient','cleaning']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'pharmacy-info-board'),
  'pharmacy-info-board',
  'Pharmacy Info Board',
  'Free flu shots service announcement — medical green palette with banded header/footer',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/pharmacy-info-board/design.svg',
  1920, 1080,
  ARRAY['healthcare','pharmacy','flu-shots','services','hours']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Hospitality variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'hotel-lobby-info-checkin'),
  'hotel-lobby-info-checkin',
  'Hotel Lobby Check-in Info',
  'Lobby check-in/out time card — espresso and gold luxury palette',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/hotel-lobby-info-checkin/design.svg',
  1920, 1080,
  ARRAY['hospitality','hotel','lobby','check-in','info']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'resort-pool-hours-evening'),
  'resort-pool-hours-evening',
  'Resort Evening Pool Hours',
  'Evening swim hours card — deep-ocean two-tone palette',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/resort-pool-hours-evening/design.svg',
  1920, 1080,
  ARRAY['hospitality','resort','pool','evening','hours']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Real Estate variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'open-house-listing-luxury'),
  'open-house-listing-luxury',
  'Luxury Open House Listing',
  'Luxury private-showing portrait listing — black and gold high-end palette',
  'Real Estate', 'portrait',
  NULL,
  '/templates/svg/open-house-listing-luxury/design.svg',
  1080, 1920,
  ARRAY['real-estate','luxury','open-house','listing','high-end']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'property-feature-grid-investor'),
  'property-feature-grid-investor',
  'Investor Property Snapshot',
  'Investor-facing 3-stat snapshot — navy professional palette',
  'Real Estate', 'landscape',
  NULL,
  '/templates/svg/property-feature-grid-investor/design.svg',
  1920, 1080,
  ARRAY['real-estate','investor','snapshot','multi-family','commercial']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Education variants (3)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'class-schedule-board-spring'),
  'class-schedule-board-spring',
  'Spring Semester Class Schedule',
  'Spring semester 6-period schedule — soft purple academic palette',
  'Education', 'landscape',
  NULL,
  '/templates/svg/class-schedule-board-spring/design.svg',
  1920, 1080,
  ARRAY['education','schedule','spring','semester','classes']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'university-event-board-fall'),
  'university-event-board-fall',
  'University Fall Event Board',
  'Fall campus event board — burgundy and harvest-gold homecoming palette',
  'Education', 'landscape',
  NULL,
  '/templates/svg/university-event-board-fall/design.svg',
  1920, 1080,
  ARRAY['education','university','fall','events','homecoming']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'library-hours-display'),
  'library-hours-display',
  'Library Hours Display',
  'Weekly library hours card — warm cream and walnut academic palette',
  'Education', 'landscape',
  NULL,
  '/templates/svg/library-hours-display/design.svg',
  1920, 1080,
  ARRAY['education','library','hours','schedule','study']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Events variants (3)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'conference-agenda-techday'),
  'conference-agenda-techday',
  'TechDay Conference Agenda',
  'Tech conference 4-block day agenda — deep-purple AI-themed palette',
  'Events', 'landscape',
  NULL,
  '/templates/svg/conference-agenda-techday/design.svg',
  1920, 1080,
  ARRAY['events','conference','tech','agenda','techday']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'tradeshow-booth-info-evening'),
  'tradeshow-booth-info-evening',
  'Trade Show Booth Evening Demo',
  'Evening tradeshow demo invite — navy and crimson high-energy palette',
  'Events', 'portrait',
  NULL,
  '/templates/svg/tradeshow-booth-info-evening/design.svg',
  1080, 1920,
  ARRAY['events','tradeshow','booth','demo','evening']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'wedding-venue-info'),
  'wedding-venue-info',
  'Wedding Venue Info',
  'Wedding ceremony/reception card — soft beige romantic typography palette',
  'Events', 'landscape',
  NULL,
  '/templates/svg/wedding-venue-info/design.svg',
  1920, 1080,
  ARRAY['events','wedding','venue','ceremony','reception']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Fitness variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'gym-class-times-morning'),
  'gym-class-times-morning',
  'Gym Morning Class Times',
  'Six-row morning class block — bold yellow energy palette',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/gym-class-times-morning/design.svg',
  1920, 1080,
  ARRAY['fitness','gym','morning','classes','schedule']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'yoga-class-schedule-restorative'),
  'yoga-class-schedule-restorative',
  'Restorative Yoga Schedule',
  'Restorative yoga weekly schedule — sand and clay calm palette',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/yoga-class-schedule-restorative/design.svg',
  1920, 1080,
  ARRAY['fitness','yoga','restorative','schedule','wellness']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Entertainment variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'movie-night-promo-newrelease'),
  'movie-night-promo-newrelease',
  'New Release Movie Night Promo',
  'New theatrical release showtime card — black and crimson cinematic palette',
  'Entertainment', 'landscape',
  NULL,
  '/templates/svg/movie-night-promo-newrelease/design.svg',
  1920, 1080,
  ARRAY['entertainment','movie','new-release','showtime','promo']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'concert-lineup-poster-festival'),
  'concert-lineup-poster-festival',
  'Festival Concert Lineup Poster',
  'Multi-day festival lineup portrait — orange and yellow festival palette',
  'Entertainment', 'portrait',
  NULL,
  '/templates/svg/concert-lineup-poster-festival/design.svg',
  1080, 1920,
  ARRAY['entertainment','concert','festival','lineup','music']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Beauty variants (1)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'salon-services-menu-hair'),
  'salon-services-menu-hair',
  'Salon Hair Services Menu',
  'Eight-line hair services price list — pink and burgundy salon palette',
  'Beauty', 'portrait',
  NULL,
  '/templates/svg/salon-services-menu-hair/design.svg',
  1080, 1920,
  ARRAY['beauty','salon','hair','services','price-list']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Automotive variants (1)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'auto-service-special-tires'),
  'auto-service-special-tires',
  'Auto Tire Special',
  'Tire BOGO promotion — black and orange high-impact automotive palette',
  'Automotive', 'landscape',
  NULL,
  '/templates/svg/auto-service-special-tires/design.svg',
  1920, 1080,
  ARRAY['automotive','tires','promo','bogo','service']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Technology variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'tech-product-launch-mobile'),
  'tech-product-launch-mobile',
  'Mobile App Product Launch',
  'Mobile app launch announcement — neon-cyan tech palette',
  'Technology', 'landscape',
  NULL,
  '/templates/svg/tech-product-launch-mobile/design.svg',
  1920, 1080,
  ARRAY['technology','mobile','app','launch','product']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'startup-launch-board-funding'),
  'startup-launch-board-funding',
  'Startup Funding Announcement',
  'Series B funding announcement portrait — indigo growth palette',
  'Technology', 'portrait',
  NULL,
  '/templates/svg/startup-launch-board-funding/design.svg',
  1080, 1920,
  ARRAY['technology','startup','funding','series-b','announcement']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Finance variants (1)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'banking-rates-board-mortgage'),
  'banking-rates-board-mortgage',
  'Mortgage Rates Board',
  'Daily mortgage rate display — navy banking palette with 3-card grid',
  'Finance', 'landscape',
  NULL,
  '/templates/svg/banking-rates-board-mortgage/design.svg',
  1920, 1080,
  ARRAY['finance','banking','mortgage','rates','loans']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- general variants (2)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'abstract-pattern-display-warm'),
  'abstract-pattern-display-warm',
  'Warm Abstract Pattern Display',
  'Warm-tone abstract circles showcase — peach and coral palette',
  'general', 'landscape',
  NULL,
  '/templates/svg/abstract-pattern-display-warm/design.svg',
  1920, 1080,
  ARRAY['general','abstract','warm','pattern','design']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'minimal-quote-display-typography'),
  'minimal-quote-display-typography',
  'Typography Quote Display',
  'Bold serif typography quote layout — black and white minimal palette',
  'general', 'landscape',
  NULL,
  '/templates/svg/minimal-quote-display-typography/design.svg',
  1920, 1080,
  ARRAY['general','quote','typography','minimal','display']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3c. Plan 05 batch 2 — 25 more first-party variants + 10 curated open-source
--     (CC0). Running total: 100 net-new rows from Phase 175.
--     - First-party variants extend per-category coverage so every category has
--       >= 5 templates total (Plan 04 + Plan 05).
--     - CC0 entries use metadata.license = 'CC0' and metadata.attribution = NULL.
--       Sources documented in 175-LICENSE-MANIFEST.md (CC0 / public domain).
-- ----------------------------------------------------------------------------

-- Restaurant variants (Plan 05 batch 2 — 3 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'restaurant-pizza-menu'),
  'restaurant-pizza-menu',
  'Wood-Fired Pizza Menu',
  'Five-line pizza price list — cream and tomato-red Italian palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/restaurant-pizza-menu/design.svg',
  1920, 1080,
  ARRAY['restaurant','pizza','menu','italian','wood-fired']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'restaurant-brunch-board'),
  'restaurant-brunch-board',
  'Brunch Service Board',
  'Saturday/Sunday brunch board — peach and burgundy weekend palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/restaurant-brunch-board/design.svg',
  1920, 1080,
  ARRAY['restaurant','brunch','weekend','menu','breakfast']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'restaurant-dessert-menu'),
  'restaurant-dessert-menu',
  'Dessert Menu',
  'Four-line dessert price list — dark chocolate and gold dessert palette',
  'Restaurant', 'landscape',
  NULL,
  '/templates/svg/restaurant-dessert-menu/design.svg',
  1920, 1080,
  ARRAY['restaurant','dessert','menu','sweets','dinner']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Retail variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'retail-buy-one-get-one'),
  'retail-buy-one-get-one',
  'Retail BOGO Promo',
  'Buy-one-get-one-free banner — bright teal and black palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/retail-buy-one-get-one/design.svg',
  1920, 1080,
  ARRAY['retail','bogo','sale','promo','offer']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'retail-loyalty-card'),
  'retail-loyalty-card',
  'Retail Loyalty Card',
  '3-tier loyalty rewards explanation — navy and pink rewards palette',
  'Retail', 'landscape',
  NULL,
  '/templates/svg/retail-loyalty-card/design.svg',
  1920, 1080,
  ARRAY['retail','loyalty','rewards','membership','customer']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Corporate variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'corporate-quarterly-results'),
  'corporate-quarterly-results',
  'Quarterly Results Snapshot',
  'Q2 results 3-stat snapshot — navy professional metrics palette',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/corporate-quarterly-results/design.svg',
  1920, 1080,
  ARRAY['corporate','quarterly','results','kpi','snapshot']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'corporate-team-photo-board'),
  'corporate-team-photo-board',
  'New Teammates Welcome Board',
  'Four-card new-hire welcome grid — corporate blue palette',
  'Corporate', 'landscape',
  NULL,
  '/templates/svg/corporate-team-photo-board/design.svg',
  1920, 1080,
  ARRAY['corporate','onboarding','welcome','team','hr']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Healthcare variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'healthcare-flu-shot-clinic'),
  'healthcare-flu-shot-clinic',
  'Free Flu Shot Clinic',
  'Saturday community flu shot clinic — medical green palette',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/healthcare-flu-shot-clinic/design.svg',
  1920, 1080,
  ARRAY['healthcare','flu-shot','clinic','community','vaccine']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'healthcare-wellness-tips'),
  'healthcare-wellness-tips',
  'Daily Wellness Tips',
  'Five-tip daily wellness card — soft teal medical palette',
  'Healthcare', 'landscape',
  NULL,
  '/templates/svg/healthcare-wellness-tips/design.svg',
  1920, 1080,
  ARRAY['healthcare','wellness','tips','prevention','education']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Hospitality variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'hospitality-spa-services'),
  'hospitality-spa-services',
  'Resort Spa Services',
  'Five-line spa services price list — taupe and cream resort palette',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/hospitality-spa-services/design.svg',
  1920, 1080,
  ARRAY['hospitality','spa','services','wellness','resort']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'hospitality-room-service'),
  'hospitality-room-service',
  'Room Service Menu',
  '24/7 room service menu — espresso brown hotel palette',
  'Hospitality', 'landscape',
  NULL,
  '/templates/svg/hospitality-room-service/design.svg',
  1920, 1080,
  ARRAY['hospitality','room-service','menu','24-7','hotel']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Real Estate variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'real-estate-mortgage-rates'),
  'real-estate-mortgage-rates',
  'Buyer Financing Snapshot',
  'Sample monthly payment by mortgage type — navy real-estate palette',
  'Real Estate', 'landscape',
  NULL,
  '/templates/svg/real-estate-mortgage-rates/design.svg',
  1920, 1080,
  ARRAY['real-estate','mortgage','financing','buyer','snapshot']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'real-estate-neighborhood-info'),
  'real-estate-neighborhood-info',
  'Neighborhood Guide',
  'Five-bullet neighborhood feature card — sage green community palette',
  'Real Estate', 'landscape',
  NULL,
  '/templates/svg/real-estate-neighborhood-info/design.svg',
  1920, 1080,
  ARRAY['real-estate','neighborhood','community','guide','locale']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Education variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'education-graduation-ceremony'),
  'education-graduation-ceremony',
  'Graduation Commencement',
  'Class of 2026 commencement announcement — purple and gold ceremonial palette',
  'Education', 'landscape',
  NULL,
  '/templates/svg/education-graduation-ceremony/design.svg',
  1920, 1080,
  ARRAY['education','graduation','commencement','ceremony','class-of']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'education-tutoring-services'),
  'education-tutoring-services',
  'Free Tutoring Services',
  'Weekly tutoring schedule — soft cream and indigo academic palette',
  'Education', 'landscape',
  NULL,
  '/templates/svg/education-tutoring-services/design.svg',
  1920, 1080,
  ARRAY['education','tutoring','services','support','academic']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Events variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'events-charity-gala'),
  'events-charity-gala',
  'Charity Gala',
  'Annual gala invitation — midnight blue and gold black-tie palette',
  'Events', 'landscape',
  NULL,
  '/templates/svg/events-charity-gala/design.svg',
  1920, 1080,
  ARRAY['events','charity','gala','formal','fundraiser']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'events-product-launch'),
  'events-product-launch',
  'Product Launch Event',
  'Tech product reveal event — split layout with cyan tech palette',
  'Events', 'landscape',
  NULL,
  '/templates/svg/events-product-launch/design.svg',
  1920, 1080,
  ARRAY['events','launch','product','reveal','event']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Fitness variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'fitness-personal-training'),
  'fitness-personal-training',
  'Personal Training Promo',
  'New-member free first session — black and red high-energy palette',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/fitness-personal-training/design.svg',
  1920, 1080,
  ARRAY['fitness','training','personal','new-member','promo']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'fitness-supplement-promo'),
  'fitness-supplement-promo',
  'Supplement Pro Shop Promo',
  'Whey protein 20% off — dark sport-shop palette with mint accent',
  'Fitness', 'landscape',
  NULL,
  '/templates/svg/fitness-supplement-promo/design.svg',
  1920, 1080,
  ARRAY['fitness','supplement','protein','promo','shop']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Entertainment variants (Plan 05 batch 2 — 2 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'entertainment-trivia-night'),
  'entertainment-trivia-night',
  'Pub Trivia Night',
  'Thursday night trivia announcement — dark navy and gold pub palette',
  'Entertainment', 'landscape',
  NULL,
  '/templates/svg/entertainment-trivia-night/design.svg',
  1920, 1080,
  ARRAY['entertainment','trivia','pub','weekly','contest']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'entertainment-karaoke-promo'),
  'entertainment-karaoke-promo',
  'Karaoke Night Promo',
  'Friday/Saturday karaoke night — bright magenta and black party palette',
  'Entertainment', 'landscape',
  NULL,
  '/templates/svg/entertainment-karaoke-promo/design.svg',
  1920, 1080,
  ARRAY['entertainment','karaoke','nightlife','promo','weekend']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Beauty variants (Plan 05 batch 2 — 1 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'beauty-bridal-package'),
  'beauty-bridal-package',
  'Bridal Beauty Package',
  'Wedding-day bridal package portrait — blush and rose romantic palette',
  'Beauty', 'portrait',
  NULL,
  '/templates/svg/beauty-bridal-package/design.svg',
  1080, 1920,
  ARRAY['beauty','bridal','wedding','package','salon']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Automotive variants (Plan 05 batch 2 — 1 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'automotive-financing-promo'),
  'automotive-financing-promo',
  'Auto 0% Financing Promo',
  '0% APR 60-month financing offer — black and yellow dealership palette',
  'Automotive', 'landscape',
  NULL,
  '/templates/svg/automotive-financing-promo/design.svg',
  1920, 1080,
  ARRAY['automotive','financing','apr','dealership','promo']::TEXT[],
  TRUE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Technology variants (Plan 05 batch 2 — 1 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'technology-app-features'),
  'technology-app-features',
  'App v4.0 Features',
  'Four-feature what-is-new launch board — split blue tech palette',
  'Technology', 'landscape',
  NULL,
  '/templates/svg/technology-app-features/design.svg',
  1920, 1080,
  ARRAY['technology','app','features','version','release']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- Finance variants (Plan 05 batch 2 — 1 more)
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'finance-investment-tips'),
  'finance-investment-tips',
  'Investment Insights',
  'Five quarterly investment tips — navy advisor palette',
  'Finance', 'landscape',
  NULL,
  '/templates/svg/finance-investment-tips/design.svg',
  1920, 1080,
  ARRAY['finance','investment','tips','advisor','quarterly']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- general / curated open-source — CC0 (public domain)
-- All hand-authored in-repo following CONTRIBUTION-GUIDE patterns; license="CC0"
-- and attribution=NULL because these are pattern-based originals adapted from
-- common public-domain visual conventions (geometric grids, line art, seasonal
-- iconography). See 175-LICENSE-MANIFEST.md footnote.
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'abstract-geometric-cc0'),
  'abstract-geometric-cc0',
  'Abstract Geometric Grid',
  'Bold 6-block geometric color grid — public-domain style adaptation',
  'general', 'landscape',
  NULL,
  '/templates/svg/abstract-geometric-cc0/design.svg',
  1920, 1080,
  ARRAY['general','abstract','geometric','grid','modern']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'minimal-line-art-cc0'),
  'minimal-line-art-cc0',
  'Minimal Line Art',
  'Single-line geometric circle frame — minimalist black-and-white CC0',
  'general', 'landscape',
  NULL,
  '/templates/svg/minimal-line-art-cc0/design.svg',
  1920, 1080,
  ARRAY['general','minimal','line-art','typography','clean']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'nature-pattern-cc0'),
  'nature-pattern-cc0',
  'Nature Circles Pattern',
  '10-circle organic green pattern with framed message — CC0',
  'general', 'landscape',
  NULL,
  '/templates/svg/nature-pattern-cc0/design.svg',
  1920, 1080,
  ARRAY['general','nature','pattern','organic','green']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'food-illustration-pattern'),
  'food-illustration-pattern',
  'Food Circle Pattern',
  '11-circle warm food-themed pattern — CC0 public-domain palette',
  'general', 'landscape',
  NULL,
  '/templates/svg/food-illustration-pattern/design.svg',
  1920, 1080,
  ARRAY['general','food','pattern','illustration','warm']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'city-skyline-silhouette'),
  'city-skyline-silhouette',
  'City Skyline Silhouette',
  'Downtown skyline silhouette with moon — CC0 public-domain composition',
  'general', 'landscape',
  NULL,
  '/templates/svg/city-skyline-silhouette/design.svg',
  1920, 1080,
  ARRAY['general','city','skyline','silhouette','urban']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'holiday-snowflake-pattern'),
  'holiday-snowflake-pattern',
  'Holiday Snowflake Pattern',
  'Snowflake-bordered holiday card — CC0 public-domain seasonal motif',
  'general', 'landscape',
  NULL,
  '/templates/svg/holiday-snowflake-pattern/design.svg',
  1920, 1080,
  ARRAY['general','holiday','snowflake','seasonal','winter']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'summer-beach-pattern'),
  'summer-beach-pattern',
  'Summer Beach Pattern',
  'Sun, sea, sand summer scene with starfish — CC0 public-domain seasonal',
  'general', 'landscape',
  NULL,
  '/templates/svg/summer-beach-pattern/design.svg',
  1920, 1080,
  ARRAY['general','summer','beach','seasonal','vacation']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'autumn-leaf-pattern'),
  'autumn-leaf-pattern',
  'Autumn Leaf Pattern',
  'Six floating autumn leaves around message card — CC0 public-domain',
  'general', 'landscape',
  NULL,
  '/templates/svg/autumn-leaf-pattern/design.svg',
  1920, 1080,
  ARRAY['general','autumn','fall','leaves','seasonal']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'spring-floral-pattern'),
  'spring-floral-pattern',
  'Spring Floral Pattern',
  'Four corner floral motifs around message card — CC0 public-domain',
  'general', 'landscape',
  NULL,
  '/templates/svg/spring-floral-pattern/design.svg',
  1920, 1080,
  ARRAY['general','spring','floral','seasonal','bloom']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'winter-pine-pattern'),
  'winter-pine-pattern',
  'Winter Pine Pattern',
  'Four pine-tree silhouettes over message card — CC0 public-domain',
  'general', 'landscape',
  NULL,
  '/templates/svg/winter-pine-pattern/design.svg',
  1920, 1080,
  ARRAY['general','winter','pine','seasonal','holiday']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'CC0', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- 3d. Plan 05 distribution top-up (3 more first-party rows so every category
--     has >= 5 templates total; per Plan 05 acceptance criterion Step E #3).
INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'beauty-skincare-routine'),
  'beauty-skincare-routine',
  'Daily Skincare Routine',
  'Five-step daily skincare routine — soft pink esthetician palette',
  'Beauty', 'landscape',
  NULL,
  '/templates/svg/beauty-skincare-routine/design.svg',
  1920, 1080,
  ARRAY['beauty','skincare','routine','daily','tips']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'automotive-detailing-services'),
  'automotive-detailing-services',
  'Auto Detailing Services',
  'Five-line detailing services price list — dark slate and electric-blue palette',
  'Automotive', 'landscape',
  NULL,
  '/templates/svg/automotive-detailing-services/design.svg',
  1920, 1080,
  ARRAY['automotive','detailing','services','price-list','wash']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

INSERT INTO svg_templates (
  id, slug, name, description, category, orientation,
  thumbnail, svg_url, width, height, tags, is_featured, is_active,
  tenant_id, created_by, metadata
) VALUES (
  uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, 'finance-credit-card-promo'),
  'finance-credit-card-promo',
  'Credit Card Bonus Points Promo',
  '50K bonus points new-cardholder offer — slate and gold finance palette',
  'Finance', 'landscape',
  NULL,
  '/templates/svg/finance-credit-card-promo/design.svg',
  1920, 1080,
  ARRAY['finance','credit-card','promo','bonus','rewards']::TEXT[],
  FALSE, TRUE, NULL, NULL,
  jsonb_build_object('license', 'first-party', 'attribution', NULL)
) ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Self-asserting verification (Pattern B from RESEARCH; mirrors migration 167:286-320)
-- Plan 04 Task 1 shipped 15 rows. Plan 04 Task 2 raised the bound to 30.
-- Plan 05 Task 1 added 35 more variants (running 65). Plan 05 Task 2 adds 38 more
-- (28 first-party + 10 CC0) to land 103 net-new total — ASSERT lower bound bumps
-- to v_new >= 100 / v_total >= 112 to enforce the TCTN-01 floor at apply time
-- (we ship 103 to leave headroom and ensure every category has >= 5 templates).
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_total INTEGER;
  v_new   INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM svg_templates WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_new
    FROM svg_templates
    WHERE created_at >= '2026-04-29'::timestamptz
      AND tenant_id IS NULL
      AND is_active = TRUE;

  ASSERT v_total >= 112,
    format('expected svg_templates total >= 112 (12 existing + 100 Plan 175), got %s', v_total);
  ASSERT v_new >= 100,
    format('expected at least 100 net-new templates from Phase 175, got %s', v_new);
END $$;
