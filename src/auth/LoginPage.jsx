/**
 * LoginPage - User login form with MFA support and SSO domain auto-detection
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Shield,
  Info,
} from 'lucide-react';
import { signIn } from '../services/authService';
import { isMfaRequired } from '../services/mfaService';
import { lookupSSOByDomain, signInWithSSO } from '../services/ssoService';
import Seo from '../components/Seo';
import AuthLayout from './AuthLayout';
import MfaVerification from '../components/security/MfaVerification';

/**
 *
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMfaVerification, setShowMfaVerification] = useState(false);

  // SSO detection state
  const [ssoDetected, setSsoDetected] = useState(false);
  const [ssoProviderName, setSsoProviderName] = useState('');
  const [ssoEnforced, setSsoEnforced] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(false);

  // Dev bypass: auto-redirect to app when auth bypass is active
  const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
  useEffect(() => {
    if (devBypass) {
      navigate('/app');
    }
  }, [devBypass, navigate]);

  /**
   * Detect SSO provider when user leaves the email field.
   * Only runs when devBypass is false.
   */
  const handleEmailBlur = async () => {
    if (devBypass) return;

    const domain = email.split('@')[1];
    if (!domain) {
      setSsoDetected(false);
      setSsoProviderName('');
      setSsoEnforced(false);
      return;
    }

    try {
      const data = await lookupSSOByDomain(domain);
      if (data.found) {
        setSsoDetected(true);
        setSsoProviderName(data.provider_name || 'SSO');
        setSsoEnforced(data.enforce_sso || false);

        // If SSO is enforced, auto-redirect immediately
        if (data.enforce_sso) {
          await handleSSOLogin();
        }
      } else {
        setSsoDetected(false);
        setSsoProviderName('');
        setSsoEnforced(false);
      }
    } catch (_err) {
      // Silently fail -- SSO detection is best-effort
      setSsoDetected(false);
      setSsoProviderName('');
      setSsoEnforced(false);
    }
  };

  /**
   * Redirect user to IdP via Supabase signInWithSSO.
   */
  const handleSSOLogin = async () => {
    const domain = email.split('@')[1];
    if (!domain) {
      setError('Please enter a valid email address');
      return;
    }

    setSsoLoading(true);
    setError('');

    try {
      const result = await signInWithSSO(domain);
      if (result.url) {
        window.location.href = result.url;
      } else if (result.error) {
        setError(result.error);
        setSsoLoading(false);
      }
    } catch (_err) {
      setError('An unexpected error occurred during SSO sign-in. Please try again.');
      setSsoLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // If SSO is enforced, redirect to SSO instead of password login
    if (ssoEnforced) {
      await handleSSOLogin();
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { user, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
        return;
      }

      if (user) {
        // Check if MFA is required
        const mfaRequired = await isMfaRequired();
        if (mfaRequired) {
          setShowMfaVerification(true);
        } else {
          // Redirect to app
          navigate('/app');
        }
      }
    } catch (_err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSuccess = () => {
    navigate('/app');
  };

  const handleMfaCancel = () => {
    setShowMfaVerification(false);
    // Sign out since MFA wasn't completed
    setEmail('');
    setPassword('');
  };

  // Show MFA verification if required
  if (showMfaVerification) {
    return (
      <>
        <Seo pageKey="login" />
        <AuthLayout
          title="Verify Your Identity"
          subtitle="Enter your authentication code to continue"
        >
          <MfaVerification
            onSuccess={handleMfaSuccess}
            onCancel={handleMfaCancel}
          />
        </AuthLayout>
      </>
    );
  }

  const allDisabled = loading || ssoLoading;

  return (
    <>
      <Seo pageKey="login" />
      <AuthLayout
        title="Welcome back"
        subtitle="Log in to your BizScreen account"
      >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="Email address"
              required
              disabled={allDisabled}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>

        {/* SSO Detection Banner (non-enforced) */}
        {ssoDetected && !ssoEnforced && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                SSO available via <strong>{ssoProviderName}</strong>. You can sign in with SSO or use your password.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSSOLogin}
              disabled={allDisabled}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2 px-4 border border-blue-300 bg-white text-blue-700 font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ssoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to {ssoProviderName}...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Sign in with {ssoProviderName}
                </>
              )}
            </button>
          </div>
        )}

        {/* SSO Enforced Banner */}
        {ssoEnforced && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Your organization requires SSO login via <strong>{ssoProviderName}</strong>. Password login is disabled.
              </p>
            </div>
          </div>
        )}

        {/* Password -- hidden when SSO is enforced */}
        {!ssoEnforced && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                to="/auth/reset-password"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={allDisabled}
                className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={allDisabled}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ssoLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Redirecting to {ssoProviderName}...
            </>
          ) : loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Signing in...
            </>
          ) : ssoEnforced ? (
            <>
              <Shield className="w-5 h-5" />
              Continue with {ssoProviderName}
            </>
          ) : (
            'Sign in'
          )}
        </button>

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <Link
          to="/auth/signup"
          className="block w-full text-center py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Create an account
        </Link>
      </form>
    </AuthLayout>
    </>
  );
}
