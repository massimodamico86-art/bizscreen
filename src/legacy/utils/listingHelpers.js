// Helper function to build visible sections for dynamic layouts
export const buildVisibleSections = (listing) => {
  const sections = [];

  // QR Codes - can have multiple - CHECK TOGGLE
  if (listing.showQRCodes && listing.qrCodes && listing.qrCodes.length > 0) {
    listing.qrCodes.forEach(qr => {
      sections.push({
        type: 'qr',
        icon: '📱',
        label: qr.name || qr.type || 'QR Code',
        details: qr.details,
        data: qr
      });
    });
  }

  // Contact - CHECK TOGGLE
  if (listing.showContact && (listing.contactPhone || listing.contactEmail)) {
    sections.push({
      type: 'contact',
      icon: '📞',
      label: 'Contact',
      details: listing.contactPhone || listing.contactEmail,
      phone: listing.contactPhone,
      email: listing.contactEmail
    });
  }

  // WiFi - requires both network AND password - CHECK TOGGLE
  if (listing.showWifi && listing.wifiNetwork && listing.wifiPassword) {
    sections.push({
      type: 'wifi',
      icon: '📶',
      label: 'Wi-fi',
      details: listing.wifiNetwork,
      network: listing.wifiNetwork,
      password: listing.wifiPassword
    });
  }

  // Weather - CHECK TOGGLE
  if (listing.showWeather && listing.weatherCity) {
    sections.push({
      type: 'weather',
      icon: '🌤️',
      label: 'Weather',
      details: '85°',
      city: listing.weatherCity,
      unit: listing.weatherUnit || 'F'
    });
  }

  // Check In/Out - require BOTH times
  if (listing.showCheckInOut && listing.standardCheckInTime && listing.standardCheckOutTime) {
    sections.push({
      type: 'checkinout',
      icon: '🏠',
      label: 'Stay',
      details: 'Check-In/Out',
      checkIn: listing.standardCheckInTime,
      checkOut: listing.standardCheckOutTime
    });
  }

  // Hours of Operation
  if (listing.showHoursOfOperation && listing.hoursOfOperationFrom && listing.hoursOfOperationTo) {
    sections.push({
      type: 'hours',
      icon: '🕐',
      label: 'Hours',
      details: `${listing.hoursOfOperationFrom} - ${listing.hoursOfOperationTo}`,
      from: listing.hoursOfOperationFrom,
      to: listing.hoursOfOperationTo
    });
  }

  return sections;
};
