// src/player/components/widgets/QRCodeWidget.jsx
// QR Code widget component extracted from Player.jsx SceneWidgetRenderer
import { QRCodeSVG } from 'qrcode.react';

/**
 * QRPlaceholder - Decorative placeholder shown when no URL is provided
 */
function QRPlaceholder({ fgColor }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gridTemplateRows: 'repeat(5, 1fr)',
      gap: '2px',
    }}>
      {[0,1,2,3,4,5,6,7,8,10,14,15,16,17,18,19,20,21,22,24].map(i => (
        <div key={i} style={{ background: fgColor, borderRadius: '1px' }} />
      ))}
      {[9,11,12,13,23].map(i => (
        <div key={i} style={{ background: fgColor, opacity: 0.4, borderRadius: '1px' }} />
      ))}
    </div>
  );
}

/**
 * QRCodeWidget - Displays a QR code with optional label
 *
 * @param {Object} props - Widget props
 * @param {string} props.url - URL to encode in QR code
 * @param {string} props.label - Optional label text below QR code
 * @param {number} props.cornerRadius - Border radius in pixels (default: 8)
 * @param {string} props.errorCorrection - Error correction level: 'L' | 'M' | 'Q' | 'H' (default: 'M')
 * @param {number} props.qrScale - Scale factor 0.5-2.0 (default: 1.0)
 * @param {string} props.qrFgColor - QR code foreground color (default: '#000000')
 * @param {string} props.qrBgColor - QR code background color (default: '#ffffff')
 * @param {string} props.textColor - Label text color (default: '#ffffff')
 */
export function QRCodeWidget({ props = {} }) {
  const cornerRadius = props.cornerRadius || 8;
  const label = props.label || '';
  const url = props.url || '';
  const errorCorrection = props.errorCorrection || 'M';
  const qrScale = Math.min(2, Math.max(0.5, props.qrScale || 1.0));
  const qrFgColor = props.qrFgColor || '#000000';
  const qrBgColor = props.qrBgColor || '#ffffff';
  const textColor = props.textColor || '#ffffff';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* QR Code Container */}
      <div style={{
        width: `min(${80 * qrScale}%, calc(100% - 8px))`,
        aspectRatio: '1',
        maxHeight: label ? '70%' : '90%',
        background: qrBgColor,
        borderRadius: `${cornerRadius}px`,
        padding: `${8 * qrScale}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {url ? (
          <QRCodeSVG
            value={url}
            size={256}
            level={errorCorrection}
            fgColor={qrFgColor}
            bgColor={qrBgColor}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        ) : (
          <QRPlaceholder fgColor={qrFgColor} />
        )}
      </div>
      {/* Label */}
      {(label || url) && (
        <div style={{
          marginTop: '4px',
          color: textColor,
          fontSize: 'clamp(0.5rem, 1.5vw, 0.75rem)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
        }}>
          {label || (url.length > 25 ? url.slice(0, 25) + '...' : url)}
        </div>
      )}
    </div>
  );
}

export default QRCodeWidget;
