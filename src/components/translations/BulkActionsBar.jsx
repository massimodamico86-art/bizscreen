/**
 * Bulk Actions Bar Component
 *
 * Toolbar for performing bulk status updates on selected scenes.
 * Appears when one or more scenes are selected in the translation dashboard.
 */

import React, { useState } from 'react';
import { Button, Select } from '../../design-system';
import { RefreshCw } from 'lucide-react';
import { bulkUpdateStatus } from '../../services/translationService';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Set to Draft' },
  { value: 'review', label: 'Set to Review' },
  { value: 'approved', label: 'Set to Approved' },
];

export default function BulkActionsBar({ selectedIds, onComplete, showToast }) {
  const [updating, setUpdating] = useState(false);
  const [targetStatus, setTargetStatus] = useState('review');

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;

    setUpdating(true);
    try {
      const count = await bulkUpdateStatus(selectedIds, targetStatus);
      showToast?.(`Updated ${count} scene(s) to ${targetStatus}`, 'success');
      onComplete?.();
    } catch (error) {
      showToast?.('Failed to update status: ' + error.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
      <span className="text-sm font-medium text-blue-800">
        {selectedIds.length} selected
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <Select
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value)}
          options={STATUS_OPTIONS}
          className="w-40"
        />

        <Button
          onClick={handleBulkUpdate}
          disabled={updating || selectedIds.length === 0}
          variant="primary"
          size="sm"
          icon={updating ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : null}
        >
          {updating ? 'Updating...' : 'Update Status'}
        </Button>
      </div>
    </div>
  );
}
