/**
 * Template Picker Modal
 *
 * Compact modal for picking templates from within the Scene Editor.
 * Allows quick browsing and selection of templates to start a new scene.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchMarketplaceTemplates,
  fetchCategories,
  installTemplateAsScene,
  LICENSE_LABELS,
} from '../services/marketplaceService';
import { useLogger } from '../hooks/useLogger.js';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function TemplatePickerModal({ onClose, onSelectTemplate }) {
  const logger = useLogger('TemplatePickerModal');
  // State
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load categories
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => logger.error('Failed to load categories', { error: err }));
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceTemplates({
        categoryId: selectedCategory || null,
        search: searchQuery || null,
        limit: 30,
      });
      setTemplates(data);
    } catch (err) {
      logger.error('Failed to load templates', { error: err });
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(loadTemplates, 300);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  // Handle template selection
  const handleSelectTemplate = async (template) => {
    if (!template.can_access) {
      setError('Upgrade your plan to access this template');
      return;
    }

    setInstalling(template.id);
    setError(null);

    try {
      const sceneId = await installTemplateAsScene(template.id, template.name);
      onSelectTemplate?.(sceneId);
    } catch (err) {
      logger.error('Failed to install template', { error: err });
      setError(err.message || 'Failed to install template');
      setInstalling(null);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Choose a Template
              </h2>
              <p className="text-sm text-gray-500">
                Start with a professional template
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="px-6 py-3 border-b bg-gray-50 flex-shrink-0">
            <div className="flex gap-4">
              {/* Search */}
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-gray-100 rounded-lg animate-pulse aspect-video"
                  />
                ))}
              </div>
            )}

            {/* Templates Grid */}
            {!loading && templates.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    disabled={installing === template.id}
                    className="text-left group relative rounded-lg overflow-hidden border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 relative">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg
                            className="w-8 h-8"
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

                      {/* License Badge */}
                      <span
                        className={`absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded ${
                          LICENSE_COLORS[template.license] || LICENSE_COLORS.free
                        }`}
                      >
                        {LICENSE_LABELS[template.license] || 'Free'}
                      </span>

                      {/* Installing Overlay */}
                      {installing === template.id && (
                        <div className="absolute inset-0 bg-blue-500/80 flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full mx-auto mb-1" />
                            <span className="text-xs">Creating...</span>
                          </div>
                        </div>
                      )}

                      {/* Access Lock */}
                      {!template.can_access && !installing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="bg-white text-gray-900 px-2 py-1 rounded text-xs font-medium">
                            Upgrade
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {template.slide_count} slide
                        {template.slide_count !== 1 ? 's' : ''}
                      </p>
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
                  Try adjusting your filters
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <div className="flex items-center justify-between">
              <a
                href="/templates"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Browse full marketplace
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
