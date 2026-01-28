/**
 * PairingScreen - QR code display for device pairing
 *
 * Shows a QR code that encodes the pairing URL with device ID.
 * Admin scans this QR code with their phone to complete pairing.
 *
 * Flow:
 * 1. Device generates unique ID on first load (stored in localStorage)
 * 2. QR encodes: {origin}/pair/{deviceId}
 * 3. Admin scans, opens web app, selects screen to pair
 * 4. Device polls for pairing completion, auto-navigates to content
 */

import { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const DEVICE_ID_KEY = 'player_device_id';

function generateDeviceId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 *
 * @param root0
 * @param root0.onFallbackToOtp
 */
export function PairingScreen({ onFallbackToOtp }) {
  const [deviceId] = useState(() => getDeviceId());

  const pairingUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/pair/${deviceId}`;
  }, [deviceId]);

  const steps = [
    'Open the BizScreen app on your phone',
    'Scan this QR code',
    'Select or create a screen to pair',
    'Content will appear automatically',
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '40rem',
        width: '90%',
        padding: '2rem',
      }}>
        {/* Logo */}
        <div style={{
          width: '4rem',
          height: '4rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#f1f5f9', marginBottom: '0.5rem', textAlign: 'center' }}>
          Pair This Screen
        </h1>

        <p style={{ fontSize: '1rem', color: '#94a3b8', marginBottom: '2rem', textAlign: 'center' }}>
          Scan the QR code to connect this screen to your BizScreen account
        </p>

        {/* QR Code */}
        <div style={{
          background: 'white',
          borderRadius: '1.5rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}>
          <QRCodeSVG
            value={pairingUrl}
            size={200}
            level="M"
            fgColor="#0f172a"
            bgColor="#ffffff"
            style={{ display: 'block' }}
          />
        </div>

        {/* Instructions */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          padding: '1.5rem',
          width: '100%',
          marginBottom: '2rem',
        }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f1f5f9', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            How to Pair
          </h3>
          <ol style={{ margin: 0, paddingLeft: '1.5rem', color: '#cbd5e1' }}>
            {steps.map((step, i) => (
              <li key={i} style={{ marginBottom: i < steps.length - 1 ? '0.75rem' : 0, fontSize: '1rem', lineHeight: '1.5' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Fallback to OTP */}
        {onFallbackToOtp && (
          <button
            onClick={onFallbackToOtp}
            style={{
              background: 'transparent',
              border: '1px solid #475569',
              borderRadius: '0.5rem',
              padding: '0.75rem 1.5rem',
              color: '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Enter pairing code manually
          </button>
        )}

        {/* Device ID debug */}
        <p style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.625rem',
          color: '#475569',
          fontFamily: 'monospace',
        }}>
          Device: {deviceId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}

export default PairingScreen;
