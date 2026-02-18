/**
 * MenuBoardEditorModal - Full CRUD editor modal for a single menu board
 *
 * Supports creating new boards and editing existing ones. Provides:
 * - Board settings (name, description, theme, currency, accent color, page interval)
 * - Price column management (add/remove columns)
 * - Category drag-and-drop reordering
 * - Nested item CRUD within categories
 * - Dietary tag picker per item
 * - Availability toggles
 *
 * Uses "immediate save" approach: each user action (add/delete/rename) calls
 * the service immediately with optimistic local state updates.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close callback
 * @param {Object|null} props.menuBoard - Null for create, object for edit
 * @param {Function} props.showToast - Toast notification callback
 * @param {Function} props.onSaved - Called after successful create/save
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Plus, X, Loader2 } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
} from '../../design-system/components/Modal';
import { Button } from '../../design-system';
import { useLogger } from '../../hooks/useLogger.js';
import {
  getMenuBoard,
  createMenuBoard,
  updateMenuBoard,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleItemAvailability,
  reorderCategories,
  reorderItems,
} from '../../services/menuBoardService';
import CategorySection from './CategorySection';

// Default price column
const DEFAULT_PRICE_COLUMNS = [{ key: 'default', label: 'Price' }];

export default function MenuBoardEditorModal({
  isOpen,
  onClose,
  menuBoard,
  showToast,
  onSaved,
}) {
  const logger = useLogger('MenuBoardEditorModal');
  const isEditing = Boolean(menuBoard);

  // Board settings state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('dark');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [priceColumns, setPriceColumns] = useState(DEFAULT_PRICE_COLUMNS);
  const [accentColor, setAccentColor] = useState('#f26f21');
  const [pageIntervalSeconds, setPageIntervalSeconds] = useState(10);

  // Categories with nested items
  const [categories, setCategories] = useState([]);

  // Loading / saving state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Board ID for editing (set after create or from prop)
  const [boardId, setBoardId] = useState(null);

  // DnD sensors for category-level reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Load board data when editing
  useEffect(() => {
    if (!isOpen) return;

    if (isEditing && menuBoard?.id) {
      setBoardId(menuBoard.id);
      loadBoard(menuBoard.id);
    } else {
      // Reset for create mode
      setName('');
      setDescription('');
      setTheme('dark');
      setCurrencyCode('USD');
      setPriceColumns(DEFAULT_PRICE_COLUMNS);
      setAccentColor('#f26f21');
      setPageIntervalSeconds(10);
      setCategories([]);
      setBoardId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, menuBoard?.id]);

  const loadBoard = useCallback(
    async (id) => {
      try {
        setLoading(true);
        const data = await getMenuBoard(id);
        setName(data.name || '');
        setDescription(data.description || '');
        setTheme(data.theme || 'dark');
        setCurrencyCode(data.currency_code || 'USD');
        setPriceColumns(
          data.price_columns?.length ? data.price_columns : DEFAULT_PRICE_COLUMNS
        );
        setAccentColor(data.accent_color || '#f26f21');
        setPageIntervalSeconds(data.page_interval_seconds ?? 10);
        setCategories(data.menu_categories || []);
      } catch (err) {
        logger.error('Failed to load menu board', { error: err });
        showToast?.('Failed to load menu board: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    },
    [logger, showToast]
  );

  // =========================================================================
  // BOARD SAVE (create or update board settings)
  // =========================================================================

  const handleSave = async () => {
    if (!name.trim()) {
      showToast?.('Board name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const boardFields = {
        name: name.trim(),
        description: description.trim() || null,
        theme,
        currencyCode,
        priceColumns,
        accentColor,
        pageIntervalSeconds,
      };

      if (isEditing && boardId) {
        await updateMenuBoard(boardId, boardFields);
        showToast?.('Menu board updated');
      } else {
        const created = await createMenuBoard(boardFields);
        setBoardId(created.id);
        showToast?.('Menu board created');
      }

      onSaved?.();
      onClose();
    } catch (err) {
      logger.error('Failed to save menu board', { error: err });
      showToast?.('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // =========================================================================
  // PRICE COLUMNS
  // =========================================================================

  const addPriceColumn = () => {
    const label = `Price ${priceColumns.length + 1}`;
    const key = label.toLowerCase().replace(/\s+/g, '-');
    setPriceColumns([...priceColumns, { key, label }]);
  };

  const updatePriceColumnLabel = (index, label) => {
    const updated = priceColumns.map((col, i) =>
      i === index
        ? { ...col, label, key: label.toLowerCase().replace(/\s+/g, '-') || col.key }
        : col
    );
    setPriceColumns(updated);
  };

  const removePriceColumn = (index) => {
    if (priceColumns.length <= 1) return; // Keep at least 1
    setPriceColumns(priceColumns.filter((_, i) => i !== index));
  };

  // =========================================================================
  // CATEGORY OPERATIONS (immediate save when editing)
  // =========================================================================

  const handleAddCategory = async () => {
    if (boardId) {
      try {
        const cat = await createCategory(boardId, { name: 'New Category' });
        setCategories((prev) => [...prev, { ...cat, menu_items: [] }]);
      } catch (err) {
        logger.error('Failed to add category', { error: err });
        showToast?.('Failed to add category: ' + err.message, 'error');
      }
    } else {
      // Create mode - add locally with temp ID
      const tempId = `temp-cat-${Date.now()}`;
      setCategories((prev) => [
        ...prev,
        { id: tempId, name: 'New Category', is_visible: true, menu_items: [] },
      ]);
    }
  };

  const handleUpdateCategory = async (catId, updates) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) =>
        c.id === catId
          ? {
              ...c,
              ...(updates.name !== undefined ? { name: updates.name } : {}),
              ...(updates.isVisible !== undefined
                ? { is_visible: updates.isVisible }
                : {}),
            }
          : c
      )
    );

    if (boardId && !String(catId).startsWith('temp-')) {
      try {
        await updateCategory(catId, updates);
      } catch (err) {
        logger.error('Failed to update category', { error: err });
        showToast?.('Failed to update category: ' + err.message, 'error');
      }
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Delete this category and all its items?')) return;

    setCategories((prev) => prev.filter((c) => c.id !== catId));

    if (boardId && !String(catId).startsWith('temp-')) {
      try {
        await deleteCategory(catId);
      } catch (err) {
        logger.error('Failed to delete category', { error: err });
        showToast?.('Failed to delete category: ' + err.message, 'error');
      }
    }
  };

  const handleCategoryDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);

    if (boardId) {
      try {
        const updates = reordered.map((c, i) => ({
          id: c.id,
          orderIndex: i,
        }));
        await reorderCategories(updates);
      } catch (err) {
        logger.error('Failed to reorder categories', { error: err });
        showToast?.('Failed to reorder: ' + err.message, 'error');
      }
    }
  };

  // =========================================================================
  // ITEM OPERATIONS (immediate save when editing)
  // =========================================================================

  const handleAddItem = async (categoryId) => {
    if (boardId && !String(categoryId).startsWith('temp-')) {
      try {
        const item = await createMenuItem(categoryId, boardId, {
          name: 'New Item',
        });
        setCategories((prev) =>
          prev.map((c) =>
            c.id === categoryId
              ? { ...c, menu_items: [...(c.menu_items || []), item] }
              : c
          )
        );
      } catch (err) {
        logger.error('Failed to add item', { error: err });
        showToast?.('Failed to add item: ' + err.message, 'error');
      }
    } else {
      const tempId = `temp-item-${Date.now()}`;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                menu_items: [
                  ...(c.menu_items || []),
                  {
                    id: tempId,
                    name: 'New Item',
                    is_available: true,
                    prices: {},
                    dietary_tags: [],
                  },
                ],
              }
            : c
        )
      );
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        menu_items: (c.menu_items || []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                ...(updates.name !== undefined ? { name: updates.name } : {}),
                ...(updates.description !== undefined
                  ? { description: updates.description }
                  : {}),
                ...(updates.prices !== undefined ? { prices: updates.prices } : {}),
                ...(updates.imageUrl !== undefined
                  ? { image_url: updates.imageUrl }
                  : {}),
                ...(updates.dietaryTags !== undefined
                  ? { dietary_tags: updates.dietaryTags }
                  : {}),
              }
            : item
        ),
      }))
    );

    if (!String(itemId).startsWith('temp-')) {
      try {
        await updateMenuItem(itemId, updates);
      } catch (err) {
        logger.error('Failed to update item', { error: err });
        showToast?.('Failed to update item: ' + err.message, 'error');
      }
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this menu item?')) return;

    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        menu_items: (c.menu_items || []).filter((item) => item.id !== itemId),
      }))
    );

    if (!String(itemId).startsWith('temp-')) {
      try {
        await deleteMenuItem(itemId);
      } catch (err) {
        logger.error('Failed to delete item', { error: err });
        showToast?.('Failed to delete item: ' + err.message, 'error');
      }
    }
  };

  const handleToggleItemAvailability = async (itemId, newState) => {
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        menu_items: (c.menu_items || []).map((item) =>
          item.id === itemId ? { ...item, is_available: newState } : item
        ),
      }))
    );

    if (!String(itemId).startsWith('temp-')) {
      try {
        await toggleItemAvailability(itemId, newState);
      } catch (err) {
        logger.error('Failed to toggle availability', { error: err });
        showToast?.('Failed to toggle availability: ' + err.message, 'error');
      }
    }
  };

  const handleReorderItems = async (categoryId, reorderedItems) => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, menu_items: reorderedItems } : c
      )
    );

    if (boardId) {
      try {
        const updates = reorderedItems.map((item, i) => ({
          id: item.id,
          orderIndex: i,
        }));
        await reorderItems(updates);
      } catch (err) {
        logger.error('Failed to reorder items', { error: err });
        showToast?.('Failed to reorder: ' + err.message, 'error');
      }
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  const categoryIds = categories.map((c) => c.id);

  return (
    <Modal open={isOpen} onClose={onClose} size="xl">
      <ModalHeader>
        <ModalTitle>
          {isEditing ? 'Edit Menu Board' : 'New Menu Board'}
        </ModalTitle>
        <ModalDescription>
          {isEditing
            ? 'Update board settings, categories, and menu items.'
            : 'Configure your menu board, then add categories and items.'}
        </ModalDescription>
      </ModalHeader>

      <ModalContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* ============================== */}
            {/* Board Settings */}
            {/* ============================== */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Board Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Lunch Menu"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    required
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Theme
                  </label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency Code
                  </label>
                  <input
                    type="text"
                    value={currencyCode}
                    onChange={(e) =>
                      setCurrencyCode(e.target.value.toUpperCase().slice(0, 3))
                    }
                    placeholder="USD"
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 p-0 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    />
                  </div>
                </div>

                {/* Page Interval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Page Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={120}
                    value={pageIntervalSeconds}
                    onChange={(e) =>
                      setPageIntervalSeconds(Number(e.target.value) || 10)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                />
              </div>
            </section>

            {/* ============================== */}
            {/* Price Columns */}
            {/* ============================== */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Price Columns
              </h3>
              <div className="space-y-2">
                {priceColumns.map((col, index) => (
                  <div key={col.key + index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) =>
                        updatePriceColumnLabel(index, e.target.value)
                      }
                      placeholder="Column label"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                    />
                    {priceColumns.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePriceColumn(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove column"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPriceColumn}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors"
                >
                  <Plus size={12} />
                  Add Column
                </button>
              </div>
            </section>

            {/* ============================== */}
            {/* Categories & Items */}
            {/* ============================== */}
            {(isEditing || boardId) && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Categories & Items
                </h3>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleCategoryDragEnd}
                >
                  <SortableContext
                    items={categoryIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <CategorySection
                          key={cat.id}
                          category={cat}
                          priceColumns={priceColumns}
                          currencyCode={currencyCode}
                          onUpdateCategory={handleUpdateCategory}
                          onDeleteCategory={handleDeleteCategory}
                          onAddItem={handleAddItem}
                          onUpdateItem={handleUpdateItem}
                          onDeleteItem={handleDeleteItem}
                          onToggleItemAvailability={
                            handleToggleItemAvailability
                          }
                          onReorderItems={handleReorderItems}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg border border-dashed border-gray-300 hover:border-orange-300 transition-colors w-full justify-center"
                >
                  <Plus size={14} />
                  Add Category
                </button>
              </section>
            )}

            {/* Hint for create mode before first save */}
            {!isEditing && !boardId && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Save the board first, then you can add categories and menu
                  items.
                </p>
              </div>
            )}
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {isEditing || boardId ? 'Close' : 'Cancel'}
        </Button>
        <Button onClick={handleSave} loading={saving} disabled={saving}>
          {isEditing ? 'Save Changes' : 'Create Board'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
