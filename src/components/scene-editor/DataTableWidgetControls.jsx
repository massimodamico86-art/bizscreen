/**
 * DataTableWidgetControls
 *
 * Configuration UI for the data-table widget type in the scene editor.
 * Provides data source selection, column picker, pagination settings,
 * per-widget refresh interval, and display options.
 */

import { useState, useEffect } from 'react';
import { fetchDataSources, getDataSource } from '../../services/dataSourceService';
import { ColumnPicker } from '../data-sources/ColumnPicker';

/**
 * @param {Object} props - Component props
 * @param {Object} props.props - Widget props from the block
 * @param {Function} props.onPropChange - Callback to update a single prop
 * @param {Function} props.onMultiPropChange - Callback to update multiple props at once
 */
export function DataTableWidgetControls({ props, onPropChange, onMultiPropChange }) {
  const [dataSources, setDataSources] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load available data sources
  useEffect(() => {
    async function load() {
      try {
        const sources = await fetchDataSources();
        setDataSources(sources || []);
      } catch {
        /* silent */
      }
    }
    load();
  }, []);

  // Load selected source details when dataSourceId changes
  useEffect(() => {
    async function loadSource() {
      if (!props.dataSourceId) {
        setSelectedSource(null);
        return;
      }
      setLoading(true);
      try {
        const source = await getDataSource(props.dataSourceId);
        setSelectedSource(source);
      } catch {
        /* silent */
      }
      setLoading(false);
    }
    loadSource();
  }, [props.dataSourceId]);

  return (
    <div className="space-y-3">
      {/* Data Source Selection */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Data Source</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.dataSourceId || ''}
          onChange={(e) => {
            // Batch source change with column config reset
            onMultiPropChange({
              dataSourceId: e.target.value || null,
              visibleColumns: null,
              columnOrder: null,
            });
          }}
        >
          <option value="">Select a data source...</option>
          {dataSources.map((source) => (
            <option key={source.id} value={source.id}>
              {source.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading indicator */}
      {loading && (
        <p className="text-xs text-gray-500">Loading source details...</p>
      )}

      {/* Column Configuration (only when source selected) */}
      {selectedSource && selectedSource.fields?.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Visible Columns</label>
          <ColumnPicker
            fields={selectedSource.fields}
            visibleColumns={props.visibleColumns || null}
            columnOrder={props.columnOrder || null}
            onChange={({ visibleColumns, columnOrder }) => {
              onMultiPropChange({ visibleColumns, columnOrder });
            }}
          />
        </div>
      )}

      {/* Rows Per Page */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Rows per Page</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.rowsPerPage || 8}
          onChange={(e) => onPropChange('rowsPerPage', parseInt(e.target.value, 10))}
        >
          {[4, 6, 8, 10, 12, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
      </div>

      {/* Page Interval */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Page Cycle Speed</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.pageIntervalSeconds || 10}
          onChange={(e) =>
            onPropChange('pageIntervalSeconds', parseInt(e.target.value, 10))
          }
        >
          {[5, 8, 10, 15, 20, 30].map((s) => (
            <option key={s} value={s}>
              {s} seconds
            </option>
          ))}
        </select>
      </div>

      {/* Per-widget Refresh Interval (DATA-03) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Refresh Interval</label>
        <select
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          value={props.refreshIntervalMinutes || 15}
          onChange={(e) =>
            onPropChange('refreshIntervalMinutes', parseInt(e.target.value, 10))
          }
        >
          {[5, 10, 15, 30, 60].map((m) => (
            <option key={m} value={m}>
              Every {m} minutes
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-600 mt-0.5">
          How often this widget re-fetches data from the source.
        </p>
      </div>

      {/* Show Header Toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showHeader !== false}
          onChange={(e) => onPropChange('showHeader', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show column headers
      </label>

      {/* Alternate Row Colors Toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.alternateRowColors !== false}
          onChange={(e) => onPropChange('alternateRowColors', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Alternating row colors
      </label>

      {/* Theme Color Overrides (optional) */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Header Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={props.headerBgColor || '#1e3a5f'}
            onChange={(e) => onPropChange('headerBgColor', e.target.value)}
            className="w-8 h-6 rounded border border-gray-700 bg-transparent cursor-pointer"
          />
          <span className="text-xs text-gray-500">
            {props.headerBgColor || 'Theme default'}
          </span>
        </div>
      </div>
    </div>
  );
}
