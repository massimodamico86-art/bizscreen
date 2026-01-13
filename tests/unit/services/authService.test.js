/**
 * Auth Service Unit Tests
 * Phase 7: Tests for auth service utilities and functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
      resend: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isEmailConfirmationPending', () => {
    it('returns false for null user', async () => {
      const { isEmailConfirmationPending } = await import('../../../src/services/authService');
      expect(isEmailConfirmationPending(null)).toBe(false);
    });

    it('returns false for undefined user', async () => {
      const { isEmailConfirmationPending } = await import('../../../src/services/authService');
      expect(isEmailConfirmationPending(undefined)).toBe(false);
    });

    it('returns truthy when email_confirmed_at is null and confirmation_sent_at exists', async () => {
      const { isEmailConfirmationPending } = await import('../../../src/services/authService');
      const user = {
        email_confirmed_at: null,
        confirmation_sent_at: '2024-01-01T00:00:00Z',
      };
      expect(isEmailConfirmationPending(user)).toBeTruthy();
    });

    it('returns falsy when email is confirmed', async () => {
      const { isEmailConfirmationPending } = await import('../../../src/services/authService');
      const user = {
        email_confirmed_at: '2024-01-01T12:00:00Z',
        confirmation_sent_at: '2024-01-01T00:00:00Z',
      };
      expect(isEmailConfirmationPending(user)).toBeFalsy();
    });

    it('returns falsy when no confirmation was sent', async () => {
      const { isEmailConfirmationPending } = await import('../../../src/services/authService');
      const user = {
        email_confirmed_at: null,
        confirmation_sent_at: null,
      };
      expect(isEmailConfirmationPending(user)).toBeFalsy();
    });
  });

  describe('signIn', () => {
    it('returns user on successful sign in', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { signIn } = await import('../../../src/services/authService');
      const result = await signIn('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('returns error on failed sign in', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      const { signIn } = await import('../../../src/services/authService');
      const result = await signIn('test@example.com', 'wrongpassword');

      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('returns no error on successful sign out', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      const { signOut } = await import('../../../src/services/authService');
      const result = await signOut();

      expect(result.error).toBeNull();
    });

    it('returns error on failed sign out', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      const { signOut } = await import('../../../src/services/authService');
      const result = await signOut();

      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('requestPasswordReset', () => {
    it('returns success on valid email', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

      const { requestPasswordReset } = await import('../../../src/services/authService');
      const result = await requestPasswordReset('test@example.com');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns error on invalid email', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        error: { message: 'User not found' },
      });

      const { requestPasswordReset } = await import('../../../src/services/authService');
      const result = await requestPasswordReset('notfound@example.com');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('updatePassword', () => {
    it('returns success on valid password update', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.updateUser.mockResolvedValueOnce({ error: null });

      const { updatePassword } = await import('../../../src/services/authService');
      const result = await updatePassword('newPassword123');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns error on failed password update', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.updateUser.mockResolvedValueOnce({
        error: { message: 'Password too weak' },
      });

      const { updatePassword } = await import('../../../src/services/authService');
      const result = await updatePassword('weak');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password too weak');
    });
  });

  describe('getSession', () => {
    it('returns session when available', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockSession = { access_token: 'token123', user: { id: 'user-123' } };

      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { getSession } = await import('../../../src/services/authService');
      const result = await getSession();

      expect(result.session).toEqual(mockSession);
      expect(result.error).toBeNull();
    });

    it('returns null session when not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { getSession } = await import('../../../src/services/authService');
      const result = await getSession();

      expect(result.session).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('returns user when authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { getCurrentUser } = await import('../../../src/services/authService');
      const result = await getCurrentUser();

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeNull();
    });

    it('returns null user when not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { getCurrentUser } = await import('../../../src/services/authService');
      const result = await getCurrentUser();

      expect(result.user).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('API function exports', () => {
    it('exports all required auth functions', async () => {
      const authService = await import('../../../src/services/authService');

      expect(typeof authService.signUp).toBe('function');
      expect(typeof authService.signIn).toBe('function');
      expect(typeof authService.signOut).toBe('function');
      expect(typeof authService.requestPasswordReset).toBe('function');
      expect(typeof authService.updatePassword).toBe('function');
      expect(typeof authService.getSession).toBe('function');
      expect(typeof authService.getCurrentUser).toBe('function');
      expect(typeof authService.isEmailConfirmationPending).toBe('function');
      expect(typeof authService.resendConfirmationEmail).toBe('function');
    });
  });
});
