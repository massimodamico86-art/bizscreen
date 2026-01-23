/**
 * Social Feed Widget Settings Panel
 *
 * Configuration panel for social feed widgets in the Scene Editor.
 * Allows selecting provider, account, layout, and display options.
 */

import { useState, useEffect } from 'react';
import { Settings, RefreshCw, ExternalLink } from 'lucide-react';
import {
  PROVIDER_LABELS,
  PROVIDER_COLORS,
  LAYOUT_LABELS,
  FILTER_MODE_LABELS,
} from '../services/social';
import {
  getConnectedAccounts,
  saveFeedWidgetSettings,
  getFeedWidgetSettings,
} from '../services/socialFeedSyncService';
import { useLogger } from '../hooks/useLogger.js';

export default function SocialFeedWidgetSettings({
  widgetId,
  elementSettings = {},
  onSettingsChange,
  onNavigate,
}) {
  const logger = useLogger('SocialFeedWidgetSettings');
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current settings
  const [provider, setProvider] = useState(elementSettings.provider || 'instagram');
  const [accountId, setAccountId] = useState(elementSettings.accountId || '');
  const [layout, setLayout] = useState(elementSettings.layout || 'carousel');
  const [filterMode, setFilterMode] = useState(elementSettings.filterMode || 'all');
  const [hashtags, setHashtags] = useState(elementSettings.hashtags?.join(', ') || '');
  const [maxItems, setMaxItems] = useState(elementSettings.maxItems || 6);
  const [rotationSpeed, setRotationSpeed] = useState(elementSettings.rotationSpeed || 5);
  const [showCaption, setShowCaption] = useState(elementSettings.showCaption ?? true);
  const [showLikes, setShowLikes] = useState(elementSettings.showLikes ?? true);
  const [showDate, setShowDate] = useState(elementSettings.showDate ?? true);
  const [showAuthor, setShowAuthor] = useState(elementSettings.showAuthor ?? true);

  // Load accounts
  useEffect(() => {
    const loadAccounts = async () => {
      setLoading(true);
      try {
        const data = await getConnectedAccounts();
        setAccounts(data);
      } catch (error) {
        logger.error('Failed to load accounts', { error });
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  // Load existing widget settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!widgetId) return;

      try {
        const settings = await getFeedWidgetSettings(widgetId);
        if (settings) {
          setProvider(settings.provider);
          setAccountId(settings.account_id);
          setLayout(settings.layout);
          setFilterMode(settings.filter_mode);
          setHashtags(settings.hashtags?.join(', ') || '');
          setMaxItems(settings.max_items);
          setRotationSpeed(settings.rotation_speed);
          setShowCaption(settings.show_caption);
          setShowLikes(settings.show_likes);
          setShowDate(settings.show_date);
          setShowAuthor(settings.show_author);
        }
      } catch (error) {
        logger.error('Failed to load widget settings', { error, widgetId });
      }
    };

    loadSettings();
  }, [widgetId]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = {
        widget_id: widgetId,
        provider,
        account_id: accountId || null,
        layout,
        filter_mode: filterMode,
        hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        max_items: maxItems,
        rotation_speed: rotationSpeed,
        show_caption: showCaption,
        show_likes: showLikes,
        show_date: showDate,
        show_author: showAuthor,
      };

      await saveFeedWidgetSettings(settings);

      // Notify parent of settings change
      onSettingsChange?.({
        provider,
        accountId,
        layout,
        filterMode,
        hashtags: settings.hashtags,
        maxItems,
        rotationSpeed,
        showCaption,
        showLikes,
        showDate,
        showAuthor,
      });
    } catch (error) {
      logger.error('Failed to save settings', { error, widgetId, provider, accountId });
    } finally {
      setSaving(false);
    }
  };

  // Filter accounts by provider
  const filteredAccounts = accounts.filter((a) => a.provider === provider);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-gray-500" />
        <h3 className="font-medium text-gray-900">Social Feed Settings</h3>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Platform
        </label>
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setAccountId(''); // Reset account when provider changes
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Account Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading accounts...
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              No {PROVIDER_LABELS[provider]} account connected.
            </p>
            <button
              onClick={() => onNavigate?.('social-accounts')}
              className="text-sm text-yellow-700 underline mt-1 flex items-center gap-1"
            >
              Connect account
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select an account</option>
            {filteredAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Layout Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Layout
        </label>
        <select
          value={layout}
          onChange={(e) => setLayout(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(LAYOUT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filter Mode
        </label>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(FILTER_MODE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Hashtag Filter (shown only if filter mode is 'hashtag') */}
      {filterMode === 'hashtag' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hashtags (comma-separated)
          </label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#food, #restaurant"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      )}

      {/* Max Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max Posts: {maxItems}
        </label>
        <input
          type="range"
          min="1"
          max="20"
          value={maxItems}
          onChange={(e) => setMaxItems(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Rotation Speed (for carousel/single) */}
      {(layout === 'carousel' || layout === 'single') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rotation Speed: {rotationSpeed}s
          </label>
          <input
            type="range"
            min="3"
            max="30"
            value={rotationSpeed}
            onChange={(e) => setRotationSpeed(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Display Options */}
      <div className="border-t pt-4 mt-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Display Options</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCaption}
              onChange={(e) => setShowCaption(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show caption</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLikes}
              onChange={(e) => setShowLikes(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show likes/comments</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showAuthor}
              onChange={(e) => setShowAuthor(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show author</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDate}
              onChange={(e) => setShowDate(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">Show date</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || !accountId}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
