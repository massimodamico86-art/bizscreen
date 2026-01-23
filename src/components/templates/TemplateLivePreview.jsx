/**
 * Template Live Preview (US-124)
 *
 * Renders a visual preview of what the template looks like on a screen.
 * - Playlist templates: show first item thumbnail with playlist icon overlay
 * - Layout templates: show zone arrangement with content placeholders
 * - Pack templates: show collage of included content
 */

import { useState, useEffect, useMemo } from 'react';
import { Package, List, Layout, Image, Video, Play, Loader2 } from 'lucide-react';

/**
 * Layout zone preview - shows the zone arrangement
 */
function LayoutPreview({ template, className = '' }) {
  const meta = template.meta || {};
  const zones = meta.zones || [];
  const width = meta.width || 1920;
  const height = meta.height || 1080;

  // Generate placeholder zones if not defined
  const displayZones = zones.length > 0 ? zones : [
    { x: 0, y: 0, width: width * 0.7, height: height, name: 'Main' },
    { x: width * 0.7, y: 0, width: width * 0.3, height: height * 0.5, name: 'Side 1' },
    { x: width * 0.7, y: height * 0.5, width: width * 0.3, height: height * 0.5, name: 'Side 2' },
  ];

  return (
    <div
      className={`relative w-full h-full bg-gray-900 overflow-hidden ${className}`}
      style={{ aspectRatio: `${width}/${height}` }}
    >
      {displayZones.map((zone, idx) => {
        const left = (zone.x / width) * 100;
        const top = (zone.y / height) * 100;
        const zoneWidth = (zone.width / width) * 100;
        const zoneHeight = (zone.height / height) * 100;

        // Color based on zone index
        const colors = [
          'bg-blue-500/30 border-blue-400',
          'bg-purple-500/30 border-purple-400',
          'bg-green-500/30 border-green-400',
          'bg-orange-500/30 border-orange-400',
          'bg-pink-500/30 border-pink-400',
        ];
        const colorClass = colors[idx % colors.length];

        return (
          <div
            key={idx}
            className={`absolute border-2 border-dashed ${colorClass} flex items-center justify-center`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${zoneWidth}%`,
              height: `${zoneHeight}%`,
            }}
          >
            <span className="text-white/70 text-[10px] font-medium bg-black/30 px-1 rounded">
              {zone.name || `Zone ${idx + 1}`}
            </span>
          </div>
        );
      })}

      {/* Layout icon overlay */}
      <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5">
        <Layout size={14} className="text-white" />
      </div>
    </div>
  );
}

/**
 * Playlist preview - shows thumbnail with playlist icon
 */
function PlaylistPreview({ template, className = '' }) {
  const thumbnail = template.thumbnail || template.thumbnail_url;
  const meta = template.meta || {};
  const itemCount = meta.estimated_items || meta.item_count || 5;

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 ${className}`}>
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={template.title || template.name}
          className="w-full h-full object-cover opacity-80"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="grid grid-cols-3 gap-1 p-4 opacity-40">
            {Array.from({ length: Math.min(itemCount, 6) }).map((_, i) => (
              <div
                key={i}
                className="w-12 h-8 bg-white/20 rounded flex items-center justify-center"
              >
                {i % 2 === 0 ? (
                  <Image size={12} className="text-white/50" />
                ) : (
                  <Video size={12} className="text-white/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Playlist icon overlay */}
      <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5 flex items-center gap-1">
        <List size={14} className="text-white" />
        <span className="text-white text-[10px] font-medium pr-1">{itemCount}</span>
      </div>

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center">
          <Play size={24} className="text-white ml-1" />
        </div>
      </div>
    </div>
  );
}

/**
 * Pack preview - shows collage of included content
 */
function PackPreview({ template, className = '' }) {
  const meta = template.meta || {};
  const includes = meta.includes || ['Playlist', 'Layout', 'Schedule'];
  const thumbnail = template.thumbnail || template.thumbnail_url;

  // Icons for different content types
  const getIcon = (type) => {
    const lower = type.toLowerCase();
    if (lower.includes('playlist')) return List;
    if (lower.includes('layout')) return Layout;
    return Package;
  };

  return (
    <div className={`relative w-full h-full bg-gradient-to-br from-green-900 to-emerald-700 ${className}`}>
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={template.title || template.name}
          className="w-full h-full object-cover opacity-70"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="grid grid-cols-2 gap-2 p-4">
            {includes.slice(0, 4).map((item, idx) => {
              const Icon = getIcon(item);
              return (
                <div
                  key={idx}
                  className="w-16 h-12 bg-white/10 rounded-lg flex flex-col items-center justify-center"
                >
                  <Icon size={16} className="text-white/70" />
                  <span className="text-[8px] text-white/50 mt-0.5">{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pack badge overlay */}
      <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1.5 flex items-center gap-1">
        <Package size={14} className="text-white" />
        <span className="text-white text-[10px] font-medium pr-1">
          {includes.length} items
        </span>
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
    </div>
  );
}

/**
 * Main TemplateLivePreview component
 */
export function TemplateLivePreview({ template, className = '', isLoading = false }) {
  const [loaded, setLoaded] = useState(false);

  // Simulate loading for smooth transitions
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [template?.id]);

  if (isLoading || !loaded) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className={`w-full h-full flex items-center justify-center bg-gray-100 ${className}`}>
        <span className="text-gray-400 text-sm">No preview available</span>
      </div>
    );
  }

  // Render appropriate preview based on template type
  switch (template.type) {
    case 'layout':
      return <LayoutPreview template={template} className={className} />;
    case 'pack':
      return <PackPreview template={template} className={className} />;
    case 'playlist':
    default:
      return <PlaylistPreview template={template} className={className} />;
  }
}

/**
 * Iframe-based live preview for actual content rendering
 * Use this for more accurate previews when template has preview_url
 */
export function TemplateIframePreview({ template, className = '' }) {
  const [isLoading, setIsLoading] = useState(true);
  const previewUrl = template?.preview_url || template?.meta?.preview_url;

  if (!previewUrl) {
    return <TemplateLivePreview template={template} className={className} />;
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      <iframe
        src={previewUrl}
        title={`Preview of ${template.title || template.name}`}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

export default TemplateLivePreview;
