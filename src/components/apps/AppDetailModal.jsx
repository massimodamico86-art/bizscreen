/**
 * AppDetailModal Component
 *
 * Shows app preview, description, and options before configuration.
 * Based on Yodeck's "New App" modal design.
 */

import { useState } from 'react';

export default function AppDetailModal({ app, onClose, onUseApp }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!app) return null;

  const Icon = app.icon;
  const hasPreviewImages = app.previewImages?.length > 0;
  const previewImages = app.previewImages || [app.previewImage || `/images/app-previews/${app.id}.png`];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % previewImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + previewImages.length) % previewImages.length);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New App</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Preview Image */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 aspect-video">
            {hasPreviewImages ? (
              <>
                <img
                  src={previewImages[currentImageIndex]}
                  alt={`${app.name} preview`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/images/app-preview-placeholder.png';
                  }}
                />
                {previewImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {app.logoUrl ? (
                  <img
                    src={app.logoUrl}
                    alt={app.name}
                    className="w-24 h-24 object-contain"
                  />
                ) : Icon ? (
                  <div className={`p-6 rounded-2xl ${app.iconBgColor || 'bg-gray-200'}`}>
                    <Icon size={64} className={app.iconColor || 'text-gray-600'} />
                  </div>
                ) : (
                  <div className="text-gray-400 text-lg">Preview not available</div>
                )}
              </div>
            )}
          </div>

          {/* Image dots indicator */}
          {previewImages.length > 1 && (
            <div className="flex justify-center gap-2 mb-4">
              {previewImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex
                      ? 'bg-[#f26f21] w-4'
                      : 'bg-gray-300 hover:bg-gray-400 w-2'
                  }`}
                />
              ))}
            </div>
          )}

          {/* App Name */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3">{app.name}</h3>

          {/* Description */}
          <div className="text-gray-600 text-sm space-y-3 mb-4">
            <p>{app.longDescription || app.description}</p>

            {app.features && (
              <div>
                <p className="font-medium text-gray-700 mb-2">Features:</p>
                <ul className="list-disc list-inside space-y-1">
                  {app.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {app.themes && (
              <div>
                <p className="font-medium text-gray-700 mb-2">Choose your theme:</p>
                <ul className="list-disc list-inside space-y-1">
                  {app.themes.map((theme, index) => (
                    <li key={index}>
                      <span className="font-medium">{theme.name}:</span> {theme.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {app.note && (
              <p className="text-gray-500">
                <span className="font-medium">Note:</span> {app.note}
              </p>
            )}
          </div>

          {/* Supported players */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span>Supported players:</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-gray-700">All</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-[#f26f21] transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Gallery
          </button>
          <Button
            onClick={() => onUseApp(app)}
            className="bg-[#f26f21] hover:bg-[#e05e10] text-white"
          >
            Use App
          </Button>
        </div>
      </div>
    </div>
  );
}
