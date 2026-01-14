-- =====================================================
-- SEED LAYOUT GALLERY TEMPLATES
-- =====================================================
-- Adds free starter templates for the Layouts gallery.
-- Uses Unsplash images (free for commercial use).
-- =====================================================

-- First, ensure we have the necessary categories
INSERT INTO public.template_categories (slug, name, description, icon, sort_order)
VALUES
  ('general', 'General', 'General purpose templates', 'layout', 1),
  ('restaurant', 'Restaurant', 'Restaurant and food service templates', 'utensils', 2),
  ('retail', 'Retail', 'Retail and shopping templates', 'shopping-bag', 3),
  ('gym', 'Gym', 'Fitness and gym templates', 'dumbbell', 4),
  ('salon', 'Salon', 'Beauty and salon templates', 'scissors', 5),
  ('social', 'Social', 'Social media style templates', 'share', 6),
  ('holidays', 'Holidays', 'Holiday and seasonal templates', 'gift', 7),
  ('sales', 'Sales', 'Sales and promotions templates', 'percent', 8),
  ('welcome', 'Welcome', 'Welcome and greeting templates', 'hand', 9),
  ('music', 'Music', 'Music and entertainment templates', 'music', 10),
  ('fashion', 'Fashion', 'Fashion and style templates', 'shirt', 11)
ON CONFLICT (slug) DO NOTHING;

-- Insert layout templates with free Unsplash images
-- These are portrait (9:16), landscape (16:9), and square formats

INSERT INTO public.content_templates (slug, name, description, thumbnail_url, type, category_id, is_active, sort_order, meta)
VALUES
  -- Restaurant Templates
  (
    'restaurant-menu-board',
    'Menu Board',
    'Classic restaurant menu display with daily specials',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'restaurant'),
    true,
    1,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["menu", "food", "restaurant"]}'
  ),
  (
    'restaurant-specials',
    'Daily Specials',
    'Highlight your daily specials with appetizing visuals',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'restaurant'),
    true,
    2,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["specials", "food", "deals"]}'
  ),
  (
    'cafe-welcome',
    'Cafe Welcome',
    'Warm welcome screen for cafes and coffee shops',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'restaurant'),
    true,
    3,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["cafe", "coffee", "welcome"]}'
  ),

  -- Retail Templates
  (
    'retail-sale-banner',
    'Sale Banner',
    'Eye-catching sale announcement for retail stores',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'retail'),
    true,
    4,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["sale", "discount", "retail"]}'
  ),
  (
    'retail-new-arrivals',
    'New Arrivals',
    'Showcase your latest products and new arrivals',
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'retail'),
    true,
    5,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["new", "products", "arrivals"]}'
  ),
  (
    'retail-promo',
    'Retail Promo',
    'Promotional display for retail stores',
    'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'retail'),
    true,
    6,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["promo", "retail", "store"]}'
  ),

  -- Gym/Fitness Templates
  (
    'gym-class-schedule',
    'Class Schedule',
    'Display your gym class schedule professionally',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'gym'),
    true,
    7,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["gym", "fitness", "schedule"]}'
  ),
  (
    'gym-membership',
    'Membership Promo',
    'Promote gym memberships and special offers',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'gym'),
    true,
    8,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["gym", "membership", "fitness"]}'
  ),
  (
    'fitness-motivation',
    'Fitness Motivation',
    'Inspiring fitness quotes and imagery',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'gym'),
    true,
    9,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["fitness", "motivation", "workout"]}'
  ),

  -- Welcome Templates
  (
    'welcome-corporate',
    'Corporate Welcome',
    'Professional welcome screen for offices and lobbies',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'welcome'),
    true,
    10,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["welcome", "corporate", "office"]}'
  ),
  (
    'welcome-hotel',
    'Hotel Welcome',
    'Elegant welcome display for hotels and hospitality',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'welcome'),
    true,
    11,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["welcome", "hotel", "hospitality"]}'
  ),
  (
    'welcome-event',
    'Event Welcome',
    'Welcome attendees to your event or conference',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'welcome'),
    true,
    12,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["welcome", "event", "conference"]}'
  ),

  -- Holiday Templates
  (
    'holiday-christmas',
    'Christmas Sale',
    'Festive Christmas promotion template',
    'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'holidays'),
    true,
    13,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["christmas", "holiday", "sale"]}'
  ),
  (
    'holiday-halloween',
    'Halloween Special',
    'Spooky Halloween themed display',
    'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'holidays'),
    true,
    14,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["halloween", "spooky", "holiday"]}'
  ),
  (
    'holiday-thanksgiving',
    'Thanksgiving',
    'Warm Thanksgiving themed template',
    'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'holidays'),
    true,
    15,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["thanksgiving", "autumn", "holiday"]}'
  ),

  -- Sales Templates
  (
    'sales-black-friday',
    'Black Friday',
    'Bold Black Friday sale announcement',
    'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'sales'),
    true,
    16,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["black friday", "sale", "discount"]}'
  ),
  (
    'sales-clearance',
    'Clearance Sale',
    'Clearance and end of season sale template',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'sales'),
    true,
    17,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["clearance", "sale", "discount"]}'
  ),
  (
    'sales-flash-sale',
    'Flash Sale',
    'Limited time flash sale template',
    'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'sales'),
    true,
    18,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["flash", "sale", "limited"]}'
  ),

  -- Social Style Templates
  (
    'social-instagram',
    'Instagram Style',
    'Trendy Instagram-inspired template',
    'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'social'),
    true,
    19,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["social", "instagram", "modern"]}'
  ),
  (
    'social-feed',
    'Social Feed',
    'Display social media feeds stylishly',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'social'),
    true,
    20,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["social", "feed", "content"]}'
  ),

  -- Music Templates
  (
    'music-now-playing',
    'Now Playing',
    'Display currently playing music or playlist',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'music'),
    true,
    21,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["music", "now playing", "audio"]}'
  ),
  (
    'music-event',
    'Music Event',
    'Promote concerts and music events',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'music'),
    true,
    22,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["music", "concert", "event"]}'
  ),

  -- Fashion Templates
  (
    'fashion-lookbook',
    'Fashion Lookbook',
    'Showcase fashion collections and lookbooks',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'fashion'),
    true,
    23,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["fashion", "lookbook", "style"]}'
  ),
  (
    'fashion-new-collection',
    'New Collection',
    'Announce new fashion collections',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'fashion'),
    true,
    24,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["fashion", "collection", "new"]}'
  ),

  -- General Templates
  (
    'general-announcement',
    'Announcement',
    'General purpose announcement template',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'general'),
    true,
    25,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["announcement", "general", "info"]}'
  ),
  (
    'general-info-board',
    'Info Board',
    'Clean information display board',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'general'),
    true,
    26,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["info", "board", "display"]}'
  ),
  (
    'general-quote',
    'Quote Display',
    'Inspirational quote and message template',
    'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=500&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'general'),
    true,
    27,
    '{"orientation": "portrait", "width": 1080, "height": 1920, "tags": ["quote", "inspiration", "message"]}'
  ),

  -- Landscape Templates (16:9)
  (
    'landscape-corporate-welcome',
    'Corporate Welcome Wide',
    'Wide format corporate welcome screen',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=338&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'welcome'),
    true,
    28,
    '{"orientation": "landscape", "width": 1920, "height": 1080, "tags": ["welcome", "corporate", "wide"]}'
  ),
  (
    'landscape-menu-display',
    'Menu Display Wide',
    'Horizontal menu board for restaurants',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=338&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'restaurant'),
    true,
    29,
    '{"orientation": "landscape", "width": 1920, "height": 1080, "tags": ["menu", "restaurant", "wide"]}'
  ),
  (
    'landscape-retail-banner',
    'Retail Banner Wide',
    'Wide promotional banner for retail',
    'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=600&h=338&fit=crop',
    'layout',
    (SELECT id FROM template_categories WHERE slug = 'retail'),
    true,
    30,
    '{"orientation": "landscape", "width": 1920, "height": 1080, "tags": ["retail", "banner", "promo"]}'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  thumbnail_url = EXCLUDED.thumbnail_url,
  meta = EXCLUDED.meta,
  is_active = true;

-- Mark some as featured
UPDATE public.content_templates
SET meta = jsonb_set(COALESCE(meta, '{}'), '{is_featured}', 'true')
WHERE slug IN (
  'restaurant-menu-board',
  'retail-sale-banner',
  'gym-class-schedule',
  'welcome-corporate',
  'sales-black-friday',
  'landscape-corporate-welcome'
);
