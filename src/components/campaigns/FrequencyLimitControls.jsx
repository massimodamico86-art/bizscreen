/**
 * FrequencyLimitControls Component
 *
 * UI for configuring frequency limits (max plays per hour/day) for campaign content.
 * Shows warning when limits are restrictive.
 */

import { AlertTriangle } from 'lucide-react';
import { isFrequencyLimitRestrictive } from '../../services/campaignService';

/**
 * FrequencyLimitControls component
 * @param {Object} props
 * @param {Object} props.content - Content with max_plays_per_hour and max_plays_per_day
 * @param {Function} props.onChange - Callback when limits change
 * @param {boolean} props.disabled - Whether inputs are disabled
 */
export function FrequencyLimitControls({ content, onChange, disabled = false }) {
  /**
   * Handle input change
   * @param {string} field - Field name (max_plays_per_hour or max_plays_per_day)
   * @param {string} value - Input value
   */
  const handleChange = (field, value) => {
    // Convert empty string to null (unlimited), otherwise parse as integer
    const numValue = value === '' ? null : parseInt(value);

    // Validate: must be positive if provided
    if (numValue !== null && (isNaN(numValue) || numValue <= 0)) {
      return; // Ignore invalid input
    }

    onChange?.({
      ...content,
      [field]: numValue
    });
  };

  // Check if current limits are restrictive
  const isRestrictive = isFrequencyLimitRestrictive(content);

  return (
    <div className="space-y-3">
      {/* Max plays per hour */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 w-32">
          Max per hour:
        </label>
        <input
          type="number"
          min="1"
          placeholder="Unlimited"
          value={content?.max_plays_per_hour ?? ''}
          onChange={(e) => handleChange('max_plays_per_hour', e.target.value)}
          disabled={disabled}
          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Maximum plays per hour"
        />
        <span className="text-xs text-gray-400">
          plays/hour
        </span>
      </div>

      {/* Max plays per day */}
      <div className="flex items-center gap-4">
        <label className="text-sm text-gray-600 w-32">
          Max per day:
        </label>
        <input
          type="number"
          min="1"
          placeholder="Unlimited"
          value={content?.max_plays_per_day ?? ''}
          onChange={(e) => handleChange('max_plays_per_day', e.target.value)}
          disabled={disabled}
          className="w-24 px-2 py-1.5 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label="Maximum plays per day"
        />
        <span className="text-xs text-gray-400">
          plays/day
        </span>
      </div>

      {/* Restrictive warning */}
      {isRestrictive && (
        <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span>
            Low limits may cause content to not play frequently enough.
            Consider setting at least 3 plays/hour or 10 plays/day.
          </span>
        </div>
      )}
    </div>
  );
}

export default FrequencyLimitControls;
