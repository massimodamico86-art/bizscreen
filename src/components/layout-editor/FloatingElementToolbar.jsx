/**
 * FloatingElementToolbar
 *
 * Yodeck-style floating toolbar that appears above a selected element.
 * Features:
 * - Settings button
 * - Rotate button
 * - Flip buttons (horizontal/vertical)
 * - Position button (with dropdown)
 * - Lock/Unlock toggle
 * - Layers button
 * - Delete button
 *
 * @module components/layout-editor/FloatingElementToolbar
 */

import { useState, useRef, useEffect } from 'react';



export default function FloatingElementToolbar({
  element,
  position,
  canvasRect,
  onOpenSettings,
  onRotate,
  onFlipHorizontal,
  onFlipVertical,
  onAlignElement,
  onToggleLock,
  onOpenLayers,
  onDelete,
  onDuplicate,
}) {
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const toolbarRef = useRef(null);
  const positionMenuRef = useRef(null);

  // Close position menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (positionMenuRef.current && !positionMenuRef.current.contains(event.target)) {
        setShowPositionMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!element || !position) return null;

  // Calculate toolbar position (above element, centered)
  const toolbarHeight = 44;
  const toolbarWidth = 380;
  const offset = 12;

  let left = position.x + position.width / 2 - toolbarWidth / 2;
  let top = position.y - toolbarHeight - offset;

  // Keep toolbar within canvas bounds
  if (canvasRect) {
    if (left < canvasRect.left + 10) left = canvasRect.left + 10;
    if (left + toolbarWidth > canvasRect.right - 10) left = canvasRect.right - toolbarWidth - 10;
    if (top < canvasRect.top + 10) {
      // Show below element if not enough space above
      top = position.y + position.height + offset;
    }
  }

  const isLocked = element.locked === true;

  return (
    <div
      ref={toolbarRef}
      className="fixed flex items-center bg-white rounded-lg shadow-lg border border-gray-200 z-50"
      style={{
        left,
        top,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Settings */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-100 transition-colors"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
        <span className="text-xs font-medium">Settings</span>
      </button>

      {/* Rotate */}
      <button
        onClick={() => onRotate?.(90)}
        className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-100 transition-colors"
        title="Rotate 90°"
      >
        <RotateCw className="w-4 h-4" />
      </button>

      {/* Flip dropdown */}
      <div className="relative border-r border-gray-100">
        <button
          onClick={() => {
            // Toggle between flip horizontal and vertical on each click
            onFlipHorizontal?.();
          }}
          className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          title="Flip Horizontal"
        >
          <FlipHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Position / Align */}
      <div className="relative" ref={positionMenuRef}>
        <button
          onClick={() => setShowPositionMenu(!showPositionMenu)}
          className="flex items-center gap-1 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-100 transition-colors"
          title="Position"
        >
          <Move className="w-4 h-4" />
          <span className="text-xs font-medium">Position</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Position dropdown */}
        {showPositionMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-40 z-10">
            <div className="px-2 py-1">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Align</p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => { onAlignElement?.('left'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onAlignElement?.('center-h'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Center Horizontally"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onAlignElement?.('right'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onAlignElement?.('top'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Align Top"
                >
                  <AlignStartVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onAlignElement?.('center-v'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Center Vertically"
                >
                  <AlignCenterVertical className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { onAlignElement?.('bottom'); setShowPositionMenu(false); }}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Align Bottom"
                >
                  <AlignEndVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lock/Unlock (Premium feature indicator) */}
      <button
        onClick={() => onToggleLock?.()}
        className={`flex items-center gap-1.5 px-3 py-2.5 border-r border-gray-100 transition-colors ${
          isLocked
            ? 'text-amber-600 hover:text-amber-700 bg-amber-50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
        title={isLocked ? 'Unlock' : 'Lock'}
      >
        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        <span className="text-xs font-medium">{isLocked ? 'Locked' : 'Unlocked'}</span>
        <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-medium rounded flex items-center gap-0.5">
          <Crown className="w-2.5 h-2.5" />
        </span>
      </button>

      {/* Layers */}
      <button
        onClick={onOpenLayers}
        className="flex items-center gap-1.5 px-3 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-100 transition-colors"
        title="Layers"
      >
        <Layers className="w-4 h-4" />
        <span className="text-xs font-medium">Layers</span>
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-r border-gray-100 transition-colors"
        title="Duplicate"
      >
        <Copy className="w-4 h-4" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-2.5 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-r-lg transition-colors"
        title="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
