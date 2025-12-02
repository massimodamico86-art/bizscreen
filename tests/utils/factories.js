/**
 * Test Data Factories
 *
 * Reusable factory functions for creating test data.
 * Use these across unit, integration, and E2E tests.
 */

/**
 * Generate a unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a UUID-like string for testing
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create a test user/profile
 */
export function createTestUser(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    email: overrides.email || `test-${id.substr(0, 8)}@example.com`,
    full_name: overrides.full_name || 'Test User',
    role: overrides.role || 'client',
    subscription_tier: overrides.subscription_tier || 'starter',
    business_name: overrides.business_name || 'Test Business',
    max_screens: overrides.max_screens || 5,
    max_playlists: overrides.max_playlists || 10,
    max_storage_mb: overrides.max_storage_mb || 1000,
    is_reseller: overrides.is_reseller || false,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test tenant (same as user but for tenant context)
 */
export function createTestTenant(overrides = {}) {
  return createTestUser({
    role: 'client',
    ...overrides
  });
}

/**
 * Create a test super admin
 */
export function createTestSuperAdmin(overrides = {}) {
  return createTestUser({
    role: 'super_admin',
    full_name: 'Super Admin',
    ...overrides
  });
}

/**
 * Create a test screen
 */
export function createTestScreen(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Screen ${id.substr(0, 8)}`,
    description: overrides.description || null,
    location: overrides.location || null,
    status: overrides.status || 'offline',
    pairing_code: overrides.pairing_code || null,
    device_id: overrides.device_id || null,
    playlist_id: overrides.playlist_id || null,
    layout_id: overrides.layout_id || null,
    schedule_id: overrides.schedule_id || null,
    resolution: overrides.resolution || '1920x1080',
    orientation: overrides.orientation || 'landscape',
    last_seen_at: overrides.last_seen_at || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test media item
 */
export function createTestMedia(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Media ${id.substr(0, 8)}`,
    type: overrides.type || 'image',
    url: overrides.url || `https://example.com/media/${id}.jpg`,
    thumbnail_url: overrides.thumbnail_url || null,
    file_size: overrides.file_size || 1024 * 1024,
    mime_type: overrides.mime_type || 'image/jpeg',
    duration: overrides.duration || null,
    width: overrides.width || 1920,
    height: overrides.height || 1080,
    metadata: overrides.metadata || {},
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test playlist
 */
export function createTestPlaylist(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Playlist ${id.substr(0, 8)}`,
    description: overrides.description || null,
    is_default: overrides.is_default || false,
    item_count: overrides.item_count || 0,
    total_duration: overrides.total_duration || 0,
    created_at: overrides.created_at || new Date().toISOString(),
    updated_at: overrides.updated_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test playlist with items
 */
export function createTestPlaylistWithMedia(overrides = {}) {
  const ownerId = overrides.owner_id || generateUUID();
  const playlistId = overrides.id || generateUUID();
  const itemCount = overrides.item_count || 3;

  const items = [];
  for (let i = 0; i < itemCount; i++) {
    const media = createTestMedia({
      owner_id: ownerId,
      name: `Media Item ${i + 1}`
    });
    items.push({
      id: generateUUID(),
      playlist_id: playlistId,
      media_id: media.id,
      position: i,
      duration: 10,
      media
    });
  }

  return {
    ...createTestPlaylist({
      id: playlistId,
      owner_id: ownerId,
      item_count: itemCount,
      total_duration: itemCount * 10,
      ...overrides
    }),
    items
  };
}

/**
 * Create a test layout
 */
export function createTestLayout(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Layout ${id.substr(0, 8)}`,
    description: overrides.description || null,
    zones: overrides.zones || [
      {
        id: 'main',
        name: 'Main Zone',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        playlist_id: null
      }
    ],
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test schedule
 */
export function createTestSchedule(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Schedule ${id.substr(0, 8)}`,
    description: overrides.description || null,
    is_default: overrides.is_default || false,
    time_blocks: overrides.time_blocks || [],
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test campaign
 */
export function createTestCampaign(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    owner_id: overrides.owner_id || generateUUID(),
    name: overrides.name || `Test Campaign ${id.substr(0, 8)}`,
    description: overrides.description || null,
    status: overrides.status || 'draft',
    priority: overrides.priority || 10,
    content_type: overrides.content_type || 'playlist',
    playlist_id: overrides.playlist_id || null,
    layout_id: overrides.layout_id || null,
    start_date: overrides.start_date || new Date().toISOString(),
    end_date: overrides.end_date || null,
    screen_ids: overrides.screen_ids || [],
    trigger_type: overrides.trigger_type || 'scheduled',
    trigger_config: overrides.trigger_config || {},
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test reseller account
 */
export function createTestResellerAccount(overrides = {}) {
  const id = overrides.id || generateUUID();
  return {
    id,
    user_id: overrides.user_id || generateUUID(),
    company_name: overrides.company_name || 'Test Reseller Co',
    company_email: overrides.company_email || 'reseller@example.com',
    company_phone: overrides.company_phone || '+1234567890',
    status: overrides.status || 'active',
    commission_percent: overrides.commission_percent || 20,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test license
 */
export function createTestLicense(overrides = {}) {
  const id = overrides.id || generateUUID();
  const code = overrides.code || generateLicenseCode();
  return {
    id,
    reseller_id: overrides.reseller_id || generateUUID(),
    code,
    license_type: overrides.license_type || 'standard',
    plan_level: overrides.plan_level || 'starter',
    max_screens: overrides.max_screens || 5,
    status: overrides.status || 'available',
    tenant_id: overrides.tenant_id || null,
    duration_days: overrides.duration_days || 365,
    activated_at: overrides.activated_at || null,
    expires_at: overrides.expires_at || null,
    created_at: overrides.created_at || new Date().toISOString(),
    ...overrides
  };
}

/**
 * Create a test reseller with license
 */
export function createTestResellerAndLicense(overrides = {}) {
  const reseller = createTestResellerAccount(overrides.reseller || {});
  const license = createTestLicense({
    reseller_id: reseller.id,
    ...(overrides.license || {})
  });

  return { reseller, license };
}

/**
 * Generate a license code in format XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`;
}

/**
 * Create a test billing/subscription status
 */
export function createTestSubscriptionStatus(overrides = {}) {
  return {
    tier: overrides.tier || 'starter',
    status: overrides.status || 'active',
    is_trial: overrides.is_trial || false,
    trial_ends_at: overrides.trial_ends_at || null,
    current_period_end: overrides.current_period_end || null,
    cancel_at_period_end: overrides.cancel_at_period_end || false,
    ...overrides
  };
}

/**
 * Create mock Supabase response
 */
export function createMockSupabaseResponse(data, error = null) {
  return { data, error };
}

/**
 * Create mock API response
 */
export function createMockAPIResponse(body, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body)
  };
}
