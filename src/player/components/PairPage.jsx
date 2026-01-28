// src/player/components/PairPage.jsx
// OTP pairing page for connecting TV screens
// Extracted from Player.jsx for maintainability

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useLogger } from '../../hooks/useLogger.js';

// Storage keys - shared with Player.jsx
const STORAGE_KEYS = {
  screenId: 'player_screen_id',
  contentHash: 'player_content_hash',
};

// Player service function - using resolved content RPC
async function getResolvedContentByOtp(otp) {
  const { data, error } = await supabase.rpc('get_resolved_player_content_by_otp', { p_otp: otp });
  if (error) throw error;
  return data;
}

/**
 * Pairing Page - Enter OTP code to connect TV
 * Supports both QR code and manual OTP entry methods
 */
export function PairPage() {
  const logger = useLogger('PairPage');
  const navigate = useNavigate();
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [useQrPairing, setUseQrPairing] = useState(true);

  // Check if already paired on mount, and check for demo OTP
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (screenId) {
      navigate('/player/view', { replace: true });
      return;
    }

    // Check for demo OTP hint
    const storedDemoOtp = localStorage.getItem('lastDemoOtp');
    if (storedDemoOtp) {
      setDemoOtp(storedDemoOtp);
    }
  }, [navigate]);

  // Poll for pairing completion when using QR mode
  useEffect(() => {
    if (!useQrPairing) return;

    const deviceId = localStorage.getItem('player_device_id');
    if (!deviceId) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('tv_devices')
          .select('id')
          .eq('device_id', deviceId)
          .eq('is_paired', true)
          .single();

        if (data && !error) {
          localStorage.setItem(STORAGE_KEYS.screenId, data.id);
          clearInterval(pollInterval);
          navigate('/player/view', { replace: true });
        }
      } catch (err) {
        // Ignore errors, keep polling
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [useQrPairing, navigate]);

  const useDemoCode = () => {
    if (demoOtp) {
      setOtpInput(demoOtp);
    }
  };

  const handlePair = async (e) => {
    e.preventDefault();
    const code = otpInput.trim().toUpperCase();

    if (!code) {
      setError('Please enter an OTP code');
      return;
    }

    if (code.length !== 6) {
      setError('OTP code must be 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getResolvedContentByOtp(code);

      // Store screen ID for future use (returned by the fixed RPC)
      localStorage.setItem(STORAGE_KEYS.screenId, data.screenId);
      // Store content hash for change detection (new format uses 'type' not 'mode')
      localStorage.setItem(STORAGE_KEYS.contentHash, JSON.stringify({
        type: data.type,
        source: data.source,
        playlistId: data.playlist?.id,
        layoutId: data.layout?.id,
        campaignId: data.campaign?.id
      }));

      // Navigate to player view
      navigate('/player/view', { replace: true });
    } catch (err) {
      logger.error('Pairing error', { error: err, code });
      // Provide more specific error messages based on error type
      const errorMessage = err.message?.toLowerCase() || '';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('not found') || errorMessage.includes('invalid')) {
        setError('Invalid pairing code. Please check the code in your BizScreen dashboard and try again.');
      } else if (errorMessage.includes('expired')) {
        setError('This pairing code has expired. Please generate a new code from your dashboard.');
      } else {
        setError(err.message || 'Failed to connect. Please verify your code and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show QR pairing screen by default
  if (useQrPairing) {
    return (
      <PairingScreen
        onFallbackToOtp={() => setUseQrPairing(false)}
      />
    );
  }

  // OTP entry fallback
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1.5rem',
        padding: '3rem',
        maxWidth: '28rem',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Logo */}
        <div style={{
          width: '5rem',
          height: '5rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '1.25rem',
          margin: '0 auto 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '0.5rem'
        }}>
          Connect Your Screen
        </h1>

        <p style={{
          color: '#64748b',
          marginBottom: '1rem',
          fontSize: '1rem'
        }}>
          Enter the 6-digit code from your BizScreen dashboard
        </p>

        {/* Demo OTP hint */}
        {demoOtp && !otpInput && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <p style={{
              color: '#166534',
              fontSize: '0.875rem',
              margin: 0
            }}>
              Demo code available: <code style={{ fontWeight: '600' }}>{demoOtp}</code>
            </p>
            <button
              type="button"
              onClick={useDemoCode}
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Use Code
            </button>
          </div>
        )}

        <form onSubmit={handlePair}>
          <input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            autoComplete="off"
            style={{
              width: '100%',
              padding: '1.25rem',
              fontSize: '2rem',
              textAlign: 'center',
              letterSpacing: '0.75rem',
              border: '2px solid #e2e8f0',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontWeight: '600',
              color: '#1e293b',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />

          {/* Character count indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.25rem',
            marginBottom: '1rem',
            marginTop: '-0.5rem'
          }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: otpInput.length > i ? '#3b82f6' : '#e2e8f0',
                  transition: 'background-color 0.15s'
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otpInput.length !== 6}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading || otpInput.length !== 6
                ? '#94a3b8'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: loading || otpInput.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: loading || otpInput.length !== 6
                ? 'none'
                : '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
            }}
          >
            {loading ? 'Connecting...' : 'Connect Screen'}
          </button>
        </form>

        {/* Help toggle */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          style={{
            marginTop: '1.5rem',
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            width: '100%'
          }}
        >
          <span>{showHelp ? '\\u25BC' : '\\u25B6'}</span>
          Need help?
        </button>

        {/* Help content */}
        {showHelp && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '0.5rem',
            textAlign: 'left',
            fontSize: '0.8125rem',
            color: '#475569'
          }}>
            <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1e293b' }}>
              How to get your pairing code:
            </p>
            <ol style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: '1.6' }}>
              <li>Log in to your BizScreen dashboard</li>
              <li>Go to <strong>Screens</strong> page</li>
              <li>Click <strong>Add Screen</strong></li>
              <li>Copy the 6-character code shown</li>
            </ol>
            <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              Code not working? Try creating a new screen in your dashboard.
            </p>
          </div>
        )}

        {/* Switch to QR mode */}
        <button
          type="button"
          onClick={() => setUseQrPairing(true)}
          style={{
            marginTop: '1rem',
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '0.875rem',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Use QR code instead
        </button>

        <p style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          Powered by BizScreen
        </p>
      </div>
    </div>
  );
}

export default PairPage;
