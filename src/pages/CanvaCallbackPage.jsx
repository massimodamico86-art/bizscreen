import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';
import { handleCanvaCallback } from '../services/canvaService';

/**
 * Canva OAuth Callback Page
 * Handles the redirect from Canva after user authorization
 */
const CanvaCallbackPage = ({ onNavigate, showToast }) => {
  const logger = useLogger('CanvaCallbackPage');
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get code and state from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');

        if (errorParam) {
          throw new Error(params.get('error_description') || 'Authorization was denied');
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens
        await handleCanvaCallback(code, state);

        setStatus('success');
        showToast?.('Successfully connected to Canva!', 'success');

        // Redirect to layouts after a short delay
        setTimeout(() => {
          onNavigate?.('layouts');
        }, 2000);
      } catch (err) {
        logger.error('Canva callback error:', err);
        setStatus('error');
        setError(err.message);
        showToast?.('Failed to connect to Canva', 'error');
      }
    };

    processCallback();
  }, [onNavigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Canva...
            </h2>
            <p className="text-gray-600">
              Please wait while we complete the authorization.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connected to Canva!
            </h2>
            <p className="text-gray-600">
              Redirecting you back to Layouts...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {error || 'Failed to connect to Canva. Please try again.'}
            </p>
            <button
              onClick={() => onNavigate?.('layouts')}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Back to Layouts
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CanvaCallbackPage;
