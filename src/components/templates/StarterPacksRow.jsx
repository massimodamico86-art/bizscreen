/**
 * Starter Packs Row
 *
 * Displays a section of starter packs at the top of the marketplace.
 * Each pack is an expandable card that shows contained templates.
 *
 * @module components/templates/StarterPacksRow
 */

import PropTypes from 'prop-types';

/**
 * StarterPacksRow component
 *
 * @param {Object} props
 * @param {Array} props.packs - Array of starter pack objects
 * @param {Function} props.onApplySelected - Called when templates are applied
 * @param {string|null} props.applyingPackId - ID of pack currently being applied
 */
export function StarterPacksRow({
  packs = [],
  onApplySelected,
  applyingPackId = null,
}) {
  if (packs.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Starter Packs</h2>
      <div className="space-y-4">
        {packs.map((pack) => (
          <StarterPackCard
            key={pack.id}
            pack={pack}
            onApplySelected={onApplySelected}
            isApplying={applyingPackId === pack.id}
          />
        ))}
      </div>
    </section>
  );
}

StarterPacksRow.propTypes = {
  packs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  onApplySelected: PropTypes.func.isRequired,
  applyingPackId: PropTypes.string,
};

export default StarterPacksRow;
