-- User Settings table for storing user preferences

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  guest_checkin_notifications BOOLEAN DEFAULT true,
  pms_sync_notifications BOOLEAN DEFAULT true,
  tv_offline_notifications BOOLEAN DEFAULT true,

  -- Display preferences
  theme TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
  language TEXT DEFAULT 'en', -- 'en', 'es', 'fr', 'de', etc.
  timezone TEXT DEFAULT 'UTC',
  date_format TEXT DEFAULT 'MM/DD/YYYY',
  time_format TEXT DEFAULT '12h', -- '12h' or '24h'

  -- Dashboard preferences
  default_page TEXT DEFAULT 'dashboard',
  items_per_page INTEGER DEFAULT 10,
  show_welcome_banner BOOLEAN DEFAULT true,

  -- Privacy preferences
  activity_tracking BOOLEAN DEFAULT true,
  analytics_enabled BOOLEAN DEFAULT true,

  -- Integration preferences
  auto_sync_pms BOOLEAN DEFAULT false,
  sync_frequency_hours INTEGER DEFAULT 24,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Function to get or create user settings
CREATE OR REPLACE FUNCTION public.get_or_create_user_settings()
RETURNS public.user_settings AS $$
DECLARE
  v_settings public.user_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO v_settings
  FROM public.user_settings
  WHERE user_id = auth.uid();

  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO public.user_settings (user_id)
    VALUES (auth.uid())
    RETURNING * INTO v_settings;
  END IF;

  RETURN v_settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user_settings() TO authenticated;
