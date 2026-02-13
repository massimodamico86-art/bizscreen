// src/player/components/widgets/DataTableWidget.jsx
// Data table widget for rendering tabular data from a data source on player screens
// Supports auto-pagination, column filtering, and brand theme inheritance

import { useState, useEffect, useRef, useCallback } from 'react';
import { getDataSource, formatValue } from '../../../services/dataSourceService';
import { cacheDataSource, getCachedDataSource } from '../../cacheService';
import { useWidgetData } from '../../hooks/useWidgetData.js';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';

/**
 * DataTableWidget - Renders tabular data with headers, alternating rows, and auto-pagination
 *
 * @param {Object} props - Widget props
 * @param {string} props.dataSourceId - Data source UUID (required)
 * @param {Array<string>} [props.visibleColumns] - Field names to show (null = show all)
 * @param {Array<string>} [props.columnOrder] - Field name order (null = source order)
 * @param {number} [props.refreshIntervalMinutes] - Data refresh interval (default 15)
 * @param {number} [props.pageIntervalSeconds] - Page rotation interval (default 10)
 * @param {number} [props.rowsPerPage] - Rows per page (default 8)
 * @param {boolean} [props.showHeader] - Show header row (default true)
 * @param {boolean} [props.alternateRowColors] - Alternate row background colors (default true)
 * @param {string} [props.headerBgColor] - Header background color override
 * @param {string} [props.headerTextColor] - Header text color override
 * @param {string} [props.evenRowBgColor] - Even row background color override
 * @param {string} [props.oddRowBgColor] - Odd row background color override
 * @param {string} [props.textColor] - Body text color override
 */
export function DataTableWidget({ props = {} }) {
  const {
    dataSourceId,
    visibleColumns = null,
    columnOrder = null,
    refreshIntervalMinutes = 15,
    pageIntervalSeconds = 10,
    rowsPerPage = 8,
    showHeader = true,
    alternateRowColors = true,
    headerBgColor = null,
    headerTextColor = null,
    evenRowBgColor = null,
    oddRowBgColor = null,
    textColor = null,
  } = props;

  const [data, setData] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedPage, setDisplayedPage] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [dataFadeOpacity, setDataFadeOpacity] = useState(1);
  const dataRef = useRef(null);
  const isFirstRender = useRef(true);
  const dataVersion = useRef(0);

  // Orchestrator integration
  const sourceKey = dataSourceId ? `data-source:${dataSourceId}` : null;
  const fetchFn = useCallback(async () => {
    const result = await getDataSource(dataSourceId);
    return result;
  }, [dataSourceId]);
  const cacheFn = useCallback(async (_key, data) => {
    await cacheDataSource(dataSourceId, data);
  }, [dataSourceId]);
  const { data: orchestratorData, lastFetchedAt } = useWidgetData(sourceKey, fetchFn, refreshIntervalMinutes * 60 * 1000, cacheFn);

  // Offline cache fallback
  useEffect(() => {
    if (!dataSourceId || orchestratorData) return;
    let cancelled = false;
    getCachedDataSource(dataSourceId).then(cached => {
      if (!cancelled && cached && !orchestratorData) setData(cached);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [dataSourceId, orchestratorData]);

  // Use orchestrator data with local cache fallback
  const activeData = orchestratorData || data;

  // Keep dataRef in sync
  useEffect(() => {
    dataRef.current = activeData;
  }, [activeData]);

  // Smart page reset when row count changes
  useEffect(() => {
    if (orchestratorData && dataRef.current) {
      if (orchestratorData.rows?.length !== dataRef.current.rows?.length) {
        setCurrentPage(0);
      }
    }
  }, [orchestratorData]);

  // Data refresh fade transition (200ms opacity dip on subsequent fetches)
  useEffect(() => {
    if (!orchestratorData) return;
    dataVersion.current += 1;
    if (dataVersion.current <= 1) return; // Skip first load
    setDataFadeOpacity(0);
    const timeout = setTimeout(() => {
      setDataFadeOpacity(1);
    }, 200);
    return () => clearTimeout(timeout);
  }, [orchestratorData]);

  // Fade transition when page changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedPage(currentPage);
      return;
    }
    setOpacity(0);
    const timeout = setTimeout(() => {
      setDisplayedPage(currentPage);
      setOpacity(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentPage]);

  // Compute visible fields
  const fields = activeData?.fields || [];
  const rows = activeData?.rows || [];

  const visibleFields = (() => {
    // Start with column order or source order
    const orderedNames = columnOrder || fields.map((f) => f.name);

    // Filter to visible columns if specified
    const filteredNames = visibleColumns
      ? orderedNames.filter((name) => visibleColumns.includes(name))
      : orderedNames;

    // Map names to field objects, filtering out any that don't match actual fields
    return filteredNames
      .map((name) => fields.find((f) => f.name === name))
      .filter(Boolean);
  })();

  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const pageRows = rows.slice(
    displayedPage * rowsPerPage,
    (displayedPage + 1) * rowsPerPage
  );

  // Pagination timer
  useEffect(() => {
    if (totalPages <= 1 || !pageIntervalSeconds) return;

    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, pageIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [totalPages, pageIntervalSeconds]);

  // No data or no fields: render nothing (silent)
  if (!activeData || visibleFields.length === 0) {
    return null;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        opacity: dataFadeOpacity,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {/* Header row */}
      {showHeader && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            backgroundColor: headerBgColor || 'rgba(59,130,246,0.15)',
            color: headerTextColor || '#ffffff',
            fontSize: 'clamp(0.7rem, 2vw, 1rem)',
            fontWeight: 'bold',
            flexShrink: 0,
          }}
        >
          {visibleFields.map((field) => (
            <div
              key={field.name}
              style={{
                flex: 1,
                padding: '0.4rem 0.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {field.label || field.name}
            </div>
          ))}
        </div>
      )}

      {/* Data rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, opacity, transition: 'opacity 0.3s ease-in-out' }}>
        {pageRows.map((row, rowIndex) => {
          const isEven = rowIndex % 2 === 0;
          const rowBg = alternateRowColors
            ? isEven
              ? evenRowBgColor || 'rgba(255,255,255,0.03)'
              : oddRowBgColor || 'transparent'
            : 'transparent';

          return (
            <div
              key={row.id || rowIndex}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flex: 1,
                alignItems: 'center',
                backgroundColor: rowBg,
                color: textColor || '#ffffff',
                fontSize: 'clamp(0.6rem, 1.8vw, 0.9rem)',
              }}
            >
              {visibleFields.map((field) => {
                const rawValue = row.values?.[field.name];
                const dataType = field.data_type || field.dataType;

                // Render image_url fields as actual images
                if (dataType === 'image_url' && rawValue) {
                  return (
                    <div
                      key={field.name}
                      style={{
                        flex: 1,
                        padding: '0 0.5rem',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={rawValue}
                        alt=""
                        style={{
                          maxHeight: '100%',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          display: 'block',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  );
                }

                const displayValue = formatValue(
                  rawValue,
                  dataType,
                  field.format_options || field.formatOptions
                );

                return (
                  <div
                    key={field.name}
                    style={{
                      flex: 1,
                      padding: '0 0.5rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayValue}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Page indicator */}
      {totalPages > 1 && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.3)',
            padding: '0.2rem 0',
            flexShrink: 0,
          }}
        >
          {currentPage + 1} / {totalPages}
        </div>
      )}
    </div>
    <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default DataTableWidget;
