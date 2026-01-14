/**
 * Editor Toolbar
 *
 * Left sidebar toolbar for the SVG editor.
 * Contains tools for adding elements and undo/redo.
 */

import {
  Type,
  Square,
  Circle,
  Triangle,
  Image,
  Undo2,
  Redo2,
  Hand,
  MousePointer,
} from 'lucide-react';

export default function EditorToolbar({
  onAddText,
  onAddShape,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddImage,
}) {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select', action: null },
    { id: 'divider1', type: 'divider' },
    { id: 'text', icon: Type, label: 'Add Text', action: onAddText },
    { id: 'divider2', type: 'divider' },
    { id: 'rect', icon: Square, label: 'Rectangle', action: () => onAddShape?.('rect') },
    { id: 'circle', icon: Circle, label: 'Circle', action: () => onAddShape?.('circle') },
    { id: 'triangle', icon: Triangle, label: 'Triangle', action: () => onAddShape?.('triangle') },
    { id: 'divider3', type: 'divider' },
    { id: 'image', icon: Image, label: 'Add Image', action: onAddImage, disabled: !onAddImage },
  ];

  return (
    <div className="w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-3 gap-1">
      {/* Tools */}
      {tools.map((tool) => {
        if (tool.type === 'divider') {
          return (
            <div
              key={tool.id}
              className="w-8 h-px bg-gray-700 my-2"
            />
          );
        }

        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={tool.action}
            disabled={tool.disabled}
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg transition-colors
              ${tool.disabled
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }
            `}
            title={tool.label}
          >
            <Icon size={20} />
          </button>
        );
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            w-10 h-10 flex items-center justify-center rounded-lg transition-colors
            ${canUndo
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 cursor-not-allowed'
            }
          `}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`
            w-10 h-10 flex items-center justify-center rounded-lg transition-colors
            ${canRedo
              ? 'text-gray-400 hover:text-white hover:bg-gray-700'
              : 'text-gray-600 cursor-not-allowed'
            }
          `}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={20} />
        </button>
      </div>
    </div>
  );
}
