-- ============================================================================
-- Migration: Seed SVG Templates
-- Description: Populate svg_templates table with initial template data
-- ============================================================================

-- Clear existing seed data (only global templates)
DELETE FROM svg_templates WHERE tenant_id IS NULL;

-- Insert SVG templates
INSERT INTO svg_templates (
    name,
    description,
    category,
    orientation,
    thumbnail,
    svg_url,
    width,
    height,
    tags,
    is_featured,
    is_active
) VALUES
-- Restaurant Menu (featured)
(
    'Restaurant Menu',
    'Elegant restaurant menu template with sections for starters, mains, desserts and drinks',
    'Restaurant',
    'landscape',
    '/templates/svg/restaurant-menu/menu-design.svg',
    '/templates/svg/restaurant-menu/menu-design.svg',
    1920,
    1080,
    ARRAY['menu', 'restaurant', 'food', 'dining'],
    TRUE,
    TRUE
),
-- Cafe Daily Special
(
    'Cafe Daily Special',
    'Coffee shop daily special board with pricing',
    'Restaurant',
    'portrait',
    '/templates/svg/cafe-special/design.svg',
    '/templates/svg/cafe-special/design.svg',
    1080,
    1920,
    ARRAY['cafe', 'coffee', 'special', 'daily'],
    FALSE,
    TRUE
),
-- Retail Sale Banner
(
    'Retail Sale Banner',
    'Eye-catching sale promotion banner for retail displays',
    'Retail',
    'landscape',
    '/templates/svg/retail-sale/design.svg',
    '/templates/svg/retail-sale/design.svg',
    1920,
    1080,
    ARRAY['sale', 'retail', 'promotion', 'discount'],
    FALSE,
    TRUE
),
-- Welcome Display
(
    'Welcome Display',
    'Professional welcome sign for lobbies and entrances',
    'Corporate',
    'landscape',
    '/templates/svg/welcome-sign/design.svg',
    '/templates/svg/welcome-sign/design.svg',
    1920,
    1080,
    ARRAY['welcome', 'corporate', 'lobby', 'entrance'],
    FALSE,
    TRUE
),
-- Holiday Sale (featured)
(
    'Holiday Sale',
    'Festive holiday sale promotion with discount badge and call-to-action',
    'Retail',
    'landscape',
    '/templates/svg/holiday-sale/design.svg',
    '/templates/svg/holiday-sale/design.svg',
    1920,
    1080,
    ARRAY['holiday', 'sale', 'christmas', 'promotion', 'seasonal'],
    TRUE,
    TRUE
),
-- Real Estate Listing (featured)
(
    'Real Estate Listing',
    'Professional property listing display with features, price, and agent info',
    'Real Estate',
    'landscape',
    '/templates/svg/real-estate/design.svg',
    '/templates/svg/real-estate/design.svg',
    1920,
    1080,
    ARRAY['real estate', 'property', 'listing', 'home', 'sale'],
    TRUE,
    TRUE
),
-- Healthcare Services
(
    'Healthcare Services',
    'Medical center services display with departments, hours, and contact info',
    'Healthcare',
    'landscape',
    '/templates/svg/healthcare-info/design.svg',
    '/templates/svg/healthcare-info/design.svg',
    1920,
    1080,
    ARRAY['healthcare', 'medical', 'hospital', 'clinic', 'services'],
    FALSE,
    TRUE
),
-- Corporate Welcome
(
    'Corporate Welcome',
    'Modern corporate welcome display for lobbies and meeting rooms',
    'Corporate',
    'landscape',
    '/templates/svg/corporate-welcome/design.svg',
    '/templates/svg/corporate-welcome/design.svg',
    1920,
    1080,
    ARRAY['corporate', 'welcome', 'meeting', 'lobby', 'business'],
    FALSE,
    TRUE
),
-- Happy Hour Specials (featured)
(
    'Happy Hour Specials',
    'Bar and restaurant happy hour promotion with drink specials',
    'Restaurant',
    'portrait',
    '/templates/svg/happy-hour/design.svg',
    '/templates/svg/happy-hour/design.svg',
    1080,
    1920,
    ARRAY['happy hour', 'bar', 'drinks', 'specials', 'restaurant'],
    TRUE,
    TRUE
),
-- Fitness Gym Promo
(
    'Fitness Gym Promo',
    'Dynamic gym membership promotion with pricing and features',
    'Fitness',
    'landscape',
    '/templates/svg/fitness-promo/design.svg',
    '/templates/svg/fitness-promo/design.svg',
    1920,
    1080,
    ARRAY['fitness', 'gym', 'membership', 'promotion', 'health'],
    FALSE,
    TRUE
),
-- Hotel Amenities
(
    'Hotel Amenities',
    'Hotel guest information display with amenities, dining hours, and services',
    'Hospitality',
    'portrait',
    '/templates/svg/hotel-amenities/design.svg',
    '/templates/svg/hotel-amenities/design.svg',
    1080,
    1920,
    ARRAY['hotel', 'amenities', 'hospitality', 'guest', 'services'],
    FALSE,
    TRUE
),
-- Event Promotion (featured)
(
    'Event Promotion',
    'Vibrant event promotion display for concerts, festivals, and live events',
    'Events',
    'landscape',
    '/templates/svg/event-promo/design.svg',
    '/templates/svg/event-promo/design.svg',
    1920,
    1080,
    ARRAY['event', 'concert', 'festival', 'music', 'entertainment'],
    TRUE,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Add comment
COMMENT ON TABLE svg_templates IS 'SVG templates for the design editor. Seeded with initial templates from migration 095.';
