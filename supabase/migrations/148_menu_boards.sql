-- ============================================================================
-- Migration: 148_menu_boards.sql
-- Feature: Menu Board Widget - Schema & Data Layer
-- Description: Creates menu_boards, menu_categories, and menu_items tables
--              with RLS policies, indexes, realtime publication, and triggers
-- Requirements: MENU-01, MENU-02, MENU-04, MENU-06, MENU-07, MENU-08, MENU-09
-- ============================================================================

-- ============================================================================
-- MENU BOARDS TABLE (top-level entity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'custom')),
  currency_code TEXT DEFAULT 'USD',
  price_columns JSONB DEFAULT '[{"label": "Price", "key": "default"}]'::jsonb,
  accent_color TEXT DEFAULT '#f59e0b',
  text_color TEXT DEFAULT '#ffffff',
  font_family TEXT DEFAULT 'system-ui',
  show_images BOOLEAN DEFAULT true,
  show_descriptions BOOLEAN DEFAULT true,
  page_interval_seconds INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE menu_boards IS 'Top-level menu board entities with theming and display configuration';
COMMENT ON COLUMN menu_boards.theme IS 'Display theme: dark, light, or custom';
COMMENT ON COLUMN menu_boards.currency_code IS 'ISO 4217 currency code for price formatting';
COMMENT ON COLUMN menu_boards.price_columns IS 'Array of price column definitions: [{label, key}]';
COMMENT ON COLUMN menu_boards.page_interval_seconds IS 'Auto-pagination interval in seconds for long menus';

-- ============================================================================
-- MENU CATEGORIES TABLE (groups of items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_board_id UUID NOT NULL REFERENCES menu_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE menu_categories IS 'Category groupings within a menu board';
COMMENT ON COLUMN menu_categories.order_index IS 'Display order within the menu board';
COMMENT ON COLUMN menu_categories.is_visible IS 'Whether the category is shown on the display';

-- ============================================================================
-- MENU ITEMS TABLE (individual items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  menu_board_id UUID NOT NULL REFERENCES menu_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  prices JSONB DEFAULT '{"default": null}'::jsonb,
  image_url TEXT,
  dietary_tags TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE menu_items IS 'Individual menu items within a category';
COMMENT ON COLUMN menu_items.menu_board_id IS 'Denormalized FK for Realtime subscription filtering';
COMMENT ON COLUMN menu_items.prices IS 'Price values keyed by price_column key: {"default": 9.99, "large": 12.99}';
COMMENT ON COLUMN menu_items.dietary_tags IS 'Array of dietary tag keys: vegetarian, vegan, gluten-free, etc.';
COMMENT ON COLUMN menu_items.is_available IS 'Whether the item is currently available (toggled without deleting)';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_menu_boards_tenant ON menu_boards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_board ON menu_categories(menu_board_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_order ON menu_categories(menu_board_id, order_index);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_board ON menu_items(menu_board_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_order ON menu_items(category_id, order_index);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE menu_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Menu Boards: tenant-scoped via JWT user_metadata
CREATE POLICY "menu_boards_select" ON menu_boards
  FOR SELECT USING (
    tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
  );

CREATE POLICY "menu_boards_insert" ON menu_boards
  FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
  );

CREATE POLICY "menu_boards_update" ON menu_boards
  FOR UPDATE USING (
    tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
  );

CREATE POLICY "menu_boards_delete" ON menu_boards
  FOR DELETE USING (
    tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
  );

-- Menu Categories: join-based via menu_boards tenant check
CREATE POLICY "menu_categories_select" ON menu_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_categories.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_categories_insert" ON menu_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_categories.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_categories_update" ON menu_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_categories.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_categories_delete" ON menu_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_categories.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

-- Menu Items: join-based via menu_boards tenant check
CREATE POLICY "menu_items_select" ON menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_items.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_items_insert" ON menu_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_items.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_items_update" ON menu_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_items.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

CREATE POLICY "menu_items_delete" ON menu_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM menu_boards mb
      WHERE mb.id = menu_items.menu_board_id
        AND mb.tenant_id = (auth.jwt()->'user_metadata'->>'tenant_id')::uuid
    )
  );

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_categories;

-- ============================================================================
-- UPDATED_AT TRIGGERS (reuse existing update_updated_at_column function)
-- ============================================================================

CREATE TRIGGER update_menu_boards_updated_at
  BEFORE UPDATE ON menu_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON menu_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON menu_boards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON menu_items TO authenticated;

-- Allow anon access for player rendering (read-only)
GRANT SELECT ON menu_boards TO anon;
GRANT SELECT ON menu_categories TO anon;
GRANT SELECT ON menu_items TO anon;

-- ============================================================================
-- Done
-- ============================================================================

DO $$ BEGIN
  RAISE NOTICE 'Migration 148 completed: Menu board tables with RLS, indexes, realtime publication, and updated_at triggers';
END $$;
