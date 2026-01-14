-- =====================================================
-- SEED LAYOUT TEMPLATES
-- =====================================================
-- Creates example layout templates for the Yodeck-style
-- layout editor demo purposes.
-- =====================================================

-- Note: This migration creates seed data for demo purposes.
-- In production, layouts would be created by users.

-- Create a function to insert seed layouts
CREATE OR REPLACE FUNCTION seed_layout_templates()
RETURNS void AS $$
DECLARE
  v_test_user_id UUID;
BEGIN
  -- Find a test user (client role) to assign layouts to
  SELECT id INTO v_test_user_id
  FROM public.profiles
  WHERE role = 'client'
  LIMIT 1;

  -- If no client user found, try any user
  IF v_test_user_id IS NULL THEN
    SELECT id INTO v_test_user_id
    FROM public.profiles
    LIMIT 1;
  END IF;

  -- Exit if no users exist
  IF v_test_user_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping layout seed data';
    RETURN;
  END IF;

  -- Insert Christmas Sales layout template
  INSERT INTO public.layouts (
    owner_id,
    name,
    description,
    width,
    height,
    background_color,
    aspect_ratio,
    data
  )
  SELECT
    v_test_user_id,
    'Christmas Sales 2024',
    'Festive holiday sales template with promotional content',
    1920,
    1080,
    '#1a1a2e',
    '16:9',
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.layouts WHERE name = 'Christmas Sales 2024' AND owner_id = v_test_user_id
  );

  -- Insert Welcome Screen layout template
  INSERT INTO public.layouts (
    owner_id,
    name,
    description,
    width,
    height,
    background_color,
    aspect_ratio,
    data
  )
  SELECT
    v_test_user_id,
    'Welcome Screen',
    'Professional welcome screen for lobbies and reception areas',
    1920,
    1080,
    '#0f172a',
    '16:9',
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.layouts WHERE name = 'Welcome Screen' AND owner_id = v_test_user_id
  );

  -- Insert Menu Board layout template
  INSERT INTO public.layouts (
    owner_id,
    name,
    description,
    width,
    height,
    background_color,
    aspect_ratio,
    data
  )
  SELECT
    v_test_user_id,
    'Restaurant Menu Board',
    'Digital menu board for restaurants and cafes',
    1920,
    1080,
    '#18181b',
    '16:9',
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
  WHERE NOT EXISTS (
    SELECT 1 FROM public.layouts WHERE name = 'Restaurant Menu Board' AND owner_id = v_test_user_id
  );

  RAISE NOTICE 'Layout templates seeded successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the seed function
SELECT seed_layout_templates();

-- Clean up the function after use
DROP FUNCTION IF EXISTS seed_layout_templates();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
