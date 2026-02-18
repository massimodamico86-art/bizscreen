/**
 * Menu Board Service - CRUD operations for menu boards, categories, and items
 *
 * @module services/menuBoardService
 *
 * Provides complete data management for the menu board widget including:
 * - Menu board CRUD with nested categories and items
 * - Category and item reordering via order_index updates
 * - Item availability toggling
 * - Realtime subscription for menu board changes
 * - Dietary tag constants
 * - Locale-aware currency formatting
 */
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService.js';

const _logger = createScopedLogger('MenuBoardService');

// ============================================================================
// DIETARY TAG CONSTANTS (MENU-08)
// ============================================================================

/**
 * Predefined dietary tag definitions with display metadata
 * @type {Array<{key: string, label: string, emoji: string, color: string}>}
 */
export const DIETARY_TAGS = [
  { key: 'vegetarian', label: 'Vegetarian', emoji: 'V', color: '#22c55e' },
  { key: 'vegan', label: 'Vegan', emoji: 'VG', color: '#16a34a' },
  { key: 'gluten-free', label: 'Gluten-Free', emoji: 'GF', color: '#eab308' },
  { key: 'dairy-free', label: 'Dairy-Free', emoji: 'DF', color: '#3b82f6' },
  { key: 'nut-free', label: 'Nut-Free', emoji: 'NF', color: '#f97316' },
  { key: 'spicy', label: 'Spicy', emoji: 'S', color: '#ef4444' },
  { key: 'halal', label: 'Halal', emoji: 'H', color: '#8b5cf6' },
  { key: 'kosher', label: 'Kosher', emoji: 'K', color: '#6366f1' },
];

// ============================================================================
// CURRENCY FORMATTING (MENU-09)
// ============================================================================

/**
 * Format a price amount using locale-aware Intl.NumberFormat
 * @param {number|string|null|undefined} amount - The price amount
 * @param {string} [currencyCode] - ISO 4217 currency code (default: 'USD')
 * @param {string} [locale] - BCP 47 locale string (default: 'en-US')
 * @returns {string} Formatted price string, or empty string for null/invalid
 */
export function formatMenuPrice(amount, currencyCode, locale) {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = Number(amount);
  if (isNaN(num)) return '';
  try {
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

// ============================================================================
// MENU BOARD CRUD (MENU-01)
// ============================================================================

/**
 * Fetch all menu boards for the current tenant with category/item counts
 * @returns {Promise<Array>} Array of menu boards
 */
export async function fetchMenuBoards() {
  const { data, error } = await supabase
    .from('menu_boards')
    .select('*, menu_categories(count), menu_items(count)')
    .order('name');

  if (error) {
    _logger.error('Failed to fetch menu boards', { error });
    throw error;
  }

  return data || [];
}

/**
 * Get a single menu board with nested categories and items
 * @param {string} id - Menu board UUID
 * @returns {Promise<Object>} Menu board with categories and items ordered by order_index
 */
export async function getMenuBoard(id) {
  if (!id) {
    throw new Error('Menu board ID is required');
  }

  const { data, error } = await supabase
    .from('menu_boards')
    .select(`
      *,
      menu_categories(
        *,
        menu_items(*)
      )
    `)
    .eq('id', id)
    .order('order_index', { referencedTable: 'menu_categories' })
    .order('order_index', { referencedTable: 'menu_categories.menu_items' })
    .single();

  if (error) {
    _logger.error('Failed to fetch menu board', { error });
    throw error;
  }

  return data;
}

/**
 * Create a new menu board
 * @param {Object} params - Menu board properties
 * @param {string} params.name - Board name
 * @param {string} [params.description] - Board description
 * @param {string} [params.theme] - Display theme (dark/light/custom)
 * @param {string} [params.currencyCode] - ISO 4217 currency code
 * @param {Array} [params.priceColumns] - Price column definitions
 * @param {string} [params.accentColor] - Accent color hex
 * @param {string} [params.textColor] - Text color hex
 * @param {string} [params.fontFamily] - Font family
 * @param {boolean} [params.showImages] - Show item images
 * @param {boolean} [params.showDescriptions] - Show item descriptions
 * @param {number} [params.pageIntervalSeconds] - Auto-pagination interval
 * @returns {Promise<Object>} Created menu board
 */
export async function createMenuBoard({
  name,
  description,
  theme,
  currencyCode,
  priceColumns,
  accentColor,
  textColor,
  fontFamily,
  showImages,
  showDescriptions,
  pageIntervalSeconds,
}) {
  if (!name?.trim()) {
    throw new Error('Menu board name is required');
  }

  const insertData = {
    name: name.trim(),
    description: description?.trim() || null,
  };

  // Only include optional fields if provided
  if (theme !== undefined) insertData.theme = theme;
  if (currencyCode !== undefined) insertData.currency_code = currencyCode;
  if (priceColumns !== undefined) insertData.price_columns = priceColumns;
  if (accentColor !== undefined) insertData.accent_color = accentColor;
  if (textColor !== undefined) insertData.text_color = textColor;
  if (fontFamily !== undefined) insertData.font_family = fontFamily;
  if (showImages !== undefined) insertData.show_images = showImages;
  if (showDescriptions !== undefined) insertData.show_descriptions = showDescriptions;
  if (pageIntervalSeconds !== undefined) insertData.page_interval_seconds = pageIntervalSeconds;

  const { data, error } = await supabase
    .from('menu_boards')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to create menu board', { error });
    throw error;
  }

  return data;
}

/**
 * Update a menu board
 * @param {string} id - Menu board UUID
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated menu board
 */
export async function updateMenuBoard(id, updates) {
  if (!id) {
    throw new Error('Menu board ID is required');
  }

  const fieldMap = {
    name: 'name',
    description: 'description',
    theme: 'theme',
    currencyCode: 'currency_code',
    priceColumns: 'price_columns',
    accentColor: 'accent_color',
    textColor: 'text_color',
    fontFamily: 'font_family',
    showImages: 'show_images',
    showDescriptions: 'show_descriptions',
    pageIntervalSeconds: 'page_interval_seconds',
  };

  const dbUpdates = { updated_at: new Date().toISOString() };

  for (const [camelKey, snakeKey] of Object.entries(fieldMap)) {
    if (updates[camelKey] !== undefined) {
      dbUpdates[snakeKey] = updates[camelKey];
    }
  }

  const { data, error } = await supabase
    .from('menu_boards')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to update menu board', { error });
    throw error;
  }

  return data;
}

/**
 * Delete a menu board (cascades to categories and items)
 * @param {string} id - Menu board UUID
 * @returns {Promise<void>}
 */
export async function deleteMenuBoard(id) {
  if (!id) {
    throw new Error('Menu board ID is required');
  }

  const { error } = await supabase
    .from('menu_boards')
    .delete()
    .eq('id', id);

  if (error) {
    _logger.error('Failed to delete menu board', { error });
    throw error;
  }
}

// ============================================================================
// CATEGORY CRUD (MENU-01)
// ============================================================================

/**
 * Create a new category within a menu board
 * @param {string} menuBoardId - Parent menu board UUID
 * @param {Object} params - Category properties
 * @param {string} params.name - Category name
 * @param {string} [params.description] - Category description
 * @returns {Promise<Object>} Created category
 */
export async function createCategory(menuBoardId, { name, description }) {
  if (!menuBoardId) {
    throw new Error('Menu board ID is required');
  }
  if (!name?.trim()) {
    throw new Error('Category name is required');
  }

  // Get max order_index for the board
  const { data: maxData } = await supabase
    .from('menu_categories')
    .select('order_index')
    .eq('menu_board_id', menuBoardId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const orderIndex = (maxData?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      menu_board_id: menuBoardId,
      name: name.trim(),
      description: description?.trim() || null,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) {
    _logger.error('Failed to create category', { error });
    throw error;
  }

  return data;
}

/**
 * Update a category
 * @param {string} id - Category UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated category
 */
export async function updateCategory(id, updates) {
  if (!id) {
    throw new Error('Category ID is required');
  }

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible;

  if (Object.keys(dbUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabase
    .from('menu_categories')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to update category', { error });
    throw error;
  }

  return data;
}

/**
 * Delete a category (cascades to items)
 * @param {string} id - Category UUID
 * @returns {Promise<void>}
 */
export async function deleteCategory(id) {
  if (!id) {
    throw new Error('Category ID is required');
  }

  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id);

  if (error) {
    _logger.error('Failed to delete category', { error });
    throw error;
  }
}

// ============================================================================
// ITEM CRUD (MENU-01, MENU-04, MENU-06)
// ============================================================================

/**
 * Create a new menu item within a category
 * @param {string} categoryId - Parent category UUID
 * @param {string} menuBoardId - Parent menu board UUID (denormalized for Realtime)
 * @param {Object} params - Item properties
 * @param {string} params.name - Item name
 * @param {string} [params.description] - Item description
 * @param {Object} [params.prices] - Price values keyed by price column key
 * @param {string} [params.imageUrl] - Item image URL
 * @param {string[]} [params.dietaryTags] - Array of dietary tag keys
 * @returns {Promise<Object>} Created item
 */
export async function createMenuItem(categoryId, menuBoardId, { name, description, prices, imageUrl, dietaryTags }) {
  if (!categoryId) {
    throw new Error('Category ID is required');
  }
  if (!menuBoardId) {
    throw new Error('Menu board ID is required');
  }
  if (!name?.trim()) {
    throw new Error('Item name is required');
  }

  // Get max order_index for the category
  const { data: maxData } = await supabase
    .from('menu_items')
    .select('order_index')
    .eq('category_id', categoryId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const orderIndex = (maxData?.order_index ?? -1) + 1;

  const insertData = {
    category_id: categoryId,
    menu_board_id: menuBoardId,
    name: name.trim(),
    description: description?.trim() || null,
    order_index: orderIndex,
  };

  if (prices !== undefined) insertData.prices = prices;
  if (imageUrl !== undefined) insertData.image_url = imageUrl;
  if (dietaryTags !== undefined) insertData.dietary_tags = dietaryTags;

  const { data, error } = await supabase
    .from('menu_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to create menu item', { error });
    throw error;
  }

  return data;
}

/**
 * Update a menu item
 * @param {string} id - Item UUID
 * @param {Object} updates - Fields to update (camelCase)
 * @returns {Promise<Object>} Updated item
 */
export async function updateMenuItem(id, updates) {
  if (!id) {
    throw new Error('Item ID is required');
  }

  const dbUpdates = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.prices !== undefined) dbUpdates.prices = updates.prices;
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
  if (updates.dietaryTags !== undefined) dbUpdates.dietary_tags = updates.dietaryTags;
  if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

  if (Object.keys(dbUpdates).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to update menu item', { error });
    throw error;
  }

  return data;
}

/**
 * Delete a menu item
 * @param {string} id - Item UUID
 * @returns {Promise<void>}
 */
export async function deleteMenuItem(id) {
  if (!id) {
    throw new Error('Item ID is required');
  }

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) {
    _logger.error('Failed to delete menu item', { error });
    throw error;
  }
}

/**
 * Toggle item availability without deleting (MENU-06)
 * @param {string} itemId - Item UUID
 * @param {boolean} isAvailable - New availability state
 * @returns {Promise<Object>} Updated item
 */
export async function toggleItemAvailability(itemId, isAvailable) {
  if (!itemId) {
    throw new Error('Item ID is required');
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    _logger.error('Failed to toggle item availability', { error });
    throw error;
  }

  return data;
}

// ============================================================================
// REORDER FUNCTIONS (MENU-02)
// ============================================================================

/**
 * Reorder categories within a menu board
 * @param {Array<{id: string, orderIndex: number}>} updates - New order positions
 * @returns {Promise<void>}
 */
export async function reorderCategories(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error('Updates array is required');
  }

  const results = await Promise.all(
    updates.map(({ id, orderIndex }) =>
      supabase
        .from('menu_categories')
        .update({ order_index: orderIndex })
        .eq('id', id)
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    _logger.error('Failed to reorder categories', { errors });
    throw new Error('Failed to reorder some categories');
  }
}

/**
 * Reorder items within a category
 * @param {Array<{id: string, orderIndex: number}>} updates - New order positions
 * @returns {Promise<void>}
 */
export async function reorderItems(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error('Updates array is required');
  }

  const results = await Promise.all(
    updates.map(({ id, orderIndex }) =>
      supabase
        .from('menu_items')
        .update({ order_index: orderIndex })
        .eq('id', id)
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    _logger.error('Failed to reorder items', { errors });
    throw new Error('Failed to reorder some items');
  }
}

// ============================================================================
// REALTIME SUBSCRIPTION (MENU-07)
// ============================================================================

/**
 * Subscribe to realtime updates for a menu board
 * Uses a SINGLE channel with two .on() calls to reduce connection overhead
 * @param {string} menuBoardId - Menu board UUID
 * @param {Function} onUpdate - Callback with {table, eventType, new, old} payload
 * @returns {{unsubscribe: () => Promise<void>}} Subscription handle
 */
export function subscribeToMenuBoard(menuBoardId, onUpdate) {
  if (!menuBoardId) {
    throw new Error('Menu board ID is required');
  }
  if (typeof onUpdate !== 'function') {
    throw new Error('onUpdate callback is required');
  }

  const channel = supabase
    .channel(`menu-board:${menuBoardId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'menu_items',
        filter: `menu_board_id=eq.${menuBoardId}`,
      },
      (payload) => {
        onUpdate({ table: 'menu_items', ...payload });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'menu_categories',
        filter: `menu_board_id=eq.${menuBoardId}`,
      },
      (payload) => {
        onUpdate({ table: 'menu_categories', ...payload });
      }
    )
    .subscribe();

  return {
    unsubscribe: async () => {
      await supabase.removeChannel(channel);
    },
  };
}
