/**
 * CalendarWidgetControls
 *
 * Configuration UI for the calendar widget type in both the scene editor
 * and layout editor properties panels. Provides calendar source management
 * with OAuth connect buttons, display options, and accent color picker.
 */

import { useState, useEffect } from 'react';
import { CalendarDays, X, Plus } from 'lucide-react';
import { getCalendarSources } from '../../services/calendarService';
import { startGoogleCalendarOAuth } from '../../services/cloud/googleCalendarService';
import { startOutlookCalendarOAuth } from '../../services/cloud/outlookCalendarService';

/**
 * @param {Object} params
 * @param {Object} params.props - Widget props from the block
 * @param {Function} params.onPropChange - Callback to update a single prop (key, value)
 */
export function CalendarWidgetControls({ props, onPropChange }) {
  const [availableSources, setAvailableSources] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedSources = props.sources || [];

  // ---------------------------------------------------------------------------
  // Load available calendar sources from the database
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadSources() {
      setLoading(true);
      try {
        const sources = await getCalendarSources();
        if (!cancelled) {
          setAvailableSources(sources);
        }
      } catch {
        // Silently fail -- user may not be authenticated
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSources();

    return () => { cancelled = true; };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleRemoveSource(sourceId) {
    const filtered = selectedSources.filter((s) => s.id !== sourceId);
    onPropChange('sources', filtered);
  }

  function handleAddSource(source) {
    // Avoid duplicates
    if (selectedSources.some((s) => s.id === source.id)) return;
    onPropChange('sources', [...selectedSources, source]);
    setShowAddPicker(false);
  }

  async function handleConnectGoogle() {
    setConnecting(true);
    try {
      await startGoogleCalendarOAuth();
    } catch {
      setConnecting(false);
    }
  }

  async function handleConnectOutlook() {
    setConnecting(true);
    try {
      await startOutlookCalendarOAuth();
    } catch {
      setConnecting(false);
    }
  }

  // Split available sources by provider for the add picker
  const googleSources = availableSources.filter((s) => s.provider === 'google_calendar');
  const outlookSources = availableSources.filter((s) => s.provider === 'outlook_calendar');

  // Sources not already selected
  const unselectedGoogle = googleSources.filter((s) => !selectedSources.some((sel) => sel.id === s.id));
  const unselectedOutlook = outlookSources.filter((s) => !selectedSources.some((sel) => sel.id === s.id));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      {/* Calendar Sources Section */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">
          <CalendarDays className="w-3 h-3 inline mr-1" />
          Calendar Sources
        </label>

        {/* Selected sources list */}
        {selectedSources.length > 0 && (
          <div className="space-y-1 mb-2">
            {selectedSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 text-xs"
              >
                <span className="font-medium text-gray-300">
                  {source.provider === 'google_calendar' ? (
                    <span className="text-red-400 mr-1">G</span>
                  ) : (
                    <span className="text-blue-400 mr-1">M</span>
                  )}
                  {source.label || source.calendarId || 'Calendar'}
                </span>
                <button
                  className="ml-auto text-gray-500 hover:text-red-400 transition-colors"
                  onClick={() => handleRemoveSource(source.id)}
                  title="Remove calendar"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Helper text when no sources connected */}
        {selectedSources.length === 0 && availableSources.length === 0 && !loading && (
          <p className="text-xs text-gray-500 mb-2">
            Connect a Google or Outlook calendar to display events
          </p>
        )}

        {/* Add Calendar button */}
        <button
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setShowAddPicker(!showAddPicker)}
        >
          <Plus className="w-3 h-3" />
          Add Calendar
        </button>

        {/* Add picker dropdown */}
        {showAddPicker && (
          <div className="mt-2 bg-gray-800 border border-gray-700 rounded p-2 space-y-2">
            {/* Google section */}
            <div>
              <span className="text-xs text-gray-400 font-medium">Google Calendar</span>
              {unselectedGoogle.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {unselectedGoogle.map((source) => (
                    <button
                      key={source.id}
                      className="block w-full text-left text-xs text-gray-300 hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                      onClick={() => handleAddSource(source)}
                    >
                      <span className="text-red-400 mr-1">G</span>
                      {source.label || source.calendarId}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  className="block w-full text-left text-xs text-gray-300 hover:bg-gray-700 rounded px-2 py-1 mt-1 transition-colors"
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                >
                  <span className="text-red-400 mr-1">G</span>
                  {connecting ? 'Connecting...' : 'Connect Google Calendar'}
                </button>
              )}
            </div>

            {/* Outlook section */}
            <div>
              <span className="text-xs text-gray-400 font-medium">Microsoft Outlook</span>
              {unselectedOutlook.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {unselectedOutlook.map((source) => (
                    <button
                      key={source.id}
                      className="block w-full text-left text-xs text-gray-300 hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                      onClick={() => handleAddSource(source)}
                    >
                      <span className="text-blue-400 mr-1">M</span>
                      {source.label || source.calendarId}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  className="block w-full text-left text-xs text-gray-300 hover:bg-gray-700 rounded px-2 py-1 mt-1 transition-colors"
                  onClick={handleConnectOutlook}
                  disabled={connecting}
                >
                  <span className="text-blue-400 mr-1">M</span>
                  {connecting ? 'Connecting...' : 'Connect Outlook Calendar'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Display Options Section */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Events to Show</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.maxEvents || 10}
          onChange={(e) => onPropChange('maxEvents', parseInt(e.target.value, 10))}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Refresh Interval</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.refreshIntervalMinutes || 5}
          onChange={(e) => onPropChange('refreshIntervalMinutes', parseInt(e.target.value, 10))}
        >
          <option value={1}>1 min</option>
          <option value={2}>2 min</option>
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
          <option value={30}>30 min</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showEndTime !== false}
          onChange={(e) => onPropChange('showEndTime', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show end time
      </label>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Theme</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.theme || 'dark'}
          onChange={(e) => onPropChange('theme', e.target.value)}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Accent Color</label>
        <input
          type="color"
          value={props.accentColor || '#3b82f6'}
          onChange={(e) => onPropChange('accentColor', e.target.value)}
          className="w-full h-8 cursor-pointer rounded border border-gray-700"
        />
      </div>
    </div>
  );
}
