-- =====================================================
-- SEED LAYOUT TEMPLATES
-- =====================================================
-- Creates global layout templates for the template gallery.
-- These templates are available to all tenants.
-- =====================================================

-- Insert global templates (tenant_id = NULL for global visibility)

-- 1. Christmas Sales Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL, -- Global template
  'Holiday Sale',
  'Festive holiday sales template with promotional content and countdown timer',
  'Holidays',
  '16_9',
  'https://images.unsplash.com/photo-1512389142860-9c449e58a814?w=400&h=225&fit=crop',
  '#1a1a2e',
  NULL,
  1920,
  1080,
  true,
  '{
    "elements": [
      {
        "id": "text-header",
        "type": "text",
        "position": { "x": 0.1, "y": 0.08, "width": 0.8, "height": 0.12 },
        "layer": 3,
        "locked": false,
        "props": {
          "text": "HOLIDAY SALE",
          "fontSize": 72,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#ef4444"
        }
      },
      {
        "id": "text-discount",
        "type": "text",
        "position": { "x": 0.25, "y": 0.25, "width": 0.5, "height": 0.2 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "50% OFF",
          "fontSize": 96,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#22c55e"
        }
      },
      {
        "id": "text-subtitle",
        "type": "text",
        "position": { "x": 0.15, "y": 0.48, "width": 0.7, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "All items in store through December 31st",
          "fontSize": 32,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "widget-clock",
        "type": "widget",
        "widgetType": "clock",
        "position": { "x": 0.8, "y": 0.02, "width": 0.18, "height": 0.08 },
        "layer": 4,
        "locked": false,
        "props": {
          "textColor": "#ffffff",
          "format": "12h",
          "showSeconds": false
        }
      },
      {
        "id": "widget-qr",
        "type": "widget",
        "widgetType": "qr",
        "position": { "x": 0.02, "y": 0.7, "width": 0.15, "height": 0.27 },
        "layer": 3,
        "locked": false,
        "props": {
          "url": "https://example.com/holiday-deals",
          "fgColor": "#000000",
          "bgColor": "#ffffff",
          "cornerRadius": 8
        }
      },
      {
        "id": "text-cta",
        "type": "text",
        "position": { "x": 0.2, "y": 0.8, "width": 0.6, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Scan for exclusive online deals!",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#94a3b8"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 2. Welcome Screen Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Welcome Screen',
  'Professional welcome screen for lobbies and reception areas',
  'Welcome',
  '16_9',
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=225&fit=crop',
  '#0f172a',
  NULL,
  1920,
  1080,
  true,
  '{
    "elements": [
      {
        "id": "text-welcome",
        "type": "text",
        "position": { "x": 0.1, "y": 0.35, "width": 0.8, "height": 0.15 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Welcome",
          "fontSize": 80,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-company",
        "type": "text",
        "position": { "x": 0.15, "y": 0.52, "width": 0.7, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "YOUR COMPANY NAME",
          "fontSize": 48,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#3b82f6"
        }
      },
      {
        "id": "widget-clock",
        "type": "widget",
        "widgetType": "clock",
        "position": { "x": 0.35, "y": 0.75, "width": 0.3, "height": 0.1 },
        "layer": 3,
        "locked": false,
        "props": {
          "textColor": "#94a3b8",
          "format": "12h",
          "showSeconds": true
        }
      },
      {
        "id": "widget-date",
        "type": "widget",
        "widgetType": "date",
        "position": { "x": 0.35, "y": 0.87, "width": 0.3, "height": 0.06 },
        "layer": 3,
        "locked": false,
        "props": {
          "textColor": "#64748b",
          "format": "long"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 3. Restaurant Menu Board Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Menu Board',
  'Digital menu board for restaurants and cafes',
  'Restaurant',
  '16_9',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=225&fit=crop',
  '#18181b',
  NULL,
  1920,
  1080,
  true,
  '{
    "elements": [
      {
        "id": "text-header",
        "type": "text",
        "position": { "x": 0.05, "y": 0.05, "width": 0.9, "height": 0.12 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "TODAY''S SPECIALS",
          "fontSize": 56,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#fbbf24"
        }
      },
      {
        "id": "text-item1",
        "type": "text",
        "position": { "x": 0.05, "y": 0.22, "width": 0.6, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Grilled Salmon with Herbs",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-price1",
        "type": "text",
        "position": { "x": 0.7, "y": 0.22, "width": 0.25, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "$24.99",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "right",
          "color": "#22c55e"
        }
      },
      {
        "id": "text-item2",
        "type": "text",
        "position": { "x": 0.05, "y": 0.35, "width": 0.6, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Ribeye Steak (12oz)",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-price2",
        "type": "text",
        "position": { "x": 0.7, "y": 0.35, "width": 0.25, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "$32.99",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "right",
          "color": "#22c55e"
        }
      },
      {
        "id": "text-item3",
        "type": "text",
        "position": { "x": 0.05, "y": 0.48, "width": 0.6, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Vegetarian Pasta Primavera",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-price3",
        "type": "text",
        "position": { "x": 0.7, "y": 0.48, "width": 0.25, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "$18.99",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "right",
          "color": "#22c55e"
        }
      },
      {
        "id": "widget-clock",
        "type": "widget",
        "widgetType": "clock",
        "position": { "x": 0.82, "y": 0.88, "width": 0.15, "height": 0.08 },
        "layer": 3,
        "locked": false,
        "props": {
          "textColor": "#71717a",
          "format": "12h",
          "showSeconds": false
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 4. Retail Promo Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Retail Promo',
  'Eye-catching promotional display for retail stores',
  'Retail',
  '16_9',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=225&fit=crop',
  '#0c0a09',
  NULL,
  1920,
  1080,
  false,
  '{
    "elements": [
      {
        "id": "text-brand",
        "type": "text",
        "position": { "x": 0.05, "y": 0.05, "width": 0.4, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "BRAND NAME",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-new",
        "type": "text",
        "position": { "x": 0.1, "y": 0.25, "width": 0.8, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "NEW ARRIVALS",
          "fontSize": 64,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#f97316"
        }
      },
      {
        "id": "text-collection",
        "type": "text",
        "position": { "x": 0.15, "y": 0.38, "width": 0.7, "height": 0.15 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Spring Collection 2024",
          "fontSize": 48,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-discount",
        "type": "text",
        "position": { "x": 0.25, "y": 0.6, "width": 0.5, "height": 0.12 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "20% OFF",
          "fontSize": 72,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#22c55e"
        }
      },
      {
        "id": "text-code",
        "type": "text",
        "position": { "x": 0.3, "y": 0.75, "width": 0.4, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Use code: SPRING24",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#94a3b8"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 5. Gym/Fitness Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Fitness Classes',
  'Class schedule display for gyms and fitness centers',
  'Gym',
  '16_9',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=225&fit=crop',
  '#0f172a',
  NULL,
  1920,
  1080,
  false,
  '{
    "elements": [
      {
        "id": "text-header",
        "type": "text",
        "position": { "x": 0.1, "y": 0.05, "width": 0.8, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "TODAY''S CLASSES",
          "fontSize": 56,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#f97316"
        }
      },
      {
        "id": "text-class1",
        "type": "text",
        "position": { "x": 0.05, "y": 0.2, "width": 0.5, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "HIIT Training",
          "fontSize": 32,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-time1",
        "type": "text",
        "position": { "x": 0.6, "y": 0.2, "width": 0.35, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "6:00 AM - Studio A",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "right",
          "color": "#94a3b8"
        }
      },
      {
        "id": "text-class2",
        "type": "text",
        "position": { "x": 0.05, "y": 0.32, "width": 0.5, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Yoga Flow",
          "fontSize": 32,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-time2",
        "type": "text",
        "position": { "x": 0.6, "y": 0.32, "width": 0.35, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "8:00 AM - Studio B",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "right",
          "color": "#94a3b8"
        }
      },
      {
        "id": "text-class3",
        "type": "text",
        "position": { "x": 0.05, "y": 0.44, "width": 0.5, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Spin Class",
          "fontSize": 32,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "left",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-time3",
        "type": "text",
        "position": { "x": 0.6, "y": 0.44, "width": 0.35, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "12:00 PM - Spin Room",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "right",
          "color": "#94a3b8"
        }
      },
      {
        "id": "widget-clock",
        "type": "widget",
        "widgetType": "clock",
        "position": { "x": 0.8, "y": 0.05, "width": 0.15, "height": 0.08 },
        "layer": 3,
        "locked": false,
        "props": {
          "textColor": "#ffffff",
          "format": "12h",
          "showSeconds": false
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 6. Portrait Announcement Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Portrait Announcement',
  'Vertical announcement display for kiosks and portrait screens',
  'General',
  '9_16',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=225&h=400&fit=crop',
  '#1e1b4b',
  NULL,
  1080,
  1920,
  true,
  '{
    "elements": [
      {
        "id": "text-headline",
        "type": "text",
        "position": { "x": 0.05, "y": 0.15, "width": 0.9, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "IMPORTANT",
          "fontSize": 48,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#f97316"
        }
      },
      {
        "id": "text-message",
        "type": "text",
        "position": { "x": 0.08, "y": 0.28, "width": 0.84, "height": 0.25 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Your announcement message goes here. Keep it short and impactful.",
          "fontSize": 36,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "widget-date",
        "type": "widget",
        "widgetType": "date",
        "position": { "x": 0.15, "y": 0.85, "width": 0.7, "height": 0.05 },
        "layer": 3,
        "locked": false,
        "props": {
          "textColor": "#94a3b8",
          "format": "long"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 7. Event Countdown Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Event Countdown',
  'Countdown display for upcoming events and launches',
  'Sales',
  '16_9',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=225&fit=crop',
  '#0c0a09',
  NULL,
  1920,
  1080,
  false,
  '{
    "elements": [
      {
        "id": "text-event",
        "type": "text",
        "position": { "x": 0.1, "y": 0.1, "width": 0.8, "height": 0.12 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "GRAND OPENING",
          "fontSize": 64,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-countdown-label",
        "type": "text",
        "position": { "x": 0.2, "y": 0.3, "width": 0.6, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "Starts in",
          "fontSize": 32,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#94a3b8"
        }
      },
      {
        "id": "text-countdown-days",
        "type": "text",
        "position": { "x": 0.25, "y": 0.4, "width": 0.5, "height": 0.2 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "7 DAYS",
          "fontSize": 96,
          "fontFamily": "Inter",
          "fontWeight": "bold",
          "align": "center",
          "color": "#f97316"
        }
      },
      {
        "id": "text-date",
        "type": "text",
        "position": { "x": 0.2, "y": 0.65, "width": 0.6, "height": 0.08 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "January 15, 2025 at 10:00 AM",
          "fontSize": 28,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#ffffff"
        }
      },
      {
        "id": "text-location",
        "type": "text",
        "position": { "x": 0.15, "y": 0.78, "width": 0.7, "height": 0.06 },
        "layer": 2,
        "locked": false,
        "props": {
          "text": "123 Main Street, Downtown",
          "fontSize": 24,
          "fontFamily": "Inter",
          "fontWeight": "normal",
          "align": "center",
          "color": "#64748b"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 8. Simple Info Display Template
INSERT INTO public.layout_templates (
  tenant_id,
  name,
  description,
  category,
  orientation,
  thumbnail_url,
  background_color,
  background_image_url,
  width,
  height,
  is_featured,
  data
) VALUES (
  NULL,
  'Info Display',
  'Clean information display with clock and weather widgets',
  'General',
  '16_9',
  'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=225&fit=crop',
  '#1e293b',
  NULL,
  1920,
  1080,
  false,
  '{
    "elements": [
      {
        "id": "widget-clock-large",
        "type": "widget",
        "widgetType": "clock",
        "position": { "x": 0.3, "y": 0.25, "width": 0.4, "height": 0.2 },
        "layer": 2,
        "locked": false,
        "props": {
          "textColor": "#ffffff",
          "format": "12h",
          "showSeconds": true
        }
      },
      {
        "id": "widget-date-large",
        "type": "widget",
        "widgetType": "date",
        "position": { "x": 0.25, "y": 0.5, "width": 0.5, "height": 0.1 },
        "layer": 2,
        "locked": false,
        "props": {
          "textColor": "#94a3b8",
          "format": "full"
        }
      },
      {
        "id": "widget-weather",
        "type": "widget",
        "widgetType": "weather",
        "position": { "x": 0.35, "y": 0.7, "width": 0.3, "height": 0.15 },
        "layer": 2,
        "locked": false,
        "props": {
          "textColor": "#ffffff",
          "location": "Miami, FL",
          "units": "imperial",
          "style": "minimal"
        }
      }
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- =====================================================
-- Remove old seed layouts from the layouts table
-- (These were created by 085_seed_layout_templates.sql
-- as user layouts, now we want them as templates)
-- =====================================================

-- Delete the old layouts that were seeded directly
-- (Only delete if they have specific names from the old seed)
DELETE FROM public.layouts
WHERE name IN ('Christmas Sales 2024', 'Welcome Screen', 'Restaurant Menu Board')
  AND template_id IS NULL;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
