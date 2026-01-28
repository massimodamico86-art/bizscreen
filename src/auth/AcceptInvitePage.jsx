/**
 * AcceptInvitePage - Accept team invitation
 *
 * Flow:
 * 1. Validate token from URL
 * 2. Show invitation details
 * 3. If logged in: Accept and redirect to app
 * 4. If not logged in: Redirect to signup with token preserved
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { acceptInvite, getInviteDetails, getRoleDisplayName } from '../services/teamService';

const ROLE_ICONS = {
  owner: '👑',
  manager: '🛡️',
  editor: '✏️',
  viewer: '👁️',
};

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteDetails, setInviteDetails] = useState(null);

  // Fetch invite details on mount
  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }

      try {
        const result = await getInviteDetails(token);

        if (result.error) {
          setError(result.error);
        } else {
          setInviteDetails(result.data);
        }
      } catch (err) {
        setError('Failed to load invitation details.');
      } finally {
        setLoading(false);
      }
    }

    loadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to signup with return URL
      navigate(`/auth/signup?returnTo=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`);
      return;
    }

    try {
      setAccepting(true);
      const result = await acceptInvite(token);

      if (result.success) {
        setSuccess(true);
        // Redirect to app after a short delay
        setTimeout(() => {
          navigate('/app');
        }, 2000);
      } else {
        setError(result.error || 'Failed to accept invitation.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setAccepting(false);
    }
  };

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <AuthLayout title="Team Invitation" subtitle="Loading invitation...">
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </AuthLayout>
    );
  }

  // Show error if no token or invalid
  if (error && !inviteDetails) {
    return (
      <AuthLayout title="Invitation Error" subtitle="Something went wrong">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowRight className="w-4 h-4" />
              Go to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Show success message
  if (success) {
    return (
      <AuthLayout title="Welcome to the team!" subtitle="Invitation accepted">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="text-gray-600 mb-2">
              You've joined <strong>{inviteDetails?.tenantName}</strong>!
            </p>
            <p className="text-gray-500 text-sm">Redirecting to the app...</p>
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Team Invitation"
      subtitle={`You've been invited to join ${inviteDetails?.tenantName || 'a team'}`}
    >
      <div className="space-y-6">
        {/* Invitation Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{inviteDetails?.tenantName}</h3>
              <p className="text-sm text-gray-600">is inviting you to join their team</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
            <span className="text-2xl">{ROLE_ICONS[inviteDetails?.role]}</span>
            <div>
              <p className="font-medium text-gray-900">
                {getRoleDisplayName(inviteDetails?.role)}
              </p>
              <p className="text-sm text-gray-500">
                {inviteDetails?.role === 'manager' && 'Manage locations, screens, and content'}
                {inviteDetails?.role === 'editor' && 'Create and edit content'}
                {inviteDetails?.role === 'viewer' && 'View-only access'}
              </p>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* User info or login prompt */}
        {user ? (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Accepting as:</p>
            <p className="font-medium text-gray-900">{user.email}</p>
            {inviteDetails?.email && inviteDetails.email !== user.email && (
              <p className="text-sm text-amber-600 mt-2">
                Note: This invitation was sent to {inviteDetails.email}
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You need to be logged in to accept this invitation.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3">
          {user ? (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Accept Invitation
                </>
              )}
            </button>
          ) : (
            <>
              <Link
                to={`/auth/signup?returnTo=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Create Account & Join
              </Link>
              <Link
                to={`/auth/login?returnTo=${encodeURIComponent(`/auth/accept-invite?token=${token}`)}`}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Sign in to existing account
              </Link>
            </>
          )}

          <Link
            to="/"
            className="block text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Decline invitation
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
