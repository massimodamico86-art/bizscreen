/**
 * Sidebar Recents Section
 *
 * Compact collapsible section showing recently used templates in the sidebar.
 * Displays up to maxItems templates with thumbnail and name.
 * Hidden when no recent templates exist.
 *
 * @module components/templates/SidebarRecentsSection
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * SidebarRecentsSection component
 *
 * @param {Object} props
 * @param {Array} props.templates - Array of recently used template objects
 * @param {number} props.maxItems - Maximum number of templates to display
 * @param {Function} props.onTemplateClick - Called when a template is clicked
 */
export function SidebarRecentsSection({
  templates = [],
  maxItems = 5,
  onTemplateClick,
}) {
  const [expanded, setExpanded] = useState(true);

  // Don't render if no recent templates
  if (templates.length === 0) return null;

  const displayedTemplates = templates.slice(0, maxItems);

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <Clock size={14} />
          Recent
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 px-2">
              {displayedTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => onTemplateClick(template)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 text-left group transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-6 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    {template.thumbnail_url ? (
                      <img
                        src={template.thumbnail_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layout size={12} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  {/* Name */}
                  <span className="text-sm text-gray-700 truncate group-hover:text-gray-900">
                    {template.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

SidebarRecentsSection.propTypes = {
  templates: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      thumbnail_url: PropTypes.string,
    })
  ),
  maxItems: PropTypes.number,
  onTemplateClick: PropTypes.func.isRequired,
};

export default SidebarRecentsSection;
