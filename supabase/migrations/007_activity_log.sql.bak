-- Activity Log table for tracking all user actions and changes

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'sync', etc.
  entity_type TEXT NOT NULL, -- 'listing', 'guest', 'tv_device', 'qr_code', 'pms_connection', etc.
  entity_id UUID, -- ID of the affected entity
  entity_name TEXT, -- Human-readable name of the entity
  details JSONB, -- Additional details about the action
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action_type ON public.activity_log(action_type);
CREATE INDEX idx_activity_log_entity_type ON public.activity_log(entity_type);
CREATE INDEX idx_activity_log_entity_id ON public.activity_log(entity_id);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activity log"
  ON public.activity_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity log"
  ON public.activity_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_log (
    user_id,
    action_type,
    entity_type,
    entity_id,
    entity_name,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON public.activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;

-- Create trigger function to automatically log changes
CREATE OR REPLACE FUNCTION public.auto_log_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log INSERT
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_activity(
      'create',
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, NEW.device_name, 'New ' || TG_TABLE_NAME),
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;

  -- Log UPDATE
  IF (TG_OP = 'UPDATE') THEN
    PERFORM public.log_activity(
      'update',
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.first_name || ' ' || NEW.last_name, NEW.device_name, TG_TABLE_NAME),
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW),
        'changes', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(to_jsonb(NEW))
          WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
        )
      )
    );
    RETURN NEW;
  END IF;

  -- Log DELETE
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.log_activity(
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      COALESCE(OLD.name, OLD.first_name || ' ' || OLD.last_name, OLD.device_name, 'Deleted ' || TG_TABLE_NAME),
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic logging on key tables
CREATE TRIGGER log_listings_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_changes();

CREATE TRIGGER log_guests_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_changes();

CREATE TRIGGER log_tv_devices_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tv_devices
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_changes();

CREATE TRIGGER log_qr_codes_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_changes();

CREATE TRIGGER log_pms_connections_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.pms_connections
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_changes();
