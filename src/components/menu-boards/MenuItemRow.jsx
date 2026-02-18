/**
 * MenuItemRow - Single menu item row in the editor
 *
 * Renders an inline-editable row with drag handle, name, description,
 * prices (one per column), image URL, dietary tags, availability toggle,
 * and delete button. Uses @dnd-kit/sortable for drag-and-drop.
 *
 * @param {Object} props
 * @param {Object} props.item - Menu item object
 * @param {Array} props.priceColumns - Price column definitions [{key, label}]
 * @param {string} props.currencyCode - ISO 4217 currency code
 * @param {Function} props.onUpdate - Called with (itemId, updates)
 * @param {Function} props.onDelete - Called with (itemId)
 * @param {Function} props.onToggleAvailability - Called with (itemId, newState)
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Tag } from 'lucide-react';
import { DIETARY_TAGS } from '../../services/menuBoardService';
import DietaryTagPicker from './DietaryTagPicker';

export default function MenuItemRow({
  item,
  priceColumns = [],
  currencyCode: _currencyCode,
  onUpdate,
  onDelete,
  onToggleAvailability,
}) {
  const [showTags, setShowTags] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const handleBlur = (field, value) => {
    onUpdate(item.id, { [field]: value });
  };

  const handlePriceChange = (columnKey, value) => {
    const prices = { ...(item.prices || {}), [columnKey]: value };
    onUpdate(item.id, { prices });
  };

  const handleTagsChange = (tags) => {
    onUpdate(item.id, { dietaryTags: tags });
  };

  const isUnavailable = item.is_available === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg p-3 bg-white ${
        isUnavailable ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-1 cursor-grab text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        {/* Fields */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            {/* Name */}
            <input
              type="text"
              defaultValue={item.name || ''}
              onBlur={(e) => handleBlur('name', e.target.value)}
              placeholder="Item name"
              className="flex-1 px-2 py-1 text-sm font-medium border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
            />
            {/* Description */}
            <input
              type="text"
              defaultValue={item.description || ''}
              onBlur={(e) => handleBlur('description', e.target.value)}
              placeholder="Description"
              className="flex-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Price inputs - one per column */}
            {priceColumns.map((col) => (
              <div key={col.key} className="flex items-center gap-1">
                <label className="text-[10px] text-gray-400 uppercase">{col.label}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.prices?.[col.key] ?? ''}
                  onBlur={(e) => handlePriceChange(col.key, e.target.value ? Number(e.target.value) : null)}
                  placeholder="0.00"
                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                />
              </div>
            ))}

            {/* Image URL */}
            <input
              type="text"
              defaultValue={item.image_url || ''}
              onBlur={(e) => handleBlur('imageUrl', e.target.value)}
              placeholder="Image URL"
              className="flex-1 min-w-[120px] px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
            />

            {/* Tag toggle */}
            <button
              type="button"
              onClick={() => setShowTags(!showTags)}
              className={`p-1 rounded transition-colors ${
                (item.dietary_tags?.length || 0) > 0
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Dietary tags"
            >
              <Tag size={14} />
            </button>

            {/* Availability toggle */}
            <label className="relative inline-flex items-center cursor-pointer" title="Available">
              <input
                type="checkbox"
                checked={item.is_available !== false}
                onChange={() => onToggleAvailability(item.id, !(item.is_available !== false))}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-gray-200 peer-focus:ring-2 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
            </label>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Delete item"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Dietary tag badges (inline) */}
          {(item.dietary_tags?.length > 0 && !showTags) && (
            <div className="flex flex-wrap gap-1">
              {item.dietary_tags.map((tagKey) => {
                const tag = DIETARY_TAGS.find((t) => t.key === tagKey);
                if (!tag) return null;
                return (
                  <span
                    key={tagKey}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.emoji}
                  </span>
                );
              })}
            </div>
          )}

          {/* Tag picker (expanded) */}
          {showTags && (
            <DietaryTagPicker
              selectedTags={item.dietary_tags || []}
              onChange={handleTagsChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
