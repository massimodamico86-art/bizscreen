// src/Player.jsx - Playlist Player for TV devices
// Supports both playlist mode and layout mode (multi-zone)
// Phase 17: Added offline mode, auto-recovery, and kiosk mode support
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import * as analytics from './services/playerAnalyticsService';
import {
  pollForCommand,
  reportCommandResult,
  updateDeviceStatus,
  initOfflineCache,
  cacheContent,
  getCachedContent,
  clearCache,
  generateContentHash,
  getConnectionStatus,
  onConnectionStatusChange,
  setConnectionStatus as setPlayerConnectionStatus,
  calculateBackoff,
  isFullscreen,
  enterFullscreen,
  exitFullscreen,
  validateKioskPassword,
  COMMAND_POLL_INTERVAL,
  HEARTBEAT_INTERVAL
} from './services/playerService';

// API base URL for app data fetching
const API_BASE = '';

// Storage keys
const STORAGE_KEYS = {
  screenId: 'player_screen_id',
  playlistId: 'player_playlist_id',
  contentHash: 'player_content_hash',
  kioskMode: 'player_kiosk_mode',
  kioskPassword: 'player_kiosk_password',
  lastActivity: 'player_last_activity'
};

// Player version for heartbeats
const PLAYER_VERSION = '1.1.0';

// Stuck detection thresholds
const STUCK_DETECTION = {
  maxVideoStallMs: 30000, // 30 seconds without video progress
  maxNoActivityMs: 300000, // 5 minutes without any activity
  checkIntervalMs: 10000 // Check every 10 seconds
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  baseDelayMs: 2000,
  maxDelayMs: 60000
};

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt) {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // Add jitter (0-25% of delay)
  return delay + Math.random() * delay * 0.25;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff(fn, maxRetries = RETRY_CONFIG.maxRetries) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// Player service functions using new resolved content RPC
async function getResolvedContentByOtp(otp) {
  const { data, error } = await supabase.rpc('get_resolved_player_content_by_otp', { p_otp: otp });
  if (error) throw error;
  return data;
}

async function getResolvedContent(screenId) {
  const { data, error } = await supabase.rpc('get_resolved_player_content', { p_screen_id: screenId });
  if (error) throw error;
  return data;
}

async function sendHeartbeat(screenId) {
  await supabase.rpc('player_heartbeat', { p_screen_id: screenId });
}

// ============================================================================
// APP DATA HOOK & DYNAMIC WIDGETS
// ============================================================================

/**
 * Hook for fetching and caching app data from the backend
 */
function useAppData(appId, config, refreshMinutes = 10) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const cacheKeyRef = useRef(null);

  // Generate cache key
  const cacheKey = useMemo(() => {
    return `app_data_${appId || JSON.stringify(config)}`;
  }, [appId, config]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      let url = `${API_BASE}/api/apps/data`;
      if (appId) {
        url += `?appId=${encodeURIComponent(appId)}`;
      } else if (config) {
        url += `?config=${encodeURIComponent(JSON.stringify(config))}`;
      } else {
        throw new Error('No appId or config provided');
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch app data: ${res.status}`);
      }

      const result = await res.json();
      if (result.success && result.data) {
        setData(result.data);
        setError(null);
        // Cache in sessionStorage
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            data: result.data,
            fetchedAt: Date.now()
          }));
        } catch (e) {
          // Ignore storage errors
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('[useAppData] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appId, config, cacheKey]);

  // Initial load
  useEffect(() => {
    // Check cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data: cachedData, fetchedAt } = JSON.parse(cached);
        const ageMinutes = (Date.now() - fetchedAt) / 60000;
        if (ageMinutes < refreshMinutes) {
          setData(cachedData);
          setLoading(false);
          // Still fetch in background to refresh
          fetchData();
          return;
        }
      }
    } catch (e) {
      // Ignore cache errors
    }

    fetchData();
  }, [cacheKey, refreshMinutes, fetchData]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshMinutes > 0) {
      intervalRef.current = setInterval(fetchData, refreshMinutes * 60 * 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshMinutes, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Weather App - Displays current weather and forecast
 */
function WeatherApp({ config, appId }) {
  const refreshMinutes = config?.refreshMinutes || 10;
  const { data, loading, error } = useAppData(appId, config, refreshMinutes);

  // Loading state
  if (loading && !data) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>Loading weather...</p>
      </div>
    );
  }

  // Use data or fallback
  const weather = data || {
    locationName: config?.locationName || 'Weather',
    current: { temp: '--', condition: 'Loading...', icon: 'cloud' },
    forecast: []
  };

  const isCompact = config?.layoutStyle === 'compact' || weather.layoutStyle === 'compact';
  const theme = config?.theme || weather.theme || 'auto';
  const isDark = theme === 'dark' || (theme === 'auto' && true);

  // Weather icon component
  const WeatherIcon = ({ icon, size = 48 }) => {
    const icons = {
      sun: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ),
      moon: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ),
      cloud: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
      ),
      'cloud-sun': (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M17.66 17.66l1.41 1.41M2 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          <circle cx="12" cy="10" r="4" />
          <path d="M17 18h-1.26A8 8 0 1 0 9 20h8a4 4 0 0 0 0-8z" />
        </svg>
      ),
      'cloud-rain': (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <path d="M8 19v2M12 19v2M16 19v2" />
        </svg>
      ),
      'cloud-lightning': (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
          <path d="M13 11l-4 6h5l-2 4" />
        </svg>
      ),
      snowflake: (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 7l-5 5-5-5M17 17l-5-5-5 5M2 12h20M7 7l5 5 5-5M7 17l5-5 5 5" />
        </svg>
      )
    };
    return icons[icon] || icons.cloud;
  };

  const bgGradient = isDark
    ? 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)'
    : 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: bgGradient,
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      padding: isCompact ? '1rem' : '2rem'
    }}>
      {/* Location */}
      <p style={{
        fontSize: isCompact ? '1rem' : '1.25rem',
        opacity: 0.8,
        marginBottom: '0.5rem'
      }}>
        {weather.locationName}
      </p>

      {/* Current weather */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCompact ? '1rem' : '2rem',
        marginBottom: isCompact ? '1rem' : '2rem'
      }}>
        <WeatherIcon icon={weather.current?.icon} size={isCompact ? 48 : 72} />
        <div>
          <p style={{
            fontSize: isCompact ? '3rem' : '5rem',
            fontWeight: '200',
            lineHeight: 1
          }}>
            {weather.current?.temp}°
          </p>
          <p style={{
            fontSize: isCompact ? '0.875rem' : '1.125rem',
            opacity: 0.8,
            textTransform: 'capitalize'
          }}>
            {weather.current?.condition}
          </p>
        </div>
      </div>

      {/* Forecast (only in detailed mode) */}
      {!isCompact && weather.forecast && weather.forecast.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          paddingTop: '1.5rem'
        }}>
          {weather.forecast.slice(0, 5).map((day, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', opacity: 0.7, marginBottom: '0.5rem' }}>{day.day}</p>
              <WeatherIcon icon={day.icon} size={24} />
              <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {day.high}° / {day.low}°
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Demo indicator */}
      {weather.isDemo && (
        <p style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          fontSize: '0.625rem',
          opacity: 0.5
        }}>
          Demo Data
        </p>
      )}
    </div>
  );
}

/**
 * RSS Ticker App - Scrolling news ticker
 */
function RssTickerApp({ config, appId }) {
  const refreshMinutes = config?.refreshMinutes || 10;
  const { data, loading, error } = useAppData(appId, config, refreshMinutes);
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation when data changes
  useEffect(() => {
    if (data) {
      setAnimationKey(k => k + 1);
    }
  }, [data]);

  // Loading state
  if (loading && !data) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e293b',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>Loading news...</p>
      </div>
    );
  }

  const rss = data || {
    title: 'News',
    items: [{ title: 'Loading...', publishedAt: null, source: '' }]
  };

  // Scroll speed mapping
  const scrollSpeeds = {
    slow: 60,
    medium: 40,
    fast: 20
  };
  const scrollSpeed = scrollSpeeds[config?.scrollSpeed || rss.scrollSpeed || 'medium'];
  const animationDuration = `${(rss.items?.length || 1) * scrollSpeed}s`;

  // Build ticker content
  const tickerContent = rss.items?.map((item, i) => (
    <span key={i} style={{ marginRight: '4rem', whiteSpace: 'nowrap' }}>
      <span style={{ fontWeight: '600' }}>{item.title}</span>
      {item.source && (
        <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>— {item.source}</span>
      )}
    </span>
  ));

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Title bar */}
      {rss.title && (
        <div style={{
          padding: '0.75rem 1.5rem',
          background: '#1e293b',
          borderBottom: '2px solid #3b82f6',
          flexShrink: 0
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0
          }}>
            {rss.title}
          </h3>
        </div>
      )}

      {/* Scrolling ticker */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <style>{`
          @keyframes ticker-scroll-${animationKey} {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
        <div
          key={animationKey}
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: `ticker-scroll-${animationKey} ${animationDuration} linear infinite`,
            fontSize: '1.5rem',
            paddingLeft: '100%'
          }}
        >
          {tickerContent}
          {tickerContent} {/* Duplicate for seamless loop */}
        </div>
      </div>

      {/* Demo indicator */}
      {rss.isDemo && (
        <p style={{
          position: 'absolute',
          bottom: '0.25rem',
          right: '0.5rem',
          fontSize: '0.625rem',
          opacity: 0.5
        }}>
          Demo Data
        </p>
      )}
    </div>
  );
}

/**
 * Data Table App - Displays tabular data (menu, schedules, etc.)
 */
function DataTableApp({ config, appId }) {
  const refreshMinutes = config?.refreshMinutes || 10;
  const { data, loading, error } = useAppData(appId, config, refreshMinutes);

  // Loading state
  if (loading && !data) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
        color: '#1e293b',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>Loading data...</p>
      </div>
    );
  }

  const table = data || {
    title: 'Menu',
    subtitle: '',
    headers: ['Item', 'Description', 'Price'],
    rows: []
  };

  const theme = config?.theme || table.theme || 'light';
  const isDark = theme === 'dark';

  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const headerBg = isDark ? '#1e293b' : '#f1f5f9';
  const rowBg = isDark ? '#0f172a' : '#ffffff';
  const altRowBg = isDark ? '#1e293b' : '#f8fafc';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: bgColor,
      color: textColor,
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Header */}
      {(table.title || table.subtitle) && (
        <div style={{
          padding: '1.5rem',
          background: headerBg,
          textAlign: 'center',
          borderBottom: `2px solid ${borderColor}`,
          flexShrink: 0
        }}>
          {table.title && (
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              margin: 0,
              marginBottom: table.subtitle ? '0.25rem' : 0
            }}>
              {table.title}
            </h2>
          )}
          {table.subtitle && (
            <p style={{
              fontSize: '1rem',
              opacity: 0.7,
              margin: 0
            }}>
              {table.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '1.125rem'
        }}>
          {table.headers && table.headers.length > 0 && (
            <thead>
              <tr style={{ background: headerBg }}>
                {table.headers.map((header, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '1rem',
                      textAlign: i === 0 ? 'left' : 'center',
                      fontWeight: '600',
                      borderBottom: `2px solid ${borderColor}`
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows?.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  background: rowIndex % 2 === 0 ? rowBg : altRowBg,
                  borderBottom: `1px solid ${borderColor}`
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: '1rem',
                      textAlign: cellIndex === 0 ? 'left' : 'center',
                      fontWeight: cellIndex === 0 ? '500' : '400'
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Has more indicator */}
        {table.hasMore && (
          <p style={{
            textAlign: 'center',
            padding: '1rem',
            opacity: 0.6,
            fontSize: '0.875rem'
          }}>
            +{table.totalRows - table.rows.length} more items
          </p>
        )}
      </div>

      {/* Demo indicator */}
      {table.isDemo && (
        <p style={{
          position: 'absolute',
          bottom: '0.25rem',
          right: '0.5rem',
          fontSize: '0.625rem',
          opacity: 0.5
        }}>
          Demo Data
        </p>
      )}
    </div>
  );
}

/**
 * App Renderer - Renders different app types (clock, web page, etc.)
 */
function AppRenderer({ item, timezone }) {
  const config = item.config || {};
  const appType = config.appType;
  const appId = item.id;

  // Clock App
  if (appType === 'clock') {
    return <ClockApp config={config} deviceTimezone={timezone} />;
  }

  // Web Page App
  if (appType === 'web_page') {
    return <WebPageApp config={config} name={item.name} />;
  }

  // Weather App
  if (appType === 'weather') {
    return <WeatherApp config={config} appId={appId} />;
  }

  // RSS Ticker App
  if (appType === 'rss_ticker') {
    return <RssTickerApp config={config} appId={appId} />;
  }

  // Data Table App (Menu, Schedules, etc.)
  if (appType === 'data_table') {
    return <DataTableApp config={config} appId={appId} />;
  }

  // Unknown app type - show placeholder
  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '6rem',
          height: '6rem',
          background: 'rgba(59, 130, 246, 0.2)',
          borderRadius: '1.5rem',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        </div>
        <p style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {item.name}
        </p>
        <p style={{ color: '#64748b' }}>App: {appType || 'Unknown'}</p>
      </div>
    </div>
  );
}

/**
 * Clock App - Displays current time and date
 */
function ClockApp({ config, deviceTimezone }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine timezone to use
  const tz = config.timezone === 'device' ? deviceTimezone : config.timezone;

  // Format time
  const formatTime = () => {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: config.format?.includes('A') || config.format?.includes('a')
    };
    if (config.showSeconds) {
      options.second = '2-digit';
    }
    if (tz && tz !== 'device') {
      options.timeZone = tz;
    }
    return time.toLocaleTimeString('en-US', options);
  };

  // Format date
  const formatDate = () => {
    const options = {
      weekday: config.dateFormat?.includes('dddd') ? 'long' : undefined,
      month: config.dateFormat?.includes('MMMM') ? 'long' :
             config.dateFormat?.includes('MMM') ? 'short' : '2-digit',
      day: 'numeric',
      year: config.dateFormat?.includes('YYYY') ? 'numeric' : undefined
    };
    if (tz && tz !== 'device') {
      options.timeZone = tz;
    }
    return time.toLocaleDateString('en-US', options);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: 'clamp(4rem, 15vw, 12rem)',
          fontWeight: '200',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          marginBottom: '1rem'
        }}>
          {formatTime()}
        </p>
        {config.showDate !== false && (
          <p style={{
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
            color: '#94a3b8',
            fontWeight: '300'
          }}>
            {formatDate()}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Web Page App - Displays an embedded web page
 */
function WebPageApp({ config, name }) {
  const iframeRef = useRef(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-refresh
  useEffect(() => {
    if (config.refreshSeconds && config.refreshSeconds > 0) {
      const interval = setInterval(() => {
        setRefreshKey(k => k + 1);
      }, config.refreshSeconds * 1000);
      return () => clearInterval(interval);
    }
  }, [config.refreshSeconds]);

  if (!config.url) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <p>No URL configured</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      key={refreshKey}
      src={config.url}
      title={name || 'Web Page'}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        transform: config.zoomLevel ? `scale(${config.zoomLevel})` : undefined,
        transformOrigin: 'top left'
      }}
    />
  );
}

/**
 * Zone Player - Plays content in a single zone (used by LayoutRenderer)
 */
function ZonePlayer({ zone, timezone, screenId, tenantId, layoutId, campaignId }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (zone.content?.type === 'playlist' && zone.content.items) {
      setItems(zone.content.items);
      setCurrentIndex(0);
    } else if (zone.content?.type === 'media' && zone.content.item) {
      setItems([zone.content.item]);
      setCurrentIndex(0);
    } else {
      setItems([]);
    }
  }, [zone]);

  // Track playback analytics for zone items
  useEffect(() => {
    if (items.length === 0 || !screenId) return;
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Start tracking this item
    analytics.startPlaybackEvent({
      screenId,
      tenantId,
      locationId: null,
      playlistId: zone.content?.playlist?.id || null,
      layoutId,
      zoneId: zone.id,
      mediaId: currentItem.mediaType !== 'app' ? currentItem.id : null,
      appId: currentItem.mediaType === 'app' ? currentItem.id : null,
      campaignId: campaignId || null,
      itemType: currentItem.mediaType === 'app' ? 'app' : 'media',
      itemName: currentItem.name,
    });

    // End tracking on cleanup
    return () => {
      analytics.endPlaybackEvent();
    };
  }, [currentIndex, items, screenId, tenantId, layoutId, zone.id, zone.content?.playlist?.id, campaignId]);

  const advanceToNext = useCallback(() => {
    if (items.length <= 1) return;
    analytics.endPlaybackEvent(); // End current before advancing
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  // Timer for duration-based advancement
  useEffect(() => {
    if (items.length === 0) return;
    const currentItem = items[currentIndex];
    if (!currentItem || currentItem.mediaType === 'video') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const duration = (currentItem.duration || zone.content?.playlist?.defaultDuration || 10) * 1000;
    timerRef.current = setTimeout(advanceToNext, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items, zone.content?.playlist?.defaultDuration, advanceToNext]);

  if (!zone.content || items.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '0.875rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>{zone.zone_name}</p>
          <p style={{ opacity: 0.5 }}>No content</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={advanceToNext}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'image' ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.name}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'app' ? (
        <AppRenderer item={currentItem} timezone={timezone} />
      ) : currentItem.mediaType === 'web_page' ? (
        <iframe
          key={currentItem.id}
          src={currentItem.url}
          title={currentItem.name}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e293b',
          color: 'white'
        }}>
          <p>{currentItem.name}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Layout Renderer - Renders multi-zone layout
 */
function LayoutRenderer({ layout, timezone, screenId, tenantId, campaignId }) {
  if (!layout || !layout.zones || layout.zones.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{layout?.name || 'Layout'}</p>
          <p style={{ color: '#64748b' }}>No zones configured</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: '#000'
    }}>
      {layout.zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            position: 'absolute',
            left: `${zone.x_percent}%`,
            top: `${zone.y_percent}%`,
            width: `${zone.width_percent}%`,
            height: `${zone.height_percent}%`,
            zIndex: zone.z_index || 0,
            overflow: 'hidden'
          }}
        >
          <ZonePlayer
            zone={zone}
            timezone={timezone}
            screenId={screenId}
            tenantId={tenantId}
            layoutId={layout.id}
            campaignId={campaignId}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Pairing Page - Enter OTP code to connect TV
 */
function PairPage() {
  const navigate = useNavigate();
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);

  // Check if already paired on mount, and check for demo OTP
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (screenId) {
      navigate('/player/view', { replace: true });
      return;
    }

    // Check for demo OTP hint
    const storedDemoOtp = localStorage.getItem('lastDemoOtp');
    if (storedDemoOtp) {
      setDemoOtp(storedDemoOtp);
    }
  }, [navigate]);

  const useDemoCode = () => {
    if (demoOtp) {
      setOtpInput(demoOtp);
    }
  };

  const handlePair = async (e) => {
    e.preventDefault();
    const code = otpInput.trim().toUpperCase();

    if (!code) {
      setError('Please enter an OTP code');
      return;
    }

    if (code.length !== 6) {
      setError('OTP code must be 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getResolvedContentByOtp(code);

      // Store screen ID for future use (returned by the fixed RPC)
      localStorage.setItem(STORAGE_KEYS.screenId, data.screenId);
      // Store content hash for change detection (new format uses 'type' not 'mode')
      localStorage.setItem(STORAGE_KEYS.contentHash, JSON.stringify({
        type: data.type,
        source: data.source,
        playlistId: data.playlist?.id,
        layoutId: data.layout?.id,
        campaignId: data.campaign?.id
      }));

      // Navigate to player view
      navigate('/player/view', { replace: true });
    } catch (err) {
      console.error('Pairing error:', err);
      setError(err.message || 'Failed to pair device. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '1.5rem',
        padding: '3rem',
        maxWidth: '28rem',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Logo */}
        <div style={{
          width: '5rem',
          height: '5rem',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          borderRadius: '1.25rem',
          margin: '0 auto 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1e293b',
          marginBottom: '0.5rem'
        }}>
          Connect Your Screen
        </h1>

        <p style={{
          color: '#64748b',
          marginBottom: '1rem',
          fontSize: '1rem'
        }}>
          Enter the 6-digit code from your BizScreen dashboard
        </p>

        {/* Demo OTP hint */}
        {demoOtp && !otpInput && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <p style={{
              color: '#166534',
              fontSize: '0.875rem',
              margin: 0
            }}>
              Demo code available: <code style={{ fontWeight: '600' }}>{demoOtp}</code>
            </p>
            <button
              type="button"
              onClick={useDemoCode}
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Use Code
            </button>
          </div>
        )}

        <form onSubmit={handlePair}>
          <input
            type="text"
            value={otpInput}
            onChange={(e) => setOtpInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            autoComplete="off"
            style={{
              width: '100%',
              padding: '1.25rem',
              fontSize: '2rem',
              textAlign: 'center',
              letterSpacing: '0.75rem',
              border: '2px solid #e2e8f0',
              borderRadius: '0.75rem',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontWeight: '600',
              color: '#1e293b',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
          />

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otpInput.length !== 6}
            style={{
              width: '100%',
              padding: '1rem',
              background: loading || otpInput.length !== 6
                ? '#94a3b8'
                : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              fontSize: '1.125rem',
              fontWeight: '600',
              cursor: loading || otpInput.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: loading || otpInput.length !== 6
                ? 'none'
                : '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
            }}
          >
            {loading ? 'Connecting...' : 'Connect Screen'}
          </button>
        </form>

        <p style={{
          marginTop: '2rem',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          Find your code in Screens &rarr; Add Screen
        </p>
      </div>
    </div>
  );
}

/**
 * Player View Page - Full-screen slideshow playback
 */
function ViewPage() {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting', 'connected', 'reconnecting', 'offline'
  const [retryCount, setRetryCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [showKioskExit, setShowKioskExit] = useState(false);
  const [kioskPasswordInput, setKioskPasswordInput] = useState('');
  const [kioskPasswordError, setKioskPasswordError] = useState('');

  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const commandPollRef = useRef(null);
  const heartbeatRef = useRef(null);
  const stuckDetectionRef = useRef(null);
  const lastVideoTimeRef = useRef(0);
  const lastActivityRef = useRef(Date.now());

  // Initialize analytics session on mount
  useEffect(() => {
    analytics.initSession();
    return () => {
      analytics.stopSession();
    };
  }, []);

  // Initialize offline cache and kiosk mode on mount
  useEffect(() => {
    const init = async () => {
      // Initialize IndexedDB cache
      try {
        await initOfflineCache();
        console.log('Offline cache initialized');
      } catch (err) {
        console.warn('Failed to initialize offline cache:', err);
      }

      // Check for kiosk mode setting
      const savedKioskMode = localStorage.getItem(STORAGE_KEYS.kioskMode);
      if (savedKioskMode === 'true') {
        setKioskMode(true);
        // Enter fullscreen for kiosk mode
        enterFullscreen().catch(console.warn);
      }
    };
    init();
  }, []);

  // Command polling - check for device commands every 10 seconds
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    const pollCommands = async () => {
      try {
        const command = await pollForCommand(screenId);
        if (command) {
          console.log('Received command:', command);
          await handleCommand(command);
        }
      } catch (err) {
        console.error('Command poll error:', err);
      }
    };

    // Poll immediately, then on interval
    pollCommands();
    commandPollRef.current = setInterval(pollCommands, COMMAND_POLL_INTERVAL);

    return () => {
      if (commandPollRef.current) {
        clearInterval(commandPollRef.current);
      }
    };
  }, []);

  // Heartbeat - update device status every 30 seconds
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    const sendBeat = async () => {
      try {
        const contentHash = localStorage.getItem(STORAGE_KEYS.contentHash);
        await updateDeviceStatus(screenId, PLAYER_VERSION, contentHash);
        lastActivityRef.current = Date.now();
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    };

    sendBeat();
    heartbeatRef.current = setInterval(sendBeat, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  // Stuck detection - auto-recovery for stalled playback
  useEffect(() => {
    const checkStuck = () => {
      const now = Date.now();

      // Check for video stall
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const currentTime = videoRef.current.currentTime;
        if (currentTime === lastVideoTimeRef.current) {
          // Video hasn't progressed
          const stallDuration = now - (lastActivityRef.current || now);
          if (stallDuration > STUCK_DETECTION.maxVideoStallMs) {
            console.warn('Video stuck detected, attempting recovery...');
            // Try to restart video
            try {
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(console.error);
            } catch (err) {
              console.error('Video recovery failed:', err);
              // Skip to next item as fallback
              advanceToNext?.();
            }
            lastActivityRef.current = now;
          }
        } else {
          lastVideoTimeRef.current = currentTime;
          lastActivityRef.current = now;
        }
      }

      // Check for general inactivity (page might be frozen)
      const inactiveDuration = now - lastActivityRef.current;
      if (inactiveDuration > STUCK_DETECTION.maxNoActivityMs) {
        console.warn('Player inactive for too long, reloading...');
        window.location.reload();
      }
    };

    stuckDetectionRef.current = setInterval(checkStuck, STUCK_DETECTION.checkIntervalMs);

    return () => {
      if (stuckDetectionRef.current) {
        clearInterval(stuckDetectionRef.current);
      }
    };
  }, []);

  // Handle device commands
  const handleCommand = useCallback(async (command) => {
    const { commandId, commandType } = command;

    try {
      switch (commandType) {
        case 'reboot':
          await reportCommandResult(commandId, true);
          setTimeout(() => window.location.reload(), 500);
          break;

        case 'reload':
          await reportCommandResult(commandId, true);
          const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
          if (screenId) {
            try {
              const newContent = await getResolvedContent(screenId);
              setContent(newContent);
              // New format uses 'type' instead of 'mode', and items are in playlist.items
              if (newContent.type === 'playlist') {
                setItems(newContent.playlist?.items || []);
                setCurrentIndex(0);
              }
            } catch (err) {
              console.error('Content reload failed:', err);
            }
          }
          break;

        case 'clear_cache':
          await clearCache();
          await reportCommandResult(commandId, true);
          break;

        case 'reset':
          await clearCache();
          localStorage.clear();
          sessionStorage.clear();
          await reportCommandResult(commandId, true);
          setTimeout(() => window.location.reload(), 500);
          break;

        default:
          console.warn('Unknown command:', commandType);
          await reportCommandResult(commandId, false, 'Unknown command');
      }
    } catch (err) {
      console.error('Command execution failed:', err);
      await reportCommandResult(commandId, false, err.message);
    }
  }, []);

  // Kiosk mode keyboard handler (Escape to show exit dialog)
  useEffect(() => {
    if (!kioskMode) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowKioskExit(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [kioskMode]);

  // Re-enter fullscreen if exited in kiosk mode
  useEffect(() => {
    if (!kioskMode) return;

    const handleFullscreenChange = () => {
      if (!isFullscreen() && kioskMode) {
        // Re-enter fullscreen after a short delay
        setTimeout(() => {
          enterFullscreen().catch(console.warn);
        }, 100);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [kioskMode]);

  // Handle kiosk exit
  const handleKioskExit = useCallback(() => {
    const savedPassword = localStorage.getItem(STORAGE_KEYS.kioskPassword);
    if (savedPassword && kioskPasswordInput !== savedPassword) {
      setKioskPasswordError('Incorrect password');
      return;
    }

    // Exit kiosk mode
    setKioskMode(false);
    setShowKioskExit(false);
    setKioskPasswordInput('');
    setKioskPasswordError('');
    localStorage.setItem(STORAGE_KEYS.kioskMode, 'false');
    exitFullscreen().catch(console.warn);
  }, [kioskPasswordInput]);

  // Shuffle array using Fisher-Yates
  const shuffleArray = useCallback((array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // Load content with retry support and offline fallback
  const loadContent = useCallback(async (screenId, useRetry = false) => {
    const fetchContent = async () => {
      const data = await getResolvedContent(screenId);
      return data;
    };

    try {
      setConnectionStatus(useRetry ? 'reconnecting' : 'connecting');

      const data = useRetry
        ? await retryWithBackoff(fetchContent)
        : await fetchContent();

      setContent(data);
      setConnectionStatus('connected');
      setIsOfflineMode(false);
      setRetryCount(0);
      lastActivityRef.current = Date.now();

      // For playlist type, process items (shuffle if needed)
      // New format: items are nested in playlist.items, type is 'playlist' or 'layout'
      if (data.type === 'playlist') {
        let processedItems = data.playlist?.items || [];
        if (data.playlist?.shuffle && processedItems.length > 1) {
          processedItems = shuffleArray(processedItems);
        }
        setItems(processedItems);
      } else {
        setItems([]);
      }

      // Store content hash for change detection (new format)
      const contentHashObj = {
        type: data.type,
        source: data.source,
        playlistId: data.playlist?.id,
        layoutId: data.layout?.id,
        campaignId: data.campaign?.id
      };
      localStorage.setItem(STORAGE_KEYS.contentHash, JSON.stringify(contentHashObj));

      // Cache content for offline use
      try {
        await cacheContent(`content-${screenId}`, data, 'playlist');
        console.log('Content cached for offline use');
      } catch (cacheErr) {
        console.warn('Failed to cache content:', cacheErr);
      }

      setError('');
      return data;
    } catch (err) {
      console.error('Failed to load content from server:', err);

      // Try to load from offline cache
      try {
        const cachedData = await getCachedContent(`content-${screenId}`);
        if (cachedData) {
          console.log('Using cached content (offline mode)');
          setContent(cachedData);
          setConnectionStatus('offline');
          setIsOfflineMode(true);
          lastActivityRef.current = Date.now();

          // New format uses 'type' and playlist.items
          if (cachedData.type === 'playlist') {
            let processedItems = cachedData.playlist?.items || [];
            if (cachedData.playlist?.shuffle && processedItems.length > 1) {
              processedItems = shuffleArray(processedItems);
            }
            setItems(processedItems);
          } else {
            setItems([]);
          }

          setError('');
          return cachedData;
        }
      } catch (cacheErr) {
        console.warn('Failed to load from cache:', cacheErr);
      }

      setConnectionStatus('offline');
      throw err;
    }
  }, [shuffleArray]);

  // Initial load
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);

    if (!screenId) {
      navigate('/player', { replace: true });
      return;
    }

    loadContent(screenId)
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message || 'Failed to load content');
        setLoading(false);
        // If screen not found, clear storage and redirect
        if (err.message?.includes('not found')) {
          localStorage.removeItem(STORAGE_KEYS.screenId);
          localStorage.removeItem(STORAGE_KEYS.playlistId);
          navigate('/player', { replace: true });
        }
      });
  }, [navigate, loadContent]);

  // Polling for updates every 30s with error recovery
  useEffect(() => {
    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    pollRef.current = setInterval(async () => {
      try {
        // Fetch fresh content
        const newContent = await getResolvedContent(screenId);

        // Reset error count on success
        consecutiveErrors = 0;
        setConnectionStatus('connected');

        // Check if content has changed (new format uses type/source)
        const lastHash = localStorage.getItem(STORAGE_KEYS.contentHash);
        const newHash = JSON.stringify({
          type: newContent.type,
          source: newContent.source,
          playlistId: newContent.playlist?.id,
          layoutId: newContent.layout?.id,
          campaignId: newContent.campaign?.id
        });

        if (lastHash !== newHash) {
          console.log('Content updated, refreshing...');
          setContent(newContent);

          // New format: type is 'playlist' or 'layout', items in playlist.items
          if (newContent.type === 'playlist') {
            let processedItems = newContent.playlist?.items || [];
            if (newContent.playlist?.shuffle && processedItems.length > 1) {
              processedItems = shuffleArray(processedItems);
            }
            setItems(processedItems);
            setCurrentIndex(0);
          } else {
            setItems([]);
          }

          localStorage.setItem(STORAGE_KEYS.contentHash, newHash);
        }

        // Also send heartbeat
        await sendHeartbeat(screenId);
      } catch (err) {
        consecutiveErrors++;
        console.error(`Polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, err);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setConnectionStatus('reconnecting');
          // Try to reconnect with exponential backoff
          try {
            await loadContent(screenId, true);
            consecutiveErrors = 0;
          } catch (reconnectError) {
            console.error('Reconnection failed:', reconnectError);
            setConnectionStatus('offline');
          }
        }
      }
    }, 30000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [shuffleArray, loadContent]);

  // Advance to next item
  const advanceToNext = useCallback(() => {
    // End current playback tracking before advancing
    analytics.endPlaybackEvent();
    setCurrentIndex((prev) => {
      const next = (prev + 1) % items.length;
      // Re-shuffle when we complete a cycle
      if (next === 0 && content?.playlist?.shuffle) {
        setItems(shuffleArray(items));
      }
      return next;
    });
  }, [items, content?.playlist?.shuffle, shuffleArray]);

  // Track playback analytics for playlist mode
  useEffect(() => {
    // New format uses 'type' instead of 'mode', and 'screen' instead of 'device'
    if (content?.type !== 'playlist' || items.length === 0) return;
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    const screenId = localStorage.getItem(STORAGE_KEYS.screenId);
    if (!screenId) return;

    // Start tracking this item
    analytics.startPlaybackEvent({
      screenId,
      tenantId: content.screen?.tenant_id,
      locationId: content.screen?.location_id || null,
      playlistId: content.playlist?.id || null,
      layoutId: null,
      zoneId: null,
      mediaId: currentItem.mediaType !== 'app' ? currentItem.id : null,
      appId: currentItem.mediaType === 'app' ? currentItem.id : null,
      campaignId: content.campaign?.id || null,
      itemType: currentItem.mediaType === 'app' ? 'app' : 'media',
      itemName: currentItem.name,
    });

    // Cleanup: end tracking when component unmounts or item changes
    return () => {
      // Note: advanceToNext handles ending, but this catches unmount
    };
  }, [currentIndex, items, content?.type, content?.playlist?.id, content?.campaign?.id, content?.screen?.tenant_id, content?.screen?.location_id]);

  // Timer for image/document duration
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // For videos, let the onEnded handler advance
    if (currentItem.mediaType === 'video') {
      return;
    }

    // For images and other types, use duration timer
    const duration = (currentItem.duration || content?.playlist?.defaultDuration || 10) * 1000;
    timerRef.current = setTimeout(advanceToNext, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentIndex, items, content?.playlist?.defaultDuration, advanceToNext]);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    advanceToNext();
  }, [advanceToNext]);

  // Disconnect and return to pairing
  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEYS.screenId);
    localStorage.removeItem(STORAGE_KEYS.playlistId);
    localStorage.removeItem(STORAGE_KEYS.contentHash);
    navigate('/player', { replace: true });
  };

  // Check if we have any content to display
  // New format uses 'type' instead of 'mode'
  const hasContent = content?.type === 'layout'
    ? (content.layout && content.layout.zones?.length > 0)
    : (items.length > 0);

  // Loading state
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #333',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          `}</style>
          <p style={{ fontSize: '1.25rem' }}>Loading content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '4rem',
            height: '4rem',
            background: '#ef4444',
            borderRadius: '50%',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Error</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={handleDisconnect}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Re-pair Device
          </button>
        </div>
      </div>
    );
  }

  // No content assigned
  if (!hasContent) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '5rem',
            height: '5rem',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: '1.25rem',
            margin: '0 auto 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {content?.screen?.name || 'Screen'} Connected
          </h2>
          <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>
            No content assigned yet
          </p>
          <p style={{ color: '#475569', fontSize: '0.875rem' }}>
            Assign a playlist, layout, or schedule from your BizScreen dashboard
          </p>
          <button
            onClick={handleDisconnect}
            style={{
              marginTop: '2rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #334155',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // Layout mode - render multi-zone layout
  // New format uses 'type' instead of 'mode', 'screen' instead of 'device'
  if (content.type === 'layout') {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#000',
        overflow: 'hidden'
      }}>
        <LayoutRenderer
          layout={content.layout}
          timezone={content.screen?.timezone}
          screenId={localStorage.getItem(STORAGE_KEYS.screenId)}
          tenantId={content.screen?.tenant_id}
          campaignId={content.campaign?.id}
        />

        {/* Connection status indicator */}
        {connectionStatus !== 'connected' && (
          <div style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: connectionStatus === 'reconnecting' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '0.75rem',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <div style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              background: 'currentColor',
              animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s infinite' : 'none'
            }} />
            {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
          </div>
        )}

        {/* Campaign indicator (debug mode) */}
        {content.campaign && (
          <div style={{
            position: 'absolute',
            bottom: '0.5rem',
            left: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
            background: 'rgba(139, 92, 246, 0.9)',
            borderRadius: '9999px',
            color: 'white',
            fontSize: '0.625rem',
            fontFamily: 'system-ui, sans-serif',
            opacity: 0.7
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Campaign: {content.campaign.name}
          </div>
        )}

        {/* Hidden disconnect button */}
        <button
          onClick={handleDisconnect}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Current item to display
  const currentItem = items[currentIndex];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: '#000',
      overflow: 'hidden'
    }}>
      {/* Media display */}
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          onError={() => advanceToNext()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      ) : currentItem.mediaType === 'image' ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.name}
          onError={() => advanceToNext()}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />
      ) : currentItem.mediaType === 'web_page' ? (
        <iframe
          key={currentItem.id}
          src={currentItem.url}
          title={currentItem.name}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      ) : currentItem.mediaType === 'app' ? (
        // App rendering (clock, web page app, etc.)
        <AppRenderer
          key={currentItem.id}
          item={currentItem}
          timezone={content?.screen?.timezone}
        />
      ) : (
        // Fallback for documents and other types
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '6rem',
              height: '6rem',
              background: '#1e293b',
              borderRadius: '1rem',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p style={{ color: '#94a3b8' }}>{currentItem.name}</p>
          </div>
        </div>
      )}

      {/* Connection status indicator */}
      {connectionStatus !== 'connected' && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          left: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: connectionStatus === 'reconnecting' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '0.75rem',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 10
        }}>
          <div style={{
            width: '0.5rem',
            height: '0.5rem',
            borderRadius: '50%',
            background: 'currentColor',
            animation: connectionStatus === 'reconnecting' ? 'pulse 1.5s infinite' : 'none'
          }} />
          {connectionStatus === 'reconnecting' ? 'Reconnecting...' : 'Offline'}
        </div>
      )}

      {/* Progress indicator (small dots at bottom) */}
      {items.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          opacity: 0.6
        }}>
          {items.slice(0, Math.min(items.length, 10)).map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentIndex ? '1.5rem' : '0.5rem',
                height: '0.5rem',
                borderRadius: '0.25rem',
                backgroundColor: idx === currentIndex ? '#3b82f6' : '#fff',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
          {items.length > 10 && (
            <span style={{ color: '#fff', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
              +{items.length - 10}
            </span>
          )}
        </div>
      )}

      {/* Campaign indicator (debug mode) */}
      {content?.campaign && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          left: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'rgba(139, 92, 246, 0.9)',
          borderRadius: '9999px',
          color: 'white',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          opacity: 0.7,
          zIndex: 10
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          Campaign: {content.campaign.name}
        </div>
      )}

      {/* Hidden disconnect button (press 'D' key) - disabled in kiosk mode */}
      {!kioskMode && (
        <button
          onClick={handleDisconnect}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = 1}
          onMouseLeave={(e) => e.target.style.opacity = 0}
        >
          Disconnect
        </button>
      )}

      {/* Offline mode indicator */}
      {isOfflineMode && (
        <div style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          background: 'rgba(251, 191, 36, 0.9)',
          borderRadius: '9999px',
          color: '#78350f',
          fontSize: '0.625rem',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 10
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l22 22" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          Offline Mode
        </div>
      )}

      {/* Kiosk mode indicator */}
      {kioskMode && (
        <div style={{
          position: 'absolute',
          bottom: '0.5rem',
          right: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.5rem',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '0.25rem',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '0.5rem',
          fontFamily: 'system-ui, sans-serif',
          zIndex: 10
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Kiosk
        </div>
      )}

      {/* Kiosk exit dialog */}
      {showKioskExit && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '20rem',
            width: '90%',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              color: '#1e293b',
              marginBottom: '0.5rem'
            }}>
              Exit Kiosk Mode
            </h3>
            <p style={{
              color: '#64748b',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {localStorage.getItem(STORAGE_KEYS.kioskPassword)
                ? 'Enter the exit password to leave kiosk mode'
                : 'Are you sure you want to exit kiosk mode?'
              }
            </p>

            {localStorage.getItem(STORAGE_KEYS.kioskPassword) && (
              <input
                type="password"
                value={kioskPasswordInput}
                onChange={(e) => setKioskPasswordInput(e.target.value)}
                placeholder="Password"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  marginBottom: '0.5rem',
                  boxSizing: 'border-box'
                }}
              />
            )}

            {kioskPasswordError && (
              <p style={{
                color: '#ef4444',
                fontSize: '0.75rem',
                marginBottom: '0.5rem'
              }}>
                {kioskPasswordError}
              </p>
            )}

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1rem'
            }}>
              <button
                onClick={() => {
                  setShowKioskExit(false);
                  setKioskPasswordInput('');
                  setKioskPasswordError('');
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleKioskExit}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Main Player component with routing
 */
export default function Player() {
  return (
    <Routes>
      <Route path="/" element={<PairPage />} />
      <Route path="/view" element={<ViewPage />} />
      <Route path="*" element={<Navigate to="/player" replace />} />
    </Routes>
  );
}
