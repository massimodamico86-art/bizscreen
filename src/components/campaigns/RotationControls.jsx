/**
 * RotationControls Component
 *
 * UI for configuring content rotation within campaigns.
 * Supports four modes: weight, percentage, sequence, random.
 */

import { useState, useEffect } from 'react';
import { Percent, Scale, Shuffle, ListOrdered } from 'lucide-react';
import { Button, Badge } from '../../design-system';
import { ROTATION_MODES, calculateEffectiveRotation } from '../../services/campaignService';

// Mode configuration with icons and descriptions
const MODE_CONFIG = [
  {
    id: ROTATION_MODES.WEIGHT,
    label: 'Weighted',
    icon: Scale,
    description: 'Proportional to weight values'
  },
  {
    id: ROTATION_MODES.PERCENTAGE,
    label: 'Percentage',
    icon: Percent,
    description: 'Explicit percentages (must sum to 100)'
  },
  {
    id: ROTATION_MODES.SEQUENCE,
    label: 'Sequential',
    icon: ListOrdered,
    description: 'Play in order'
  },
  {
    id: ROTATION_MODES.RANDOM,
    label: 'Random',
    icon: Shuffle,
    description: 'Random selection'
  }
];

// Color palette for distribution bar segments
const SEGMENT_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-indigo-500'
];

/**
 * RotationControls component
 * @param {Object} props
 * @param {Array} props.contents - Campaign contents with weight, rotation_percentage
 * @param {string} props.mode - Current rotation mode
 * @param {Function} props.onChange - Callback when content rotation values change
 * @param {Function} props.onModeChange - Callback when rotation mode changes
 */
export function RotationControls({ contents = [], mode = ROTATION_MODES.WEIGHT, onChange, onModeChange }) {
  const [localContents, setLocalContents] = useState(contents);
  const [error, setError] = useState(null);

  // Sync with parent contents
  useEffect(() => {
    setLocalContents(contents);
    // Re-validate when contents change
    if (mode === ROTATION_MODES.PERCENTAGE) {
      validatePercentages(contents);
    }
  }, [contents, mode]);

  /**
   * Validate that percentages sum to 100
   */
  const validatePercentages = (contentsToValidate) => {
    const total = contentsToValidate.reduce((sum, c) => sum + (c.rotation_percentage ?? 0), 0);
    if (total !== 100) {
      setError(`Percentages sum to ${total}%. Must equal 100%.`);
      return false;
    }
    setError(null);
    return true;
  };

  /**
   * Handle percentage input change
   */
  const handlePercentageChange = (contentId, value) => {
    const numValue = parseInt(value) || 0;
    const updated = localContents.map(c =>
      c.id === contentId ? { ...c, rotation_percentage: numValue } : c
    );
    setLocalContents(updated);

    // Validate and propagate if valid
    if (validatePercentages(updated)) {
      onChange?.(updated);
    }
  };

  /**
   * Handle weight input change
   */
  const handleWeightChange = (contentId, value) => {
    const numValue = Math.max(1, parseInt(value) || 1);
    const updated = localContents.map(c =>
      c.id === contentId ? { ...c, weight: numValue } : c
    );
    setLocalContents(updated);
    setError(null);
    onChange?.(updated);
  };

  /**
   * Handle mode change
   */
  const handleModeChange = (newMode) => {
    setError(null);

    // If switching to percentage mode, initialize percentages from weights
    if (newMode === ROTATION_MODES.PERCENTAGE) {
      const effectiveRotation = calculateEffectiveRotation(localContents, ROTATION_MODES.WEIGHT);
      const updatedContents = localContents.map((c, i) => ({
        ...c,
        rotation_percentage: effectiveRotation[i]?.effectivePercent ?? 0
      }));
      setLocalContents(updatedContents);
      validatePercentages(updatedContents);
      onChange?.(updatedContents);
    }

    onModeChange?.(newMode);
  };

  // Calculate effective percentages for display
  const effectiveRotation = calculateEffectiveRotation(localContents, mode);

  // Don't render if no contents
  if (!contents || contents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2">
        {MODE_CONFIG.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <Button
              key={m.id}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleModeChange(m.id)}
              title={m.description}
            >
              <Icon className="w-4 h-4 mr-1.5" />
              {m.label}
            </Button>
          );
        })}
      </div>

      {/* Mode description */}
      <p className="text-sm text-gray-500">
        {MODE_CONFIG.find(m => m.id === mode)?.description}
      </p>

      {/* Content rotation inputs */}
      <div className="space-y-2">
        {effectiveRotation.map((content, index) => (
          <div
            key={content.id}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
          >
            {/* Color indicator */}
            <div
              className={`w-3 h-3 rounded-full ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`}
            />

            {/* Content name */}
            <span className="flex-1 font-medium text-gray-900 truncate">
              {content.content_name || 'Unnamed content'}
            </span>

            {/* Input based on mode */}
            {mode === ROTATION_MODES.PERCENTAGE ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={content.rotation_percentage ?? 0}
                  onChange={(e) => handlePercentageChange(content.id, e.target.value)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  aria-label={`Rotation percentage for ${content.content_name}`}
                />
                <span className="text-gray-500 text-sm">%</span>
              </div>
            ) : mode === ROTATION_MODES.WEIGHT ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={content.weight ?? 1}
                  onChange={(e) => handleWeightChange(content.id, e.target.value)}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  aria-label={`Weight for ${content.content_name}`}
                />
                <Badge color="blue">{content.effectivePercent}%</Badge>
              </div>
            ) : (
              <Badge color="gray">{content.effectivePercent}%</Badge>
            )}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 font-medium" role="alert">
          {error}
        </p>
      )}

      {/* Distribution visualization bar */}
      {effectiveRotation.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 font-medium">Distribution</p>
          <div className="h-4 flex rounded-full overflow-hidden" role="img" aria-label="Content rotation distribution">
            {effectiveRotation.map((content, index) => (
              <div
                key={content.id}
                className={`${SEGMENT_COLORS[index % SEGMENT_COLORS.length]} transition-all duration-300`}
                style={{ width: `${content.effectivePercent}%` }}
                title={`${content.content_name}: ${content.effectivePercent}%`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RotationControls;
