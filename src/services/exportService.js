// Export Service - Export data to various formats

import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('ExportService');

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions {key, header}
 * @returns {string} - CSV string
 */
export function arrayToCSV(data, columns) {
  if (!data || data.length === 0) {
    return '';
  }

  // If no columns specified, use all keys from first object
  if (!columns) {
    const firstItem = data[0];
    columns = Object.keys(firstItem).map(key => ({
      key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    }));
  }

  // Create header row
  const headers = columns.map(col => `"${col.header}"`).join(',');

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];

      // Handle nested objects and arrays
      if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }

      // Escape quotes and wrap in quotes
      value = value !== null && value !== undefined ? String(value) : '';
      value = value.replace(/"/g, '""'); // Escape quotes
      return `"${value}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 * @param {string} csv - CSV string
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csv, filename = 'export.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export listings to CSV
 * @param {Array} listings - Array of listing objects
 * @returns {string} - CSV string
 */
export function exportListingsToCSV(listings) {
  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'address', header: 'Address' },
    { key: 'description', header: 'Description' },
    { key: 'active', header: 'Active' },
    { key: 'bedrooms', header: 'Bedrooms' },
    { key: 'bathrooms', header: 'Bathrooms' },
    { key: 'guests', header: 'Max Guests' },
    { key: 'price', header: 'Price' },
    { key: 'tvs', header: 'TVs' },
    { key: 'rating', header: 'Rating' },
    { key: 'reviews', header: 'Reviews' },
    { key: 'wifiNetwork', header: 'WiFi Network' },
    { key: 'wifiPassword', header: 'WiFi Password' },
    { key: 'contactPhone', header: 'Contact Phone' },
    { key: 'contactEmail', header: 'Contact Email' },
    { key: 'weatherCity', header: 'Weather City' },
    { key: 'created_at', header: 'Created At' },
    { key: 'updated_at', header: 'Updated At' }
  ];

  return arrayToCSV(listings, columns);
}

/**
 * Export guests to CSV
 * @param {Array} guests - Array of guest objects
 * @returns {string} - CSV string
 */
export function exportGuestsToCSV(guests) {
  const columns = [
    { key: 'firstName', header: 'First Name' },
    { key: 'lastName', header: 'Last Name' },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'checkIn', header: 'Check-In' },
    { key: 'checkOut', header: 'Check-Out' },
    { key: 'language', header: 'Language' },
    { key: 'specialRequests', header: 'Special Requests' },
    { key: 'notes', header: 'Notes' }
  ];

  return arrayToCSV(guests, columns);
}

/**
 * Export TV devices to CSV
 * @param {Array} devices - Array of TV device objects
 * @returns {string} - CSV string
 */
export function exportTVDevicesToCSV(devices) {
  const columns = [
    { key: 'name', header: 'Device Name' },
    { key: 'otp', header: 'OTP Code' },
    { key: 'isOnline', header: 'Online' },
    { key: 'lastSeen', header: 'Last Seen' },
    { key: 'created_at', header: 'Created At' }
  ];

  return arrayToCSV(devices, columns);
}

/**
 * Download listings as CSV file
 * @param {Array} listings - Array of listing objects
 * @param {string} filename - Optional filename
 */
export function downloadListingsCSV(listings, filename) {
  const csv = exportListingsToCSV(listings);
  const defaultFilename = `bizscreen-locations-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename || defaultFilename);
}

/**
 * Download guests as CSV file
 * @param {Array} guests - Array of guest objects
 * @param {string} filename - Optional filename
 */
export function downloadGuestsCSV(guests, filename) {
  const csv = exportGuestsToCSV(guests);
  const defaultFilename = `bizscreen-data-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(csv, filename || defaultFilename);
}
