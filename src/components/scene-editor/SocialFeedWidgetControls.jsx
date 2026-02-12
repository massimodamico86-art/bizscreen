/**
 * SocialFeedWidgetControls
 *
 * Configuration UI for the social-feed widget type in the scene editor.
 * Provides provider, account, layout, filter mode, hashtag, max posts,
 * rotation speed, and display toggle controls.
 */

import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { PROVIDER_LABELS, LAYOUT_LABELS, FILTER_MODE_LABELS } from '../../services/social';
import { getConnectedAccounts } from '../../services/socialFeedSyncService';

/**
 * @param {Object} root0 - Component props
 * @param {Object} root0.props - Widget props from the block
 * @param {Function} root0.onPropChange - Callback to update a single prop
 */
export function SocialFeedWidgetControls({ props, onPropChange }) {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Load connected social accounts on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        const data = await getConnectedAccounts();
        if (!cancelled) setAccounts(data || []);
      } catch {
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }
    loadAccounts();
    return () => { cancelled = true; };
  }, []);

  const selectedProvider = props.provider || 'instagram';
  const selectedLayout = props.layout || 'carousel';
  const selectedFilterMode = props.filterMode || 'all';

  // Filter accounts by selected provider
  const filteredAccounts = accounts.filter((a) => a.provider === selectedProvider);

  return (
    <div className="space-y-3">
      {/* Provider Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <Share2 className="w-3 h-3 inline mr-1" />
          Provider
        </label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={selectedProvider}
          onChange={(e) => onPropChange('provider', e.target.value)}
        >
          {Object.entries(PROVIDER_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Account Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Account</label>
        {loadingAccounts ? (
          <div className="text-xs text-gray-500 py-1">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-xs text-gray-500 py-1">
            No accounts connected. Visit Social Accounts page to connect.
          </div>
        ) : (
          <select
            className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
            value={props.accountId || ''}
            onChange={(e) => onPropChange('accountId', e.target.value)}
          >
            <option value="">Select an account...</option>
            {filteredAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Layout Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Layout</label>
        <div className="flex flex-wrap gap-1">
          {Object.entries(LAYOUT_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => onPropChange('layout', key)}
              className={`flex-1 min-w-[60px] text-xs py-1 rounded border ${
                selectedLayout === key
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Mode Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Filter Mode</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={selectedFilterMode}
          onChange={(e) => onPropChange('filterMode', e.target.value)}
        >
          {Object.entries(FILTER_MODE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Hashtags Input (only when filterMode is 'hashtag') */}
      {selectedFilterMode === 'hashtag' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hashtags</label>
          <input
            type="text"
            className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
            placeholder="#food, #restaurant"
            value={props.hashtags || ''}
            onChange={(e) => onPropChange('hashtags', e.target.value)}
          />
        </div>
      )}

      {/* Max Posts Slider */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          Max Posts: {props.maxItems || 6}
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={props.maxItems || 6}
          onChange={(e) => onPropChange('maxItems', parseInt(e.target.value, 10))}
          className="w-full"
        />
      </div>

      {/* Rotation Speed Slider (carousel/single only) */}
      {(selectedLayout === 'carousel' || selectedLayout === 'single') && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Rotation Speed: {props.rotationSpeed || 5}s
          </label>
          <input
            type="range"
            min={3}
            max={30}
            value={props.rotationSpeed || 5}
            onChange={(e) => onPropChange('rotationSpeed', parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
      )}

      {/* Display Toggles */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showCaption !== false}
          onChange={(e) => onPropChange('showCaption', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Caption
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showLikes !== false}
          onChange={(e) => onPropChange('showLikes', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Likes
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showAuthor !== false}
          onChange={(e) => onPropChange('showAuthor', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Author
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showDate !== false}
          onChange={(e) => onPropChange('showDate', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Date
      </label>
    </div>
  );
}
