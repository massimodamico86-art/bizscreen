/**
 * AuthContext Characterization Tests
 *
 * Tests document the CURRENT contract of useAuth():
 *   { user, userProfile, loading,
 *     isSuperAdmin, isAdmin, isClient,
 *     signUp, signIn, signOut, resetPassword, updatePassword,
 *     signInWithGoogle, resendVerificationEmail, refreshProfile }
 *
 * Removed in Packet 1: previous "Retry State Machine" block tested fields
 *   (authStatus, retryCount, lastError, isRetrying, hasAuthError, retryAuth)
 * that the current AuthContext does NOT expose. Those tests were speculative
 * characterization of a refactor that never landed; they were not failing
 * because of a product bug, they were failing because they described a
 * contract the code never had. If/when the retry state machine ships,
 * re-introduce those assertions then.
 *
 * Timeout block aligned to actual behavior: on a timed-out getSession the
 * provider does call supabase.auth.signOut() to clear stale session
 * (see AuthContext.jsx initAuth catch branch). Earlier version of the
 * test asserted the opposite for a planned non-signOut behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Mock supabase — factory must not reference outer variables (hoisted)
vi.mock('../../../src/supabase', () => {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn(() => profileQuery),
      _profileQuery: profileQuery,
    },
  };
});

vi.mock('../../../src/services/billingService', () => ({
  startTrial: vi.fn().mockResolvedValue({ success: true }),
}));

// Import after mocks
import { AuthProvider, useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/supabase';

// Shorthand accessors
const getSession = () => supabase.auth.getSession;
const onAuthStateChange = () => supabase.auth.onAuthStateChange;
const profileSingle = () => supabase._profileQuery.single;

// Helper component to read auth state — only reads fields the current
// useAuth() actually exposes.
function AuthStateDisplay() {
  const { user, userProfile, loading } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.id : 'null'}</div>
      <div data-testid="profile">{JSON.stringify(userProfile)}</div>
    </div>
  );
}

describe('AuthContext - PGRST116 Error Handling (characterization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('sets userProfile to error object with errorCode PGRST116 when profile not found', async () => {
    getSession().mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
      error: null,
    });
    profileSingle().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      const profile = JSON.parse(screen.getByTestId('profile').textContent);
      expect(profile).toMatchObject({
        error: true,
        errorCode: 'PGRST116',
      });
    });
  });

  it('includes human-readable error message for PGRST116', async () => {
    getSession().mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
      error: null,
    });
    profileSingle().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      const profile = JSON.parse(screen.getByTestId('profile').textContent);
      expect(profile.errorMessage).toContain('not created properly');
    });
  });

  it('sets error with different message for non-PGRST116 errors', async () => {
    getSession().mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'test@test.com' } } },
      error: null,
    });
    profileSingle().mockResolvedValue({
      data: null,
      error: { code: 'PGRST301', message: 'RLS denied' },
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      const profile = JSON.parse(screen.getByTestId('profile').textContent);
      expect(profile.error).toBe(true);
      expect(profile.errorMessage).toContain('RLS denied');
      expect(profile.errorCode).toBe('PGRST301');
    });
  });

  it('sets userProfile to null when no user in session', async () => {
    getSession().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('profile').textContent).toBe('null');
  });
});

describe('AuthContext - Timeout Behavior (characterization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls signOut to clear stale session when getSession reports a timeout', async () => {
    // Current AuthContext.initAuth catch branch: when the wrapped getSession
    // promise rejects with a message containing "timed out", it calls
    // supabase.auth.signOut() to clear any stale session. Mirror that by
    // rejecting with a fake-but-correctly-shaped timeout error.
    getSession().mockRejectedValue(new Error('getSession timed out after 10000ms'));

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('sets user to null after non-timeout error', async () => {
    // Non-timeout errors don't trigger signOut — they fail silently
    getSession().mockRejectedValue(new Error('Connection refused'));

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('does not call signOut for non-timeout errors', async () => {
    getSession().mockRejectedValue(new Error('Network failure'));

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});

describe('AuthContext - Successful Authentication (characterization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('sets user and profile on successful session', async () => {
    getSession().mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com' } } },
      error: null,
    });
    profileSingle().mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', role: 'client', full_name: 'Test User' },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('u1');
    const profile = JSON.parse(screen.getByTestId('profile').textContent);
    expect(profile.role).toBe('client');
    expect(profile.full_name).toBe('Test User');
  });

  it('sets user to null when session has no user', async () => {
    getSession().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('loading starts true and becomes false after init', async () => {
    getSession().mockResolvedValue({
      data: { session: null },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});

describe('AuthContext - Auth State Change Listener (characterization)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to auth state changes on mount', async () => {
    getSession().mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });

    render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    const mockUnsub = vi.fn();
    getSession().mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsub } },
    });

    const { unmount } = render(
      <AuthProvider>
        <AuthStateDisplay />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    unmount();
    expect(mockUnsub).toHaveBeenCalled();
  });
});

describe('AuthContext - Exposed Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onAuthStateChange().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('exposes the expected fields and methods', async () => {
    getSession().mockResolvedValue({ data: { session: null }, error: null });

    let captured;
    function Capture() {
      captured = useAuth();
      return null;
    }

    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(captured.loading).toBe(false);
    });

    // State fields
    expect(captured).toHaveProperty('user');
    expect(captured).toHaveProperty('userProfile');
    expect(captured).toHaveProperty('loading');
    // Role helpers
    expect(captured).toHaveProperty('isSuperAdmin');
    expect(captured).toHaveProperty('isAdmin');
    expect(captured).toHaveProperty('isClient');
    // Auth methods
    expect(typeof captured.signUp).toBe('function');
    expect(typeof captured.signIn).toBe('function');
    expect(typeof captured.signOut).toBe('function');
    expect(typeof captured.resetPassword).toBe('function');
    expect(typeof captured.updatePassword).toBe('function');
    expect(typeof captured.signInWithGoogle).toBe('function');
    expect(typeof captured.resendVerificationEmail).toBe('function');
    expect(typeof captured.refreshProfile).toBe('function');
  });
});
