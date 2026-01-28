/**
 * AuthCallbackPage - Handle auth redirects from email links
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useLogger } from '../hooks/useLogger.js';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const logger = useLogger('AuthCallbackPage');
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (type === 'recovery') {
          // Password recovery - redirect to update password page
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
          navigate('/auth/update-password');
          return;
        }

        if (type === 'signup' || type === 'email_change') {
          // Email confirmation
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (error) {
              setStatus('error');
              setMessage('Failed to verify your email. Please try again.');
              return;
            }
          }

          setStatus('success');
          setMessage('Email verified! Redirecting to your dashboard...');

          // Redirect to app after short delay
          setTimeout(() => {
            navigate('/app');
          }, 1500);
          return;
        }

        // Check for error in hash
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || 'An error occurred during verification.');
          return;
        }

        // Default - try to get session and redirect
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          navigate('/app');
        } else {
          navigate('/auth/login');
        }
      } catch (error) {
        logger.error('Auth callback error', { error });
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <AuthLayout>
      <div className="text-center py-8">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-gray-900 font-medium">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <p className="text-gray-900 font-medium mb-4">{message}</p>
            <button
              onClick={() => navigate('/auth/login')}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to login
            </button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
