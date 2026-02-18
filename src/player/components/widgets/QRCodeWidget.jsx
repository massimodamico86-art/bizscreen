// src/player/components/widgets/QRCodeWidget.jsx
// QR Code widget component extracted from Player.jsx SceneWidgetRenderer

import { QRCodeSVG } from 'qrcode.react';

/**
 * Escape special characters in WiFi QR string fields.
 * Characters ; : \ " , must be backslash-escaped per the WiFi QR spec.
 */
function escapeWifiField(value) {
  if (!value) return '';
  return value.replace(/([\\;:,"])/g, '\\$1');
}

/**
 * Generate the QR code value string based on the qrType prop.
 *
 * @param {Object} props - Widget props
 * @returns {string} The string to encode in the QR code
 */
function generateQRValue(props) {
  const qrType = props.qrType || 'url';

  switch (qrType) {
    case 'url':
      return props.url || '';
    case 'wifi': {
      const encryption = props.encryption || 'WPA';
      const ssid = escapeWifiField(props.ssid || '');
      const password = escapeWifiField(props.password || '');
      const hidden = props.hiddenNetwork ? 'true' : '';
      return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
    }
    case 'text':
      return props.text || '';
    default:
      return props.url || props.text || '';
  }
}

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
 * @param {Object} props - Widget props
 * @param {string} props.qrType - QR content type: 'url' | 'wifi' | 'text' (default: 'url')
 * @param {string} props.url - URL to encode (when qrType is 'url')
 * @param {string} props.text - Plain text to encode (when qrType is 'text')
 * @param {string} props.ssid - WiFi network name (when qrType is 'wifi')
 * @param {string} props.password - WiFi password (when qrType is 'wifi')
 * @param {string} props.encryption - WiFi encryption: 'WPA' | 'nopass' (default: 'WPA')
 * @param {boolean} props.hiddenNetwork - WiFi hidden network flag (default: false)
 * @param {string} props.label - Optional label text below QR code
 * @param {number} props.cornerRadius - Border radius in pixels (default: 8)
 * @param {string} props.errorCorrection - Error correction level: 'L' | 'M' | 'Q' | 'H' (default: 'M')
 * @param {number} props.qrScale - Scale factor 0.5-2.0 (default: 1.0)
 * @param {string} props.qrFgColor - QR code foreground color (default: '#000000')
 * @param {string} props.qrBgColor - QR code background color (default: '#ffffff')
 * @param {string} props.textColor - Label text color (default: '#ffffff')
 * @param {boolean} props.logoEnabled - Enable brand logo overlay (default: false)
 * @param {string} props.logoUrl - Logo image URL (default: '')
 */
export function QRCodeWidget({ props = {} }) {
  const qrType = props.qrType || 'url';
  const cornerRadius = props.cornerRadius || 8;
  const label = props.label || '';
  const errorCorrection = props.errorCorrection || 'M';
  const qrScale = Math.min(2, Math.max(0.5, props.qrScale || 1.0));
  const qrFgColor = props.qrFgColor || '#000000';
  const qrBgColor = props.qrBgColor || '#ffffff';
  const textColor = props.textColor || '#ffffff';
  const logoEnabled = props.logoEnabled || false;
  const logoUrl = props.logoUrl || '';

  // Force error correction to H when logo is enabled for scan reliability
  const effectiveErrorCorrection = logoEnabled && logoUrl ? 'H' : (errorCorrection || 'M');

  const qrValue = generateQRValue(props);

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
        {qrValue ? (
          <QRCodeSVG
            value={qrValue}
            size={256}
            level={effectiveErrorCorrection}
            fgColor={qrFgColor}
            bgColor={qrBgColor}
            imageSettings={logoEnabled && logoUrl ? {
              src: logoUrl,
              height: 40,
              width: 40,
              excavate: true,
            } : undefined}
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
      {(label || qrValue) && (
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
          {label || (() => {
            switch (qrType) {
              case 'wifi':
                return props.ssid || 'WiFi';
              case 'text':
                return (props.text || '').length > 25 ? (props.text || '').slice(0, 25) + '...' : (props.text || '');
              case 'url':
              default:
                return (props.url || '').length > 25 ? (props.url || '').slice(0, 25) + '...' : (props.url || '');
            }
          })()}
        </div>
      )}
    </div>
  );
}

export default QRCodeWidget;
