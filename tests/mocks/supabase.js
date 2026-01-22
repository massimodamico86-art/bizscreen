/**
 * Centralized Supabase Mock for Player Tests
 *
 * Provides configurable mocks for Supabase RPC calls used by Player.jsx.
 * Supports:
 * - get_resolved_player_content
 * - get_resolved_player_content_by_otp
 * - player_heartbeat
 * - get_pending_device_command
 */
import { vi } from 'vitest';

// Default responses for RPC calls
const DEFAULT_RESPONSES = {
  get_resolved_player_content: {
    mode: 'playlist',
    source: 'playlist',
    screen: {
      id: 'screen-123',
      name: 'Test Screen',
      tenant_id: 'tenant-123',
      screen_group_id: 'group-123',
      location_id: 'location-123'
    },
    playlist: {
      id: 'playlist-123',
      name: 'Test Playlist',
      shuffle: false,
      defaultDuration: 10
    },
    items: [
      {
        id: 'item-1',
        position: 0,
        type: 'media',
        mediaType: 'image',
        url: 'https://example.com/image1.jpg',
        name: 'Image 1',
        duration: 10
      },
      {
        id: 'item-2',
        position: 1,
        type: 'media',
        mediaType: 'image',
        url: 'https://example.com/image2.jpg',
        name: 'Image 2',
        duration: 10
      }
    ]
  },
  get_resolved_player_content_by_otp: {
    screenId: 'screen-123',
    mode: 'playlist',
    source: 'playlist',
    screen: {
      id: 'screen-123',
      name: 'Test Screen',
      tenant_id: 'tenant-123'
    },
    playlist: {
      id: 'playlist-123',
      name: 'Test Playlist'
    },
    items: []
  },
  player_heartbeat: { success: true },
  get_pending_device_command: null
};

// Store for configured responses
let rpcResponses = {};

// Store for configured errors
let rpcErrors = {};

// Store for call tracking
let rpcCallHistory = {};

/**
 * Reset all mock state
 */
export function resetMockState() {
  rpcResponses = {};
  rpcErrors = {};
  rpcCallHistory = {};
}

/**
 * Configure RPC response for a specific function
 * @param {string} rpcName - RPC function name
 * @param {any} response - Response data to return
 */
export function mockRpc(rpcName, response) {
  rpcResponses[rpcName] = response;
}

/**
 * Configure RPC to throw an error
 * @param {string} rpcName - RPC function name
 * @param {Error|string} error - Error to throw (string will be converted to Error)
 */
export function mockRpcError(rpcName, error) {
  rpcErrors[rpcName] = typeof error === 'string' ? new Error(error) : error;
}

/**
 * Get the last call arguments for an RPC function
 * @param {string} rpcName - RPC function name
 * @returns {object|null} Last call arguments or null if never called
 */
export function getLastRpcCall(rpcName) {
  const history = rpcCallHistory[rpcName];
  if (!history || history.length === 0) return null;
  return history[history.length - 1];
}

/**
 * Get all calls for an RPC function
 * @param {string} rpcName - RPC function name
 * @returns {Array} Array of call arguments
 */
export function getAllRpcCalls(rpcName) {
  return rpcCallHistory[rpcName] || [];
}

/**
 * Clear call history for a specific RPC or all RPCs
 * @param {string} [rpcName] - Optional RPC name to clear
 */
export function clearRpcCallHistory(rpcName) {
  if (rpcName) {
    rpcCallHistory[rpcName] = [];
  } else {
    rpcCallHistory = {};
  }
}

/**
 * Create a fresh mock Supabase client
 * @returns {object} Mock Supabase client
 */
export function createMockSupabase() {
  // Reset state for fresh instance
  resetMockState();

  const mockRpcFn = vi.fn().mockImplementation(async (rpcName, params) => {
    // Track the call
    if (!rpcCallHistory[rpcName]) {
      rpcCallHistory[rpcName] = [];
    }
    rpcCallHistory[rpcName].push({ rpcName, params, timestamp: Date.now() });

    // Check for configured error
    if (rpcErrors[rpcName]) {
      return { data: null, error: rpcErrors[rpcName] };
    }

    // Get response (configured or default)
    const response = rpcName in rpcResponses
      ? rpcResponses[rpcName]
      : DEFAULT_RESPONSES[rpcName];

    // Return in Supabase format
    if (response === undefined) {
      return { data: null, error: new Error(`Unknown RPC: ${rpcName}`) };
    }

    return { data: response, error: null };
  });

  // Mock auth methods
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } }
    })
  };

  // Mock query builder for from() calls
  const createQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      and: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn((resolve) => resolve({ data: [], error: null }))
    };
    return builder;
  };

  // Mock storage
  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' }
      }),
      list: vi.fn().mockResolvedValue({ data: [], error: null })
    })
  };

  // Mock realtime channel
  const mockChannel = vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  });

  const mockClient = {
    rpc: mockRpcFn,
    from: vi.fn().mockReturnValue(createQueryBuilder()),
    auth: mockAuth,
    storage: mockStorage,
    channel: mockChannel,
    removeChannel: vi.fn()
  };

  return mockClient;
}

/**
 * Mock auth helper - configure auth state
 * @param {object} config - Auth configuration
 * @param {object} [config.user] - User object to return
 * @param {object} [config.session] - Session object to return
 * @param {Error} [config.error] - Error to return
 */
export function mockAuth(config = {}) {
  // This is a helper to configure auth state
  // Actual implementation depends on test needs
  return {
    user: config.user || null,
    session: config.session || null,
    error: config.error || null
  };
}

// Export for vi.mock usage
export const supabase = createMockSupabase();
