import { useState, useEffect } from 'react';
import Modal from '../Modal';
import ScaledStage from '../../ScaledStage';
import { Layout1, Layout2, Layout3, Layout4 } from '../../layouts';
import { getConfig } from '../../getConfig';
import { getWeather } from '../../services/weatherService';
import { useMediaPlayback } from '../../hooks/useMediaPlayback';
import { DEFAULT_UNIFIED_MEDIA_STATE } from '../../types/media';

export const TVPreviewModal = ({ listing, onClose }) => {
  const layout = listing.tvLayout || 'layout1';
  const [weatherData, setWeatherData] = useState(null);

  // Use unified media playback system
  const unifiedMediaState = listing.unifiedMediaState || DEFAULT_UNIFIED_MEDIA_STATE;
  const mediaPlayback = useMediaPlayback(unifiedMediaState);

  // Fetch weather data when modal opens
  useEffect(() => {
    if (listing.weatherCity && listing.showWeather) {
      const fetchWeather = async () => {
        try {
          const units = listing.weatherUnit === 'C' ? 'metric' : 'imperial';
          const weather = await getWeather(listing.weatherCity, units);
          setWeatherData(weather);
        } catch (err) {
          console.error('Failed to fetch weather:', err);
          setWeatherData(null);
        }
      };
      fetchWeather();
    }
  }, [listing.weatherCity, listing.weatherUnit, listing.showWeather]);

  // Map layout names to components
  const layoutComponents = {
    layout1: Layout1,
    layout2: Layout2,
    layout3: Layout3,
    layout4: Layout4
  };

  const LayoutComponent = layoutComponents[layout] || Layout1;

  // Get current media from unified playback
  const currentMedia = mediaPlayback.currentItem;
  const backgroundImage = mediaPlayback.activeType === 'image' && currentMedia ? currentMedia.url : '';
  const backgroundVideo = mediaPlayback.activeType === 'video' && currentMedia ? currentMedia.url : '';

  // Format listing data to match the layout prop structure
  const layoutData = {
    backgroundImage,
    backgroundVideo,
    propertyName: listing.name,
    showWelcomeMessage: listing.showWelcomeMessage,
    welcomeGreeting: listing.welcomeGreeting,
    welcomeMessage: listing.welcomeMessage,
    showCheckInOut: listing.showCheckInOut,
    standardCheckInTime: listing.standardCheckInTime,
    standardCheckOutTime: listing.standardCheckOutTime,
    showContact: listing.showContact,
    contactPhone: listing.contactPhone,
    contactEmail: listing.contactEmail,
    showWifi: listing.showWifi,
    wifiNetwork: listing.wifiNetwork,
    wifiPassword: listing.wifiPassword,
    showQRCodes: listing.showQRCodes,
    qrCodes: listing.qrCodes || [],
    showWeather: listing.showWeather,
    weatherCity: listing.weatherCity,
    weatherTemp: weatherData?.tempFormatted,
    weatherDescription: weatherData?.description,
    weatherIcon: weatherData?.iconUrl,
    websiteUrl: listing.websiteUrl,
    showHoursOfOperation: listing.showHoursOfOperation,
    hoursOfOperationFrom: listing.hoursOfOperationFrom,
    hoursOfOperationTo: listing.hoursOfOperationTo,
    showLogo: listing.showLogo,
    logo: listing.logo
  };

  // No guest data in BizScreen
  const guestData = null;

  return (
    <Modal isOpen={true} onClose={onClose} title={`TV Preview - ${listing.name} (${layout})`} size="xlarge">
      <div className="bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <ScaledStage baseWidth={1920} baseHeight={1080} fullScreen={false}>
          <LayoutComponent layout={layoutData} guest={guestData} />
        </ScaledStage>
      </div>
      <div className="mt-4 text-center text-sm text-gray-600">
        This is how your screen will appear on TVs using {layout}
      </div>
    </Modal>
  );
};
