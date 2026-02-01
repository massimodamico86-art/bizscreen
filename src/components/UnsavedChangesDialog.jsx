/**
 * UnsavedChangesDialog - Confirmation dialog for unsaved changes
 *
 * Per CONTEXT.md: "Unsaved changes trigger confirm dialog: Save / Discard / Cancel"
 * Three-button dialog that prevents accidental data loss when closing the editor.
 */

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from '../design-system/components/Modal';

/**
 * UnsavedChangesDialog component
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onSave - Callback when user wants to save changes
 * @param {Function} props.onDiscard - Callback when user wants to discard changes
 * @param {Function} props.onCancel - Callback when user wants to cancel (return to editor)
 * @param {boolean} [props.loading=false] - Whether save is in progress
 */
export default function UnsavedChangesDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="sm"
      closeOnOverlay={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="p-6">
        {/* Warning icon and header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Unsaved Changes
          </h2>
          <p className="text-sm text-gray-500">
            You have unsaved changes. What would you like to do?
          </p>
        </div>

        {/* Action buttons - Cancel on left, Discard and Save on right */}
        <div className="flex items-center justify-between gap-3">
          {/* Cancel - gray secondary, left side */}
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {/* Discard and Save grouped on right */}
          <div className="flex items-center gap-3">
            {/* Discard - red danger */}
            <button
              onClick={onDiscard}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Discard
            </button>

            {/* Save - primary teal */}
            <button
              onClick={onSave}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
