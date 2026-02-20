/**
 * RecoveryFallbackScreen - Static fallback displayed when all recovery attempts are exhausted
 *
 * Shown when the crash counter reaches MAX_RECOVERY_ATTEMPTS (6).
 * Uses inline styles only (no Tailwind) since the player bundle is separate.
 * Displays device identification so operators know which screen is affected.
 *
 * @module player/components/RecoveryFallbackScreen
 */

/**
 * Static fallback screen component for exhausted recovery
 *
 * @param {Object} props - Component props
 * @param {string} [props.screenId] - Screen UUID
 * @param {string} [props.screenName] - Human-readable screen name
 * @param {number} [props.crashCount] - Number of recovery attempts made
 * @returns {JSX.Element} Full-screen fallback UI
 */
export function RecoveryFallbackScreen({ screenId, screenName, crashCount }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
        {/* Warning icon */}
        <div style={{
          width: '5rem',
          height: '5rem',
          background: '#ef4444',
          borderRadius: '50%',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          Recovery Failed
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
          This screen has encountered repeated errors and automatic recovery has been disabled.
        </p>
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Screen: {screenName || screenId || 'Unknown'}
        </p>
        <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
          Attempts: {crashCount} | Please restart the device manually
        </p>
      </div>
    </div>
  );
}
