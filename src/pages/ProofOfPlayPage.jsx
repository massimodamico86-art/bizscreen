/**
 * Proof of Play Page
 *
 * Enterprise compliance reporting page showing what content played on which
 * screens and when. Features date range filters, screen selector, summary
 * statistics, results table, and CSV export.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  Play,
  Clock,
  Film,
  Monitor,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  PageLayout,
  PageContent,
  PageHeader,
  Button,
  Card,
  StatCard,
} from '../design-system';
import { supabase } from '../supabase';
import {
  fetchProofOfPlayReport,
  fetchPlaybackSummary,
  exportToCSV,
} from '../services/proofOfPlayService';

/**
 * Format seconds into a human-readable duration string.
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Format a timestamp for display.
 * @param {string} timestamp - ISO timestamp
 * @returns {string}
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString();
}

/**
 * @param {Object} props
 * @param {Function} props.showToast
 */
export default function ProofOfPlayPage({ showToast }) {
  // Default date range: last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [selectedScreens, setSelectedScreens] = useState([]);
  const [screens, setScreens] = useState([]);

  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce ref for filter changes
  const debounceRef = useRef(null);

  // Fetch screen list for the dropdown
  useEffect(() => {
    async function loadScreens() {
      try {
        const { data, error } = await supabase
          .from('tv_devices')
          .select('id, name')
          .order('name');
        if (!error && data) {
          setScreens(data);
        }
      } catch (err) {
        console.error('[ProofOfPlay] Failed to load screens:', err);
      }
    }
    loadScreens();
  }, []);

  // Load report data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const startISO = new Date(startDate + 'T00:00:00').toISOString();
      const endISO = new Date(endDate + 'T23:59:59').toISOString();

      const [reportResult, summaryResult] = await Promise.all([
        fetchProofOfPlayReport({
          startDate: startISO,
          endDate: endISO,
          screenIds: selectedScreens.length > 0 ? selectedScreens : undefined,
        }),
        fetchPlaybackSummary({
          startDate: startISO,
          endDate: endISO,
        }),
      ]);

      setReportData(reportResult);
      setSummary(summaryResult);
    } catch (err) {
      console.error('[ProofOfPlay] Failed to load data:', err);
      if (showToast) {
        showToast('Failed to load report data', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate, selectedScreens, showToast]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce filter changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      loadData();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [startDate, endDate, selectedScreens]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    if (reportData.length === 0) return;
    exportToCSV(reportData);
    if (showToast) {
      showToast('CSV file downloaded', 'success');
    }
  };


  return (
    <PageLayout>
      <PageHeader
        title="Proof of Play"
        description="Compliance report showing content playback across all screens"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={loading || reportData.length === 0}
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Plays"
            value={loading ? '...' : (summary?.total_plays ?? 0).toLocaleString()}
            icon={<Play className="w-4 h-4" />}
          />
          <StatCard
            title="Total Hours"
            value={loading ? '...' : (summary?.total_hours ?? 0).toLocaleString()}
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            title="Unique Content"
            value={loading ? '...' : (summary?.unique_content ?? 0).toLocaleString()}
            icon={<Film className="w-4 h-4" />}
          />
          <StatCard
            title="Active Screens"
            value={loading ? '...' : (summary?.active_screens ?? 0).toLocaleString()}
            icon={<Monitor className="w-4 h-4" />}
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                />
              </div>

              {/* Screen Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screens
                </label>
                <select
                  multiple
                  value={selectedScreens}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, opt => opt.value);
                    setSelectedScreens(options);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm px-3 py-2 border"
                  size={Math.min(screens.length || 1, 4)}
                >
                  {screens.map(screen => (
                    <option key={screen.id} value={screen.id}>
                      {screen.name}
                    </option>
                  ))}
                </select>
                {selectedScreens.length > 0 && (
                  <button
                    onClick={() => setSelectedScreens([])}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear selection ({selectedScreens.length} selected)
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Results Table */}
        <Card>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Loading report data...</p>
                </div>
              </div>
            ) : reportData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <FileText className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No playback data found for the selected date range</p>
                <p className="text-xs mt-1">Try adjusting your date range or screen filters</p>
              </div>
            ) : (
              <table className="w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Screen
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Content
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Total Plays
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                      First Played
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">
                      Last Played
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {row.screen_name}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.content_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {row.content_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">
                        {row.total_plays?.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                        {formatDuration(row.total_duration_seconds)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatTimestamp(row.first_played)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {formatTimestamp(row.last_played)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Table footer with row count */}
          {!loading && reportData.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              {reportData.length} {reportData.length === 1 ? 'row' : 'rows'}
            </div>
          )}
        </Card>
      </PageContent>
    </PageLayout>
  );
}
