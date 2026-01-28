// src/player/components/LayoutRenderer.jsx
// Multi-zone layout rendering
// Extracted from Player.jsx for maintainability


/**
 * Layout Renderer - Renders multi-zone layout
 * Each zone can contain a playlist, single media item, or app
 */
export function LayoutRenderer({ layout, timezone, screenId, tenantId, campaignId }) {
  if (!layout || !layout.zones || layout.zones.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{layout?.name || 'Layout'}</p>
          <p style={{ color: '#64748b' }}>No zones configured</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000'
    }}>
      {layout.zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            position: 'absolute',
            left: `${zone.x_percent}%`,
            top: `${zone.y_percent}%`,
            width: `${zone.width_percent}%`,
            height: `${zone.height_percent}%`,
            zIndex: zone.z_index || 0,
            overflow: 'hidden'
          }}
        >
          <ZonePlayer
            zone={zone}
            timezone={timezone}
            screenId={screenId}
            tenantId={tenantId}
            layoutId={layout.id}
            campaignId={campaignId}
          />
        </div>
      ))}
    </div>
  );
}

export default LayoutRenderer;
