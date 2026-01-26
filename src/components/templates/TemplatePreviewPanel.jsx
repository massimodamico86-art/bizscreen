/**
 * Template Preview Panel
 *
 * Right slide-in panel for previewing template details before applying.
 * Shows template image, description, details, and Apply button.
 * Grid remains visible behind the panel for comparison.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { drawer } from '../../design-system/motion';
import {
  fetchTemplateDetail,
  installTemplateAsScene,
  LICENSE_LABELS,
} from '../../services/marketplaceService';
import { TemplateRating } from './TemplateRating';
import { SimilarTemplatesRow } from './SimilarTemplatesRow';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export function TemplatePreviewPanel({ template, onClose, onApply }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [showSimilar, setShowSimilar] = useState(false);

  // Load template detail on mount/template change
  useEffect(() => {
    if (!template?.id) return;

    setLoading(true);
    setError(null);
    setDetail(null);
    setShowSimilar(false);

    fetchTemplateDetail(template.id)
      .then(setDetail)
      .catch((err) => {
        console.error('Failed to load template detail:', err);
        setError('Failed to load template details');
      })
      .finally(() => setLoading(false));
  }, [template?.id]);

  // Handle escape key to close panel
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle Apply button click
  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const sceneName = `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`;
      const sceneId = await installTemplateAsScene(template.id, sceneName);
      setShowSimilar(true);
      onApply(sceneId);
    } catch (err) {
      console.error('Failed to apply template:', err);
      setError(err.message || 'Failed to apply template');
      setApplying(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const slides = detail?.slides || [];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/30 z-30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <motion.div
        className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white shadow-xl z-40 flex flex-col"
        {...drawer.right}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {template?.name || 'Template Preview'}
            </h2>
            {template?.license && (
              <span
                className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                  LICENSE_COLORS[template.license] || LICENSE_COLORS.free
                }`}
              >
                {LICENSE_LABELS[template.license] || 'Free'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-500 text-sm">Loading template details...</p>
            </div>
          ) : error && !detail ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 p-6">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <p className="text-red-600 font-medium">Failed to load template</p>
              <p className="text-gray-500 text-sm text-center">{error}</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Preview Image */}
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {template?.preview_url || template?.thumbnail_url ? (
                  <img
                    src={template.preview_url || template.thumbnail_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No preview available
                  </div>
                )}
              </div>

              {/* Description */}
              {detail?.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Description
                  </h3>
                  <p className="text-sm text-gray-600">{detail.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="space-y-2 text-sm">
                {detail?.category?.name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category</span>
                    <span className="text-gray-900">{detail.category.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Slides</span>
                  <span className="text-gray-900">{slides.length}</span>
                </div>
                {detail?.install_count > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Installs</span>
                    <span className="text-gray-900">
                      {detail.install_count.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {detail?.tags?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {detail.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rating Section */}
              {detail && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Rating</h3>
                  <TemplateRating templateId={template.id} />
                </div>
              )}

              {/* Similar Templates - shown after apply */}
              {showSimilar && detail?.category_id && (
                <SimilarTemplatesRow
                  categoryId={detail.category_id}
                  excludeTemplateId={template.id}
                  onTemplateClick={() => {
                    setShowSimilar(false);
                  }}
                />
              )}

              {/* Access Warning */}
              {detail && !detail.canAccess && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Upgrade Required
                      </p>
                      <p className="text-xs text-yellow-700 mt-0.5">
                        This template requires a{' '}
                        {LICENSE_LABELS[template?.license] || 'higher'} plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && detail && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          {detail?.canAccess ? (
            <button
              onClick={handleApply}
              disabled={applying || loading}
              className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Template'
              )}
            </button>
          ) : detail && !detail.canAccess ? (
            <button
              onClick={() => {
                window.location.href = '/account/plan';
              }}
              className="w-full py-2.5 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700"
            >
              Upgrade to Access
            </button>
          ) : (
            <button
              disabled
              className="w-full py-2.5 px-4 bg-gray-200 text-gray-400 font-medium rounded-lg cursor-not-allowed"
            >
              Apply Template
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
