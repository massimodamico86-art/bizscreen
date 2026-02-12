// src/player/components/widgets/DataTableWidget.jsx
// Data table widget for rendering tabular data from a data source on player screens
// Supports auto-pagination, column filtering, and brand theme inheritance

import { useState, useEffect, useRef } from 'react';
import { getDataSource, formatValue } from '../../../services/dataSourceService';
import { cacheDataSource, getCachedDataSource } from '../../cacheService';
import { createScopedLogger } from '../../../services/loggingService.js';

const logger = createScopedLogger('DataTableWidget');

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
  const dataRef = useRef(null);

  // Keep dataRef in sync with state
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Initial data load
  useEffect(() => {
    if (!dataSourceId) return;

    let cancelled = false;

    async function loadData() {
      try {
        const result = await getDataSource(dataSourceId);
        if (!cancelled && result) {
          setData(result);
          setCurrentPage(0);
          // Cache for offline use
          cacheDataSource(dataSourceId, result).catch((err) => {
            logger.warn('Failed to cache data source', { error: err });
          });
        }
      } catch (err) {
        logger.warn('Failed to fetch data source, trying cache', { error: err });
        // Silent fallback to cached data
        try {
          const cached = await getCachedDataSource(dataSourceId);
          if (!cancelled && cached) {
            setData(cached);
            setCurrentPage(0);
          }
        } catch (cacheErr) {
          logger.warn('Failed to get cached data source', { error: cacheErr });
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [dataSourceId]);

  // Refresh timer
  useEffect(() => {
    if (!dataSourceId || !refreshIntervalMinutes) return;

    const intervalMs = refreshIntervalMinutes * 60 * 1000;

    const interval = setInterval(async () => {
      try {
        const result = await getDataSource(dataSourceId);
        if (result) {
          setData(result);
          setCurrentPage(0);
          cacheDataSource(dataSourceId, result).catch((err) => {
            logger.warn('Failed to cache on refresh', { error: err });
          });
        }
      } catch (err) {
        logger.warn('Refresh failed, keeping current data', { error: err });
        // On refresh failure, try cache if we have no data yet
        if (!dataRef.current) {
          try {
            const cached = await getCachedDataSource(dataSourceId);
            if (cached) {
              setData(cached);
            }
          } catch (cacheErr) {
            logger.warn('Cache fallback failed on refresh', { error: cacheErr });
          }
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [dataSourceId, refreshIntervalMinutes]);

  // Compute visible fields
  const fields = data?.fields || [];
  const rows = data?.rows || [];

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
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
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
  if (!data || visibleFields.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
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
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
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
                const displayValue = formatValue(
                  rawValue,
                  field.data_type || field.dataType,
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
  );
}

export default DataTableWidget;
