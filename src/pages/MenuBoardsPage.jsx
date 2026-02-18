/**
 * MenuBoardsPage - List page for menu boards
 *
 * Displays a responsive card grid of all menu boards with create, edit,
 * duplicate, and delete actions. Opens MenuBoardEditorModal for CRUD.
 *
 * @param {Object} props
 * @param {Function} props.showToast - Toast notification callback
 */

import { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-react';
import { PageLayout } from '../design-system';
import { Button } from '../design-system';
import {
  fetchMenuBoards,
  deleteMenuBoard,
  getMenuBoard,
  createMenuBoard,
  createCategory,
  createMenuItem,
} from '../services/menuBoardService';
import MenuBoardEditorModal from '../components/menu-boards/MenuBoardEditorModal';
import { useLogger } from '../hooks/useLogger.js';

const THEME_COLORS = {
  dark: 'bg-gray-800 text-gray-100',
  light: 'bg-gray-100 text-gray-800',
  custom: 'bg-purple-100 text-purple-800',
};

export default function MenuBoardsPage({ showToast }) {
  const logger = useLogger('MenuBoardsPage');

  const [menuBoards, setMenuBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [duplicating, setDuplicating] = useState(null); // ID being duplicated

  // Load menu boards on mount
  useEffect(() => {
    loadMenuBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMenuBoards = async () => {
    try {
      setLoading(true);
      const data = await fetchMenuBoards();
      setMenuBoards(data);
    } catch (err) {
      logger.error('Failed to load menu boards', { error: err });
      showToast?.('Failed to load menu boards: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingBoard(null);
    setEditorOpen(true);
  };

  const handleEdit = (board) => {
    setEditingBoard(board);
    setEditorOpen(true);
  };

  const handleDelete = async (board) => {
    if (!confirm(`Delete "${board.name}" and all its categories and items?`)) {
      return;
    }

    try {
      await deleteMenuBoard(board.id);
      setMenuBoards((prev) => prev.filter((b) => b.id !== board.id));
      showToast?.('Menu board deleted');
    } catch (err) {
      logger.error('Failed to delete menu board', { error: err });
      showToast?.('Failed to delete: ' + err.message, 'error');
    }
  };

  const handleDuplicate = async (board) => {
    try {
      setDuplicating(board.id);

      // Fetch full board with categories and items
      const fullBoard = await getMenuBoard(board.id);

      // Create a copy of the board
      const newBoard = await createMenuBoard({
        name: `${fullBoard.name} (Copy)`,
        description: fullBoard.description,
        theme: fullBoard.theme,
        currencyCode: fullBoard.currency_code,
        priceColumns: fullBoard.price_columns,
        accentColor: fullBoard.accent_color,
        textColor: fullBoard.text_color,
        fontFamily: fullBoard.font_family,
        showImages: fullBoard.show_images,
        showDescriptions: fullBoard.show_descriptions,
        pageIntervalSeconds: fullBoard.page_interval_seconds,
      });

      // Recreate categories and items
      for (const cat of fullBoard.menu_categories || []) {
        const newCat = await createCategory(newBoard.id, {
          name: cat.name,
          description: cat.description,
        });

        for (const item of cat.menu_items || []) {
          await createMenuItem(newCat.id, newBoard.id, {
            name: item.name,
            description: item.description,
            prices: item.prices,
            imageUrl: item.image_url,
            dietaryTags: item.dietary_tags,
          });
        }
      }

      showToast?.('Menu board duplicated');
      loadMenuBoards();
    } catch (err) {
      logger.error('Failed to duplicate menu board', { error: err });
      showToast?.('Failed to duplicate: ' + err.message, 'error');
    } finally {
      setDuplicating(null);
    }
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setEditingBoard(null);
  };

  const handleSaved = () => {
    loadMenuBoards();
  };

  // Count helpers
  const getCategoryCount = (board) => {
    const count = board.menu_categories;
    if (Array.isArray(count)) return count.length;
    if (count && typeof count === 'object' && count.count !== undefined)
      return count.count;
    return 0;
  };

  const getItemCount = (board) => {
    const count = board.menu_items;
    if (Array.isArray(count)) return count.length;
    if (count && typeof count === 'object' && count.count !== undefined)
      return count.count;
    return 0;
  };

  return (
    <PageLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Boards</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage digital menu boards for your screens
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={handleCreate}>
          New Menu Board
        </Button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-gray-100 rounded w-16" />
                <div className="h-6 bg-gray-100 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && menuBoards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <UtensilsCrossed size={32} className="text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No menu boards yet
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first menu board to display on screens.
          </p>
          <Button icon={<Plus size={16} />} onClick={handleCreate}>
            Create Menu Board
          </Button>
        </div>
      )}

      {/* Board cards grid */}
      {!loading && menuBoards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuBoards.map((board) => (
            <div
              key={board.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group"
            >
              {/* Board name */}
              <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                {board.name}
              </h3>

              {/* Counts */}
              <p className="text-xs text-gray-400 mb-3">
                {getCategoryCount(board)} categories
                {' / '}
                {getItemCount(board)} items
              </p>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    THEME_COLORS[board.theme] || THEME_COLORS.dark
                  }`}
                >
                  {board.theme || 'dark'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {board.currency_code || 'USD'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(board)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                  title="Edit"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(board)}
                  disabled={duplicating === board.id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="Duplicate"
                >
                  {duplicating === board.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Copy size={12} />
                  )}
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(board)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <MenuBoardEditorModal
        isOpen={editorOpen}
        onClose={handleEditorClose}
        menuBoard={editingBoard}
        showToast={showToast}
        onSaved={handleSaved}
      />
    </PageLayout>
  );
}
