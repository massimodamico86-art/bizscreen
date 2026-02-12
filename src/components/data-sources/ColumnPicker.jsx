/**
 * @file ColumnPicker.jsx
 * @description Column visibility toggles and drag-to-reorder controls for data source preview.
 * Allows users to show/hide columns and change their display order.
 *
 * Props:
 * - fields: array of field objects (all available fields from the data source)
 * - visibleColumns: array of field names currently visible (null = all visible)
 * - columnOrder: array of field names in display order (null = source order)
 * - onChange({ visibleColumns, columnOrder }): callback when user changes visibility or order
 */
import { ArrowUp, ArrowDown } from 'lucide-react';

/**
 * ColumnPicker - Provides column visibility toggles and reorder controls.
 */
export function ColumnPicker({
  fields = [],
  visibleColumns = null,
  columnOrder = null,
  onChange,
}) {
  // Derive working state
  const effectiveOrder = columnOrder || fields.map((f) => f.name);
  const effectiveVisible = visibleColumns || fields.map((f) => f.name);

  const fieldMap = new Map(fields.map((f) => [f.name, f]));

  const allSelected = effectiveVisible.length === fields.length;

  // Toggle a single column's visibility
  const handleToggle = (fieldName) => {
    let newVisible;
    if (effectiveVisible.includes(fieldName)) {
      // Remove from visible (don't allow removing the last one)
      newVisible = effectiveVisible.filter((n) => n !== fieldName);
      if (newVisible.length === 0) return;
    } else {
      // Add to visible
      newVisible = [...effectiveVisible, fieldName];
    }

    onChange({
      visibleColumns: newVisible.length === fields.length ? null : newVisible,
      columnOrder: effectiveOrder,
    });
  };

  // Toggle select all / deselect all
  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all except the first one (must keep at least one)
      onChange({
        visibleColumns: [effectiveOrder[0]],
        columnOrder: effectiveOrder,
      });
    } else {
      // Select all
      onChange({
        visibleColumns: null,
        columnOrder: effectiveOrder,
      });
    }
  };

  // Move a column up or down in order
  const handleMove = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= effectiveOrder.length) return;

    const newOrder = [...effectiveOrder];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

    onChange({
      visibleColumns: effectiveVisible.length === fields.length ? null : effectiveVisible,
      columnOrder: newOrder,
    });
  };

  if (fields.length === 0) {
    return (
      <p className="text-sm text-gray-500">No fields available</p>
    );
  }

  return (
    <div>
      {/* Select All / Deselect All toggle */}
      <button
        type="button"
        onClick={handleToggleAll}
        className="text-xs text-blue-400 hover:text-blue-300 mb-3 focus:outline-none"
      >
        {allSelected ? 'Deselect All' : 'Select All'}
      </button>

      {/* Column list */}
      <div className="space-y-1">
        {effectiveOrder.map((fieldName, index) => {
          const field = fieldMap.get(fieldName);
          if (!field) return null;

          const isVisible = effectiveVisible.includes(fieldName);
          const isFirst = index === 0;
          const isLast = index === effectiveOrder.length - 1;

          return (
            <div
              key={fieldName}
              className="flex items-center gap-2 py-1"
            >
              {/* Visibility checkbox */}
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => handleToggle(fieldName)}
                className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
              />

              {/* Field label */}
              <span className="text-sm text-gray-300 flex-1">
                {field.label || field.name}
              </span>

              {/* Move up/down buttons */}
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={isFirst}
                className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
                aria-label={`Move ${field.label || field.name} up`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={isLast}
                className="p-0.5 text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
                aria-label={`Move ${field.label || field.name} down`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
