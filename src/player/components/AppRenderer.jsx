// src/player/components/AppRenderer.jsx
// App type routing (clock, weather, web page, rss, data table, etc.)
// Extracted from Player.jsx for maintainability

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import WeatherWall from '../../components/WeatherWall';
import { createScopedLogger } from '../../services/loggingService.js';

// Module-level logger for app data fetching
const appDataLogger = createScopedLogger('AppRenderer:appData');

// API base URL for app data fetching
const API_BASE = '';

/**
 * Hook for fetching and caching app data from the backend
 */
function useAppData(appId, config, refreshMinutes = 10) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

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
        } catch (cacheError) {
          appDataLogger.warn('Failed to cache app data', {
            error: cacheError.message,
            cacheKey,
            dataSize: JSON.stringify(result.data).length,
          });
          // Non-critical: continue execution without cache
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      appDataLogger.error('Fetch error', { error: err });
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
    } catch (cacheError) {
      appDataLogger.warn('Failed to read cached app data', {
        error: cacheError.message,
        cacheKey,
      });
      // Non-critical: fall through to fetchData()
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
 * Weather App - Displays current weather and forecast
 * Uses the themed WeatherWall component for Yodeck-style display
 */
function WeatherApp({ config, appId }) {
  return <WeatherWall config={config} appId={appId} />;
}

/**
 * RSS Ticker App - Scrolling news ticker
 */
function RssTickerApp({ config, appId }) {
  const refreshMinutes = config?.refreshMinutes || 10;
  const { data, loading } = useAppData(appId, config, refreshMinutes);
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
        <span style={{ opacity: 0.6, marginLeft: '0.5rem' }}>- {item.source}</span>
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
  const { data, loading } = useAppData(appId, config, refreshMinutes);

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
 * Routes to appropriate app component based on appType
 */
export function AppRenderer({ item, timezone }) {
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

export default AppRenderer;
