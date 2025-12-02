/**
 * Test Mocks
 *
 * Mock implementations for Supabase and other external dependencies.
 */
import { vi } from 'vitest';

/**
 * Create a mock Supabase client
 */
export function createMockSupabaseClient() {
  const mockChain = {
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

  // Make the chain thenable
  mockChain.then = vi.fn((resolve) => resolve({ data: [], error: null }));

  const mockClient = {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      })
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/test.jpg' }
        }),
        list: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    }),
    removeChannel: vi.fn()
  };

  return { mockClient, mockChain };
}

/**
 * Create mock for the supabase module
 */
export function mockSupabaseModule() {
  const { mockClient, mockChain } = createMockSupabaseClient();

  vi.mock('../../src/supabase', () => ({
    supabase: mockClient
  }));

  return { mockClient, mockChain };
}

/**
 * Create mock window.localStorage
 */
export function createMockLocalStorage() {
  const store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    key: vi.fn((index) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
}

/**
 * Create mock fetch
 */
export function createMockFetch(responses = {}) {
  return vi.fn().mockImplementation((url, options) => {
    const method = options?.method || 'GET';
    const key = `${method}:${url}`;

    const response = responses[key] || responses[url] || {
      ok: true,
      status: 200,
      json: async () => ({})
    };

    if (typeof response === 'function') {
      return Promise.resolve(response(url, options));
    }

    return Promise.resolve({
      ok: response.status >= 200 && response.status < 300,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      json: async () => response.data || response,
      text: async () => JSON.stringify(response.data || response),
      headers: new Headers(response.headers || {})
    });
  });
}

/**
 * Create mock for Stripe
 */
export function createMockStripe() {
  return {
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_test123' })
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      update: vi.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      cancel: vi.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' })
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ id: 'cs_test123', url: 'https://checkout.stripe.com/test' })
      }
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' })
      }
    },
    webhooks: {
      constructEvent: vi.fn()
    }
  };
}

/**
 * Mock React Router hooks
 */
export function createMockRouter() {
  return {
    useNavigate: vi.fn().mockReturnValue(vi.fn()),
    useLocation: vi.fn().mockReturnValue({ pathname: '/', search: '', hash: '' }),
    useParams: vi.fn().mockReturnValue({}),
    useSearchParams: vi.fn().mockReturnValue([new URLSearchParams(), vi.fn()])
  };
}

/**
 * Create a deferred promise for async testing
 */
export function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(condition, timeout = 5000, interval = 50) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}
