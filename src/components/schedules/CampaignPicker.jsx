/**
 * Campaign Picker (US-148)
 *
 * Dropdown to assign a schedule entry to a campaign.
 * - Fetches campaigns with entry counts on mount
 * - Shows "No Campaign" option to unassign
 * - Displays campaign name + entry count badge
 * - Shows date range as secondary text if dates exist
 */

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { Folder, Loader2 } from 'lucide-react';
import { getCampaignsWithEntryCounts } from '../../services/scheduleService';

/**
 * Format date range for display
 * @param {string|null} startAt - ISO date string
 * @param {string|null} endAt - ISO date string
 * @returns {string|null} Formatted date range or null
 */
function formatDateRange(startAt, endAt) {
  if (!startAt && !endAt) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  if (startAt && endAt) {
    return `${formatDate(startAt)} - ${formatDate(endAt)}`;
  }
  if (startAt) {
    return `From ${formatDate(startAt)}`;
  }
  return `Until ${formatDate(endAt)}`;
}

export function CampaignPicker({
  value = null,
  onChange,
  disabled = false
}) {
  const logger = useLogger('CampaignPicker');
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load campaigns on mount
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCampaignsWithEntryCounts();
      setCampaigns(data || []);
    } catch (err) {
      logger.error('Failed to load campaigns', { error: err });
      setError(err.message || 'Failed to load campaigns');
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [logger]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleChange = (e) => {
    const newValue = e.target.value || null;
    onChange?.(newValue);
  };

  // Find current campaign for display
  const currentCampaign = campaigns.find(c => c.id === value);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Campaign
      </label>

      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
          <Folder size={16} />
        </div>

        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || isLoading}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none bg-white"
        >
          <option value="">No Campaign</option>
          {isLoading ? (
            <option disabled>Loading...</option>
          ) : error ? (
            <option disabled>Error loading campaigns</option>
          ) : (
            campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} ({campaign.entry_count})
              </option>
            ))
          )}
        </select>

        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Loader2 size={14} className="animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Show date range if campaign selected and has dates */}
      {currentCampaign && (currentCampaign.start_at || currentCampaign.end_at) && (
        <p className="text-xs text-gray-500">
          {formatDateRange(currentCampaign.start_at, currentCampaign.end_at)}
        </p>
      )}

      {/* Help text when no campaign selected */}
      {!value && !isLoading && (
        <p className="text-xs text-gray-400">
          Assign to a campaign for grouped management
        </p>
      )}
    </div>
  );
}

export default CampaignPicker;
