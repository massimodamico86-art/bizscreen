/**
 * Templates Page
 *
 * Gallery of content templates and vertical packs for quick-start content.
 * Features: search, favorites, recently used, hover preview, customize modal
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutTemplate,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Building2,
  Star,
} from 'lucide-react';
import {
  fetchTemplateCategories,
  fetchTemplates,
  fetchFavoriteTemplates,
  fetchRecentlyUsedTemplates,
  getFavoriteTemplateIds,
  addFavoriteTemplate,
  removeFavoriteTemplate,
  applyTemplate,
  applyPack,
  recordTemplateUsage,
  formatTemplateForCard,
} from '../services/templateService';
import { canEditContent } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';


import {
  useTemplatePreview,
} from '../components/templates';

// Icon mapping for categories
const getCategoryIcon = (iconKey) => {
  const icons = {
    utensils: Utensils,
    scissors: Scissors,
    dumbbell: Dumbbell,
    'shopping-bag': ShoppingBag,
    building: Building2,
  };
  return icons[iconKey] || Building2;
};

// Badge colors for template types
const getBadgeVariant = (type) => {
  const variants = {
    playlist: 'blue',
    layout: 'purple',
    pack: 'green',
  };
  return variants[type] || 'gray';
};

const PAGE_SIZE = 24; // Good for grid display

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const TemplatesPage = ({ showToast }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { t } = useTranslation();
  const logger = useLogger('TemplatesPage');

  // State
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search state (US-128)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Favorites state (US-130, US-131)
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  // Recently used state (US-129)
  const [recentlyUsed, setRecentlyUsed] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Get filters from URL params
  const activeCategory = searchParams.get('category') || 'all';
  const activeType = searchParams.get('type') || 'all';
  const showFavorites = searchParams.get('favorites') === 'true';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('search') || '';

  // Customize modal state (US-126, US-127)
  const [customizeModal, setCustomizeModal] = useState(null);
  const [applyError, setApplyError] = useState(null);

  // Apply state
  const [applying, setApplying] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  // Permissions
  const [canEdit, setCanEdit] = useState(false);

  // Preview state (US-132)
  const preview = useTemplatePreview(300);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await canEditContent();
      setCanEdit(hasPermission);
    };
    checkPermissions();
  }, [user]);

  // Load categories on mount
  useEffect(() => {
    fetchTemplateCategories()
      .then(setCategories)
      .catch((err) => {
        logger.error('Failed to load categories', { error: err });
      });
  }, []);

  // Load favorite IDs on mount (US-130)
  useEffect(() => {
    const loadFavoriteIds = async () => {
      try {
        const ids = await getFavoriteTemplateIds();
        setFavoriteIds(new Set(ids));
      } catch (err) {
        logger.error('Failed to load favorite IDs', { userId: user?.id, error: err });
      }
    };
    if (user) loadFavoriteIds();
  }, [user]);

  // Load recently used templates (US-129)
  useEffect(() => {
    const loadRecentlyUsed = async () => {
      try {
        setLoadingRecent(true);
        const recent = await fetchRecentlyUsedTemplates(6);
        setRecentlyUsed(recent);
      } catch (err) {
        logger.error('Failed to load recently used templates', { userId: user?.id, error: err });
      } finally {
        setLoadingRecent(false);
      }
    };
    if (user) loadRecentlyUsed();
  }, [user]);

  // Load templates with server-side filtering and pagination
  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);

      // If showing favorites, use different fetch
      if (showFavorites) {
        setLoadingFavorites(true);
        const favs = await fetchFavoriteTemplates();
        setFavoriteTemplates(favs);
        setTemplates(favs);
        setTotalCount(favs.length);
        setTotalPages(1);
        setLoadingFavorites(false);
        return;
      }

      const result = await fetchTemplates({
        categorySlug: activeCategory === 'all' ? undefined : activeCategory,
        type: activeType === 'all' ? undefined : activeType,
        search: debouncedSearch || undefined,
        page: currentPage,
        pageSize: PAGE_SIZE,
      });
      setTemplates((result.data || []).map(formatTemplateForCard));
      setTotalCount(result.totalCount || 0);
      setTotalPages(result.totalPages || 0);
    } catch (error) {
      logger.error('Failed to load templates', { categoryId, searchQuery: debouncedSearch, error });
      showToast?.('Error loading templates', 'error');
    } finally {
      setLoading(false);
      setLoadingFavorites(false);
    }
  }, [activeCategory, activeType, currentPage, debouncedSearch, showFavorites, showToast]);

  // Fetch templates when filters or page change
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Update search URL param when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== searchQuery) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch);
        newParams.set('page', '1'); // Reset to page 1 on search
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
    }
  }, [debouncedSearch, searchQuery, searchParams, setSearchParams]);

  // Update URL params helper
  const updateParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === 'all' || value === '1' || value === null || value === undefined || value === 'false') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams);
  };

  // Handle filter changes (reset page to 1)
  const handleCategoryChange = (category) => {
    updateParams({ category, page: '1', favorites: null });
  };

  const handleTypeChange = (type) => {
    updateParams({ type, page: '1', favorites: null });
  };

  const handleFavoritesToggle = () => {
    updateParams({ favorites: showFavorites ? null : 'true', page: '1' });
  };

  const handlePageChange = (newPage) => {
    updateParams({ page: newPage.toString() });
  };

  const handleSearchClear = () => {
    setSearchInput('');
    updateParams({ search: null, page: '1' });
  };

  // Toggle favorite (US-130)
  const handleToggleFavorite = async (template, e) => {
    e?.stopPropagation();
    if (!user) return;

    const isFavorited = favoriteIds.has(template.id);

    // Optimistic update
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isFavorited) {
        next.delete(template.id);
      } else {
        next.add(template.id);
      }
      return next;
    });

    try {
      if (isFavorited) {
        await removeFavoriteTemplate(template.id);
        showToast?.(t('templates.removedFromFavorites', 'Removed from favorites'), 'success');
      } else {
        await addFavoriteTemplate(template.id);
        showToast?.(t('templates.addedToFavorites', 'Added to favorites'), 'success');
      }
    } catch (error) {
      // Revert optimistic update
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) {
          next.add(template.id);
        } else {
          next.delete(template.id);
        }
        return next;
      });
      showToast?.('Error updating favorites', 'error');
    }
  };

  // Group by type for display when showing all types
  const packs = activeType === 'all' && !showFavorites ? templates.filter((t) => t.type === 'pack') : [];
  const playlistTemplates = activeType === 'all' && !showFavorites ? templates.filter((t) => t.type === 'playlist') : [];
  const layoutTemplates = activeType === 'all' && !showFavorites ? templates.filter((t) => t.type === 'layout') : [];

  // Open customize modal instead of applying directly (US-127)
  const handleUseTemplate = (template) => {
    if (!canEdit) {
      showToast?.(t('templates.noPermission', 'You do not have permission to use templates'), 'error');
      return;
    }
    setApplyError(null);
    setCustomizeModal(template);
  };

  // Apply template from customize modal (US-127)
  const handleApplyFromModal = async (template, customization) => {
    try {
      setApplying(template.slug);
      setApplyError(null);
      let result;

      if (template.type === 'pack') {
        result = await applyPack(template.slug);
      } else {
        result = await applyTemplate(template.slug);
      }

      // Record template usage (US-121)
      try {
        await recordTemplateUsage(template.id);
        // Refresh recently used
        const recent = await fetchRecentlyUsedTemplates(6);
        setRecentlyUsed(recent);
      } catch (historyError) {
        logger.warn('Failed to record template usage', { templateId: template.id, error: historyError });
      }

      setCustomizeModal(null);
      setSuccessModal({
        template,
        result,
      });

      showToast?.(t('templates.appliedSuccessfully', 'Template applied successfully!'), 'success');
    } catch (error) {
      logger.error('Failed to apply template', { templateId: template.id, templateName: template.name, error });
      setApplyError(error.message || 'Error applying template');
    } finally {
      setApplying(null);
    }
  };

  // Navigate to created content
  const navigateToPlaylist = (playlistId) => {
    setSuccessModal(null);
    navigate(`/app/playlists/${playlistId}`);
  };

  const navigateToLayout = (layoutId) => {
    setSuccessModal(null);
    navigate(`/app/layouts/${layoutId}`);
  };

  const navigateToScreens = () => {
    setSuccessModal(null);
    navigate('/app/screens');
  };

  // Show loading state only on initial load
  const isInitialLoading = loading && templates.length === 0 && !showFavorites;

  return (
    <PageLayout>
      <PageHeader
        title={t('templates.title', 'Templates')}
        description={t('templates.subtitle', 'Quick-start your signage with ready-made templates')}
        icon={<LayoutTemplate size={20} className="text-white" />}
        iconBackground="bg-gradient-to-br from-blue-500 to-purple-600"
      />

      <PageContent>
        {/* Search Bar (US-128) */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('templates.searchPlaceholder', 'Search templates...')}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label={t('templates.searchTemplates', 'Search templates')}
            />
            {searchInput && (
              <button
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={t('common.clearSearch', 'Clear search')}
              >
                <X size={18} />
              </button>
            )}
          </div>
          {debouncedSearch && (
            <p className="mt-2 text-sm text-gray-500">
              {t('templates.searchResults', '{{count}} results for "{{query}}"', {
                count: totalCount,
                query: debouncedSearch,
              })}
            </p>
          )}
        </div>

        {/* Recently Used Section (US-129) */}
        {recentlyUsed.length > 0 && !showFavorites && !debouncedSearch && (
          <section className="mb-6" aria-labelledby="recently-used-heading">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={16} className="text-gray-500" />
              <h2 id="recently-used-heading" className="text-sm font-medium text-gray-700">
                {t('templates.recentlyUsed', 'Recently Used')}
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentlyUsed.map((template) => (
                <div
                  key={template.id}
                  className="flex-shrink-0 w-36 cursor-pointer group"
                  onClick={() => handleUseTemplate(template)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUseTemplate(template);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={t('templates.useTemplate', 'Use {{name}}', { name: template.title })}
                >
                  <div className="h-20 rounded-lg overflow-hidden bg-gray-100 group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                    {template.thumbnail ? (
                      <img
                        src={template.thumbnail}
                        alt={template.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TemplateLivePreview template={template} />
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 truncate">{template.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label={t('templates.categoryFilter', 'Category filter')}>
          <button
            onClick={() => handleCategoryChange('all')}
            disabled={loading}
            role="tab"
            aria-selected={activeCategory === 'all' && !showFavorites}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
              activeCategory === 'all' && !showFavorites
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('templates.allCategories', 'All Categories')}
          </button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                disabled={loading}
                role="tab"
                aria-selected={activeCategory === cat.slug && !showFavorites}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
                  activeCategory === cat.slug && !showFavorites
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Type Filter with Favorites (US-131) */}
        <div className="flex gap-2 mb-6" role="tablist" aria-label={t('templates.typeFilter', 'Type filter')}>
          <button
            onClick={() => handleTypeChange('all')}
            disabled={loading}
            role="tab"
            aria-selected={activeType === 'all' && !showFavorites}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
              activeType === 'all' && !showFavorites
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('templates.allTypes', 'All Types')}
          </button>
          <button
            onClick={handleFavoritesToggle}
            disabled={loading}
            role="tab"
            aria-selected={showFavorites}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 disabled:opacity-50 ${
              showFavorites
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star size={14} aria-hidden="true" />
            {t('templates.favorites', 'Favorites')}
          </button>
          <button
            onClick={() => handleTypeChange('pack')}
            disabled={loading}
            role="tab"
            aria-selected={activeType === 'pack' && !showFavorites}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 ${
              activeType === 'pack' && !showFavorites
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Package size={14} aria-hidden="true" />
            {t('templates.starterPacks', 'Starter Packs')}
          </button>
          <button
            onClick={() => handleTypeChange('playlist')}
            disabled={loading}
            role="tab"
            aria-selected={activeType === 'playlist' && !showFavorites}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
              activeType === 'playlist' && !showFavorites
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <List size={14} aria-hidden="true" />
            {t('templates.playlists', 'Playlists')}
          </button>
          <button
            onClick={() => handleTypeChange('layout')}
            disabled={loading}
            role="tab"
            aria-selected={activeType === 'layout' && !showFavorites}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50 ${
              activeType === 'layout' && !showFavorites
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Layout size={14} aria-hidden="true" />
            {t('templates.layouts', 'Layouts')}
          </button>
        </div>

        {/* Loading State */}
        {isInitialLoading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        )}

        {/* Favorites Empty State (US-131) */}
        {showFavorites && !loadingFavorites && templates.length === 0 && (
          <EmptyState
            icon={Star}
            title={t('templates.noFavoritesYet', 'No favorites yet')}
            description={t('templates.noFavoritesDescription', 'Click the heart icon on any template to add it to your favorites.')}
          />
        )}

        {/* When "All Types" is selected, show grouped sections */}
        {!isInitialLoading && activeType === 'all' && !showFavorites && (
          <>
            {/* Starter Packs Section */}
            {packs.length > 0 && (
              <section className="space-y-4 mb-8" aria-labelledby="packs-heading">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-green-600" aria-hidden="true" />
                  <h2 id="packs-heading" className="text-lg font-semibold text-gray-900">{t('templates.starterPacks', 'Starter Packs')}</h2>
                  <span className="text-sm text-gray-500">
                    {t('templates.starterPacksDescription', 'Complete setups with playlists, layouts, and schedules')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packs.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleUseTemplate}
                      applying={applying === template.slug}
                      disabled={!canEdit}
                      isFavorite={favoriteIds.has(template.id)}
                      onToggleFavorite={handleToggleFavorite}
                      preview={preview}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Playlist Templates Section */}
            {playlistTemplates.length > 0 && (
              <section className="space-y-4 mb-8" aria-labelledby="playlists-heading">
                <div className="flex items-center gap-2">
                  <List size={20} className="text-blue-600" aria-hidden="true" />
                  <h2 id="playlists-heading" className="text-lg font-semibold text-gray-900">{t('templates.playlistTemplates', 'Playlist Templates')}</h2>
                  <span className="text-sm text-gray-500">
                    {t('templates.playlistTemplatesDescription', 'Pre-configured playlists with placeholder items')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlistTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleUseTemplate}
                      applying={applying === template.slug}
                      disabled={!canEdit}
                      isFavorite={favoriteIds.has(template.id)}
                      onToggleFavorite={handleToggleFavorite}
                      preview={preview}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Layout Templates Section */}
            {layoutTemplates.length > 0 && (
              <section className="space-y-4 mb-8" aria-labelledby="layouts-heading">
                <div className="flex items-center gap-2">
                  <Layout size={20} className="text-purple-600" aria-hidden="true" />
                  <h2 id="layouts-heading" className="text-lg font-semibold text-gray-900">{t('templates.layoutTemplates', 'Layout Templates')}</h2>
                  <span className="text-sm text-gray-500">
                    {t('templates.layoutTemplatesDescription', 'Multi-zone layouts for dynamic displays')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {layoutTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onApply={handleUseTemplate}
                      applying={applying === template.slug}
                      disabled={!canEdit}
                      isFavorite={favoriteIds.has(template.id)}
                      onToggleFavorite={handleToggleFavorite}
                      preview={preview}
                      t={t}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* When a specific type or favorites is selected, show flat grid with pagination */}
        {!isInitialLoading && (activeType !== 'all' || showFavorites) && templates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={handleUseTemplate}
                applying={applying === template.slug}
                disabled={!canEdit}
                isFavorite={favoriteIds.has(template.id)}
                onToggleFavorite={handleToggleFavorite}
                preview={preview}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && !showFavorites && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('common.previous', 'Previous')}
            </Button>
            <span className="text-sm text-gray-600">
              {t('common.pageOf', 'Page {{current}} of {{total}}', { current: currentPage, total: totalPages })}
              <span className="text-gray-400 ml-2">({totalCount} {t('templates.templates', 'templates')})</span>
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {t('common.next', 'Next')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isInitialLoading && templates.length === 0 && !showFavorites && (
          <EmptyState
            icon={LayoutTemplate}
            title={t('templates.noTemplatesFound', 'No templates found')}
            description={t('templates.adjustFilters', 'Try adjusting your filters to see more templates.')}
          />
        )}

        {/* Preview Popover (US-132) */}
        <TemplatePreviewPopover
          template={preview.template}
          isVisible={preview.isVisible}
          anchorRect={preview.anchorRect}
          onClose={preview.hidePreview}
          livePreview={preview.template ? <TemplateLivePreview template={preview.template} /> : null}
        />

        {/* Customize Modal (US-126, US-127) */}
        <TemplateCustomizeModal
          isOpen={!!customizeModal}
          onClose={() => setCustomizeModal(null)}
          template={customizeModal}
          onApply={handleApplyFromModal}
          isApplying={applying === customizeModal?.slug}
          error={applyError}
          t={t}
        />

        {/* Success Modal */}
        {successModal && (
          <Modal isOpen onClose={() => setSuccessModal(null)} size="lg">
            <ModalHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <Check size={24} className="text-green-600" />
                </div>
                <div>
                  <ModalTitle>{t('templates.templateApplied', 'Template Applied!')}</ModalTitle>
                  <p className="text-sm text-gray-500">
                    {t('templates.templateAddedToAccount', '{{title}} has been added to your account', { title: successModal.template.title })}
                  </p>
                </div>
              </div>
            </ModalHeader>
            <ModalContent>
              {/* Created Items */}
              <div className="space-y-3 mb-6">
                {successModal.result.playlists?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <List size={16} className="text-blue-600" aria-hidden="true" />
                      <span className="font-medium text-blue-900">
                        {t('templates.playlistsCreated', '{{count}} Playlist(s) Created', { count: successModal.result.playlists.length })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {successModal.result.playlists.map((p) => (
                        <div key={p.id} className="text-sm text-blue-700 flex items-center justify-between">
                          <span>{p.name}</span>
                          <button
                            onClick={() => navigateToPlaylist(p.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                          >
                            {t('common.edit', 'Edit')} <ChevronRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {successModal.result.layouts?.length > 0 && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layout size={16} className="text-purple-600" aria-hidden="true" />
                      <span className="font-medium text-purple-900">
                        {t('templates.layoutsCreated', '{{count}} Layout(s) Created', { count: successModal.result.layouts.length })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {successModal.result.layouts.map((l) => (
                        <div key={l.id} className="text-sm text-purple-700 flex items-center justify-between">
                          <span>{l.name}</span>
                          <button
                            onClick={() => navigateToLayout(l.id)}
                            className="text-purple-600 hover:text-purple-800 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                          >
                            {t('common.edit', 'Edit')} <ChevronRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {successModal.result.schedules?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-orange-600" aria-hidden="true" />
                      <span className="font-medium text-orange-900">
                        {t('templates.schedulesCreated', '{{count}} Schedule(s) Created', { count: successModal.result.schedules.length })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                <Info size={16} className="text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-gray-600">
                  {t('templates.replaceInfo', 'Replace the placeholder items with your own images and content, then assign to screens.')}
                </p>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSuccessModal(null)}>
                {t('common.close', 'Close')}
              </Button>
              {successModal.result.playlists?.length > 0 && (
                <Button onClick={() => navigateToPlaylist(successModal.result.playlists[0].id)}>
                  {t('templates.editPlaylist', 'Edit Playlist')}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={navigateToScreens}
                icon={<ExternalLink size={16} />}
              >
                {t('templates.assignToScreen', 'Assign to Screen')}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </PageContent>
    </PageLayout>
  );
};

// Template Card Component with favorites and hover preview (US-130, US-132, US-133)
const TemplateCard = ({ template, onApply, applying, disabled, isFavorite, onToggleFavorite, preview, t }) => {
  const cardRef = useRef(null);
  const Icon = getCategoryIcon(template.categoryIcon);

  const getTypeBadgeLabel = (type) => {
    switch (type) {
      case 'pack': return t('templates.starterPack', 'Starter Pack');
      case 'layout': return t('templates.layout', 'Layout');
      default: return t('templates.playlist', 'Playlist');
    }
  };

  // Keyboard handler (US-133)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onApply(template);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      onToggleFavorite(template, e);
    }
  };

  return (
    <Card
      padding="none"
      className="overflow-hidden hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-500"
    >
      {/* Thumbnail with hover preview trigger */}
      <div
        ref={cardRef}
        className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative cursor-pointer"
        onMouseEnter={() => preview.showPreview(template, cardRef.current)}
        onMouseLeave={preview.hidePreview}
        onFocus={() => preview.showPreview(template, cardRef.current)}
        onBlur={preview.hidePreview}
        onClick={() => onApply(template)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={t('templates.previewTemplate', 'Preview {{name}}', { name: template.title })}
        aria-describedby={`template-desc-${template.id}`}
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            {template.type === 'pack' ? (
              <Package size={48} className="text-gray-300" />
            ) : template.type === 'layout' ? (
              <Layout size={48} className="text-gray-300" />
            ) : (
              <List size={48} className="text-gray-300" />
            )}
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={getBadgeVariant(template.type)}>
            {getTypeBadgeLabel(template.type)}
          </Badge>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-xs text-gray-700">
            <Icon size={12} aria-hidden="true" />
            {template.category}
          </div>
        </div>

        {/* Favorite Button (US-130) */}
        <button
          onClick={(e) => onToggleFavorite(template, e)}
          className={`absolute top-2 left-2 p-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
            isFavorite
              ? 'bg-yellow-100 text-yellow-500'
              : 'bg-white/80 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
          }`}
          aria-label={isFavorite ? t('templates.removeFromFavorites', 'Remove from favorites') : t('templates.addToFavorites', 'Add to favorites')}
          aria-pressed={isFavorite}
        >
          <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
        <p id={`template-desc-${template.id}`} className="text-sm text-gray-500 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Meta info */}
        {template.meta && (template.meta.includes || template.meta.estimated_items) && (
          <div className="text-xs text-gray-400 mb-3">
            {template.meta.includes && (
              <span>{t('templates.includes', 'Includes')}: {template.meta.includes.join(', ')}</span>
            )}
            {template.meta.estimated_items && (
              <span>{t('templates.itemCount', '{{count}} items', { count: template.meta.estimated_items })}</span>
            )}
          </div>
        )}

        {/* Apply Button */}
        <Button
          onClick={() => onApply(template)}
          disabled={disabled || applying}
          fullWidth
          variant={template.type === 'pack' ? 'primary' : 'secondary'}
          icon={applying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        >
          {applying
            ? t('templates.applying', 'Applying...')
            : template.type === 'pack'
              ? t('templates.useThisPack', 'Use This Pack')
              : t('templates.useTemplate', 'Use Template')
          }
        </Button>
      </div>
    </Card>
  );
};

export default TemplatesPage;
