/**
 * Template Grid and Card Components
 *
 * Grid layout for displaying template cards with hover overlays.
 * TemplateCard shows title and Quick Apply button on hover.
 *
 * @module components/templates/TemplateGrid
 */

import PropTypes from 'prop-types';

/**
 * TemplateCard component
 *
 * Individual template card with hover overlay showing title and Quick Apply.
 * Includes optional favorite heart icon in top-right corner.
 * Shows usage badge (bottom-left) when user has applied this template before.
 *
 * @param {Object} props
 * @param {Object} props.template - Template data with id, name, thumbnail_url
 * @param {Function} props.onClick - Called when card clicked (for preview)
 * @param {Function} props.onQuickApply - Called when Quick Apply clicked
 * @param {boolean} props.isApplying - Whether this template is currently being applied
 * @param {boolean} props.isFavorited - Whether this template is favorited
 * @param {Function} props.onToggleFavorite - Called when favorite icon clicked
 * @param {number} props.usageCount - Number of times user has applied this template
 */
export function TemplateCard({
  template,
  onClick,
  onQuickApply,
  isApplying = false,
  isFavorited = false,
  onToggleFavorite,
  usageCount = 0,
}) {
  const handleQuickApply = (e) => {
    e.stopPropagation();
    if (!isApplying && onQuickApply) {
      onQuickApply(template);
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(template);
    }
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(template.id, !isFavorited);
    }
  };

  return (
    <div
      className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 cursor-pointer transition-shadow hover:shadow-md"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Template: ${template.name}`}
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
          <div className="w-full h-full flex items-center justify-center">
            <Layout size={48} className="text-gray-300" />
          </div>
        )}

        {/* Heart icon - always visible in corner */}
        {onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              size={18}
              className={isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-gray-600'}
            />
          </button>
        )}

        {/* Usage badge - bottom-left, only show if used */}
        {usageCount > 0 && (
          <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-full bg-gray-900/70 text-white text-xs font-medium">
            Used {usageCount}x
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
          <h3 className="text-white font-medium text-sm text-center px-3 line-clamp-2">
            {template.name}
          </h3>
          <button
            onClick={handleQuickApply}
            disabled={isApplying}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Applying...
              </>
            ) : (
              'Quick Apply'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

TemplateCard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    thumbnail_url: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
  onQuickApply: PropTypes.func,
  isApplying: PropTypes.bool,
  isFavorited: PropTypes.bool,
  onToggleFavorite: PropTypes.func,
  usageCount: PropTypes.number,
};

/**
 * TemplateGrid component
 *
 * Responsive 4-column grid for displaying template cards.
 *
 * @param {Object} props
 * @param {Array} props.templates - Array of template objects
 * @param {Function} props.onTemplateClick - Called when template card clicked
 * @param {Function} props.onQuickApply - Called when Quick Apply clicked
 * @param {string|null} props.applyingId - ID of template currently being applied
 * @param {Set} props.favoriteIds - Set of favorited template IDs
 * @param {Function} props.onToggleFavorite - Called when favorite icon clicked
 * @param {Map} props.usageCounts - Map of template ID to usage count
 */
export function TemplateGrid({
  templates = [],
  onTemplateClick,
  onQuickApply,
  applyingId = null,
  favoriteIds = null,
  onToggleFavorite,
  usageCounts = null,
}) {
  if (templates.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onClick={onTemplateClick}
          onQuickApply={onQuickApply}
          isApplying={applyingId === template.id}
          isFavorited={favoriteIds?.has(template.id) || false}
          onToggleFavorite={onToggleFavorite}
          usageCount={usageCounts?.get(template.id) || 0}
        />
      ))}
    </div>
  );
}

TemplateGrid.propTypes = {
  templates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      thumbnail_url: PropTypes.string,
    })
  ),
  onTemplateClick: PropTypes.func,
  onQuickApply: PropTypes.func,
  applyingId: PropTypes.string,
  favoriteIds: PropTypes.instanceOf(Set),
  onToggleFavorite: PropTypes.func,
  usageCounts: PropTypes.instanceOf(Map),
};

export default TemplateGrid;
