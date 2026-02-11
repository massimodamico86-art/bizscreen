/**
 * Keyboard Shortcuts Overlay
 *
 * Dark-themed overlay that displays all available keyboard shortcuts
 * for the SVG editor. Categorized and styled with kbd tags.
 *
 * Props:
 * - isOpen: boolean - whether the overlay is visible
 * - onClose: function - callback to close the overlay
 *
 * Keyboard handling:
 * - Escape key closes the overlay via internal useEffect
 * - The "?" key trigger is handled externally in FabricSvgEditor
 *
 * Mac support:
 * - Displays "Cmd" instead of "Ctrl" on macOS
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { modal } from '../../design-system/motion';

const SHORTCUTS = [
  {
    category: 'General',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Save design' },
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alt)' },
      { keys: ['Ctrl', 'P'], description: 'Toggle preview' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selection' },
      { keys: ['Delete'], description: 'Delete selection' },
      { keys: ['Escape'], description: 'Exit preview / deselect' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
  },
];

/**
 *
 * @param root0
 * @param root0.isOpen
 * @param root0.onClose
 */
export default function KeyboardShortcutsOverlay({ isOpen, onClose }) {
  const [isMac] = useState(() =>
    typeof navigator !== 'undefined' && navigator.platform
      ? navigator.platform.includes('Mac')
      : false,
  );

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    /** @param {KeyboardEvent} e */
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * Render a key label, replacing Ctrl with Cmd on Mac
   *
   * @param {string} key
   */
  function renderKeyLabel(key) {
    if (key === 'Ctrl') return isMac ? 'Cmd' : 'Ctrl';
    return key;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="shortcuts-backdrop"
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center"
          onClick={onClose}
          {...modal.overlay}
        >
          <motion.div
            key="shortcuts-panel"
            className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
            {...modal.content}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4">
              <h2 className="text-white font-semibold text-lg">Keyboard Shortcuts</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              {SHORTCUTS.map((category) => (
                <div key={category.category}>
                  <div className="flex flex-col gap-3">
                    {category.items.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-300 text-sm">{shortcut.description}</span>
                        <div className="flex items-center gap-1 ml-4 shrink-0">
                          {shortcut.keys.map((key, keyIndex) => (
                            <span key={key} className="flex items-center gap-1">
                              {keyIndex > 0 && (
                                <span className="text-gray-500 text-xs">+</span>
                              )}
                              <kbd className="px-2 py-1 text-xs bg-gray-700 text-gray-200 rounded border border-gray-600 font-mono min-w-[28px] text-center">
                                {renderKeyLabel(key)}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
