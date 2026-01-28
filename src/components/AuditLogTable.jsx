/**
 * AuditLogTable Component
 * Phase 18: Table component for displaying audit logs
 */

import { formatDistanceToNow } from 'date-fns';
import {
  User,
  Monitor,
  FileText,
  Settings,
  Shield,
  Activity,
} from 'lucide-react';
import { useState } from 'react';
import { getEventTypeLabel, getEntityTypeLabel } from '../services/auditService';

/**
 * Get icon for event type category
 */
function getEventIcon(eventType) {
  if (eventType?.startsWith('auth.')) return Shield;
  if (eventType?.startsWith('user.')) return User;
  if (eventType?.startsWith('screen.')) return Monitor;
  if (eventType?.startsWith('media.') || eventType?.startsWith('playlist.') || eventType?.startsWith('campaign.')) return FileText;
  if (eventType?.startsWith('settings.') || eventType?.startsWith('integration.')) return Settings;
  return Activity;
}

/**
 * Get color class for event type category
 */
function getEventColor(eventType) {
  if (eventType?.startsWith('auth.')) return 'text-blue-500 bg-blue-50';
  if (eventType?.startsWith('user.')) return 'text-purple-500 bg-purple-50';
  if (eventType?.includes('.deleted') || eventType?.includes('.suspended') || eventType?.includes('.disabled')) return 'text-red-500 bg-red-50';
  if (eventType?.includes('.created')) return 'text-green-500 bg-green-50';
  if (eventType?.includes('.updated') || eventType?.includes('.changed')) return 'text-yellow-500 bg-yellow-50';
  return 'text-gray-500 bg-gray-50';
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
 * Expandable row for metadata
 */
function MetadataPanel({ metadata }) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-gray-400 text-sm">No additional details</span>;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 text-sm">
      <pre className="whitespace-pre-wrap text-gray-700 font-mono text-xs">
        {JSON.stringify(metadata, null, 2)}
      </pre>
    </div>
  );
}

/**
 * Single audit log row
 */
function AuditLogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getEventIcon(log.event_type);
  const colorClass = getEventColor(log.event_type);

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Event Type */}
        <td className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {getEventTypeLabel(log.event_type)}
              </div>
              <div className="text-xs text-gray-500">
                {log.event_type}
              </div>
            </div>
          </div>
        </td>

        {/* Entity */}
        <td className="px-4 py-3">
          {log.entity_type ? (
            <div>
              <div className="text-sm text-gray-900">
                {getEntityTypeLabel(log.entity_type)}
              </div>
              {log.entity_id && (
                <div className="text-xs text-gray-500 font-mono">
                  {log.entity_id.substring(0, 8)}...
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>

        {/* User */}
        <td className="px-4 py-3">
          {log.user_email || log.user_name ? (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {log.user_name || 'Unknown'}
                </div>
                <div className="text-xs text-gray-500">
                  {log.user_email}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-gray-400">System</span>
          )}
        </td>

        {/* Timestamp */}
        <td className="px-4 py-3">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            {formatTimestamp(log.created_at)}
          </div>
        </td>

        {/* IP Address */}
        <td className="px-4 py-3">
          {log.ip_address ? (
            <div className="flex items-center text-sm text-gray-500">
              <MapPin className="w-4 h-4 mr-1" />
              {log.ip_address}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>

        {/* Expand */}
        <td className="px-4 py-3">
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
        </td>
      </tr>

      {/* Expanded metadata */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50">
            <MetadataPanel metadata={log.metadata} />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Main AuditLogTable component
 */
export default function AuditLogTable({ logs = [], loading = false, emptyMessage = 'No audit logs found' }) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse p-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex space-x-4 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP
              </th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
