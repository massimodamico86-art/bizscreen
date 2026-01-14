import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Grid3X3,
  Clock,
  Globe,
  CloudSun,
  Rss,
  Table,
  MoreVertical,
  Trash2,
  Edit,
  X,
  ChevronDown,
  Loader2,
  LinkIcon,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/formatters';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';
import { AppCard, AppDetailModal } from '../components/apps';
import WeatherWallConfigModal from '../components/apps/WeatherWallConfigModal';
import {
  APP_CATALOG,
  APP_CATEGORIES,
  FEATURED_APPS,
  INDUSTRY_POPULAR,
  getAppsByCategory,
  searchApps,
  sortAppsAlphabetically,
  getAppById,
} from '../config/appCatalog';
import {
  fetchApps,
  createClockApp,
  createWebPageApp,
  createWeatherApp,
  createRssTickerApp,
  createDataTableApp,
  deleteApp,
  APP_TYPE_KEYS
} from '../services/mediaService';

// ============================================
// APP TYPE INFO (for user-created apps display)
// ============================================

const APP_TYPE_INFO = {
  [APP_TYPE_KEYS.CLOCK]: { name: 'Clock', icon: Clock, color: 'blue' },
  [APP_TYPE_KEYS.WEB_PAGE]: { name: 'Web Page', icon: Globe, color: 'green' },
  [APP_TYPE_KEYS.WEATHER]: { name: 'Weather', icon: CloudSun, color: 'orange' },
  [APP_TYPE_KEYS.RSS_TICKER]: { name: 'RSS Ticker', icon: Rss, color: 'purple' },
  [APP_TYPE_KEYS.DATA_TABLE]: { name: 'Data Table', icon: Table, color: 'teal' }
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  purple: 'bg-purple-100 text-purple-600',
  teal: 'bg-teal-100 text-teal-600',
  gray: 'bg-gray-100 text-gray-600'
};

// ============================================
// MAIN COMPONENT
// ============================================

const AppsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // User's created app instances
  const [userApps, setUserApps] = useState([]);
  const [loadingUserApps, setLoadingUserApps] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortOrder, setSortOrder] = useState('a-z'); // 'a-z', 'z-a', 'popular'
  const [selectedIndustry, setSelectedIndustry] = useState('restaurant');

  // Modal states
  const [selectedApp, setSelectedApp] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);
  const [showWebPageModal, setShowWebPageModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showRssTickerModal, setShowRssTickerModal] = useState(false);
  const [showDataTableModal, setShowDataTableModal] = useState(false);
  const [showGenericEmbedModal, setShowGenericEmbedModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Dropdown menu state for user apps
  const [openMenuId, setOpenMenuId] = useState(null);

  // Load user's created apps
  useEffect(() => {
    loadUserApps();
  }, []);

  const loadUserApps = async () => {
    try {
      setLoadingUserApps(true);
      const data = await fetchApps();
      setUserApps(data);
    } catch (error) {
      console.error('Error fetching apps:', error);
    } finally {
      setLoadingUserApps(false);
    }
  };

  // Filter and sort catalog apps
  const filteredApps = useMemo(() => {
    let apps = search ? searchApps(search) : getAppsByCategory(activeCategory);

    // Sort
    if (sortOrder === 'a-z') {
      apps = sortAppsAlphabetically(apps);
    } else if (sortOrder === 'z-a') {
      apps = sortAppsAlphabetically(apps).reverse();
    }

    return apps;
  }, [search, activeCategory, sortOrder]);

  // Get popular apps for selected industry
  const popularApps = useMemo(() => {
    const industryConfig = INDUSTRY_POPULAR[selectedIndustry];
    if (!industryConfig) return [];
    return industryConfig.appIds.map(id => getAppById(id)).filter(Boolean);
  }, [selectedIndustry]);

  // Handle app selection from gallery - show detail modal first
  const handleAppSelect = (app) => {
    setSelectedApp(app);
    setShowDetailModal(true);
  };

  // Handle "Use App" button from detail modal - open config modal
  const handleUseApp = (app) => {
    setShowDetailModal(false);

    // Route to appropriate modal based on configType
    switch (app.configType) {
      case 'clock':
      case 'counter':
      case 'world-clock':
        setShowClockModal(true);
        break;
      case 'weather':
      case 'weather-radar':
      case 'weather-alert':
        setShowWeatherModal(true);
        break;
      case 'webpage':
        setShowWebPageModal(true);
        break;
      case 'rss':
      case 'rss-preset':
      case 'ticker':
        setShowRssTickerModal(true);
        break;
      case 'google-sheets':
      case 'menu':
        setShowDataTableModal(true);
        break;
      default:
        // Generic embed/web page for most apps
        setShowGenericEmbedModal(true);
    }
  };

  // Handle deleting user's app instance
  const handleDeleteApp = async (id) => {
    if (!confirm('Are you sure you want to delete this app?')) return;
    try {
      await deleteApp(id);
      setUserApps(userApps.filter(a => a.id !== id));
      showToast?.('App deleted successfully');
    } catch (error) {
      console.error('Error deleting app:', error);
      showToast?.('Error deleting app: ' + error.message, 'error');
    }
    setOpenMenuId(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

  const getAppTypeInfo = (app) => {
    const appType = app.config_json?.appType;
    return APP_TYPE_INFO[appType] || { name: 'App', icon: Grid3X3, color: 'gray' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('apps.title', 'Apps')}</h1>
        <div className="flex items-center gap-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="a-z">A to Z</option>
            <option value="z-a">Z to A</option>
          </select>
        </div>
      </div>

      {/* Select App Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Select App</h2>

        {/* Search */}
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search in All Apps"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2">
          {APP_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => {
                  setActiveCategory(category.id);
                  setSearch(''); // Clear search when changing category
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recently Used Section (User's Apps) */}
      {userApps.length > 0 && !search && activeCategory === 'all' && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">Recently Used</h3>
          <p className="text-sm text-gray-500">
            {userApps.length === 0
              ? 'Create or use some apps and they\'ll appear here!'
              : ''}
          </p>

          {loadingUserApps ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : userApps.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {userApps.slice(0, 8).map(app => {
                const typeInfo = getAppTypeInfo(app);
                const Icon = typeInfo.icon;
                return (
                  <div
                    key={app.id}
                    className="relative group bg-white border border-gray-200 rounded-xl p-3 hover:border-[#f26f21] hover:shadow-md transition-all"
                  >
                    {/* Menu */}
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === app.id ? null : app.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={14} className="text-gray-400" />
                      </button>

                      {openMenuId === app.id && (
                        <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[120px]">
                          <button
                            onClick={() => {
                              showToast?.('Edit coming soon');
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteApp(app.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${colorClasses[typeInfo.color]}`}>
                        <Icon size={24} />
                      </div>
                      <span className="text-xs font-medium text-gray-900 truncate w-full">
                        {app.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <LinkIcon size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Create or use some apps and they'll appear here!</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Featured Apps Section */}
      {!search && activeCategory === 'all' && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900">Featured Apps</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {FEATURED_APPS.slice(0, 8).map(app => (
              <AppCard key={app.id} app={app} onClick={handleAppSelect} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* Most Popular in Industry Section */}
      {!search && activeCategory === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center">
            <h3 className="text-base font-semibold text-gray-900">
              Most Popular in{' '}
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="inline-block px-1 py-0.5 text-[#f26f21] font-semibold bg-transparent border-b-2 border-[#f26f21] focus:outline-none cursor-pointer appearance-none"
                style={{ textAlignLast: 'left' }}
              >
                {Object.entries(INDUSTRY_POPULAR).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {popularApps.map(app => (
              <AppCard key={app.id} app={app} onClick={handleAppSelect} size="small" />
            ))}
          </div>
        </div>
      )}

      {/* All Apps Section */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">
          {search ? `Search Results (${filteredApps.length})` : activeCategory === 'all' ? 'All' : APP_CATEGORIES.find(c => c.id === activeCategory)?.label}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {filteredApps.map(app => (
            <AppCard key={app.id} app={app} onClick={handleAppSelect} size="small" />
          ))}

          {/* No results */}
          {filteredApps.length === 0 && (
            <div className="col-span-full flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <div className="text-center">
                <Search size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No apps found for "{search}"</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* App Detail Modal - shows preview before config */}
      {showDetailModal && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedApp(null);
          }}
          onUseApp={handleUseApp}
        />
      )}

      {/* Clock App Modal */}
      {showClockModal && (
        <ClockAppModal
          app={selectedApp}
          onClose={() => {
            setShowClockModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createClockApp(config);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${selectedApp?.name || 'Clock'} app created successfully`);
              setShowClockModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* Web Page App Modal */}
      {showWebPageModal && (
        <WebPageAppModal
          app={selectedApp}
          onClose={() => {
            setShowWebPageModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createWebPageApp(config);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${selectedApp?.name || 'Web Page'} app created successfully`);
              setShowWebPageModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* Weather Wall Config Modal - Yodeck Style */}
      {showWeatherModal && (
        <WeatherWallConfigModal
          app={selectedApp}
          onClose={() => {
            setShowWeatherModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              // Use enhanced config with theme support
              const weatherConfig = {
                name: config.name || 'Weather Wall',
                location: config.usePlayerLocation ? 'auto' : config.location,
                units: config.measurementSystem || 'metric',
                layout: 'detailed',
                refreshMinutes: config.refreshMinutes || 15,
                // Pass all advanced config for themed rendering
                ...config,
              };
              const newApp = await createWeatherApp(weatherConfig);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${config.name || 'Weather Wall'} app created successfully`);
              setShowWeatherModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* RSS Ticker App Modal */}
      {showRssTickerModal && (
        <RssTickerAppModal
          app={selectedApp}
          onClose={() => {
            setShowRssTickerModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createRssTickerApp(config);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${selectedApp?.name || 'RSS'} app created successfully`);
              setShowRssTickerModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* Data Table App Modal */}
      {showDataTableModal && (
        <DataTableAppModal
          app={selectedApp}
          onClose={() => {
            setShowDataTableModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createDataTableApp(config);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${selectedApp?.name || 'Data Table'} app created successfully`);
              setShowDataTableModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* Generic Embed Modal (for most apps) */}
      {showGenericEmbedModal && (
        <GenericEmbedModal
          app={selectedApp}
          onClose={() => {
            setShowGenericEmbedModal(false);
            setSelectedApp(null);
          }}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createWebPageApp(config);
              setUserApps([newApp, ...userApps]);
              showToast?.(`${selectedApp?.name || 'App'} created successfully`);
              setShowGenericEmbedModal(false);
              setSelectedApp(null);
            } catch (error) {
              console.error('Error creating app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}
    </div>
  );
};

// ============================================
// MODAL COMPONENTS
// ============================================

function ClockAppModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || 'Clock');
  const [format, setFormat] = useState('HH:mm');
  const [showSeconds, setShowSeconds] = useState(false);
  const [showDate, setShowDate] = useState(true);
  const [dateFormat, setDateFormat] = useState('MMMM D, YYYY');
  const [timezone, setTimezone] = useState('device');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name, format, showSeconds, showDate, dateFormat, timezone });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock size={20} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold">{app?.name || 'Create Clock App'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="HH:mm">24-hour (14:30)</option>
              <option value="hh:mm A">12-hour (2:30 PM)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showSeconds"
              checked={showSeconds}
              onChange={(e) => setShowSeconds(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showSeconds" className="text-sm text-gray-700">Show seconds</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showDate"
              checked={showDate}
              onChange={(e) => setShowDate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showDate" className="text-sm text-gray-700">Show date</label>
          </div>

          {showDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MMMM D, YYYY">November 26, 2025</option>
                <option value="MMM D, YYYY">Nov 26, 2025</option>
                <option value="MM/DD/YYYY">11/26/2025</option>
                <option value="dddd, MMMM D">Wednesday, November 26</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="device">Use device timezone</option>
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">London (GMT)</option>
            </select>
          </div>

          <div className="p-4 bg-gray-900 rounded-lg text-center">
            <p className="text-4xl font-light text-white">
              {format === 'HH:mm' ? '14:30' : '2:30 PM'}
              {showSeconds && <span className="text-2xl">:45</span>}
            </p>
            {showDate && <p className="text-gray-400 mt-1">November 26, 2025</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function WebPageAppModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || '');
  const [url, setUrl] = useState('');
  const [refreshSeconds, setRefreshSeconds] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name: name || url, url, refreshSeconds });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe size={20} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold">{app?.name || 'Web Page'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Dashboard"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Web Page URL *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Refresh</label>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value={0}>Never</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Some websites may not allow embedding due to security settings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !url}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function WeatherAppModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || 'Weather');
  const [location, setLocation] = useState('');
  const [units, setUnits] = useState('imperial');
  const [layout, setLayout] = useState('detailed');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name, location, units, layout, refreshMinutes: 15 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CloudSun size={20} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-bold">{app?.name || 'Weather'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., New York, NY or 40.7128,-74.0060"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="imperial">Fahrenheit (F)</option>
              <option value="metric">Celsius (C)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Layout</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="detailed">Detailed (with forecast)</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className="p-4 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg text-center text-white">
            <p className="text-3xl font-light">72F</p>
            <p className="opacity-90">Partly Cloudy</p>
            <p className="text-sm opacity-80">{location || 'Your Location'}</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !location}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function RssTickerAppModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || 'News Ticker');
  const [feedUrl, setFeedUrl] = useState(app?.presetFeedUrl || '');
  const [maxItems, setMaxItems] = useState(10);
  const [scrollSpeed, setScrollSpeed] = useState(30);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name, feedUrl, maxItems, scrollSpeed, refreshMinutes: 5 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Rss size={20} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">{app?.name || 'RSS Ticker'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RSS Feed URL *</label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              placeholder="https://example.com/rss/feed.xml"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
            {app?.presetFeedUrl && (
              <p className="text-xs text-gray-500 mt-1">Pre-filled with {app.name} feed</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Headlines</label>
            <select
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={5}>5 headlines</option>
              <option value={10}>10 headlines</option>
              <option value={15}>15 headlines</option>
              <option value={20}>20 headlines</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scroll Speed</label>
            <select
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={15}>Fast</option>
              <option value={30}>Medium</option>
              <option value={45}>Slow</option>
            </select>
          </div>

          <div className="p-3 bg-gray-900 rounded-lg overflow-hidden">
            <div className="text-white text-sm whitespace-nowrap animate-pulse">
              Headlines will scroll here...
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !feedUrl}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function DataTableAppModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || 'Data Table');
  const [dataUrl, setDataUrl] = useState('');
  const [format, setFormat] = useState('csv');
  const [theme, setTheme] = useState('dark');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name, dataUrl, format, theme, maxRows: 0, columns: [], refreshMinutes: 5 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Table size={20} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold">{app?.name || 'Data Table'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">App Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Source URL *</label>
            <input
              type="url"
              value={dataUrl}
              onChange={(e) => setDataUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/.../export?format=csv"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Google Sheets: File - Share - Publish to web - CSV</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="csv">CSV</option>
              <option value="tsv">TSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                  <th className="text-left pb-1">Item</th>
                  <th className="text-right pb-1">Price</th>
                </tr>
              </thead>
              <tbody className={theme === 'dark' ? 'text-white' : 'text-gray-900'}>
                <tr><td>Coffee</td><td className="text-right">$3.50</td></tr>
                <tr><td>Sandwich</td><td className="text-right">$8.99</td></tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !dataUrl}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function GenericEmbedModal({ app, onClose, onCreate, creating }) {
  const [name, setName] = useState(app?.name || '');
  const [url, setUrl] = useState('');
  const [refreshSeconds, setRefreshSeconds] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({ name: name || app?.name || url, url, refreshSeconds });
  };

  const Icon = app?.icon || Globe;
  const iconBgColor = app?.iconBgColor || 'bg-blue-100';
  const iconColor = app?.iconColor || 'text-blue-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {app?.logoUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-200 p-1">
                <img src={app.logoUrl} alt={app.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className={`p-2 ${iconBgColor} rounded-lg`}>
                <Icon size={20} className={iconColor} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">{app?.name || 'Embed App'}</h2>
              {app?.description && (
                <p className="text-sm text-gray-500">{app.description}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={app?.name || 'My App'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {app?.name || 'Embed'} URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
            {app?.configType === 'embed' && (
              <p className="text-xs text-gray-500 mt-1">
                Enter the embed URL or public share link for {app.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Refresh</label>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value={0}>Never</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
              <option value={1800}>Every 30 minutes</option>
            </select>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Make sure the {app?.name || 'content'} is publicly accessible or allows iframe embedding.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={creating || !url}>
              {creating ? 'Creating...' : 'Create App'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AppsPage;
