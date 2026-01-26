/**
 * DaypartPicker Component
 *
 * A dropdown picker that allows users to quickly apply predefined time blocks
 * (dayparts) to schedule entries. Includes system presets (meal-based and
 * period-based) and user's custom presets.
 *
 * Features:
 * - Grouped dropdown: Meal-based, Period-based, Custom presets
 * - Time range display in friendly format (e.g., "Breakfast (6:00 AM - 10:00 AM)")
 * - Create custom preset option with inline form
 * - Disabled state for form integration
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Clock, Loader2, X, Check } from 'lucide-react';
import { getDaypartPresetsGrouped, createDaypartPreset } from '../../services/daypartService';
import { useLogger } from '../../hooks/useLogger.js';

/**
 * Format time from 24-hour to 12-hour format
 * @param {string} time24 - Time in HH:mm or HH:mm:ss format
 * @returns {string} Time in h:mm AM/PM format
 */
const formatTime12 = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

/**
 * Days of week options for custom preset form
 */
const DAYS_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

/**
 * DaypartPicker Component
 *
 * @param {Object} props
 * @param {Function} props.onApply - Callback when preset is selected, receives full preset object
 * @param {boolean} [props.disabled=false] - Disable the picker
 * @param {boolean} [props.showCreateOption=true] - Show option to create custom preset
 * @param {string} [props.className=''] - Additional CSS classes
 */
export function DaypartPicker({
  onApply,
  disabled = false,
  showCreateOption = true,
  className = ''
}) {
  const logger = useLogger('DaypartPicker');

  // State
  const [presets, setPresets] = useState({ meal: [], period: [], custom: [] });
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newPreset, setNewPreset] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
  });

  // Load presets on mount
  const loadPresets = useCallback(async () => {
    try {
      setLoading(true);
      const grouped = await getDaypartPresetsGrouped();
      setPresets(grouped);
    } catch (err) {
      logger.error('Failed to load daypart presets', { error: err.message });
    } finally {
      setLoading(false);
    }
  }, [logger]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Handle preset selection
  const handleSelect = (preset) => {
    logger.debug('Selected daypart preset', { presetId: preset.id, name: preset.name });
    onApply?.(preset);
    setIsOpen(false);
  };

  // Handle create custom preset
  const handleCreate = async () => {
    if (!newPreset.name.trim()) {
      return;
    }

    try {
      setCreating(true);
      const created = await createDaypartPreset({
        name: newPreset.name.trim(),
        startTime: newPreset.startTime,
        endTime: newPreset.endTime,
        daysOfWeek: newPreset.daysOfWeek
      });

      // Refresh presets and apply the new one
      await loadPresets();
      handleSelect(created);
      setShowCreateForm(false);
      setNewPreset({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
      });
    } catch (err) {
      logger.error('Failed to create daypart preset', { error: err.message });
    } finally {
      setCreating(false);
    }
  };

  // Toggle day in selection
  const toggleDay = (dayValue) => {
    setNewPreset(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(dayValue)
        ? prev.daysOfWeek.filter(d => d !== dayValue)
        : [...prev.daysOfWeek, dayValue].sort((a, b) => a - b)
    }));
  };

  // Render a single preset option
  const renderPresetOption = (preset) => (
    <button
      key={preset.id}
      onClick={() => handleSelect(preset)}
      className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
    >
      <Clock size={14} className="text-gray-400 shrink-0" />
      <span className="font-medium">{preset.name}</span>
      <span className="text-gray-500 text-xs">
        ({formatTime12(preset.start_time)} - {formatTime12(preset.end_time)})
      </span>
    </button>
  );

  // Check if there are any presets to show
  const hasPresets = presets.meal.length > 0 || presets.period.length > 0 || presets.custom.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          border rounded-lg text-sm transition-colors
          ${disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 cursor-pointer'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-gray-400" />
          <span>Quick Apply Time Block</span>
        </div>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : (
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {!hasPresets ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No presets available
            </div>
          ) : (
            <>
              {/* Meal-based presets */}
              {presets.meal.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    Meal-based
                  </div>
                  {presets.meal.map(renderPresetOption)}
                </div>
              )}

              {/* Period-based presets */}
              {presets.period.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    Period-based
                  </div>
                  {presets.period.map(renderPresetOption)}
                </div>
              )}

              {/* Custom presets */}
              {presets.custom.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    Custom
                  </div>
                  {presets.custom.map(renderPresetOption)}
                </div>
              )}
            </>
          )}

          {/* Create Custom Option */}
          {showCreateOption && (
            <>
              <div className="border-t border-gray-200" />

              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm text-[#f26f21]"
                >
                  <Plus size={14} />
                  <span>Create Custom Preset...</span>
                </button>
              ) : (
                <div className="p-3 space-y-3 bg-gray-50">
                  {/* Name input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={newPreset.name}
                      onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Happy Hour"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                    />
                  </div>

                  {/* Time inputs */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                      <input
                        type="time"
                        value={newPreset.startTime}
                        onChange={(e) => setNewPreset(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                      <input
                        type="time"
                        value={newPreset.endTime}
                        onChange={(e) => setNewPreset(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                  </div>

                  {/* Days of week */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                    <div className="flex gap-1">
                      {DAYS_OPTIONS.map(day => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => toggleDay(day.value)}
                          className={`
                            w-8 h-8 text-xs rounded transition-colors
                            ${newPreset.daysOfWeek.includes(day.value)
                              ? 'bg-[#f26f21] text-white'
                              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }
                          `}
                        >
                          {day.label.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300 flex items-center justify-center gap-1"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={!newPreset.name.trim() || creating}
                      className="flex-1 px-3 py-1.5 text-sm text-white bg-[#f26f21] rounded hover:bg-[#e05a10] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {creating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

export default DaypartPicker;
