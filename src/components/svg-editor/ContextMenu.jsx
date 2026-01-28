/**
 * Context Menu - OptiSigns Style
 *
 * Right-click context menu for canvas objects.
 * Features:
 * - Copy, Copy Style, Paste, Paste Style
 * - Duplicate, Delete
 * - Layer controls (Bring to Front, Send to Back, Bring Forward, Send Backward)
 * - Align Elements
 * - Link, Animate, Lock
 */

import { useEffect, useRef, useState } from 'react';
import {
  Copy,
  ClipboardPaste,
  Trash2,
  Layers,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowUp,
  ArrowDown,
  AlignHorizontalJustifyCenter,
  Link2,
  Play,
  Lock,
  Unlock,
  Paintbrush,
  Scissors,
} from 'lucide-react';

export default function ContextMenu({
  x,
  y,
  selectedObject,
  onClose,
  onCopy,
  onCut,
  onPaste,
  onCopyStyle,
  onPasteStyle,
  onDuplicate,
  onDelete,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onToggleLock,
  onOpenAnimate,
  onOpenLink,
  isLocked,
  hasClipboard,
  hasStyleClipboard,
}) {
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Position menu so it doesn't overflow viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const MenuItem = ({ icon: Icon, label, shortcut, onClick, disabled, danger }) => (
    <button
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
          onClose();
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
        disabled
          ? 'text-gray-500 cursor-not-allowed'
          : danger
          ? 'text-red-400 hover:bg-red-500/20'
          : 'text-gray-200 hover:bg-gray-700'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="flex-1 text-left">{label}</span>
      {shortcut && <span className="text-xs text-gray-500">{shortcut}</span>}
    </button>
  );

  const SubMenu = ({ icon: Icon, label, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const subMenuRef = useRef(null);

    return (
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors">
          {Icon && <Icon className="w-4 h-4" />}
          <span className="flex-1 text-left">{label}</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {isOpen && (
          <div
            ref={subMenuRef}
            className="absolute left-full top-0 ml-1 min-w-[180px] bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50"
          >
            {children}
          </div>
        )}
      </div>
    );
  };

  const Divider = () => <div className="my-1 border-t border-gray-700" />;

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 z-[100] min-w-[220px]"
      style={{ left: x, top: y }}
    >
      {/* Copy/Paste Section */}
      <MenuItem
        icon={Copy}
        label="Copy"
        shortcut="⌘C"
        onClick={onCopy}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={Scissors}
        label="Cut"
        shortcut="⌘X"
        onClick={onCut}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={ClipboardPaste}
        label="Paste"
        shortcut="⌘V"
        onClick={onPaste}
        disabled={!hasClipboard}
      />

      <Divider />

      {/* Style Copy/Paste */}
      <MenuItem
        icon={Paintbrush}
        label="Copy Style"
        onClick={onCopyStyle}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={Paintbrush}
        label="Paste Style"
        onClick={onPasteStyle}
        disabled={!selectedObject || !hasStyleClipboard}
      />

      <Divider />

      {/* Duplicate/Delete */}
      <MenuItem
        icon={Copy}
        label="Duplicate"
        shortcut="⌘D"
        onClick={onDuplicate}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={Trash2}
        label="Delete"
        shortcut="⌫"
        onClick={onDelete}
        disabled={!selectedObject}
        danger
      />

      <Divider />

      {/* Layer Controls */}
      <SubMenu icon={Layers} label="Layer">
        <MenuItem
          icon={ArrowUpToLine}
          label="Bring to Front"
          shortcut="⌘⇧↑"
          onClick={onBringToFront}
          disabled={!selectedObject}
        />
        <MenuItem
          icon={ArrowUp}
          label="Bring Forward"
          shortcut="⌘↑"
          onClick={onBringForward}
          disabled={!selectedObject}
        />
        <MenuItem
          icon={ArrowDown}
          label="Send Backward"
          shortcut="⌘↓"
          onClick={onSendBackward}
          disabled={!selectedObject}
        />
        <MenuItem
          icon={ArrowDownToLine}
          label="Send to Back"
          shortcut="⌘⇧↓"
          onClick={onSendToBack}
          disabled={!selectedObject}
        />
      </SubMenu>

      {/* Align Elements */}
      <SubMenu icon={AlignHorizontalJustifyCenter} label="Align Elements">
        <MenuItem label="Align Left" onClick={onAlignLeft} disabled={!selectedObject} />
        <MenuItem label="Align Center" onClick={onAlignCenter} disabled={!selectedObject} />
        <MenuItem label="Align Right" onClick={onAlignRight} disabled={!selectedObject} />
        <Divider />
        <MenuItem label="Align Top" onClick={onAlignTop} disabled={!selectedObject} />
        <MenuItem label="Align Middle" onClick={onAlignMiddle} disabled={!selectedObject} />
        <MenuItem label="Align Bottom" onClick={onAlignBottom} disabled={!selectedObject} />
      </SubMenu>

      <Divider />

      {/* Additional Actions */}
      <MenuItem
        icon={Link2}
        label="Link"
        onClick={onOpenLink}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={Play}
        label="Animate"
        onClick={onOpenAnimate}
        disabled={!selectedObject}
      />
      <MenuItem
        icon={isLocked ? Unlock : Lock}
        label={isLocked ? 'Unlock' : 'Lock'}
        shortcut="⌘L"
        onClick={onToggleLock}
        disabled={!selectedObject}
      />
    </div>
  );
}
