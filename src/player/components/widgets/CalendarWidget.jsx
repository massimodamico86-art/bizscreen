/**
 * CalendarWidget
 *
 * Player widget that displays upcoming calendar events in an agenda/list format
 * with date grouping and auto-refresh. Supports multiple calendar sources
 * (Google Calendar + Outlook) per widget instance.
 *
 * Events are fetched via the calendar-proxy Edge Function (handles token refresh
 * and caching server-side). The widget reads directly from the Edge Function
 * to avoid service-layer dependencies in the player bundle.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, MapPin, AlertCircle } from 'lucide-react';
import { supabase } from '../../../supabase';

// ─── Time Formatting Helpers ─────────────────────────────────────────────────

/**
 * Format an ISO datetime string for display.
 * All-day events return "ALL DAY". Timed events return locale-aware time.
 */
function formatEventTime(isoString, allDay) {
  if (allDay) return 'ALL DAY';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Format a date for group headers.
 * Returns "Today", "Tomorrow", or "Wed, Mar 5" style.
 */
function formatDateHeader(dateStr) {
  const eventDate = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  // Compare date portions only (ignore time)
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  if (eventDay.getTime() === todayDay.getTime()) return 'Today';
  if (eventDay.getTime() === tomorrowDay.getTime()) return 'Tomorrow';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(eventDate);
}

/**
 * Get the date key (YYYY-MM-DD) from an ISO datetime string.
 */
function getDateKey(isoString) {
  try {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return 'unknown';
  }
}

/**
 * Group events by date for agenda display.
 * Returns array of { dateKey, dateLabel, events }.
 */
function groupEventsByDate(events) {
  const groups = {};
  const order = [];

  for (const event of events) {
    const key = getDateKey(event.startTime);
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(event);
  }

  return order.map((key) => ({
    dateKey: key,
    dateLabel: formatDateHeader(key),
    events: groups[key],
  }));
}

// ─── CalendarWidget Component ────────────────────────────────────────────────

/**
 * @param {Object} params
 * @param {Object} params.props - Widget props from registry defaultProps
 * @param {Array} [params.props.sources] - Calendar source references
 * @param {number} [params.props.refreshIntervalMinutes=5] - Minutes between refreshes
 * @param {number} [params.props.maxEvents=10] - Max events to display
 * @param {boolean} [params.props.showEndTime=true] - Show end time
 * @param {string} [params.props.textColor='#ffffff'] - Text color
 * @param {string} [params.props.accentColor='#3b82f6'] - Accent color
 * @param {string} [params.props.theme='dark'] - 'dark' or 'light'
 */
export function CalendarWidget({ props = {} }) {
  const {
    sources = [],
    refreshIntervalMinutes = 5,
    maxEvents = 10,
    showEndTime = true,
    textColor = '#ffffff',
    accentColor = '#3b82f6',
    theme = 'dark',
  } = props;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [_lastRefresh, setLastRefresh] = useState(null);
  const intervalRef = useRef(null);

  // Derive text colors from theme
  const primaryText = theme === 'light' ? '#1e293b' : textColor;
  const secondaryText = theme === 'light' ? '#64748b' : '#9ca3af';
  const dividerColor = theme === 'light' ? '#e2e8f0' : '#374151';

  // ─── Fetch Events ──────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    const sourceIds = (sources || []).map((s) => s.id).filter(Boolean);
    if (sourceIds.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const results = await Promise.all(
        sourceIds.map((sourceId) =>
          supabase.functions
            .invoke('calendar-proxy', {
              body: { action: 'fetch', sourceId },
            })
            .then(({ data, error: fnError }) => {
              if (fnError) return [];
              return data?.ok ? data.data || [] : [];
            })
            .catch(() => [])
        )
      );

      // Merge, sort by startTime, and slice to maxEvents
      const merged = results.flat();
      merged.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const sliced = merged.slice(0, maxEvents);

      setEvents(sliced);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      // Graceful degradation: keep previous events on error
      setError(err.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [sources, maxEvents]);

  // ─── Initial Fetch ─────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    fetchEvents();
  }, [fetchEvents]);

  // ─── Auto-Refresh Interval ────────────────────────────────────────

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const ms = refreshIntervalMinutes * 60 * 1000;
    if (ms > 0) {
      intervalRef.current = setInterval(fetchEvents, ms);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshIntervalMinutes, fetchEvents]);

  // ─── Render ────────────────────────────────────────────────────────

  const containerStyle = {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    padding: 16,
    boxSizing: 'border-box',
  };

  // Loading state (initial)
  if (loading && events.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #374151',
            borderTopColor: accentColor,
            borderRadius: '50%',
            animation: 'calSpin 1s linear infinite',
          }}
        />
        <span style={{ color: secondaryText, fontSize: 14 }}>Loading events...</span>
        <style>{`@keyframes calSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // No sources connected
  if (!sources || sources.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <CalendarDays style={{ width: 48, height: 48, color: '#6b7280' }} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>No calendars connected</span>
      </div>
    );
  }

  // Error state (no events available)
  if (error && events.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <AlertCircle style={{ width: 48, height: 48, color: '#ef4444' }} />
        <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
      </div>
    );
  }

  // No upcoming events
  if (events.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <CalendarDays style={{ width: 48, height: 48, color: secondaryText }} />
        <span style={{ color: secondaryText, fontSize: 14 }}>No upcoming events</span>
      </div>
    );
  }

  // Event list with date grouping
  const dateGroups = groupEventsByDate(events);

  return (
    <div style={containerStyle}>
      {dateGroups.map((group, gi) => (
        <div key={group.dateKey} style={{ marginBottom: gi < dateGroups.length - 1 ? 16 : 0 }}>
          {/* Date group header */}
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: accentColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              paddingBottom: 6,
              marginBottom: 8,
              borderTop: gi > 0 ? `1px solid ${dividerColor}` : 'none',
              paddingTop: gi > 0 ? 12 : 0,
            }}
          >
            {group.dateLabel}
          </div>

          {/* Events in this date group */}
          {group.events.map((event, ei) => (
            <div
              key={event.id || `${group.dateKey}-${ei}`}
              style={{
                display: 'flex',
                gap: 12,
                paddingBottom: 10,
                marginBottom: 10,
                borderBottom: ei < group.events.length - 1 ? `1px solid ${dividerColor}` : 'none',
              }}
            >
              {/* Left column: time */}
              <div style={{ minWidth: 60, flexShrink: 0, textAlign: 'right' }}>
                {event.allDay ? (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#ffffff',
                      backgroundColor: accentColor,
                      padding: '2px 6px',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    All Day
                  </span>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: primaryText }}>
                      {formatEventTime(event.startTime, false)}
                    </div>
                    {showEndTime && event.endTime && (
                      <div style={{ fontSize: 11, color: secondaryText }}>
                        {formatEventTime(event.endTime, false)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right column: event details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: primaryText,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: 1.3,
                  }}
                >
                  {event.title || 'Untitled Event'}
                </div>
                {event.location && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 4,
                      fontSize: 12,
                      color: secondaryText,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
