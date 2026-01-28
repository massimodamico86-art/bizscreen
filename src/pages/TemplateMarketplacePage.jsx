/**
 * Template Marketplace Page
 *
 * Browse and install scene templates from the marketplace.
 * Supports filtering by category, orientation, and search.
 * Features prominent search bar, persistent sidebar, featured templates row, and Quick Apply.
 * Includes customization wizard for templates with customizable fields.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  fetchMarketplaceTemplates,
  fetchFeaturedTemplates,
  fetchCategories,
  fetchStarterPacks,
  installTemplateAsScene,
  fetchMarketplaceFavorites,
  fetchRecentMarketplaceTemplates,
  toggleMarketplaceFavorite,
  checkFavoritedTemplates,
  applyCustomizationToScene,
  getTemplateUsageCounts,
} from '../services/marketplaceService';



/**
 * Check if a template has customizable fields
 */
function hasCustomizableFields(template) {
  const fields = template?.metadata?.customizable_fields;
  if (!fields) return false;
  return (
    fields.logo !== false ||
    fields.color !== false ||
    (fields.texts?.length > 0)
  );
}

export default function TemplateMarketplacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [templates, setTemplates] = useState([]);
  const [featuredTemplates, setFeaturedTemplates] = useState([]);
  const [starterPacks, setStarterPacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyingId, setApplyingId] = useState(null);
  const [applyingPackId, setApplyingPackId] = useState(null);

  // Favorites and recents state
  const [recentTemplates, setRecentTemplates] = useState([]);
  const [favoriteTemplates, setFavoriteTemplates] = useState([]);
  const [favoritedIds, setFavoritedIds] = useState(new Set());
  const [usageCounts, setUsageCounts] = useState(new Map());

  // Filters from URL
  const categoryId = searchParams.get('category') || '';
  const orientation = searchParams.get('orientation') || '';
  const search = searchParams.get('q') || '';

  // Panel state (truthy check controls visibility)
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Wizard state
  const [wizardState, setWizardState] = useState({
    open: false,
    template: null,
    sceneId: null,
  });

  // Search input state (debounced)
  const [searchInput, setSearchInput] = useState(search);

  // Check if any filters are active
  const hasActiveFilters = categoryId || orientation || search;

  // Update URL params
  const updateFilters = useCallback((updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Load featured templates on mount
  useEffect(() => {
    fetchFeaturedTemplates(6)
      .then(setFeaturedTemplates)
      .catch(err => console.error('Failed to load featured templates:', err));
  }, []);

  // Load starter packs on mount
  useEffect(() => {
    fetchStarterPacks()
      .then(setStarterPacks)
      .catch(err => console.error('Failed to load starter packs:', err));
  }, []);

  // Load recents and favorites on mount
  useEffect(() => {
    fetchRecentMarketplaceTemplates(5)
      .then(setRecentTemplates)
      .catch(err => console.error('Failed to load recent templates:', err));

    fetchMarketplaceFavorites(10)
      .then((favorites) => {
        setFavoriteTemplates(favorites);
        setFavoritedIds(new Set(favorites.map(f => f.id)));
      })
      .catch(err => console.error('Failed to load favorites:', err));
  }, []);

  // Load templates when filters change
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await fetchMarketplaceTemplates({
        categoryId: categoryId || null,
        search: search || null,
      });
      // Client-side orientation filter (RPC doesn't support orientation)
      if (orientation) {
        data = data.filter(t => t.metadata?.orientation === orientation);
      }
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [categoryId, orientation, search]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Check favorited status for grid templates when templates load
  useEffect(() => {
    if (templates.length > 0) {
      checkFavoritedTemplates(templates.map(t => t.id))
        .then(setFavoritedIds)
        .catch(err => console.error('Failed to check favorites:', err));
    }
  }, [templates]);

  // Fetch usage counts for grid templates
  useEffect(() => {
    if (templates.length > 0) {
      getTemplateUsageCounts(templates.map(t => t.id))
        .then(setUsageCounts)
        .catch(err => console.error('Failed to load usage counts:', err));
    }
  }, [templates]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilters({ q: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, updateFilters]);

  // Handle template click (open preview panel)
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
  };

  // Handle Quick Apply - creates scene with auto-naming
  // Opens wizard if template has customizable fields, otherwise navigates to editor
  const handleQuickApply = async (template) => {
    setApplyingId(template.id);
    try {
      const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
      const sceneId = await installTemplateAsScene(template.id, sceneName);

      // Check if template has customizable fields
      if (hasCustomizableFields(template)) {
        // Open wizard
        setWizardState({
          open: true,
          template,
          sceneId,
        });
        setApplyingId(null);
      } else {
        // No customization, go directly to editor
        navigate(`/scene-editor/${sceneId}`);
      }
    } catch (err) {
      console.error('Failed to apply template:', err);
      setApplyingId(null);
    }
  };

  // Handle apply success from preview panel
  const handleApplySuccess = async (sceneId) => {
    // Refresh recents (will show on next visit)
    fetchRecentMarketplaceTemplates(5).then(setRecentTemplates);

    // Check if template has customizable fields
    if (selectedTemplate && hasCustomizableFields(selectedTemplate)) {
      setWizardState({
        open: true,
        template: selectedTemplate,
        sceneId,
      });
      setSelectedTemplate(null);
    } else {
      setSelectedTemplate(null);
      navigate(`/scene-editor/${sceneId}`);
    }
  };

  // Handle wizard complete - apply customizations and navigate
  const handleWizardComplete = async (customization) => {
    try {
      await applyCustomizationToScene(wizardState.sceneId, customization);
      setWizardState({ open: false, template: null, sceneId: null });
      navigate(`/scene-editor/${wizardState.sceneId}`);
    } catch (err) {
      console.error('Failed to apply customization:', err);
      throw err; // Let wizard handle error state
    }
  };

  // Handle wizard skip - close wizard and navigate to editor
  const handleWizardSkip = () => {
    const sceneId = wizardState.sceneId;
    setWizardState({ open: false, template: null, sceneId: null });
    navigate(`/scene-editor/${sceneId}`);
  };

  // Handle favorite toggle
  const handleToggleFavorite = async (templateId, shouldBeFavorited) => {
    // Optimistic update
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (shouldBeFavorited) {
        next.add(templateId);
      } else {
        next.delete(templateId);
      }
      return next;
    });

    try {
      await toggleMarketplaceFavorite(templateId);
      // Refresh favorites list
      const favorites = await fetchMarketplaceFavorites(10);
      setFavoriteTemplates(favorites);
      setFavoritedIds(new Set(favorites.map(f => f.id)));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      // Revert optimistic update
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (shouldBeFavorited) {
          next.delete(templateId);
        } else {
          next.add(templateId);
        }
        return next;
      });
    }
  };

  // Handle applying selected templates from a starter pack
  const handleApplyPackTemplates = async (pack, selectedTemplates) => {
    if (selectedTemplates.length === 0) return;

    setApplyingPackId(pack.id);
    try {
      // Apply templates sequentially
      let lastSceneId = null;
      for (const template of selectedTemplates) {
        const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
        lastSceneId = await installTemplateAsScene(template.id, sceneName);
      }
      // Navigate to the last created scene
      if (lastSceneId) {
        navigate(`/scene-editor/${lastSceneId}`);
      }
    } catch (err) {
      console.error('Failed to apply pack templates:', err);
    } finally {
      setApplyingPackId(null);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <PageLayout
      title="Template Marketplace"
      description="Browse and install professional scene templates"
    >
      {/* Prominent Search Bar */}
      <div className="mb-6">
        <div className="relative w-full max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <TemplateSidebar
          categories={categories}
          selectedCategory={categoryId || null}
          selectedOrientation={orientation || null}
          onFilterChange={updateFilters}
          recentTemplates={recentTemplates}
          favoriteTemplates={favoriteTemplates}
          onSidebarTemplateClick={handleTemplateClick}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Results Count & Clear Filters */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${templates.length} templates found`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadTemplates}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 animate-pulse"
                >
                  <div className="aspect-video bg-gray-200 rounded-t-lg" />
                </div>
              ))}
            </div>
          )}

          {/* Content when not loading */}
          {!loading && (
            <>
              {/* Starter Packs Row (only when no filters active) */}
              {!hasActiveFilters && starterPacks.length > 0 && (
                <StarterPacksRow
                  packs={starterPacks}
                  onApplySelected={handleApplyPackTemplates}
                  applyingPackId={applyingPackId}
                />
              )}

              {/* Featured Templates Row (only when no filters active) */}
              {!hasActiveFilters && featuredTemplates.length > 0 && (
                <FeaturedTemplatesRow
                  templates={featuredTemplates}
                  onTemplateClick={handleTemplateClick}
                  onQuickApply={handleQuickApply}
                  applyingId={applyingId}
                  favoriteIds={favoritedIds}
                  onToggleFavorite={handleToggleFavorite}
                  usageCounts={usageCounts}
                />
              )}

              {/* Template Grid */}
              {templates.length > 0 ? (
                <TemplateGrid
                  templates={templates}
                  onTemplateClick={handleTemplateClick}
                  onQuickApply={handleQuickApply}
                  applyingId={applyingId}
                  favoriteIds={favoritedIds}
                  onToggleFavorite={handleToggleFavorite}
                  usageCounts={usageCounts}
                />
              ) : (
                /* Empty State */
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No templates found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Try adjusting your filters or search query.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Preview Panel */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplatePreviewPanel
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
            onApply={handleApplySuccess}
          />
        )}
      </AnimatePresence>

      {/* Customization Wizard */}
      <AnimatePresence>
        {wizardState.open && wizardState.template && wizardState.sceneId && (
          <TemplateCustomizationWizard
            template={wizardState.template}
            sceneId={wizardState.sceneId}
            onComplete={handleWizardComplete}
            onSkip={handleWizardSkip}
          />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
