import { useState, useEffect } from 'react';
import { getWeather } from '../../services/weatherService';
import { useMediaPlayback } from '../../hooks/useMediaPlayback';
import { migrateToUnifiedMedia } from '../../utils/mediaMigration';
import { DEFAULT_UNIFIED_MEDIA_STATE } from '../../types/media';
import { useLogger } from '../../hooks/useLogger.js';
export const PropertyDetailsModal = ({ listing, onClose, onSave, showToast, listings }) => {
  const logger = useLogger('PropertyDetailsModal');
  // Migrate old format to unified media on init
  const [formData, setFormData] = useState(() => {
    const migrated = { ...listing };
    if (!migrated.unifiedMediaState) {
      migrated.unifiedMediaState = migrateToUnifiedMedia(listing);
    }
    return migrated;
  });

  const [activeTab, setActiveTab] = useState('display');
  const [previewListing, setPreviewListing] = useState(null);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadTarget, setUploadTarget] = useState({ type: null, index: null });

  // Weather data state
  const [weatherData, setWeatherData] = useState(null);

  // Unified media playback (shared by preview and layout cards)
  const unifiedMediaState = formData.unifiedMediaState || DEFAULT_UNIFIED_MEDIA_STATE;
  const mediaPlayback = useMediaPlayback(unifiedMediaState);

  // Fetch weather data when city or unit changes
  useEffect(() => {
    if (formData.weatherCity && formData.showWeather) {
      const fetchWeather = async () => {
        try {
          const units = formData.weatherUnit === 'C' ? 'metric' : 'imperial';
          const weather = await getWeather(formData.weatherCity, units);
          setWeatherData(weather);
        } catch (err) {
          logger.error('Failed to fetch weather', { error: err, city: formData.weatherCity, unit: formData.weatherUnit });
          setWeatherData(null);
        }
      };
      fetchWeather();
    } else {
      setWeatherData(null);
    }
  }, [formData.weatherCity, formData.weatherUnit, formData.showWeather]);

  // Update formData and trigger re-render
  const updateFormData = (newData) => {
    setFormData(newData);
  };

  const handleSave = () => {
    onSave(formData);
    showToast(`${formData.name} updated successfully!`);
    onClose();
  };

  const tabs = [
    { id: 'display', label: 'Display Settings' }
  ];

  return (
    <>
      <Modal isOpen={true} onClose={onClose} title={`Edit ${listing.name}`} size="xlarge">
        {/* Tab Navigation */}
        <div className="border-b mb-6 -mt-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'display' && (
            <>
              {/* Property Basic Information */}
              <div className="grid grid-cols-2 gap-6 pb-6 border-b">
                {/* Left Side - Listing Image */}
                <div>
                  <label className="block text-sm font-medium mb-2">Listing Image</label>
                  <div 
                    className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors group"
                    onClick={() => {
                      setUploadTarget({ type: 'property', index: null });
                      setShowImageUpload(true);
                    }}
                  >
                    {formData.image && formData.image.trim() !== '' ? (
                      <div className="relative w-full h-full bg-gray-900">
                        <img 
                          src={formData.image} 
                          alt="Listing" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-30 transition-opacity"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <Edit size={20} className="text-gray-700" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                        <Plus size={48} className="mb-2" />
                        <span className="text-sm">Click to upload image</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side - Listing Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Location name*</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Enter location name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Address*</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Enter address"
                    />
                  </div>
                  
                  <div>
                    <label className="flex items-center justify-between">
                      <span className="text-sm font-medium">Location status</span>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.active || false}
                            onChange={(e) =>
                              setFormData({ ...formData, active: e.target.checked })
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            {formData.active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="pb-6 border-b">
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Enter location description"
                  />
                </div>
              </div>

              {/* Layout Selection Section - COMPLETE REPLACEMENT */}
<div className="border-b pb-6 -mx-6 px-6">
  <h3 className="font-semibold mb-4">Choose TV Layout</h3>
  <div className="relative">
    <div className="overflow-x-auto overflow-y-visible pb-2 snap-x snap-mandatory" style={{ scrollBehavior: 'smooth' }}>
      <div className="flex gap-4" style={{ width: 'max-content', minWidth: '100%' }}>
        {[
          { id: 'layout1', name: 'Layout 1', description: 'Centered with bottom info bar' },
          { id: 'layout2', name: 'Layout 2', description: 'Centered with horizontal info' },
          { id: 'layout3', name: 'Layout 3', description: 'Full screen with side overlay' },
          { id: 'layout4', name: 'Layout 4', description: 'Full screen gradient overlay' }
        ].map((layout) => (
          <div key={layout.id} className="flex-shrink-0 w-64 border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow snap-start">
            {/* Thumbnail Preview - Now using actual Layout components */}
            <div className="relative aspect-video bg-gray-900 overflow-hidden">
              <ScaledStage baseWidth={1920} baseHeight={1080} fullScreen={false}>
                {(() => {
                  // Format listing data to match layout prop structure
                  // Use current media from unified playback
                  const currentMedia = mediaPlayback.currentItem;
                  const backgroundImage = mediaPlayback.activeType === 'image' && currentMedia ? currentMedia.url : '';
                  const backgroundVideo = mediaPlayback.activeType === 'video' && currentMedia ? currentMedia.url : '';

                  const layoutData = {
                    backgroundImage,
                    backgroundVideo,
                    propertyName: formData.name,
                    showWelcomeMessage: formData.showWelcomeMessage,
                    welcomeGreeting: formData.welcomeGreeting,
                    welcomeMessage: formData.welcomeMessage,
                    showCheckInOut: formData.showCheckInOut,
                    standardCheckInTime: formData.standardCheckInTime,
                    standardCheckOutTime: formData.standardCheckOutTime,
                    showContact: formData.showContact,
                    contactPhone: formData.contactPhone,
                    contactEmail: formData.contactEmail,
                    showWifi: formData.showWifi,
                    wifiNetwork: formData.wifiNetwork,
                    wifiPassword: formData.wifiPassword,
                    showQRCodes: formData.showQRCodes,
                    qrCodes: formData.qrCodes || [],
                    showWeather: formData.showWeather,
                    weatherCity: formData.weatherCity,
                    weatherTemp: weatherData?.tempFormatted,
                    weatherDescription: weatherData?.description,
                    weatherIcon: weatherData?.iconUrl,
                    websiteUrl: formData.websiteUrl,
                    showHoursOfOperation: formData.showHoursOfOperation,
                    hoursOfOperationFrom: formData.hoursOfOperationFrom,
                    hoursOfOperationTo: formData.hoursOfOperationTo,
                    showLogo: formData.showLogo,
                    logo: formData.logo
                  };

                  // No guest data in BizScreen
                  const guestData = null;

                  // Render the appropriate layout component
                  switch(layout.id) {
                    case 'layout1':
                      return <Layout1 layout={layoutData} guest={guestData} />;
                    case 'layout2':
                      return <Layout2 layout={layoutData} guest={guestData} />;
                    case 'layout3':
                      return <Layout3 layout={layoutData} guest={guestData} />;
                    case 'layout4':
                      return <Layout4 layout={layoutData} guest={guestData} />;
                    default:
                      return <Layout1 layout={layoutData} guest={guestData} />;
                  }
                })()}
              </ScaledStage>
            </div>
          
          {/* Card Footer */}
          <div className="p-3">
            <div className="font-semibold text-sm mb-3">{layout.name}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPreviewListing({ ...formData, tvLayout: layout.id });
                }}
              >
                Preview
              </Button>
              {formData.tvLayout === layout.id ? (
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled
                >
                  Selected
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setFormData({ ...formData, tvLayout: layout.id });
                    showToast(`${layout.name} selected!`);
                  }}
                >
                  Select
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
  </div>
</div>

              {/* Information Alert */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <div className="text-blue-600 mt-0.5">ℹ️</div>
                <div className="flex-1 text-sm text-blue-800">
                  Download the BizScreen TV app on your TV!
                </div>
              </div>

              {/* Manage TVs */}
              <TVDeviceManagement formData={formData} setFormData={setFormData} showToast={showToast} />

              {/* Welcome message */}
              <WelcomeMessageForm formData={formData} setFormData={setFormData} />

              {/* Unified Media Section (replaces Carousel + Background) */}
              <MediaSection
                unifiedMediaState={unifiedMediaState}
                onChange={(newUnifiedMediaState) => {
                  setFormData({ ...formData, unifiedMediaState: newUnifiedMediaState });
                }}
                showToast={showToast}
              />

              {/* Weather settings and Branding */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`border rounded-lg p-4 transition-opacity ${!formData.showWeather ? 'opacity-50 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Weather settings</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showWeather || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showWeather: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.weatherCity || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weatherCity: e.target.value,
                          })
                        }
                        placeholder="Miami"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Temp unit</label>
                      <select
                        value={formData.weatherUnit || 'F'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weatherUnit: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="F">Fahrenheit</option>
                        <option value="C">Celsius</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={`border rounded-lg p-4 transition-opacity ${!formData.showLogo ? 'opacity-50 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Branding</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showLogo || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showLogo: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Logo</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.logo || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              logo: e.target.value,
                            })
                          }
                          placeholder="Logo URL or upload"
                          className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        />
                        <ImageUploadButton
                          onImageUploaded={(imageUrl) => {
                            setFormData({ ...formData, logo: imageUrl });
                          }}
                          buttonText="Upload"
                          buttonVariant="outline"
                          folder="bizscreen/logos"
                          transformation={{
                            width: 400,
                            height: 400,
                            crop: 'fit',
                            quality: 'auto'
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Recommended: Square (1:1) or widescreen (16:9) format
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Website</label>
                      <input
                        type="text"
                        value={formData.websiteUrl || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            websiteUrl: e.target.value,
                          })
                        }
                        placeholder="https://www.yoursite.com"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Language and Check in & check out */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Language</h3>
                  <select
                    value={formData.language || 'en'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        language: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>

                <div className={`border rounded-lg p-4 transition-opacity ${!formData.showCheckInOut ? 'opacity-50 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Check in & check out</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showCheckInOut || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showCheckInOut: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {formData.showCheckInOut && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Check in</label>
                        <input
                          type="time"
                          value={formData.standardCheckInTime || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              standardCheckInTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Check out</label>
                        <input
                          type="time"
                          value={formData.standardCheckOutTime || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              standardCheckOutTime: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Hours of operation - Full width */}
              <div className={`border rounded-lg p-4 transition-opacity ${!formData.showHoursOfOperation ? 'opacity-50 bg-gray-50' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Hours of operation</h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showHoursOfOperation || false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          showHoursOfOperation: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {formData.showHoursOfOperation && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">From</label>
                      <input
                        type="time"
                        value={formData.hoursOfOperationFrom || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hoursOfOperationFrom: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">To</label>
                      <input
                        type="time"
                        value={formData.hoursOfOperationTo || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hoursOfOperationTo: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* WiFi details and Contact information */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`border rounded-lg p-4 transition-opacity ${!formData.showWifi ? 'opacity-50 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">WiFi details</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showWifi || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showWifi: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Network</label>
                      <input
                        type="text"
                        value={formData.wifiNetwork || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            wifiNetwork: e.target.value,
                          })
                        }
                        placeholder="WiFi network name"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Password</label>
                      <input
                        type="text"
                        value={formData.wifiPassword || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            wifiPassword: e.target.value,
                          })
                        }
                        placeholder="WiFi password"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className={`border rounded-lg p-4 transition-opacity ${!formData.showContact ? 'opacity-50 bg-gray-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Contact information</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.showContact || false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            showContact: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Contact no.</label>
                      <input
                        type="text"
                        value={formData.contactPhone || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contactPhone: e.target.value,
                          })
                        }
                        placeholder="Contact no."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.contactEmail || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contactEmail: e.target.value,
                          })
                        }
                        placeholder="contact@gmail.com"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* QR codes - Full width with table */}
              <QRCodeManager formData={formData} setFormData={setFormData} showToast={showToast} />

              {/* Upcoming events info */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    You can see upcoming events and recommendations in Layout 2 and 4
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showToast('Add upcoming events feature coming soon!')}
                  >
                    <Plus size={14} /> Add New
                  </Button>
                </div>
              </div>

              {/* TV Preview Card - Real-time Preview */}
              <div className="mt-6 rounded-2xl border border-black/10 bg-white dark:bg-zinc-900 shadow-xl">
                <div className="px-5 py-4 text-sm font-medium">
                  TV Preview — {formData.name} ({formData.tvLayout || "layout1"})
                </div>
                <div className="px-5 pb-5">
                  <div className="relative w-full max-w-[1200px] mx-auto rounded-xl overflow-hidden bg-black">
                    <div className="relative w-full pb-[56.25%]">
                      <div className="absolute inset-0">
                        <ScaledStage fullScreen={false} baseWidth={1920} baseHeight={1080}>
                          {(() => {
                            // Format listing data to match layout prop structure
                            // Use current media from unified playback
                            const currentMedia = mediaPlayback.currentItem;
                            const backgroundImage = mediaPlayback.activeType === 'image' && currentMedia ? currentMedia.url : '';
                            const backgroundVideo = mediaPlayback.activeType === 'video' && currentMedia ? currentMedia.url : '';

                            const layoutData = {
                              backgroundImage,
                              backgroundVideo,
                              propertyName: formData.name,
                              showWelcomeMessage: formData.showWelcomeMessage,
                              welcomeGreeting: formData.welcomeGreeting,
                              welcomeMessage: formData.welcomeMessage,
                              showCheckInOut: formData.showCheckInOut,
                              standardCheckInTime: formData.standardCheckInTime,
                              standardCheckOutTime: formData.standardCheckOutTime,
                              showContact: formData.showContact,
                              contactPhone: formData.contactPhone,
                              contactEmail: formData.contactEmail,
                              showWifi: formData.showWifi,
                              wifiNetwork: formData.wifiNetwork,
                              wifiPassword: formData.wifiPassword,
                              showQRCodes: formData.showQRCodes,
                              qrCodes: formData.qrCodes || [],
                              showWeather: formData.showWeather,
                              weatherCity: formData.weatherCity,
                              weatherTemp: weatherData?.tempFormatted,
                              weatherDescription: weatherData?.description,
                              weatherIcon: weatherData?.iconUrl,
                              websiteUrl: formData.websiteUrl,
                              showHoursOfOperation: formData.showHoursOfOperation,
                              hoursOfOperationFrom: formData.hoursOfOperationFrom,
                              hoursOfOperationTo: formData.hoursOfOperationTo,
                              showLogo: formData.showLogo,
                              logo: formData.logo
                            };

                            // No guest data in BizScreen
                            const guestData = null;

                            // Render the selected layout
                            switch(formData.tvLayout) {
                              case 'layout1':
                                return <Layout1 layout={layoutData} guest={guestData} />;
                              case 'layout2':
                                return <Layout2 layout={layoutData} guest={guestData} />;
                              case 'layout3':
                                return <Layout3 layout={layoutData} guest={guestData} />;
                              case 'layout4':
                                return <Layout4 layout={layoutData} guest={guestData} />;
                              default:
                                return <Layout1 layout={layoutData} guest={guestData} />;
                            }
                          })()}
                        </ScaledStage>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {previewListing && (
        <TVPreviewModal
          listing={previewListing}
          onClose={() => setPreviewListing(null)}
        />
      )}

      {showMusicSelector && (
        <BackgroundMusicSelector
          isOpen={true}
          onClose={() => setShowMusicSelector(false)}
          currentMusic={formData.backgroundMusic}
          onSelect={(musicUrl) => {
            setFormData({ ...formData, backgroundMusic: musicUrl });
            showToast(musicUrl ? 'Background music updated!' : 'Background music removed');
          }}
        />
      )}

      {showImageUpload && (
        <ImageUploadModal
          isOpen={true}
          onClose={() => {
            setShowImageUpload(false);
            setUploadTarget({ type: null, index: null });
          }}
          currentImage={
            uploadTarget.type === 'property' ? formData.image :
            uploadTarget.type === 'carousel' && uploadTarget.index !== null ? (formData.carouselImages || [])[uploadTarget.index] :
            uploadTarget.type === 'logo' ? formData.logo :
            ''
          }
          onUpload={(imageData) => {
            if (uploadTarget.type === 'property') {
              setFormData({ ...formData, image: imageData });
              showToast('Property image uploaded successfully!');
            } else if (uploadTarget.type === 'carousel' && uploadTarget.index !== null) {
              const newImages = [...(formData.carouselImages || [])];
              newImages[uploadTarget.index] = imageData;
              setFormData({ ...formData, carouselImages: newImages });
              showToast('Carousel image uploaded successfully!');
            } else if (uploadTarget.type === 'logo') {
              setFormData({ ...formData, logo: imageData });
              showToast('Logo uploaded successfully!');
            }
            setUploadTarget({ type: null, index: null });
          }}
        />
      )}
    </>
  );
};
