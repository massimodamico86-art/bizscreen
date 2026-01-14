/**
 * Template Marketplace Page
 *
 * Browse and install scene templates from the marketplace.
 * Supports filtering by category, license tier, and search.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../design-system/components/PageLayout';
import {
  fetchMarketplaceTemplates,
  fetchCategories,
  LICENSE_LABELS,
} from '../services/marketplaceService';
import TemplatePreviewModal from '../components/TemplatePreviewModal';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function TemplateMarketplacePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters from URL
  const categoryId = searchParams.get('category') || '';
  const license = searchParams.get('license') || '';
  const search = searchParams.get('q') || '';

  // Modal state
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Search input state (debounced)
  const [searchInput, setSearchInput] = useState(search);

  // Load categories on mount
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Load templates when filters change
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketplaceTemplates({
        categoryId: categoryId || null,
        license: license || null,
        search: search || null,
      });
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [categoryId, license, search]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateFilters({ q: searchInput || null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params
  const updateFilters = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Handle template click
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  // Handle install success
  const handleInstallSuccess = (sceneId) => {
    setPreviewOpen(false);
    navigate(`/scene-editor/${sceneId}`);
  };

  return (
    <PageLayout
      title="Template Marketplace"
      description="Browse and install professional scene templates"
    >
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow p-4 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => updateFilters({ category: null })}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    !categoryId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateFilters({ category: cat.id })}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      categoryId === cat.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* License Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License
              </label>
              <div className="space-y-1">
                <button
                  onClick={() => updateFilters({ license: null })}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    !license
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Licenses
                </button>
                {Object.entries(LICENSE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => updateFilters({ license: key })}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                      license === key
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${templates.length} templates found`}
            </p>
            {(categoryId || license || search) && (
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow animate-pulse"
                >
                  <div className="aspect-video bg-gray-200 rounded-t-lg" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Template Grid */}
          {!loading && templates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateClick(template)}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left group"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="w-12 h-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Featured Badge */}
                    {template.is_featured && (
                      <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-medium px-2 py-0.5 rounded">
                        Featured
                      </span>
                    )}

                    {/* Access Lock */}
                    {!template.can_access && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="bg-white text-gray-900 px-3 py-1.5 rounded-full text-sm font-medium">
                          Upgrade to access
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-gray-900 truncate flex-1">
                        {template.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                          LICENSE_COLORS[template.license] || LICENSE_COLORS.free
                        }`}
                      >
                        {LICENSE_LABELS[template.license] || 'Free'}
                      </span>
                    </div>

                    {template.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                      <span>{template.category_name || 'General'}</span>
                      <span>
                        {template.slide_count} slide{template.slide_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && templates.length === 0 && (
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
        </main>
      </div>

      {/* Preview Modal */}
      {previewOpen && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setPreviewOpen(false)}
          onInstallSuccess={handleInstallSuccess}
        />
      )}
    </PageLayout>
  );
}
