/**
 * Template Preview Modal
 *
 * Modal for previewing template details and installing as a new scene.
 * Shows template thumbnail, description, slide preview, and install button.
 */

import { useState, useEffect } from 'react';
import {
  fetchTemplateDetail,
  installTemplateAsScene,
  LICENSE_LABELS,
} from '../services/marketplaceService';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function TemplatePreviewModal({
  template,
  onClose,
  onInstallSuccess,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState(null);
  const [customName, setCustomName] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);

  // Load template detail
  useEffect(() => {
    if (!template?.id) return;

    setLoading(true);
    setError(null);

    fetchTemplateDetail(template.id)
      .then(data => {
        setDetail(data);
        setCustomName(data.name);
      })
      .catch(err => {
        console.error('Failed to load template detail:', err);
        setError('Failed to load template details');
      })
      .finally(() => setLoading(false));
  }, [template?.id]);

  // Handle install
  const handleInstall = async () => {
    if (!detail?.canAccess) return;

    setInstalling(true);
    setError(null);

    try {
      const sceneId = await installTemplateAsScene(
        template.id,
        customName || template.name
      );
      onInstallSuccess?.(sceneId);
    } catch (err) {
      console.error('Failed to install template:', err);
      setError(err.message || 'Failed to install template');
      setInstalling(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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

  const slides = detail?.slides || [];
  const currentSlide = slides[activeSlide];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {template?.name || 'Template Preview'}
              </h2>
              {template?.license && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    LICENSE_COLORS[template.license] || LICENSE_COLORS.free
                  }`}
                >
                  {LICENSE_LABELS[template.license] || 'Free'}
                </span>
              )}
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

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-gray-500">Loading template...</p>
              </div>
            ) : error && !detail ? (
              <div className="p-8 text-center">
                <p className="text-red-600">{error}</p>
              </div>
            ) : (
              <div className="p-6">
                {/* Preview Area */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Main Preview */}
                  <div className="lg:col-span-2">
                    <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                      {currentSlide?.design_json ? (
                        <SlidePreview designJson={currentSlide.design_json} />
                      ) : template?.preview_url ? (
                        <img
                          src={template.preview_url}
                          alt="Template preview"
                          className="w-full h-full object-contain"
                        />
                      ) : template?.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt="Template thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          No preview available
                        </div>
                      )}

                      {/* Slide navigation */}
                      {slides.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              setActiveSlide((prev) =>
                                prev > 0 ? prev - 1 : slides.length - 1
                              )
                            }
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
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
                                d="M15 19l-7-7 7-7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setActiveSlide((prev) =>
                                prev < slides.length - 1 ? prev + 1 : 0
                              )
                            }
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
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
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                            {activeSlide + 1} / {slides.length}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Slide Thumbnails */}
                    {slides.length > 1 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                        {slides.map((slide, index) => (
                          <button
                            key={slide.id}
                            onClick={() => setActiveSlide(index)}
                            className={`flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden ${
                              index === activeSlide
                                ? 'border-blue-500'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                              {slide.title || `Slide ${index + 1}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Details Sidebar */}
                  <div className="space-y-4">
                    {/* Description */}
                    {detail?.description && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-1">
                          Description
                        </h3>
                        <p className="text-sm text-gray-600">
                          {detail.description}
                        </p>
                      </div>
                    )}

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      {detail?.category?.name && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Category</span>
                          <span className="text-gray-900">
                            {detail.category.name}
                          </span>
                        </div>
                      )}
                      {detail?.industry && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Industry</span>
                          <span className="text-gray-900 capitalize">
                            {detail.industry}
                          </span>
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
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          Tags
                        </h3>
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

                    {/* Access Warning */}
                    {detail && !detail.canAccess && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex gap-2">
                          <svg
                            className="w-5 h-5 text-yellow-600 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-yellow-800">
                              Upgrade Required
                            </p>
                            <p className="text-xs text-yellow-700 mt-0.5">
                              This template requires a{' '}
                              {LICENSE_LABELS[template?.license] || 'higher'}{' '}
                              plan.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Name Input */}
                {detail?.canAccess && (
                  <div className="mt-6 pt-6 border-t">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scene Name
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter a name for your new scene..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will create a new scene based on the template that
                      you can customize.
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            {detail?.canAccess ? (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {installing ? (
                  <>
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Installing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Use Template
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  // Navigate to billing/upgrade page
                  window.location.href = '/account/plan';
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
              >
                Upgrade to Access
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple slide preview component
function SlidePreview({ designJson }) {
  // Basic rendering of design_json
  // In production, this would use the actual slide renderer
  const { backgroundColor, elements = [] } = designJson || {};

  return (
    <div
      className="w-full h-full relative"
      style={{ backgroundColor: backgroundColor || '#1a1a2e' }}
    >
      {elements.map((el, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: el.x || 0,
            top: el.y || 0,
            width: el.width,
            height: el.height,
          }}
        >
          {el.type === 'text' && (
            <p
              style={{
                color: el.color || '#fff',
                fontSize: el.fontSize || 16,
                fontWeight: el.fontWeight,
              }}
            >
              {el.content}
            </p>
          )}
          {el.type === 'image' && el.src && (
            <img
              src={el.src}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
      {elements.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
          Preview
        </div>
      )}
    </div>
  );
}
