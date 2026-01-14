import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { createLogger } from '../utils/logger';
import { startTrial } from '../services/billingService';

const log = createLogger('AuthContext');

// Auth context for user authentication and profile management
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Helper to add timeout to async operations
    const withTimeout = (promise, timeoutMs, operation) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    };

    // Initialize auth state
    const initAuth = async () => {
      try {
        // Get initial session with timeout
        log.debug('Getting session...');
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'getSession'
        );

        if (error) {
          log.error('Session error', { error: error.message });
        } else {
          log.debug('Session retrieved', { hasSession: !!session });
        }

        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id, session.user.email);
        }
      } catch (error) {
        log.error('Init error', { error: error.message });
        // On timeout or error, clear any stale session and allow login
        if (error.message.includes('timed out')) {
          log.warn('Auth timed out - clearing stale session');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            // Ignore signOut errors
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
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
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]); // Add fetchUserProfile to dependencies

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
    isSuperAdmin,
    isAdmin,
    isClient,
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
