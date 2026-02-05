import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { createScopedLogger } from '../services/loggingService.js';
import { startTrial } from '../services/billingService';

const log = createScopedLogger('AuthContext');

// Auth context for user authentication and profile management
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth status for handling timeout/retry states
// 'loading' - initial state, checking session
// 'authenticated' - user is logged in
// 'unauthenticated' - no user session
// 'retrying' - timeout occurred, retrying with backoff
// 'error' - auth check failed after all retries
const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  RETRYING: 'retrying',
  ERROR: 'error',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.LOADING);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);

  /**
   * Fetch user profile from Supabase including role information
   *
   * This function handles profile fetching with built-in error handling and retry logic.
   * It supports skipping unnecessary fetches if the profile is already loaded.
   *
   * @param {string} userId - The UUID of the user to fetch profile for
   * @param {string} userEmail - The user's email address (used for logging)
   * @param {boolean} [skipIfExists=false] - If true, skip fetch if profile already exists in state
   * @param {number} [retryCount=0] - Current retry attempt number (used for logging)
   *
   * @returns {Promise<void>} Updates userProfile state with either:
   *   - Profile data object: {id, email, full_name, role}
   *   - Error object: {error: true, errorMessage: string, errorCode: string}
   *
   * @example
   * // Fetch profile on initial login
   * await fetchUserProfile(user.id, user.email);
   *
   * @example
   * // Skip fetch if profile already loaded
   * await fetchUserProfile(user.id, user.email, true);
   *
   * Error Codes:
   * - PGRST116: Profile not found in database
   * - Other codes: RLS policy violations, network errors, etc.
   */
  const fetchUserProfile = useCallback(async (userId, userEmail, skipIfExists = false, retryCount = 0) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }

    // Skip fetch if profile already exists and skipIfExists is true
    // Note: We check userProfile in the closure, but it's stable due to dependencies
    setUserProfile(prevProfile => {
      if (skipIfExists && prevProfile && !prevProfile.error) {
        log.debug('Skipping profile fetch - already loaded');
        return prevProfile; // Return existing profile
      }
      return prevProfile; // Continue with fetch
    });

    // If skipIfExists and profile exists, return early
    if (skipIfExists) {
      const shouldSkip = await new Promise(resolve => {
        setUserProfile(prevProfile => {
          resolve(prevProfile && !prevProfile.error);
          return prevProfile;
        });
      });
      if (shouldSkip) return;
    }

    try {
      log.debug('Fetching profile', { userId, attempt: retryCount + 1 });

      // Build the query with minimal fields for faster response
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, has_completed_onboarding')
        .eq('id', userId)
        .single();

      if (error) {
        log.error('Profile fetch error', { code: error.code, message: error.message });

        // PGRST116 = no rows returned - profile doesn't exist
        if (error.code === 'PGRST116') {
          log.error('Profile not found', { userId });
          setUserProfile({
            error: true,
            errorMessage: 'Your profile was not created properly. Please contact support.',
            errorCode: error.code
          });
          return;
        }

        // Other errors (RLS, network, etc.)
        setUserProfile({
          error: true,
          errorMessage: `Profile load failed: ${error.message}`,
          errorCode: error.code
        });
        return;
      }

      log.debug('Profile fetched successfully', { id: data?.id, role: data?.role });
      setUserProfile(data);
    } catch (err) {
      log.error('Error fetching user profile', { error: err.message });
      setUserProfile({
        error: true,
        errorMessage: `Unexpected error: ${err.message}`,
        errorCode: err.code
      });
    }
  }, []); // Empty dependencies - function is stable

  useEffect(() => {
    log.debug('Initializing auth');

    let mounted = true;
    let retryTimeoutId = null;

    // Configuration for exponential backoff retry
    const INITIAL_TIMEOUT_MS = 10000; // 10 seconds for first attempt
    const MAX_RETRIES = 3;
    const BACKOFF_BASE_MS = 2000; // 2 seconds
    const BACKOFF_MAX_MS = 30000; // 30 seconds max wait

    // Helper to add timeout to async operations
    const withTimeout = (promise, timeoutMs, operation) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };

    // Calculate backoff delay with jitter
    const getBackoffDelay = (attempt) => {
      const baseDelay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Add 0-1s of jitter
      return Math.min(baseDelay + jitter, BACKOFF_MAX_MS);
    };

    // Initialize auth state with retry support
    const initAuth = async (attempt = 0) => {
      if (!mounted) return;

      try {
        // Update status based on attempt
        if (attempt > 0) {
          setAuthStatus(AUTH_STATUS.RETRYING);
          setRetryCount(attempt);
          log.debug('Retrying auth init', { attempt, maxRetries: MAX_RETRIES });
        } else {
          setAuthStatus(AUTH_STATUS.LOADING);
        }

        // Get initial session with timeout
        log.debug('Getting session...', { attempt });
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          INITIAL_TIMEOUT_MS,
          'getSession'
        );

        if (error) {
          log.error('Session error', { error: error.message, attempt });
          throw error;
        }

        log.debug('Session retrieved', { hasSession: !!session, attempt });

        if (!mounted) return;

        setUser(session?.user ?? null);
        setAuthStatus(session?.user ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.UNAUTHENTICATED);
        setRetryCount(0);
        setLastError(null);

        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        }

        // Success - clear loading state
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        if (!mounted) return;

        const isTimeout = error.message.includes('timed out');

        if (isTimeout && attempt < MAX_RETRIES) {
          // Timeout with retries remaining - schedule retry with exponential backoff
          const delay = getBackoffDelay(attempt);
          log.warn('Auth timeout, scheduling retry', {
            attempt,
            nextAttempt: attempt + 1,
            delayMs: Math.round(delay),
          });

          setAuthStatus(AUTH_STATUS.RETRYING);
          setRetryCount(attempt + 1);
          setLastError(`Connection timeout. Retrying in ${Math.round(delay / 1000)}s...`);

          // Schedule retry - DO NOT sign out, just retry
          retryTimeoutId = setTimeout(() => {
            if (mounted) {
              initAuth(attempt + 1);
            }
          }, delay);

          return; // Don't set loading=false yet, we're retrying
        }

        // All retries exhausted OR non-timeout error
        if (isTimeout) {
          log.error('Auth init failed after all retries', { attempts: attempt + 1 });
          setAuthStatus(AUTH_STATUS.ERROR);
          setLastError('Unable to connect to authentication service. Please check your network and try again.');
        } else {
          log.error('Auth init error', { error: error.message });
          setAuthStatus(AUTH_STATUS.ERROR);
          setLastError(error.message);
        }

        // DO NOT sign out on timeout/error - let user retry manually or wait for network recovery
        // Just set user to null and let them see the login page
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      log.debug('Auth state changed', { event: _event, hasSession: !!session });

      if (!mounted) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        // Skip re-fetching if profile already loaded (unless SIGNED_IN event)
        const skipIfExists = _event !== 'SIGNED_IN';
        await fetchUserProfile(session.user.id, session.user.email, skipIfExists);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]); // Add fetchUserProfile to dependencies

  // Manual retry function for user-initiated retry
  const retryAuth = useCallback(async () => {
    setLoading(true);
    setAuthStatus(AUTH_STATUS.LOADING);
    setRetryCount(0);
    setLastError(null);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setUser(session?.user ?? null);
      setAuthStatus(session?.user ? AUTH_STATUS.AUTHENTICATED : AUTH_STATUS.UNAUTHENTICATED);

      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user.email);
      }
    } catch (error) {
      log.error('Manual retry failed', { error: error.message });
      setAuthStatus(AUTH_STATUS.ERROR);
      setLastError(error.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) throw error;

    // Profile will be automatically created by database trigger (010_auto_create_profiles.sql)
    // The trigger reads full_name from user metadata (raw_user_meta_data->>'full_name')

    // Auto-start trial for new users (14-day starter trial)
    // We don't await this to avoid blocking signup if trial start fails
    if (data?.user) {
      startTrial('starter', 14).then(result => {
        if (result.success) {
          log.debug('Trial started for new user', { trialEndsAt: result.trialEndsAt });
        } else {
          log.debug('Trial start skipped or failed', { error: result.error });
        }
      }).catch(err => {
        // Don't block signup if trial start fails - user can start manually later
        log.debug('Trial start error (non-blocking)', { error: err.message });
      });
    }

    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
    return data;
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) throw new Error('No user email found');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email
    });

    if (error) throw error;
  };

  // Helper functions to check user role
  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAdmin = userProfile?.role === 'admin';
  const isClient = userProfile?.role === 'client';

  const value = {
    user,
    userProfile,
    loading,
    // New auth status and retry state
    authStatus,
    retryCount,
    lastError,
    retryAuth,
    isRetrying: authStatus === AUTH_STATUS.RETRYING,
    hasAuthError: authStatus === AUTH_STATUS.ERROR,
    // Role helpers
    isSuperAdmin,
    isAdmin,
    isClient,
    // Auth actions
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    signInWithGoogle,
    resendVerificationEmail,
    refreshProfile: () => fetchUserProfile(user?.id, user?.email)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
