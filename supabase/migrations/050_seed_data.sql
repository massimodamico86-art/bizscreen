-- BizScreen - Seed Data
-- This adds sample data for testing

-- Create a test auth user first (required for profile foreign key)
-- Using Supabase's internal auth schema
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
  role
) VALUES (
  'c5a025d1-a2ec-4219-bed6-dd166ae77a57',
  '00000000-0000-0000-0000-000000000000',
  'test@bizscreen.test',
  crypt('testpassword123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Test User"}',
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Insert the corresponding profile
INSERT INTO public.profiles (id, email, full_name, role)
VALUES ('c5a025d1-a2ec-4219-bed6-dd166ae77a57', 'test@bizscreen.test', 'Test User', 'admin')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- =====================================================
-- SAMPLE LISTINGS
-- =====================================================

-- Listing 1: Luxury Beach House
INSERT INTO public.listings (
  id,
  owner_id,
  name,
  description,
  address,
  image,
  active,
  bedrooms,
  bathrooms,
  guests,
  price,
  rating,
  reviews,
  tvs,
  amenities,
  carousel_images,
  background_image,
  tv_layout,
  language,
  wifi_network,
  wifi_password,
  contact_phone,
  contact_email,
  welcome_greeting,
  welcome_message,
  weather_city,
  weather_unit,
  website_url,
  show_check_in_out,
  standard_check_in_time,
  standard_check_out_time,
  show_wifi,
  show_contact,
  show_weather,
  show_qr_codes,
  show_logo,
  show_welcome_message,
  tours_link
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'c5a025d1-a2ec-4219-bed6-dd166ae77a57', -- Supabase auth user ID
  'Luxury Beach House',
  'Stunning beachfront property with panoramic ocean views',
  '123 Ocean Drive, Miami Beach, FL',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
  true,
  4,
  3,
  8,
  450.00,
  4.80,
  124,
  2,
  '["WiFi", "Pool", "Beach Access", "Parking", "Kitchen", "Smart TV"]'::jsonb,
  '["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800", "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800", "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"]'::jsonb,
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=3840',
  'layout1',
  'English',
  'Beach House WiFi',
  'welcome123',
  '+1 (305) 555-0123',
  'contact@luxurybeach.com',
  'Welcome {{first-name}} {{last-name}}!',
  'We''re delighted to have you. Make yourselves at home and enjoy the serene views. Whether you''re here to relax, explore, or unwind, we hope you have a wonderful stay.',
  'Miami',
  'F',
  'https://luxurybeach.com',
  true,
  '16:00',
  '11:00',
  true,
  true,
  true,
  true,
  true,
  true,
  'https://vi.me/GSCJL'
);

-- Listing 2: Downtown Loft
INSERT INTO public.listings (
  id,
  owner_id,
  name,
  description,
  address,
  image,
  active,
  bedrooms,
  bathrooms,
  guests,
  price,
  rating,
  reviews,
  tvs,
  amenities,
  carousel_images,
  background_image,
  tv_layout,
  language,
  wifi_network,
  wifi_password,
  contact_phone,
  contact_email,
  welcome_greeting,
  welcome_message,
  weather_city,
  weather_unit,
  website_url,
  show_check_in_out,
  standard_check_in_time,
  standard_check_out_time,
  show_wifi,
  show_contact,
  show_weather,
  show_qr_codes,
  show_logo,
  show_welcome_message
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'c5a025d1-a2ec-4219-bed6-dd166ae77a57', -- Supabase auth user ID
  'Downtown Loft',
  'Modern loft in the heart of downtown',
  '456 Main St, New York, NY',
  'https://images.unsplash.com/photo-1502672260066-6bc35f0af07e?w=400',
  true,
  2,
  2,
  4,
  320.00,
  4.60,
  87,
  1,
  '["WiFi", "Gym", "Parking", "Kitchen"]'::jsonb,
  '["https://images.unsplash.com/photo-1502672260066-6bc35f0af07e?w=800", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]'::jsonb,
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=3840',
  'layout2',
  'English',
  'Loft WiFi',
  'loft2024',
  '+1 (212) 555-0456',
  'info@downtownloft.com',
  'Welcome to Downtown Loft!',
  'Enjoy your stay in the heart of the city.',
  'New York',
  'F',
  'https://downtownloft.com',
  true,
  '15:00',
  '11:00',
  true,
  true,
  true,
  true,
  true,
  true
);

-- Listing 3: Mountain Cabin
INSERT INTO public.listings (
  id,
  owner_id,
  name,
  description,
  address,
  image,
  active,
  bedrooms,
  bathrooms,
  guests,
  price,
  rating,
  reviews,
  tvs,
  amenities,
  carousel_images,
  background_image,
  tv_layout,
  language,
  contact_email,
  welcome_greeting,
  welcome_message,
  weather_unit,
  website_url,
  show_check_in_out,
  standard_check_in_time,
  standard_check_out_time,
  show_wifi,
  show_contact,
  show_weather,
  show_qr_codes,
  show_logo,
  show_welcome_message
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'c5a025d1-a2ec-4219-bed6-dd166ae77a57', -- Supabase auth user ID
  'Mountain Cabin',
  'Cozy mountain retreat with stunning views',
  '789 Pine Trail, Aspen, CO',
  'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=400',
  true,
  3,
  2,
  6,
  380.00,
  4.90,
  156,
  2,
  '["WiFi", "Fireplace", "Hot Tub", "Ski Storage", "Kitchen"]'::jsonb,
  '["https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800", "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800", "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800"]'::jsonb,
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3840',
  'layout3',
  'English',
  'stay@mountaincabin.com',
  'Welcome to Mountain Cabin!',
  'Relax and unwind in our cozy mountain retreat.',
  'F',
  'https://mountaincabin.com',
  false,
  '16:00',
  '10:00',
  false,
  true,
  false,
  true,
  true,
  true
);

-- =====================================================
-- SAMPLE GUESTS
-- =====================================================

-- Guests for Luxury Beach House
INSERT INTO public.guests (listing_id, first_name, last_name, check_in, check_out, language, email)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'John', 'Smith', '2024-11-05', '2024-11-08', 'English', 'john.smith@email.com'),
  ('11111111-1111-1111-1111-111111111111', 'Maria', 'Garcia', '2024-11-10', '2024-11-15', 'Spanish', 'maria.garcia@email.com');

-- Guests for Downtown Loft
INSERT INTO public.guests (listing_id, first_name, last_name, check_in, check_out, language, email)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Sarah', 'Johnson', '2024-11-12', '2024-11-16', 'English', 'sarah.johnson@email.com');

-- =====================================================
-- SAMPLE TV DEVICES
-- =====================================================

-- TV Devices for Luxury Beach House
INSERT INTO public.tv_devices (listing_id, device_name, otp_code, is_paired, is_online)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Living Room', '914792', false, false),
  ('11111111-1111-1111-1111-111111111111', 'Master Bedroom', '827461', false, false);

-- TV Devices for Downtown Loft
INSERT INTO public.tv_devices (listing_id, device_name, otp_code, is_paired, is_online)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Living Area', '456789', false, false);

-- TV Devices for Mountain Cabin
INSERT INTO public.tv_devices (listing_id, device_name, otp_code, is_paired, is_online)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Living Room', '123456', false, false),
  ('33333333-3333-3333-3333-333333333333', 'Bedroom', '789012', false, false);

-- =====================================================
-- SAMPLE QR CODES
-- =====================================================

-- QR Codes for Luxury Beach House
INSERT INTO public.qr_codes (listing_id, qr_name, qr_type, qr_details, display_order)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'House Guide', 'guidebook', 'https://guide.luxurybeach.com', 1),
  ('11111111-1111-1111-1111-111111111111', 'WiFi QR', 'wifi', 'WIFI:T:WPA;S:Beach House WiFi;P:welcome123;;', 2);

-- QR Codes for Mountain Cabin
INSERT INTO public.qr_codes (listing_id, qr_name, qr_type, qr_details, display_order)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Restaurant Menu', 'menu', 'https://menu.mountaincabin.com', 1);

-- =====================================================
-- SAMPLE TASKS
-- =====================================================

INSERT INTO public.tasks (listing_id, title, due_date, priority, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Deep clean Luxury Beach House', '2024-10-24', 'high', 'pending'),
  ('22222222-2222-2222-2222-222222222222', 'Restock amenities Downtown Loft', '2024-10-25', 'medium', 'in-progress');

-- =====================================================
-- SAMPLE FAQs
-- =====================================================

INSERT INTO public.faqs (category, question, answer, display_order, is_published)
VALUES
  ('General', 'How do I get started with BizScreen?', 'Complete the setup wizard and add your first location.', 1, true),
  ('Billing', 'How does billing work?', 'You are billed monthly based on your plan. All major credit cards are accepted.', 2, true),
  ('Integration', 'What integrations are available?', 'BizScreen supports Cloudinary for media uploads, weather services, and more.', 3, true);

-- =====================================================
-- SAMPLE MONETIZATION STATS (for demo user)
-- =====================================================

-- INSERT INTO public.monetization_stats (user_id, total_earnings, month_earnings, total_bookings, stat_month)
-- VALUES
--   ('YOUR_USER_ID_HERE', 1245.50, 342.80, 28, '2024-11-01');

-- =====================================================
-- SAMPLE EXPERIENCES
-- =====================================================

-- INSERT INTO public.experiences (user_id, name, price, commission, rating, image, total_bookings)
-- VALUES
--   ('YOUR_USER_ID_HERE', 'Miami City Tour', 89.99, 12.99, 4.8, 'https://images.unsplash.com/photo-1514214246283-d427a95c5d2f?w=300', 15),
--   ('YOUR_USER_ID_HERE', 'Everglades Adventure', 129.99, 18.99, 4.9, 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=300', 13);
