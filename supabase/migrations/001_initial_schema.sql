-- BizScreen - Initial Database Schema
-- This migration creates all the core tables for the BizScreen application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS & AUTH
-- =====================================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'admin', 'client')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LISTINGS (Properties)
-- =====================================================

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  image TEXT,
  active BOOLEAN NOT NULL DEFAULT true,

  -- Property Details
  bedrooms INTEGER,
  bathrooms INTEGER,
  guests INTEGER,
  price DECIMAL(10, 2),
  rating DECIMAL(3, 2),
  reviews INTEGER DEFAULT 0,
  tvs INTEGER DEFAULT 0,
  amenities JSONB DEFAULT '[]'::jsonb,

  -- Media
  carousel_images JSONB DEFAULT '[]'::jsonb,
  background_image TEXT,
  background_video TEXT,
  background_music TEXT,
  logo TEXT,

  -- TV Layout & Display
  tv_layout TEXT DEFAULT 'layout1' CHECK (tv_layout IN ('layout1', 'layout2', 'layout3', 'layout4')),
  language TEXT DEFAULT 'English',

  -- Contact & Network
  wifi_network TEXT,
  wifi_password TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  website_url TEXT,
  tours_link TEXT,

  -- Times
  standard_check_in_time TIME,
  standard_check_out_time TIME,
  hours_of_operation_from TIME,
  hours_of_operation_to TIME,

  -- Welcome Message
  welcome_greeting TEXT DEFAULT 'Welcome, {{Guest}}!',
  welcome_message TEXT,

  -- Weather
  weather_city TEXT,
  weather_unit TEXT DEFAULT 'F' CHECK (weather_unit IN ('F', 'C')),

  -- Display Toggles
  show_check_in_out BOOLEAN DEFAULT true,
  show_hours_of_operation BOOLEAN DEFAULT false,
  show_wifi BOOLEAN DEFAULT true,
  show_contact BOOLEAN DEFAULT true,
  show_weather BOOLEAN DEFAULT true,
  show_qr_codes BOOLEAN DEFAULT true,
  show_logo BOOLEAN DEFAULT true,
  show_welcome_message BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_listings_owner_id ON public.listings(owner_id);
CREATE INDEX idx_listings_active ON public.listings(active);

-- =====================================================
-- GUESTS
-- =====================================================

CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,

  -- Guest Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  language TEXT DEFAULT 'English',

  -- Reservation Dates
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,

  -- Guest Preferences
  special_requests TEXT,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_guests_listing_id ON public.guests(listing_id);
CREATE INDEX idx_guests_check_in ON public.guests(check_in);
CREATE INDEX idx_guests_check_out ON public.guests(check_out);
CREATE INDEX idx_guests_dates ON public.guests(check_in, check_out);

-- =====================================================
-- TV DEVICES
-- =====================================================

CREATE TABLE public.tv_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,

  -- Device Info
  name TEXT NOT NULL,
  device_id TEXT UNIQUE,
  otp TEXT, -- One-time password for pairing

  -- Status
  is_paired BOOLEAN DEFAULT false,
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMPTZ,

  -- Device Details
  model TEXT,
  os_version TEXT,
  app_version TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paired_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tv_devices_listing_id ON public.tv_devices(listing_id);
CREATE INDEX idx_tv_devices_device_id ON public.tv_devices(device_id);
CREATE INDEX idx_tv_devices_otp ON public.tv_devices(otp);

-- =====================================================
-- QR CODES
-- =====================================================

CREATE TABLE public.qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE NOT NULL,

  -- QR Code Info
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wifi', 'website', 'guidebook', 'menu', 'custom')),
  details TEXT NOT NULL, -- URL or data to encode

  -- Display Order
  display_order INTEGER DEFAULT 0,

  -- Generated QR
  qr_image_url TEXT, -- Stored QR code image if pre-generated

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_qr_codes_listing_id ON public.qr_codes(listing_id);
CREATE INDEX idx_qr_codes_type ON public.qr_codes(type);

-- =====================================================
-- TASKS
-- =====================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Task Info
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),

  -- Task Metadata
  tags JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_tasks_listing_id ON public.tasks(listing_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

-- =====================================================
-- FAQs
-- =====================================================

CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- FAQ Content
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  -- Display
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_faqs_category ON public.faqs(category);
CREATE INDEX idx_faqs_published ON public.faqs(is_published);

-- =====================================================
-- VIATOR / MONETIZATION STATS
-- =====================================================

CREATE TABLE public.monetization_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Stats
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  month_earnings DECIMAL(10, 2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,

  -- Period
  stat_month DATE NOT NULL, -- First day of the month

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, stat_month)
);

-- Index
CREATE INDEX idx_monetization_stats_user_id ON public.monetization_stats(user_id);
CREATE INDEX idx_monetization_stats_month ON public.monetization_stats(stat_month);

-- =====================================================
-- EXPERIENCES (Viator/Tours)
-- =====================================================

CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Experience Info
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  commission DECIMAL(10, 2),
  rating DECIMAL(3, 2),
  image TEXT,
  external_id TEXT, -- ID from Viator or other platform
  booking_url TEXT,

  -- Stats
  total_bookings INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_experiences_user_id ON public.experiences(user_id);

-- =====================================================
-- FUNCTIONS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tv_devices_updated_at BEFORE UPDATE ON public.tv_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monetization_stats_updated_at BEFORE UPDATE ON public.monetization_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON public.experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tv_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monetization_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profile, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Listings: Users can see their own listings
CREATE POLICY "Users can view own listings" ON public.listings
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = owner_id);

-- Guests: Users can manage guests for their listings
CREATE POLICY "Users can view guests for own listings" ON public.guests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = guests.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert guests for own listings" ON public.guests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = guests.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update guests for own listings" ON public.guests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = guests.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete guests for own listings" ON public.guests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = guests.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- TV Devices: Similar pattern for own listings
CREATE POLICY "Users can view TV devices for own listings" ON public.tv_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = tv_devices.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage TV devices for own listings" ON public.tv_devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = tv_devices.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- QR Codes: Similar pattern
CREATE POLICY "Users can view QR codes for own listings" ON public.qr_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = qr_codes.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage QR codes for own listings" ON public.qr_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = qr_codes.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- Tasks: Users can manage tasks for their listings
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (
    listing_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = tasks.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own tasks" ON public.tasks
  FOR ALL USING (
    listing_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = tasks.listing_id
      AND listings.owner_id = auth.uid()
    )
  );

-- FAQs: Everyone can read, only admins can manage
CREATE POLICY "Anyone can view published FAQs" ON public.faqs
  FOR SELECT USING (is_published = true);

-- Monetization Stats: Users can view own stats
CREATE POLICY "Users can view own stats" ON public.monetization_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stats" ON public.monetization_stats
  FOR ALL USING (auth.uid() = user_id);

-- Experiences: Users can view own experiences
CREATE POLICY "Users can view own experiences" ON public.experiences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own experiences" ON public.experiences
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth';
COMMENT ON TABLE public.listings IS 'Property listings with all configuration';
COMMENT ON TABLE public.guests IS 'Guest reservations and information';
COMMENT ON TABLE public.tv_devices IS 'TV devices paired with listings';
COMMENT ON TABLE public.qr_codes IS 'QR codes displayed on TV screens';
COMMENT ON TABLE public.tasks IS 'Property management tasks';
COMMENT ON TABLE public.faqs IS 'Frequently asked questions';
COMMENT ON TABLE public.monetization_stats IS 'Earnings statistics from Viator/tours';
COMMENT ON TABLE public.experiences IS 'Tour and experience offerings';
