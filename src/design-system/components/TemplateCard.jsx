/**
 * TemplateCard Component
 *
 * Yodeck-inspired template card for galleries and marketplaces.
 *
 * @example
 * <TemplateCard
 *   title="Restaurant Menu"
 *   description="Perfect for displaying daily specials"
 *   imageUrl="/preview.jpg"
 *   category="Restaurant"
 *   onSelect={() => handleSelect(template)}
 *   actionLabel="Use Template"
 * />
 */

import { forwardRef, useState } from 'react';

export const TemplateCard = forwardRef(function TemplateCard(
  {
    title,
    description,
    imageUrl,
    category,
    tags = [],
    orientation, // 'landscape' | 'portrait' | 'square'
    onSelect,
    onPreview,
    actionLabel = 'Use Template',
    loading = false,
    featured = false,
    className = '',
    ...props
  },
  ref
) {
  const [imageError, setImageError] = useState(false);

  // Aspect ratio based on orientation
  const aspectClasses = {
    landscape: 'aspect-video',
    portrait: 'aspect-[9/16]',
    square: 'aspect-square',
  };
  const aspectClass = aspectClasses[orientation] || 'aspect-video';

  return (
    <div
      ref={ref}
      className={`
        group bg-white border border-gray-200 rounded-card overflow-hidden
        hover:shadow-elevated transition-all duration-200
        ${onSelect ? 'cursor-pointer' : ''}
        ${featured ? 'ring-2 ring-brand-500/30' : ''}
        ${className}
      `.trim()}
      onClick={(e) => {
        // Don't trigger card click if clicking buttons
        if (e.target.closest('button')) return;
        onSelect?.();
      }}
      {...props}
    >
      {/* Preview Image */}
      <div className={`${aspectClass} bg-gray-100 relative overflow-hidden`}>
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <LayoutTemplate size={32} className="text-gray-300" />
          </div>
        )}

        {/* Featured badge */}
        {featured && (
          <div className="absolute top-2 left-2">
            <Badge variant="warning" size="sm" className="flex items-center gap-1">
              <Sparkles size={10} />
              Featured
            </Badge>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          ) : (
            <>
              {onSelect && (
                <Button variant="secondary" size="sm" onClick={onSelect}>
                  <Plus size={16} />
                  {actionLabel}
                </Button>
              )}
              {onPreview && (
                <Button variant="ghost" size="sm" onClick={onPreview} className="text-white hover:text-white hover:bg-white/20">
                  Preview
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-gray-900 text-sm truncate">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}

        {/* Tags/Category */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {category && (
            <Badge variant="neutral" size="sm">{category}</Badge>
          )}
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" size="sm">{tag}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * TemplateCardGrid - Grid layout for template cards
 */
export const TemplateCardGrid = forwardRef(function TemplateCardGrid(
  {
    children,
    columns = 4, // 2 | 3 | 4
    className = '',
    ...props
  },
  ref
) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  return (
    <div
      ref={ref}
      className={`grid ${gridClasses[columns]} gap-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * TemplateCardSkeleton - Loading placeholder
 */
export const TemplateCardSkeleton = forwardRef(function TemplateCardSkeleton(
  { className = '', ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-200 rounded-card overflow-hidden ${className}`}
      {...props}
    >
      <div className="aspect-video bg-gray-100 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
});

export default TemplateCard;
