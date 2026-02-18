/**
 * CategorySection - Sortable category with nested sortable item list
 *
 * Renders a category header (drag handle, editable name, visibility toggle, delete)
 * with a nested list of MenuItemRow components. Items within each category are
 * independently sortable via @dnd-kit.
 *
 * @param {Object} props
 * @param {Object} props.category - Category object with id, name, is_visible, menu_items
 * @param {Array} props.priceColumns - Price column definitions [{key, label}]
 * @param {string} props.currencyCode - ISO 4217 currency code
 * @param {Function} props.onUpdateCategory - Called with (categoryId, updates)
 * @param {Function} props.onDeleteCategory - Called with (categoryId)
 * @param {Function} props.onAddItem - Called with (categoryId)
 * @param {Function} props.onUpdateItem - Called with (itemId, updates)
 * @param {Function} props.onDeleteItem - Called with (itemId)
 * @param {Function} props.onToggleItemAvailability - Called with (itemId, newState)
 * @param {Function} props.onReorderItems - Called with (categoryId, reorderedItems)
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { GripVertical, Eye, EyeOff, Trash2, Plus } from 'lucide-react';
import MenuItemRow from './MenuItemRow';

export default function CategorySection({
  category,
  priceColumns,
  currencyCode,
  onUpdateCategory,
  onDeleteCategory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onToggleItemAvailability,
  onReorderItems,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  // PointerSensor with distance constraint to prevent accidental drags on inputs
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const items = category.menu_items || [];
  const itemIds = items.map((item) => item.id);

  const handleItemDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorderItems(category.id, reordered);
  };

  const isHidden = category.is_visible === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg bg-gray-50 ${
        isHidden ? 'opacity-60' : ''
      }`}
    >
      {/* Category header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white rounded-t-lg">
        <button
          type="button"
          className="cursor-grab text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>

        <input
          type="text"
          defaultValue={category.name || ''}
          onBlur={(e) => onUpdateCategory(category.id, { name: e.target.value })}
          placeholder="Category name"
          className="flex-1 px-2 py-1 text-sm font-semibold border border-transparent rounded hover:border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-transparent"
        />

        <button
          type="button"
          onClick={() =>
            onUpdateCategory(category.id, { isVisible: !category.is_visible })
          }
          className={`p-1 rounded transition-colors ${
            isHidden
              ? 'text-gray-400 hover:text-gray-600'
              : 'text-green-500 hover:text-green-600'
          }`}
          title={isHidden ? 'Show category' : 'Hide category'}
        >
          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <button
          type="button"
          onClick={() => onDeleteCategory(category.id)}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete category"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Items list */}
      <div className="p-2 space-y-1.5">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <SortableContext
            items={itemIds}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <MenuItemRow
                key={item.id}
                item={item}
                priceColumns={priceColumns}
                currencyCode={currencyCode}
                onUpdate={onUpdateItem}
                onDelete={onDeleteItem}
                onToggleAvailability={onToggleItemAvailability}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => onAddItem(category.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors w-full"
        >
          <Plus size={12} />
          Add Item
        </button>
      </div>
    </div>
  );
}
