import { useState, useEffect } from 'react';
import { Bell, Eye, Globe, Shield, Activity, RotateCcw, AlertCircle, RefreshCw, Palette, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, Button } from '../design-system';
import { getUserSettings, updateUserSettings, resetUserSettings } from '../services/userSettingsService';
import { getActivityLog, formatActivity } from '../services/activityLogService';
import { getAllBrandThemes, deleteBrandTheme, setActiveTheme } from '../services/brandThemeService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTranslation } from '../i18n';
import { BrandImporterModal, ThemePreviewCard } from '../components/brand';

const SettingsPage = ({ showToast }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('notifications');
  const [settings, setSettings] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Brand theme state
  const [brandThemes, setBrandThemes] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);

  const tabs = [
    { id: 'notifications', label: t('settings.tabs.notifications', 'Notifications'), icon: Bell },
    { id: 'display', label: t('settings.tabs.display', 'Display'), icon: Eye },
    { id: 'branding', label: t('settings.tabs.branding', 'Branding'), icon: Palette },
    { id: 'privacy', label: t('settings.tabs.privacy', 'Privacy'), icon: Shield },
    { id: 'activity', label: t('settings.tabs.activity', 'Activity Log'), icon: Activity }
  ];

  useEffect(() => {
    fetchSettings();
    fetchActivityLog();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserSettings();
      setSettings(data);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async () => {
    try {
      const data = await getActivityLog({ limit: 20 });
      setActivityLog(data);
    } catch (error) {
      console.error('Error loading activity log:', error);
    }
  };

  const fetchBrandThemes = async () => {
    try {
      setBrandLoading(true);
      const themes = await getAllBrandThemes();
      setBrandThemes(themes || []);
    } catch (error) {
      console.error('Error loading brand themes:', error);
    } finally {
      setBrandLoading(false);
    }
  };

  // Fetch brand themes when branding tab is selected
  useEffect(() => {
    if (activeTab === 'branding' && brandThemes.length === 0 && !brandLoading) {
      fetchBrandThemes();
    }
  }, [activeTab]);

  const handleSaveSettings = async (updates) => {
    try {
      setSaving(true);
      const updated = await updateUserSettings(updates);
      setSettings(updated);
      showToast('Settings saved successfully!');
    } catch (error) {
      showToast('Error saving settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) {
      return;
    }

    try {
      setSaving(true);
      const defaults = await resetUserSettings();
      setSettings(defaults);
      showToast('Settings reset to defaults');
    } catch (error) {
      showToast('Error resetting settings: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeCreated = async (theme) => {
    setShowBrandModal(false);
    await fetchBrandThemes();
    showToast(t('settings.branding.themeCreated', 'Brand theme created successfully!'));
  };

  const handleDeleteTheme = async (themeId) => {
    if (!confirm(t('settings.branding.confirmDelete', 'Are you sure you want to delete this brand theme?'))) {
      return;
    }

    try {
      await deleteBrandTheme(themeId);
      setBrandThemes(brandThemes.filter(t => t.id !== themeId));
      showToast(t('settings.branding.themeDeleted', 'Brand theme deleted'));
    } catch (error) {
      showToast('Error deleting theme: ' + error.message, 'error');
    }
  };

  const handleSetActiveTheme = async (themeId) => {
    try {
      await setActiveTheme(themeId);
      setBrandThemes(brandThemes.map(t => ({
        ...t,
        is_active: t.id === themeId
      })));
      showToast(t('settings.branding.themeActivated', 'Brand theme activated'));
    } catch (error) {
      showToast('Error activating theme: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('settings.errorTitle', 'Unable to load settings')}
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchSettings} variant="outline">
              <RefreshCw size={16} />
              {t('common.tryAgain', 'Try Again')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading', 'Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title', 'Settings')}</h1>
        <p className="text-gray-600">{t('settings.subtitle', 'Manage your account preferences and settings')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4 overflow-x-auto" role="tablist" aria-label={t('settings.tabs.label', 'Settings tabs')}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('settings.notifications.title', 'Notification Preferences')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.notifications.email', 'Email Notifications')}</div>
                <div className="text-sm text-gray-600">{t('settings.notifications.emailDesc', 'Receive notifications via email')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.email_notifications}
                  onChange={(e) => handleSaveSettings({ email_notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.notifications.guestCheckin', 'Guest Check-in Notifications')}</div>
                <div className="text-sm text-gray-600">{t('settings.notifications.guestCheckinDesc', 'Get notified when guests check in')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.guest_checkin_notifications}
                  onChange={(e) => handleSaveSettings({ guest_checkin_notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.notifications.pmsSync', 'PMS Sync Notifications')}</div>
                <div className="text-sm text-gray-600">{t('settings.notifications.pmsSyncDesc', 'Get notified when PMS sync completes')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pms_sync_notifications}
                  onChange={(e) => handleSaveSettings({ pms_sync_notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.notifications.tvOffline', 'TV Offline Notifications')}</div>
                <div className="text-sm text-gray-600">{t('settings.notifications.tvOfflineDesc', 'Get notified when TV devices go offline')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.tv_offline_notifications}
                  onChange={(e) => handleSaveSettings({ tv_offline_notifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Display Tab */}
      {activeTab === 'display' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('settings.display.title', 'Display Preferences')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.display.theme', 'Theme')}</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSaveSettings({ theme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="light">{t('settings.display.themeLight', 'Light')}</option>
                <option value="dark">{t('settings.display.themeDark', 'Dark')}</option>
                <option value="auto">{t('settings.display.themeAuto', 'Auto (System)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.display.language', 'Language')}</label>
              <LanguageSwitcher showLabel={false} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.display.dateFormat', 'Date Format')}</label>
              <select
                value={settings.date_format}
                onChange={(e) => handleSaveSettings({ date_format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t('settings.display.timeFormat', 'Time Format')}</label>
              <select
                value={settings.time_format}
                onChange={(e) => handleSaveSettings({ time_format: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="12h">{t('settings.display.time12h', '12-hour (AM/PM)')}</option>
                <option value="24h">{t('settings.display.time24h', '24-hour')}</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">{t('settings.branding.title', 'Brand Themes')}</h2>
              <p className="text-sm text-gray-600">
                {t('settings.branding.description', 'Import your brand identity for consistent styling across all scenes')}
              </p>
            </div>
            <Button onClick={() => setShowBrandModal(true)}>
              <Plus size={16} />
              {t('settings.branding.importBrand', 'Import Brand')}
            </Button>
          </div>

          {brandLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : brandThemes.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('settings.branding.noThemes', 'No brand themes yet')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('settings.branding.noThemesDesc', 'Import your logo to automatically extract brand colors and create a consistent theme')}
              </p>
              <Button onClick={() => setShowBrandModal(true)} variant="outline">
                <Plus size={16} />
                {t('settings.branding.importFirst', 'Import Your First Brand')}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {brandThemes.map(theme => (
                <ThemePreviewCard
                  key={theme.id}
                  theme={theme}
                  isActive={theme.is_active}
                  onSelect={() => handleSetActiveTheme(theme.id)}
                  onDelete={() => handleDeleteTheme(theme.id)}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('settings.privacy.title', 'Privacy & Data')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.privacy.activityTracking', 'Activity Tracking')}</div>
                <div className="text-sm text-gray-600">{t('settings.privacy.activityTrackingDesc', 'Track your actions for activity log')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activity_tracking}
                  onChange={(e) => handleSaveSettings({ activity_tracking: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t('settings.privacy.analytics', 'Analytics')}</div>
                <div className="text-sm text-gray-600">{t('settings.privacy.analyticsDesc', 'Help us improve by sharing anonymous usage data')}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.analytics_enabled}
                  onChange={(e) => handleSaveSettings({ analytics_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">{t('settings.privacy.autoSyncPms', 'Auto-Sync PMS')}</h3>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">{t('settings.privacy.autoSyncPmsDesc', 'Automatically sync reservations from PMS')}</div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_sync_pms}
                    onChange={(e) => handleSaveSettings({ auto_sync_pms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {settings.auto_sync_pms && (
                <div>
                  <label className="block text-sm font-medium mb-2">{t('settings.privacy.syncFrequency', 'Sync Frequency')}</label>
                  <select
                    value={settings.sync_frequency_hours}
                    onChange={(e) => handleSaveSettings({ sync_frequency_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="1">{t('settings.privacy.everyHour', 'Every hour')}</option>
                    <option value="6">{t('settings.privacy.every6Hours', 'Every 6 hours')}</option>
                    <option value="12">{t('settings.privacy.every12Hours', 'Every 12 hours')}</option>
                    <option value="24">{t('settings.privacy.every24Hours', 'Every 24 hours')}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t('settings.activity.title', 'Recent Activity')}</h2>
          <div className="space-y-3">
            {activityLog.length > 0 ? (
              activityLog.map(activity => {
                const formatted = formatActivity(activity);
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
                    <div className="text-2xl">{formatted.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${formatted.color}`}>{formatted.actionLabel}</span>
                        <span className="text-gray-600">{formatted.entityLabel}</span>
                        {activity.entity_name && (
                          <span className="text-gray-900 font-medium">"{activity.entity_name}"</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{formatted.formattedTime}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t('settings.activity.noActivity', 'No activity recorded yet')}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
        >
          <RotateCcw size={16} />
          {t('settings.resetToDefaults', 'Reset to Defaults')}
        </Button>
      </div>

      {/* Brand Importer Modal */}
      {showBrandModal && (
        <BrandImporterModal
          isOpen={showBrandModal}
          onClose={() => setShowBrandModal(false)}
          onThemeCreated={handleThemeCreated}
        />
      )}
    </div>
  );
};

export default SettingsPage;
