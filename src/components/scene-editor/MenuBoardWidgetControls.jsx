/**
 * MenuBoardWidgetControls
 *
 * Configuration UI for the menu-board widget type in the scene editor.
 * Provides menu board selector, theme toggle, accent color, display toggles
 * (show images, show descriptions), page interval, and currency override.
 *
 * @module components/scene-editor/MenuBoardWidgetControls
 * @param {Object} props - Widget props from the block
 * @param {Function} onPropChange - Callback to update a single prop
 */

import { useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { fetchMenuBoards } from '../../services/menuBoardService';

/**
 * @param {Object} root0 - Component props
 * @param {Object} root0.props - Widget props from the block
 * @param {Function} root0.onPropChange - Callback to update a single prop
 */
export function MenuBoardWidgetControls({ props, onPropChange }) {
  const [menuBoards, setMenuBoards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load available menu boards on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const boards = await fetchMenuBoards();
        setMenuBoards(boards || []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-3">
      {/* Menu Board Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">
          <UtensilsCrossed className="w-3 h-3 inline mr-1" />
          Menu Board
        </label>
        <select
          value={props.menuBoardId || ''}
          onChange={(e) => onPropChange('menuBoardId', e.target.value)}
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
          disabled={loading}
        >
          <option value="">Select a menu board...</option>
          {menuBoards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </div>

      {/* Theme Selector */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Theme</label>
        <div className="flex gap-1">
          <button
            onClick={() => onPropChange('theme', 'dark')}
            className={`flex-1 text-xs py-1.5 rounded ${
              (props.theme || 'dark') === 'dark'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => onPropChange('theme', 'light')}
            className={`flex-1 text-xs py-1.5 rounded ${
              props.theme === 'light'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            Light
          </button>
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Accent Color</label>
        <input
          type="color"
          value={props.accentColor || '#f59e0b'}
          onChange={(e) => onPropChange('accentColor', e.target.value)}
          className="w-full h-8 cursor-pointer rounded border border-gray-700"
        />
      </div>

      {/* Show Images Toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showImages !== false}
          onChange={(e) => onPropChange('showImages', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Images
      </label>

      {/* Show Descriptions Toggle */}
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={props.showDescriptions !== false}
          onChange={(e) => onPropChange('showDescriptions', e.target.checked)}
          className="rounded border-gray-600 text-blue-500 bg-gray-800"
        />
        Show Descriptions
      </label>

      {/* Page Interval */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Page Interval</label>
        <select
          value={props.pageIntervalSeconds || 10}
          onChange={(e) => onPropChange('pageIntervalSeconds', parseInt(e.target.value, 10))}
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
        >
          {[5, 8, 10, 15, 20, 30].map((seconds) => (
            <option key={seconds} value={seconds}>
              {seconds} seconds
            </option>
          ))}
        </select>
      </div>

      {/* Currency Override */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Currency</label>
        <select
          value={props.currencyCode || ''}
          onChange={(e) => onPropChange('currencyCode', e.target.value || null)}
          className="w-full bg-gray-800 text-gray-300 text-xs rounded px-2 py-1.5 border border-gray-700"
        >
          <option value="">Board default</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="CAD">CAD</option>
          <option value="AUD">AUD</option>
          <option value="JPY">JPY</option>
        </select>
      </div>
    </div>
  );
}
