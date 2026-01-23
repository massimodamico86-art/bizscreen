/**
 * LayoutTemplatesPage
 *
 * Page for browsing layout templates and user's layouts.
 * Provides a Yodeck-style gallery for discovering and using templates.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  LayoutGrid,
  Sparkles,
  Plus,
  Loader2,
  AlertCircle,
  Monitor,
  Smartphone,
  Square,
  Star,
  Edit,
  Trash2,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Tv,
  Play,
  FileImage,
  UtensilsCrossed,
  Megaphone,
  Share2,
  BarChart3,
  Palette,
  Wand2,
  RectangleHorizontal,
} from 'lucide-react';
import { Button } from '../../design-system';
import { useLayoutTemplates } from '../../hooks/useLayoutTemplates';
import { fetchLayouts, deleteLayoutSafely } from '../../services/layoutService';
import { CANVA_TEMPLATE_CATEGORIES, openCanvaTemplates } from '../../services/canvaService';
import { useLogger } from '../../hooks/useLogger.js';

/**
 * Orientation icons mapping
 */
const ORIENTATION_ICONS = {
  '16_9': Monitor,
  '9_16': Smartphone,
  'square': Square,
};

/**
 * Orientation labels
 */
const ORIENTATION_LABELS = {
  'All': 'All Orientations',
  '16_9': 'Landscape (16:9)',
  '9_16': 'Portrait (9:16)',
  'square': 'Square (1:1)',
};

/**
 * Template Card Component
 */
function TemplateCard({ template, onUse, isCloning }) {
  const [isHovered, setIsHovered] = useState(false);
  const OrientationIcon = ORIENTATION_ICONS[template.orientation] || Monitor;

  return (
    <div
      className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="aspect-video relative bg-gray-900">
        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: template.background_color || '#1a1a2e' }}
          >
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <LayoutGrid className="w-12 h-12" />
            </div>
          </div>
        )}

        {/* Featured badge */}
        {template.is_featured && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
            <Star className="w-3 h-3" />
            Featured
          </div>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => onUse(template)}
              disabled={isCloning}
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Use this template
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-white truncate">{template.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">
            {template.category}
          </span>
          <OrientationIcon className="w-3 h-3 text-gray-500" />
          {template.use_count > 0 && (
            <span className="text-xs text-gray-500">
              {template.use_count} uses
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Layout Card Component (for My Layouts tab)
 */
function LayoutCard({ layout, onEdit, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${layout.name}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(layout.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all">
      {/* Thumbnail */}
      <div
        className="aspect-video relative"
        style={{ backgroundColor: layout.background_color || '#1a1a2e' }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-gray-600">
          <LayoutGrid className="w-10 h-10" />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="primary" size="sm" onClick={() => onEdit(layout.id)}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-white truncate">{layout.name}</h3>
        <p className="text-xs text-gray-500 mt-1">
          {layout.zone_count || 0} zones
        </p>
      </div>
    </div>
  );
}

/**
 * Category Filter Chips
 */
function CategoryChips({ categories, selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selected === category
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

/**
 * Orientation Dropdown
 */
function OrientationDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const options = ['All', '16_9', '9_16', 'square'];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg text-sm text-white hover:bg-gray-600 transition-colors"
      >
        {ORIENTATION_LABELS[value]}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 ${
                  value === option ? 'text-blue-400' : 'text-white'
                }`}
              >
                {ORIENTATION_LABELS[option]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Main LayoutTemplatesPage Component
 */
export default function LayoutTemplatesPage({ showToast, onNavigate }) {
  const logger = useLogger('LayoutTemplatesPage');
