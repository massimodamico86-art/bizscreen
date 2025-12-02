import { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/formatters';
import { Button, Card, EmptyState, Modal, ModalHeader, ModalTitle, ModalContent } from '../design-system';
import { useTranslation } from '../i18n';
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

// App type display info
const APP_TYPE_INFO = {
  [APP_TYPE_KEYS.CLOCK]: {
    name: 'Clock',
    icon: Clock,
    color: 'blue',
    description: 'Display current date and time'
  },
  [APP_TYPE_KEYS.WEB_PAGE]: {
    name: 'Web Page',
    icon: Globe,
    color: 'green',
    description: 'Embed a web page or dashboard'
  },
  [APP_TYPE_KEYS.WEATHER]: {
    name: 'Weather',
    icon: CloudSun,
    color: 'orange',
    description: 'Current weather and forecast'
  },
  [APP_TYPE_KEYS.RSS_TICKER]: {
    name: 'RSS Ticker',
    icon: Rss,
    color: 'purple',
    description: 'Scrolling news feed'
  },
  [APP_TYPE_KEYS.DATA_TABLE]: {
    name: 'Data Table',
    icon: Table,
    color: 'teal',
    description: 'Menu boards and data displays'
  }
};

const AppsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showClockModal, setShowClockModal] = useState(false);
  const [showWebPageModal, setShowWebPageModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showRssTickerModal, setShowRssTickerModal] = useState(false);
  const [showDataTableModal, setShowDataTableModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const data = await fetchApps();
      setApps(data);
    } catch (error) {
      console.error('Error fetching apps:', error);
      showToast?.('Error loading apps: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(search.toLowerCase())
  );

  const getAppTypeInfo = (app) => {
    const appType = app.config_json?.appType;
    return APP_TYPE_INFO[appType] || {
      name: 'Unknown',
      icon: Grid3X3,
      color: 'gray',
      description: ''
    };
  };

  const handleDeleteApp = async (id) => {
    if (!confirm('Are you sure you want to delete this app?')) return;

    try {
      await deleteApp(id);
      setApps(apps.filter(a => a.id !== id));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('apps.title', 'Apps')}</h1>
          <p className="text-gray-500 mt-1">
            {t('apps.count', '{{count}} app', { count: apps.length })}{apps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={18} aria-hidden="true" />
          {t('apps.createApp', 'Create App')}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder={t('apps.searchPlaceholder', 'Search apps...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('apps.searchLabel', 'Search apps')}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" aria-label={t('common.loading', 'Loading')}></div>
        </div>
      ) : apps.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={<Grid3X3 size={32} className="text-orange-600" />}
          title={t('apps.emptyTitle', 'No Apps Yet')}
          description={t('apps.emptyDescription', 'Apps are widgets like clocks, web pages, and more. Create your first app to add dynamic content to your screens.')}
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} aria-hidden="true" />
              {t('apps.createApp', 'Create App')}
            </Button>
          }
        />
      ) : (
        /* Apps List */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th scope="col" className="p-4 font-medium">{t('apps.table.name', 'NAME')}</th>
                  <th scope="col" className="p-4 font-medium">{t('apps.table.appType', 'APP TYPE')}</th>
                  <th scope="col" className="p-4 font-medium">{t('apps.table.modified', 'MODIFIED')}</th>
                  <th scope="col" className="p-4 font-medium w-20">{t('apps.table.actions', 'ACTIONS')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map(app => {
                  const typeInfo = getAppTypeInfo(app);
                  const Icon = typeInfo.icon;
                  const colorClasses = {
                    blue: 'bg-blue-100 text-blue-600',
                    green: 'bg-green-100 text-green-600',
                    orange: 'bg-orange-100 text-orange-600',
                    purple: 'bg-purple-100 text-purple-600',
                    teal: 'bg-teal-100 text-teal-600',
                    gray: 'bg-gray-100 text-gray-600'
                  };

                  return (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[typeInfo.color]}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{app.name}</span>
                            {app.config_json?.url && (
                              <p className="text-xs text-gray-500 truncate max-w-xs">
                                {app.config_json.url}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[typeInfo.color]}`}>
                          <Icon size={12} />
                          {typeInfo.name}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 text-sm">
                        {formatDate(app.updated_at)}
                      </td>
                      <td className="p-4 relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === app.id ? null : app.id);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>

                        {openMenuId === app.id && (
                          <div className="absolute right-4 top-12 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                            <button
                              onClick={() => {
                                // TODO: Implement edit
                                showToast?.('Edit functionality coming soon');
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteApp(app.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create App Selection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create App</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">Select an app type to create:</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowClockModal(true);
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock size={24} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Clock / Date & Time</h3>
                  <p className="text-sm text-gray-500">Display current date and time</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowWebPageModal(true);
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="p-3 bg-green-100 rounded-lg">
                  <Globe size={24} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Web Page</h3>
                  <p className="text-sm text-gray-500">Embed a web page or dashboard</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowWeatherModal(true);
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="p-3 bg-orange-100 rounded-lg">
                  <CloudSun size={24} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Weather</h3>
                  <p className="text-sm text-gray-500">Current weather and forecast</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowRssTickerModal(true);
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Rss size={24} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">RSS Ticker</h3>
                  <p className="text-sm text-gray-500">Scrolling news feed from RSS</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowDataTableModal(true);
                }}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors text-left flex items-center gap-4"
              >
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Table size={24} className="text-teal-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Data Table / Menu</h3>
                  <p className="text-sm text-gray-500">Menu boards from Google Sheets or CSV</p>
                </div>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Clock App Modal */}
      {showClockModal && (
        <ClockAppModal
          onClose={() => setShowClockModal(false)}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createClockApp(config);
              setApps([newApp, ...apps]);
              showToast?.('Clock app created successfully');
              setShowClockModal(false);
            } catch (error) {
              console.error('Error creating clock app:', error);
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
          onClose={() => setShowWebPageModal(false)}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createWebPageApp(config);
              setApps([newApp, ...apps]);
              showToast?.('Web Page app created successfully');
              setShowWebPageModal(false);
            } catch (error) {
              console.error('Error creating web page app:', error);
              showToast?.('Error creating app: ' + error.message, 'error');
            } finally {
              setCreating(false);
            }
          }}
          creating={creating}
        />
      )}

      {/* Weather App Modal */}
      {showWeatherModal && (
        <WeatherAppModal
          onClose={() => setShowWeatherModal(false)}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createWeatherApp(config);
              setApps([newApp, ...apps]);
              showToast?.('Weather app created successfully');
              setShowWeatherModal(false);
            } catch (error) {
              console.error('Error creating weather app:', error);
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
          onClose={() => setShowRssTickerModal(false)}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createRssTickerApp(config);
              setApps([newApp, ...apps]);
              showToast?.('RSS Ticker app created successfully');
              setShowRssTickerModal(false);
            } catch (error) {
              console.error('Error creating RSS ticker app:', error);
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
          onClose={() => setShowDataTableModal(false)}
          onCreate={async (config) => {
            setCreating(true);
            try {
              const newApp = await createDataTableApp(config);
              setApps([newApp, ...apps]);
              showToast?.('Data Table app created successfully');
              setShowDataTableModal(false);
            } catch (error) {
              console.error('Error creating data table app:', error);
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

// Clock App Configuration Modal
function ClockAppModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('Retail Store Time');
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
            <h2 className="text-xl font-bold">Create Clock App</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Retail Store Time"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="HH:mm">24-hour (14:30)</option>
              <option value="hh:mm A">12-hour (2:30 PM)</option>
              <option value="h:mm A">12-hour no leading zero (2:30 PM)</option>
            </select>
          </div>

          {/* Show Seconds */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showSeconds"
              checked={showSeconds}
              onChange={(e) => setShowSeconds(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showSeconds" className="text-sm text-gray-700">
              Show seconds
            </label>
          </div>

          {/* Show Date */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showDate"
              checked={showDate}
              onChange={(e) => setShowDate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showDate" className="text-sm text-gray-700">
              Show date
            </label>
          </div>

          {/* Date Format */}
          {showDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="MMMM D, YYYY">November 26, 2025</option>
                <option value="MMM D, YYYY">Nov 26, 2025</option>
                <option value="MM/DD/YYYY">11/26/2025</option>
                <option value="DD/MM/YYYY">26/11/2025</option>
                <option value="YYYY-MM-DD">2025-11-26</option>
                <option value="dddd, MMMM D">Wednesday, November 26</option>
              </select>
            </div>
          )}

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
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
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gray-900 rounded-lg text-center">
            <p className="text-gray-400 text-xs mb-2">Preview</p>
            <p className="text-4xl font-light text-white">
              {format === 'HH:mm' ? '14:30' : '2:30 PM'}
              {showSeconds && <span className="text-2xl">:45</span>}
            </p>
            {showDate && (
              <p className="text-gray-400 mt-1">November 26, 2025</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Clock'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Web Page App Configuration Modal
function WebPageAppModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [refreshSeconds, setRefreshSeconds] = useState(0);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value) => {
    if (!value) {
      setUrlError('');
      return;
    }
    try {
      new URL(value);
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) {
      setUrlError('URL is required');
      return;
    }
    try {
      new URL(url);
    } catch {
      setUrlError('Please enter a valid URL');
      return;
    }
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
            <h2 className="text-xl font-bold">Create Web Page App</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sales Dashboard"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to use URL as name</p>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Web Page URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                validateUrl(e.target.value);
              }}
              placeholder="https://example.com/dashboard"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                urlError ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {urlError && (
              <p className="text-xs text-red-600 mt-1">{urlError}</p>
            )}
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auto-Refresh Interval
            </label>
            <select
              value={refreshSeconds}
              onChange={(e) => setRefreshSeconds(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value={0}>Never</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
              <option value={1800}>Every 30 minutes</option>
              <option value={3600}>Every hour</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How often the page should automatically reload
            </p>
          </div>

          {/* Info Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Some websites may not allow embedding due to security settings.
              Make sure the URL you're adding allows iframe embedding.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !!urlError}>
              {creating ? 'Creating...' : 'Create Web Page'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Weather App Configuration Modal
function WeatherAppModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('Weather');
  const [location, setLocation] = useState('');
  const [units, setUnits] = useState('imperial');
  const [layout, setLayout] = useState('detailed');
  const [refreshMinutes, setRefreshMinutes] = useState(15);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!location.trim()) return;
    onCreate({ name, location: location.trim(), units, layout, refreshMinutes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CloudSun size={20} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-bold">Create Weather App</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Store Weather"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., New York, NY or 40.7128,-74.0060"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              City name, zip code, or coordinates (lat,lon)
            </p>
          </div>

          {/* Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature Units
            </label>
            <select
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="imperial">Fahrenheit (°F)</option>
              <option value="metric">Celsius (°C)</option>
            </select>
          </div>

          {/* Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout Style
            </label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="detailed">Detailed (with forecast)</option>
              <option value="compact">Compact (current only)</option>
            </select>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refresh Interval
            </label>
            <select
              value={refreshMinutes}
              onChange={(e) => setRefreshMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every hour</option>
            </select>
          </div>

          {/* Preview */}
          <div className="p-4 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-lg text-center text-white">
            <p className="text-xs opacity-80 mb-1">Preview</p>
            <p className="text-3xl font-light">72°F</p>
            <p className="opacity-90">Partly Cloudy</p>
            <p className="text-sm opacity-80">{location || 'Your Location'}</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !location.trim()}>
              {creating ? 'Creating...' : 'Create Weather'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// RSS Ticker App Configuration Modal
function RssTickerAppModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('News Ticker');
  const [feedUrl, setFeedUrl] = useState('');
  const [maxItems, setMaxItems] = useState(10);
  const [scrollSpeed, setScrollSpeed] = useState(30);
  const [refreshMinutes, setRefreshMinutes] = useState(5);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value) => {
    if (!value) {
      setUrlError('');
      return;
    }
    try {
      new URL(value);
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid URL');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!feedUrl || urlError) return;
    onCreate({ name, feedUrl, maxItems, scrollSpeed, refreshMinutes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Rss size={20} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold">Create RSS Ticker</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Breaking News"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>

          {/* Feed URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RSS Feed URL *
            </label>
            <input
              type="url"
              value={feedUrl}
              onChange={(e) => {
                setFeedUrl(e.target.value);
                validateUrl(e.target.value);
              }}
              placeholder="https://example.com/rss/feed.xml"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                urlError ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {urlError && (
              <p className="text-xs text-red-600 mt-1">{urlError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Common feeds: CNN, BBC, Reuters, or any website's RSS feed
            </p>
          </div>

          {/* Max Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Headlines
            </label>
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

          {/* Scroll Speed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scroll Speed
            </label>
            <select
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={15}>Fast (15s)</option>
              <option value={30}>Medium (30s)</option>
              <option value={45}>Slow (45s)</option>
              <option value={60}>Very Slow (60s)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Time for full scroll cycle
            </p>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refresh Interval
            </label>
            <select
              value={refreshMinutes}
              onChange={(e) => setRefreshMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>

          {/* Preview */}
          <div className="p-3 bg-gray-900 rounded-lg overflow-hidden">
            <p className="text-xs text-gray-500 mb-2">Preview</p>
            <div className="text-white text-sm whitespace-nowrap animate-pulse">
              📰 Breaking: Headlines will scroll here • Latest news updates • More stories...
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !!urlError || !feedUrl}>
              {creating ? 'Creating...' : 'Create RSS Ticker'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Data Table App Configuration Modal
function DataTableAppModal({ onClose, onCreate, creating }) {
  const [name, setName] = useState('Menu Board');
  const [dataUrl, setDataUrl] = useState('');
  const [format, setFormat] = useState('csv');
  const [theme, setTheme] = useState('dark');
  const [maxRows, setMaxRows] = useState(0);
  const [refreshMinutes, setRefreshMinutes] = useState(5);
  const [urlError, setUrlError] = useState('');

  const validateUrl = (value) => {
    if (!value) {
      setUrlError('');
      return;
    }
    try {
      new URL(value);
      setUrlError('');
    } catch {
      setUrlError('Please enter a valid URL');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dataUrl || urlError) return;
    onCreate({ name, dataUrl, format, theme, maxRows, columns: [], refreshMinutes });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Table size={20} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold">Create Data Table</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Menu"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          {/* Data URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Source URL *
            </label>
            <input
              type="url"
              value={dataUrl}
              onChange={(e) => {
                setDataUrl(e.target.value);
                validateUrl(e.target.value);
              }}
              placeholder="https://docs.google.com/spreadsheets/.../export?format=csv"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                urlError ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {urlError && (
              <p className="text-xs text-red-600 mt-1">{urlError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Google Sheets: File → Share → Publish to web → CSV
            </p>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="csv">CSV (comma-separated)</option>
              <option value="tsv">TSV (tab-separated)</option>
              <option value="json">JSON (array of objects)</option>
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Theme
            </label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="dark">Dark (white text on dark)</option>
              <option value="light">Light (dark text on light)</option>
            </select>
          </div>

          {/* Max Rows */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Rows to Display
            </label>
            <select
              value={maxRows}
              onChange={(e) => setMaxRows(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value={0}>Show all rows</option>
              <option value={5}>5 rows</option>
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>

          {/* Refresh Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Refresh Interval
            </label>
            <select
              value={refreshMinutes}
              onChange={(e) => setRefreshMinutes(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value={2}>Every 2 minutes</option>
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
            </select>
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <p className={`text-xs mb-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}`}>Preview</p>
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

          {/* Info Box */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
            <p className="text-sm text-teal-800">
              <strong>Tip:</strong> For Google Sheets, publish your sheet to the web as CSV for best results.
              Changes to your sheet will automatically appear on screen.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating || !!urlError || !dataUrl}>
              {creating ? 'Creating...' : 'Create Data Table'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AppsPage;
