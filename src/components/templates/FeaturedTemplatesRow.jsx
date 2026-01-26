/**
 * Featured Templates Row
 *
 * Displays featured templates in a larger card format at the top of the marketplace.
 * Uses fewer columns for emphasis: 3-column max on desktop.
 *
 * @module components/templates/FeaturedTemplatesRow
 */

import PropTypes from 'prop-types';
import { TemplateCard } from './TemplateGrid';

/**
 * FeaturedTemplatesRow component
 *
 * @param {Object} props
 * @param {Array} props.templates - Array of featured template objects
 * @param {Function} props.onTemplateClick - Called when template card clicked
 * @param {Function} props.onQuickApply - Called when Quick Apply clicked
 * @param {string|null} props.applyingId - ID of template currently being applied
 * @param {Set} props.favoriteIds - Set of favorited template IDs
 * @param {Function} props.onToggleFavorite - Called when favorite icon clicked
 * @param {Map} props.usageCounts - Map of template ID to usage count
 */
export function FeaturedTemplatesRow({
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
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="[&_.aspect-video]:aspect-[16/9]">
            <TemplateCard
              template={template}
              onClick={onTemplateClick}
              onQuickApply={onQuickApply}
              isApplying={applyingId === template.id}
              isFavorited={favoriteIds?.has(template.id) || false}
              onToggleFavorite={onToggleFavorite}
              usageCount={usageCounts?.get(template.id) || 0}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

FeaturedTemplatesRow.propTypes = {
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

export default FeaturedTemplatesRow;
