// QR Code Generation Service
import QRCode from 'qrcode';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('QrcodeService');

/**
 * Generate QR code as data URL from text/URL
 * @param {string} text - The text or URL to encode
 * @param {object} options - QR code generation options
 * @returns {Promise<string>} - Data URL of the QR code image
 */
export async function generateQRCode(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error('Text is required to generate QR code');
  }

  const defaultOptions = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    width: 512,
    ...options
  };

  try {
    const dataUrl = await QRCode.toDataURL(text, defaultOptions);
    return dataUrl;
  } catch (error) {
    logger.error('Error generating QR code:', { error: error });
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generate WiFi QR code
 * @param {string} ssid - WiFi network name
 * @param {string} password - WiFi password
 * @param {string} encryption - Encryption type (WPA, WEP, or nopass)
 * @returns {Promise<string>} - Data URL of the WiFi QR code
 */
export async function generateWiFiQRCode(ssid, password, encryption = 'WPA') {
  if (!ssid || !ssid.trim()) {
    throw new Error('WiFi SSID is required');
  }

  // WiFi QR code format: WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
  const wifiString = `WIFI:T:${encryption};S:${ssid};P:${password || ''};;`;

  return generateQRCode(wifiString);
}

/**
 * Generate URL QR code
 * @param {string} url - The URL to encode
 * @returns {Promise<string>} - Data URL of the URL QR code
 */
export async function generateURLQRCode(url) {
  if (!url || !url.trim()) {
    throw new Error('URL is required');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  return generateQRCode(url);
}

/**
 * Batch generate QR codes for multiple items
 * @param {Array} items - Array of objects with {type, data}
 * @returns {Promise<Array>} - Array of generated QR code data URLs
 */
export async function batchGenerateQRCodes(items) {
  const promises = items.map(async (item) => {
    try {
      let qrCode;

      if (item.type === 'wifi') {
        qrCode = await generateWiFiQRCode(
          item.data.ssid,
          item.data.password,
          item.data.encryption || 'WPA'
        );
      } else if (item.type === 'url' || item.type === 'website') {
        qrCode = await generateURLQRCode(item.data.url);
      } else {
        qrCode = await generateQRCode(item.data.text || item.data);
      }

      return {
        ...item,
        qrCode,
        success: true
      };
    } catch (error) {
      return {
        ...item,
        error: error.message,
        success: false
      };
    }
  });

  return Promise.all(promises);
}
