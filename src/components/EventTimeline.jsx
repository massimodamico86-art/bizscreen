/**
 * EventTimeline Component
 * Phase 18: Timeline component for displaying system events
 */

import { formatDistanceToNow, format } from 'date-fns';
import {
  Server,
  Clock,
  Zap,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Info,
  Bug,
} from 'lucide-react';
import { useState } from 'react';
import { SEVERITY_LEVELS, SYSTEM_SOURCES } from '../services/auditService';

/**
 * Get icon for severity level
 */
function getSeverityIcon(severity) {
  switch (severity) {
    case 'critical':
      return XCircle;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'debug':
      return Bug;
    default:
      return Info;
  }
}

/**
 * Get color class for severity level
 */
function getSeverityColor(severity) {
  const config = SEVERITY_LEVELS[severity];
  const colors = {
    gray: 'text-gray-500 bg-gray-100 border-gray-200',
    blue: 'text-blue-500 bg-blue-100 border-blue-200',
    yellow: 'text-yellow-600 bg-yellow-100 border-yellow-300',
    red: 'text-red-500 bg-red-100 border-red-200',
    purple: 'text-purple-500 bg-purple-100 border-purple-200',
  };
  return colors[config?.color] || colors.gray;
}

/**
 * Get icon for source
 */
function getSourceIcon(source) {
  switch (source) {
    case 'scheduler':
      return Clock;
    case 'worker':
      return Zap;
    default:
      return Server;
  }
}

/**
 * Get color class for source
 */
function getSourceColor(source) {
  const config = SYSTEM_SOURCES[source];
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
  };
  return colors[config?.color] || colors.gray;
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return timestamp;
  }
}

/**
 * Format full timestamp for tooltip
 */
function formatFullTimestamp(timestamp) {
  if (!timestamp) return '';
  try {
    return format(new Date(timestamp), 'PPpp');
  } catch {
    return timestamp;
  }
}

/**
 * Details panel for event metadata
 */
function DetailsPanel({ details }) {
  if (!details || Object.keys(details).length === 0) {
    return <span className="text-gray-400 text-sm">No additional details</span>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-3 text-sm">
      <pre className="whitespace-pre-wrap text-gray-300 font-mono text-xs">
        {JSON.stringify(details, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Single event item in timeline
 */
function EventItem({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const SeverityIcon = getSeverityIcon(event.severity);
  const SourceIcon = getSourceIcon(event.source);
  const severityColor = getSeverityColor(event.severity);
  const sourceColor = getSourceColor(event.source);

  return (
    <div className="relative pb-8">
      {/* Timeline connector */}
      {!isLast && (
        <span
          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
          aria-hidden="true"
        />
      )}

      <div className="relative flex space-x-3">
        {/* Timeline dot with source icon */}
        <div>
          <span
            className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${sourceColor}`}
          >
            <SourceIcon className="h-4 w-4 text-white" />
          </span>
        </div>

        {/* Event content */}
        <div className="flex-1 min-w-0">
          <div
            className={`bg-white rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow ${severityColor.split(' ').slice(2).join(' ')}`}
            onClick={() => setExpanded(!expanded)}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SeverityIcon className={`h-5 w-5 ${severityColor.split(' ')[0]}`} />
                <span className="font-medium text-gray-900">
                  {event.event_type}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${severityColor}`}
                >
                  {SEVERITY_LEVELS[event.severity]?.label || event.severity}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>

            {/* Source and time */}
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <Server className="w-4 h-4 mr-1" />
                {SYSTEM_SOURCES[event.source]?.label || event.source}
              </span>
              <span
                className="flex items-center"
                title={formatFullTimestamp(event.created_at)}
              >
                <Clock className="w-4 h-4 mr-1" />
                {formatTimestamp(event.created_at)}
              </span>
            </div>

            {/* Expanded details */}
            {expanded && (
              <div className="mt-4 border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                <DetailsPanel details={event.details} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main EventTimeline component
 */
export default function EventTimeline({ events = [], loading = false, emptyMessage = 'No system events found' }) {
  if (loading) {
    return (
      <div className="flow-root">
        <ul className="-mb-8">
          {[...Array(5)].map((_, i) => (
            <li key={i} className="relative pb-8">
              {i < 4 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="bg-white rounded-lg border p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {events.map((event, index) => (
          <li key={event.id}>
            <EventItem
              event={event}
              isLast={index === events.length - 1}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
