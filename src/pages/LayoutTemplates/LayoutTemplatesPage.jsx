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
  // Tab state
  const [activeTab, setActiveTab] = useState('templates');

  // Templates hook
  const {
    templates,
    categories,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    isCloning,
    cloningTemplateId,
    filters,
    setFilters,
    fetchMore,
    cloneTemplate,
    refresh,
  } = useLayoutTemplates();

  // My Layouts state
  const [myLayouts, setMyLayouts] = useState([]);
  const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
  const [layoutsError, setLayoutsError] = useState(null);

  // Search input state (debounced)
  const [searchInput, setSearchInput] = useState('');

  // Load my layouts
  const loadMyLayouts = useCallback(async () => {
    setIsLoadingLayouts(true);
    setLayoutsError(null);
    try {
      const layouts = await fetchLayouts();
      setMyLayouts(layouts);
    } catch (err) {
      console.error('Failed to load layouts:', err);
      setLayoutsError(err.message);
    } finally {
      setIsLoadingLayouts(false);
    }
  }, []);

  // Load layouts when tab changes
  useEffect(() => {
    if (activeTab === 'my-layouts') {
      loadMyLayouts();
    }
  }, [activeTab, loadMyLayouts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilters]);

  // Handle template use
  const handleUseTemplate = useCallback(async (template) => {
    try {
      const newLayout = await cloneTemplate(template.id);
      showToast?.({ type: 'success', message: `Created "${newLayout.name}"` });
      // Navigate to the layout editor
      onNavigate?.(`yodeck-layout-${newLayout.id}`);
    } catch (err) {
      console.error('Failed to create layout from template:', err);
      showToast?.({ type: 'error', message: 'Failed to create layout' });
    }
  }, [cloneTemplate, showToast, onNavigate]);

  // Handle layout edit
  const handleEditLayout = useCallback((layoutId) => {
    onNavigate?.(`yodeck-layout-${layoutId}`);
  }, [onNavigate]);

  // Handle layout delete
  const handleDeleteLayout = useCallback(async (layoutId) => {
    try {
      const result = await deleteLayoutSafely(layoutId);
      if (result.success) {
        setMyLayouts((prev) => prev.filter((l) => l.id !== layoutId));
        showToast?.({ type: 'success', message: 'Layout deleted' });
      } else if (result.code === 'IN_USE') {
        showToast?.({ type: 'error', message: 'Layout is in use and cannot be deleted' });
      } else {
        showToast?.({ type: 'error', message: result.error || 'Failed to delete layout' });
      }
    } catch (err) {
      console.error('Failed to delete layout:', err);
      showToast?.({ type: 'error', message: 'Failed to delete layout' });
    }
  }, [showToast]);

  // Handle create new layout
  const handleCreateNew = useCallback(() => {
    onNavigate?.('yodeck-layout-new');
  }, [onNavigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Layouts</h1>
            <Button variant="primary" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Create Layout
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700 -mb-px">
            <button
              onClick={() => setActiveTab('my-layouts')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'my-layouts'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4 inline-block mr-2" />
              My Layouts
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 inline-block mr-2" />
              Discover Templates
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'templates' ? (
          <>
            {/* Canva Templates Section */}
            <div className="mb-8 bg-gradient-to-br from-[#7d2ae8]/10 to-[#00c4cc]/10 border border-[#7d2ae8]/30 rounded-xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#7d2ae8] to-[#00c4cc] rounded-xl flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-6v4h4l-5 6z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Design with Canva
                      <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-[#7d2ae8] to-[#00c4cc] text-white rounded-full">
                        Millions of templates
                      </span>
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Browse Canva's professional templates, then export to your media library
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => openCanvaTemplates()}
                  className="border-[#7d2ae8]/50 text-[#a855f7] hover:bg-[#7d2ae8]/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Browse All Templates
                </Button>
              </div>

              {/* Template Category Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CANVA_TEMPLATE_CATEGORIES.map((category) => {
                  const IconComponent = {
                    Monitor,
                    Tv,
                    Play,
                    FileImage,
                    UtensilsCrossed,
                    Megaphone,
                    Share2,
                    BarChart3,
                  }[category.icon] || Monitor;

                  return (
                    <button
                      key={category.id}
                      onClick={() => openCanvaTemplates(category.id)}
                      className={`group relative p-4 rounded-lg border transition-all text-left hover:shadow-lg ${
                        category.recommended
                          ? 'bg-gray-800/80 border-[#7d2ae8]/40 hover:border-[#7d2ae8]'
                          : 'bg-gray-800/50 border-gray-700 hover:border-[#00c4cc]'
                      }`}
                    >
                      {category.recommended && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-[#7d2ae8] to-[#00c4cc] rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                        category.recommended
                          ? 'bg-[#7d2ae8]/20 group-hover:bg-[#7d2ae8]/30'
                          : 'bg-gray-700 group-hover:bg-[#00c4cc]/20'
                      }`}>
                        <IconComponent
                          className={`w-5 h-5 ${category.recommended ? 'text-[#a855f7]' : 'text-gray-400 group-hover:text-[#00c4cc]'}`}
                        />
                      </div>
                      <h4 className="font-medium text-white text-sm">{category.name}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{category.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity">
                        Browse <ExternalLink className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pro tip */}
              <div className="mt-4 pt-4 border-t border-[#7d2ae8]/20 flex items-start gap-3">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-sm text-gray-400">
                  <strong className="text-gray-300">Pro tip:</strong> Design in Canva, then download as PNG/JPG and upload to your Media Library.
                  Use the exported image in your playlists or layouts!
                </p>
              </div>
            </div>

            {/* Built-in Design Editor Section */}
            <div className="mb-8 bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Palette className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Built-in Design Editor
                      <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full">
                        No login required
                      </span>
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Create custom designs directly in BizScreen - saves straight to your Media Library
                    </p>
                  </div>
                </div>
              </div>

              {/* Design Presets Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'landscape-hd', name: 'Landscape HD', desc: '16:9 - 1920×1080', icon: Monitor, recommended: true },
                  { id: 'portrait-hd', name: 'Portrait HD', desc: '9:16 - 1080×1920', icon: Smartphone },
                  { id: 'landscape-4k', name: 'Landscape 4K', desc: '16:9 - 3840×2160', icon: Monitor },
                  { id: 'square', name: 'Square', desc: '1:1 - 1080×1080', icon: Square },
                  { id: 'ultrawide', name: 'Ultrawide', desc: '21:9 - 2560×1080', icon: RectangleHorizontal },
                ].map((preset) => {
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => onNavigate?.(`design-editor-new-${preset.id}`)}
                      className={`group relative p-4 rounded-lg border transition-all text-left hover:shadow-lg ${
                        preset.recommended
                          ? 'bg-gray-800/80 border-orange-500/40 hover:border-orange-500'
                          : 'bg-gray-800/50 border-gray-700 hover:border-amber-500'
                      }`}
                    >
                      {preset.recommended && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                          <Star className="w-3 h-3 text-white fill-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                        preset.recommended
                          ? 'bg-orange-500/20 group-hover:bg-orange-500/30'
                          : 'bg-gray-700 group-hover:bg-amber-500/20'
                      }`}>
                        <PresetIcon
                          className={`w-5 h-5 ${preset.recommended ? 'text-orange-400' : 'text-gray-400 group-hover:text-amber-400'}`}
                        />
                      </div>
                      <h4 className="font-medium text-white text-sm">{preset.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{preset.desc}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Wand2 className="w-3 h-3" /> Start designing
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feature highlights */}
              <div className="mt-4 pt-4 border-t border-orange-500/20 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">No account needed</p>
                    <p className="text-xs text-gray-500">Design without signing up</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Direct save</p>
                    <p className="text-xs text-gray-500">Export straight to Media Library</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                    <Palette className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">Full editor</p>
                    <p className="text-xs text-gray-500">Text, shapes, images & more</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-sm font-medium text-gray-500">BizScreen Templates</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* Filters */}
            <div className="mb-6 space-y-4">
              {/* Search and Orientation */}
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search templates (e.g. menu, welcome)..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <OrientationDropdown
                  value={filters.orientation}
                  onChange={(orientation) => setFilters({ orientation })}
                />
                <button
                  onClick={refresh}
                  className="p-2.5 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Refresh templates"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {/* Category chips */}
              {categories.length > 0 && (
                <CategoryChips
                  categories={categories}
                  selected={filters.category}
                  onChange={(category) => setFilters({ category })}
                />
              )}
            </div>

            {/* Templates Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-gray-400">{error}</p>
                <Button variant="outline" className="mt-4" onClick={refresh}>
                  Try Again
                </Button>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <LayoutGrid className="w-12 h-12 text-gray-600 mb-4" />
                <p className="text-gray-400">No templates found</p>
                {filters.search && (
                  <p className="text-gray-500 text-sm mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onUse={handleUseTemplate}
                      isCloning={isCloning && cloningTemplateId === template.id}
                    />
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={fetchMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More Templates'
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {/* My Layouts */}
            {isLoadingLayouts ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : layoutsError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-gray-400">{layoutsError}</p>
                <Button variant="outline" className="mt-4" onClick={loadMyLayouts}>
                  Try Again
                </Button>
              </div>
            ) : myLayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <LayoutGrid className="w-12 h-12 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  No layouts yet
                </h3>
                <p className="text-gray-400 mb-4">
                  Create a layout from scratch or use a template
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Blank
                  </Button>
                  <Button variant="primary" onClick={() => setActiveTab('templates')}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Browse Templates
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myLayouts.map((layout) => (
                  <LayoutCard
                    key={layout.id}
                    layout={layout}
                    onEdit={handleEditLayout}
                    onDelete={handleDeleteLayout}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
