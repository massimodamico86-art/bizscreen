/**
 * Starter Pack Card
 *
 * Expandable card showing a curated pack of templates.
 * When expanded, displays template grid with checkboxes for multi-select.
 * Users can select templates and click "Apply Selected" to create scenes.
 *
 * @module components/templates/StarterPackCard
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronDown, Check, Loader2 } from 'lucide-react';

/**
 * StarterPackCard component
 *
 * @param {Object} props
 * @param {Object} props.pack - Starter pack object
 * @param {Function} props.onApplySelected - Called with (pack, selectedTemplates)
 * @param {boolean} props.isApplying - Whether templates are being applied
 */
export function StarterPackCard({
  pack,
  onApplySelected,
  isApplying = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Reset selection when collapsing
    if (isExpanded) {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (templateId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pack.templates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pack.templates.map(t => t.id)));
    }
  };

  const handleApply = () => {
    const selectedTemplates = pack.templates.filter(t => selectedIds.has(t.id));
    onApplySelected(pack, selectedTemplates);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Pack Header - Clickable */}
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Pack Icon/Thumbnail */}
        <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          {pack.thumbnail_url ? (
            <img src={pack.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Package size={28} className="text-white" />
          )}
        </div>

        {/* Pack Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{pack.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-1">{pack.description}</p>
          <p className="text-xs text-gray-400 mt-1">{pack.template_count} templates</p>
        </div>

        {/* Expand Chevron */}
        <ChevronDown
          size={20}
          className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Template Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t bg-gray-50 p-4">
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedIds.size === pack.templates.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedIds.size} of {pack.templates.length} selected
                </span>
              </div>

              {/* Template Grid with Checkboxes */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {pack.templates.map((template) => (
                  <div key={template.id} className="relative">
                    {/* Checkbox Overlay */}
                    <button
                      onClick={() => handleToggleSelect(template.id)}
                      className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(template.id)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white/80 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {selectedIds.has(template.id) && <Check size={14} />}
                    </button>

                    {/* Template Card (compact, no Quick Apply) */}
                    <div
                      className={`cursor-pointer transition-opacity ${
                        selectedIds.has(template.id) ? 'ring-2 ring-blue-500 rounded-lg' : ''
                      }`}
                      onClick={() => handleToggleSelect(template.id)}
                    >
                      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
                        <div className="aspect-video bg-gray-100">
                          {template.thumbnail_url ? (
                            <img
                              src={template.thumbnail_url}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package size={24} />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{template.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Apply Button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleApply}
                  disabled={selectedIds.size === 0 || isApplying}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isApplying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      Apply Selected ({selectedIds.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

StarterPackCard.propTypes = {
  pack: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    thumbnail_url: PropTypes.string,
    template_count: PropTypes.number,
    templates: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        thumbnail_url: PropTypes.string,
      })
    ),
  }).isRequired,
  onApplySelected: PropTypes.func.isRequired,
  isApplying: PropTypes.bool,
};

export default StarterPackCard;
