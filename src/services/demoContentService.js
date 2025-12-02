/**
 * Demo Content Service - Creates sample workspace for new users
 */
import { supabase } from '../supabase';

// Demo placeholder image URLs (using public placeholder services)
const DEMO_IMAGES = {
  welcome: 'https://placehold.co/1920x1080/1e40af/ffffff?text=Welcome+to+BizScreen',
  promo: 'https://placehold.co/1920x1080/dc2626/ffffff?text=Today%27s+Special',
  feature: 'https://placehold.co/1920x1080/059669/ffffff?text=Featured+Content'
};

// Demo web page URL
const DEMO_WEB_URL = 'https://time.is/';

// Demo content names (used for idempotency checks)
const DEMO_NAMES = {
  welcomeImage: 'Welcome Banner',
  promoImage: 'Promo Banner',
  webApp: 'Live Clock Widget',
  playlist: 'Welcome Loop',
  layout: 'Welcome Layout',
  screen: 'Demo Screen'
};

/**
 * Check if demo content already exists for the current user
 * @returns {Promise<{exists: boolean, playlist?: object, layout?: object, screen?: object}>}
 */
export async function checkDemoContentExists() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Check for existing demo playlist
  const { data: existingPlaylist } = await supabase
    .from('playlists')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('name', DEMO_NAMES.playlist)
    .maybeSingle();

  // Check for existing demo layout
  const { data: existingLayout } = await supabase
    .from('layouts')
    .select('id, name')
    .eq('owner_id', user.id)
    .eq('name', DEMO_NAMES.layout)
    .maybeSingle();

  // Check for existing demo screen
  const { data: existingScreen } = await supabase
    .from('tv_devices')
    .select('id, device_name, otp_code')
    .eq('owner_id', user.id)
    .eq('device_name', DEMO_NAMES.screen)
    .maybeSingle();

  const exists = !!(existingPlaylist || existingLayout || existingScreen);

  return {
    exists,
    playlist: existingPlaylist,
    layout: existingLayout,
    screen: existingScreen
  };
}

/**
 * Generate a cryptographically secure random 6-character OTP code
 * Uses Web Crypto API for browser-safe secure randomness
 */
function generateOtpCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomValues[i] % chars.length);
  }
  return code;
}

/**
 * Create demo media assets
 * @param {string} ownerId - The owner's user ID
 * @returns {Promise<{images: object[], clockApp: object}>}
 */
async function createDemoMedia(ownerId) {
  // Create demo images
  const imageInserts = [
    {
      owner_id: ownerId,
      name: DEMO_NAMES.welcomeImage,
      type: 'image',
      url: DEMO_IMAGES.welcome,
      thumbnail_url: DEMO_IMAGES.welcome,
      width: 1920,
      height: 1080
    },
    {
      owner_id: ownerId,
      name: DEMO_NAMES.promoImage,
      type: 'image',
      url: DEMO_IMAGES.promo,
      thumbnail_url: DEMO_IMAGES.promo,
      width: 1920,
      height: 1080
    }
  ];

  const { data: images, error: imageError } = await supabase
    .from('media_assets')
    .insert(imageInserts)
    .select();

  if (imageError) throw imageError;

  // Create clock app
  const { data: clockApp, error: clockError } = await supabase
    .from('media_assets')
    .insert({
      owner_id: ownerId,
      name: DEMO_NAMES.webApp,
      type: 'app',
      url: DEMO_WEB_URL,
      config_json: {
        appType: 'clock',
        clockFormat: '12h',
        showSeconds: true,
        showDate: true,
        backgroundColor: '#1e293b',
        textColor: '#ffffff'
      }
    })
    .select()
    .single();

  if (clockError) throw clockError;

  return { images, clockApp };
}

/**
 * Create demo playlist with items
 * @param {string} ownerId - The owner's user ID
 * @param {object[]} mediaItems - Array of media assets to add to playlist
 * @returns {Promise<object>} The created playlist
 */
async function createDemoPlaylist(ownerId, mediaItems) {
  // Create playlist
  const { data: playlist, error: playlistError } = await supabase
    .from('playlists')
    .insert({
      owner_id: ownerId,
      name: DEMO_NAMES.playlist,
      default_duration: 8,
      transition_effect: 'fade',
      shuffle: false
    })
    .select()
    .single();

  if (playlistError) throw playlistError;

  // Add items to playlist
  const playlistItems = mediaItems.map((item, index) => ({
    playlist_id: playlist.id,
    item_type: 'media',
    item_id: item.id,
    position: index,
    duration: item.type === 'app' ? 0 : 8 // Apps show until next item
  }));

  const { error: itemsError } = await supabase
    .from('playlist_items')
    .insert(playlistItems);

  if (itemsError) throw itemsError;

  return playlist;
}

/**
 * Create demo layout with zones
 * @param {string} ownerId - The owner's user ID
 * @param {string} playlistId - The playlist to assign to main zone
 * @param {string} clockAppId - The clock app to assign to side zone
 * @returns {Promise<object>} The created layout
 */
async function createDemoLayout(ownerId, playlistId, clockAppId) {
  // Create layout
  const { data: layout, error: layoutError } = await supabase
    .from('layouts')
    .insert({
      owner_id: ownerId,
      name: DEMO_NAMES.layout,
      description: 'Demo layout with main content and clock widget'
    })
    .select()
    .single();

  if (layoutError) throw layoutError;

  // Create zones
  const zones = [
    {
      layout_id: layout.id,
      zone_name: 'Main Content',
      x_percent: 0,
      y_percent: 0,
      width_percent: 70,
      height_percent: 100,
      z_index: 1,
      assigned_playlist_id: playlistId
    },
    {
      layout_id: layout.id,
      zone_name: 'Clock Widget',
      x_percent: 70,
      y_percent: 0,
      width_percent: 30,
      height_percent: 100,
      z_index: 2,
      assigned_media_id: clockAppId
    }
  ];

  const { error: zonesError } = await supabase
    .from('layout_zones')
    .insert(zones);

  if (zonesError) throw zonesError;

  return layout;
}

/**
 * Create demo screen
 * @param {string} ownerId - The owner's user ID
 * @param {string} layoutId - The layout to assign (optional)
 * @param {string} playlistId - The playlist to assign as fallback
 * @returns {Promise<object>} The created screen with OTP
 */
async function createDemoScreen(ownerId, layoutId, playlistId) {
  const otpCode = generateOtpCode();

  const { data: screen, error } = await supabase
    .from('tv_devices')
    .insert({
      owner_id: ownerId,
      device_name: DEMO_NAMES.screen,
      otp_code: otpCode,
      assigned_layout_id: layoutId,
      assigned_playlist_id: playlistId
    })
    .select()
    .single();

  if (error) throw error;

  return screen;
}

/**
 * Create a complete demo workspace for the current user
 * Creates sample media, playlist, layout, and screen
 *
 * @returns {Promise<{
 *   mediaCount: number,
 *   playlistId: string,
 *   playlistName: string,
 *   layoutId: string,
 *   layoutName: string,
 *   screenId: string,
 *   screenName: string,
 *   otpCode: string,
 *   alreadyExisted: boolean
 * }>}
 */
export async function createDemoWorkspace() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Check if demo content already exists
  const existing = await checkDemoContentExists();

  if (existing.exists && existing.screen) {
    // Return existing demo content info
    return {
      mediaCount: 0,
      playlistId: existing.playlist?.id || null,
      playlistName: existing.playlist?.name || null,
      layoutId: existing.layout?.id || null,
      layoutName: existing.layout?.name || null,
      screenId: existing.screen.id,
      screenName: existing.screen.device_name,
      otpCode: existing.screen.otp_code,
      alreadyExisted: true
    };
  }

  try {
    // Step 1: Create demo media
    const { images, clockApp } = await createDemoMedia(user.id);
    const allMedia = [...images, clockApp];

    // Step 2: Create demo playlist (with images only, not the clock)
    const playlist = await createDemoPlaylist(user.id, images);

    // Step 3: Create demo layout (with playlist in main zone, clock in side zone)
    const layout = await createDemoLayout(user.id, playlist.id, clockApp.id);

    // Step 4: Create demo screen (assigned to layout, with playlist fallback)
    const screen = await createDemoScreen(user.id, layout.id, playlist.id);

    // Store demo OTP in localStorage for player hint
    localStorage.setItem('lastDemoOtp', screen.otp_code);

    return {
      mediaCount: allMedia.length,
      playlistId: playlist.id,
      playlistName: playlist.name,
      layoutId: layout.id,
      layoutName: layout.name,
      screenId: screen.id,
      screenName: screen.device_name,
      otpCode: screen.otp_code,
      alreadyExisted: false
    };
  } catch (error) {
    console.error('Error creating demo workspace:', error);
    throw new Error('Failed to create demo workspace: ' + error.message);
  }
}

/**
 * Get demo content status for the current user
 * @returns {Promise<{hasDemoContent: boolean, demoScreen: object|null}>}
 */
export async function getDemoContentStatus() {
  const existing = await checkDemoContentExists();

  return {
    hasDemoContent: existing.exists,
    demoPlaylist: existing.playlist || null,
    demoLayout: existing.layout || null,
    demoScreen: existing.screen || null
  };
}
