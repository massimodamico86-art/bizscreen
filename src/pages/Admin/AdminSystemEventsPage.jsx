/**
 * Admin System Events Page
 * Phase 18: View system events (super admin only)
 */

import { useState, useEffect } from 'react';


import { useSystemEvents } from '../../hooks/useAuditLogs';
import { SEVERITY_LEVELS, SYSTEM_SOURCES } from '../../services/auditService';

export default function AdminSystemEventsPage({ onBack, showToast }) {
  const {
    events,
    pagination,
    loading,
    error,
    filters,
    filterOptions,
    updateFilters,
    clearFilters,
    goToPage,
    refresh,
    isSuperAdmin,
  } = useSystemEvents();

  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState({
    source: '',
    severity: '',
    start_date: '',
    end_date: '',
  });

  // Sync local filters with hook filters
  useEffect(() => {
    setLocalFilters({
      source: filters.source || '',
      severity: filters.severity || '',
      start_date: filters.start_date || '',
      end_date: filters.end_date || '',
    });
  }, [filters]);

  const handleApplyFilters = () => {
    updateFilters(localFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    clearFilters();
    setLocalFilters({
      source: '',
      severity: '',
      start_date: '',
      end_date: '',
    });
    setShowFilters(false);
  };

  const hasActiveFilters =
    filters.source || filters.severity || filters.start_date || filters.end_date;

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 mt-2">Super admin access required to view system events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Server className="w-6 h-6 mr-2" />
              System Events
            </h1>
            <p className="text-sm text-gray-500">
              Backend operations and system activity
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium ${
              hasActiveFilters
                ? 'border-purple-500 text-purple-600 bg-purple-50'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-purple-500 text-white text-xs rounded-full px-2">
                Active
              </span>
            )}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filter Events</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={localFilters.source}
                onChange={(e) => setLocalFilters((f) => ({ ...f, source: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="">All Sources</option>
                {Object.entries(SYSTEM_SOURCES).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={localFilters.severity}
                onChange={(e) => setLocalFilters((f) => ({ ...f, severity: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              >
                <option value="">All Severities</option>
                {Object.entries(SEVERITY_LEVELS).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={localFilters.start_date}
                onChange={(e) => setLocalFilters((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={localFilters.end_date}
                onChange={(e) => setLocalFilters((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t">
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {events.length} system events
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-purple-600 hover:text-purple-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Severity quick filters */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(SEVERITY_LEVELS).map(([key, config]) => {
          const colors = {
            gray: 'border-gray-300 text-gray-600 hover:bg-gray-50',
            blue: 'border-blue-300 text-blue-600 hover:bg-blue-50',
            yellow: 'border-yellow-300 text-yellow-600 hover:bg-yellow-50',
            red: 'border-red-300 text-red-600 hover:bg-red-50',
            purple: 'border-purple-300 text-purple-600 hover:bg-purple-50',
          };
          const isActive = filters.severity === key;
          return (
            <button
              key={key}
              onClick={() => updateFilters({ severity: isActive ? '' : key })}
              className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : colors[config.color]
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Event timeline */}
      <EventTimeline
        events={events}
        loading={loading}
        emptyMessage={
          hasActiveFilters
            ? 'No system events match your filters'
            : 'No system events recorded yet'
        }
      />

      {/* Pagination */}
      {events.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-500">
            Page {pagination.page}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={events.length < pagination.limit || loading}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
