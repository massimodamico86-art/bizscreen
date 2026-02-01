/**
 * PostSaveDialog - Success dialog shown after design save
 *
 * Per CONTEXT.md: "After successful save, ask user: 'Keep editing or view your template?'"
 * User controls post-save navigation rather than auto-close.
 */

import { CheckCircle } from 'lucide-react';
import { Modal } from '../design-system/components/Modal';

/**
 * PostSaveDialog component
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onKeepEditing - Callback when user wants to continue editing
 * @param {Function} props.onViewTemplate - Callback when user wants to view saved template
 * @param {string} [props.savedDesignName] - Name of the saved design (optional)
 */
export default function PostSaveDialog({
  open,
  onKeepEditing,
  onViewTemplate,
  savedDesignName,
}) {
  const description = savedDesignName
    ? `Your design "${savedDesignName}" has been saved to the media library.`
    : 'Your design has been saved to the media library.';

  return (
    <Modal
      open={open}
      onClose={onKeepEditing}
      size="sm"
      closeOnOverlay={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="p-6 text-center">
        {/* Success icon */}
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-green-600" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Design Saved!
        </h2>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-6">
          {description}
        </p>

        {/* Action buttons - stacked vertically */}
        <div className="flex flex-col gap-2">
          {/* Primary: Keep Editing (most common action) */}
          <button
            onClick={onKeepEditing}
            className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
          >
            Keep Editing
          </button>

          {/* Secondary: View My Template */}
          <button
            onClick={onViewTemplate}
            className="w-full px-4 py-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
          >
            View My Template
          </button>
        </div>
      </div>
    </Modal>
  );
}
