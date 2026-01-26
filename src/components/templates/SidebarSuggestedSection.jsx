/**
 * Sidebar Suggested Section
 *
 * Displays personalized template suggestions in the marketplace sidebar.
 * Shows industry-based recommendations with suggestion reason.
 *
 * @module components/templates/SidebarSuggestedSection
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSuggestedTemplates } from '../../services/marketplaceService';

export function SidebarSuggestedSection({ onTemplateClick = () => {} }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchSuggestedTemplates(6)
      .then((data) => {
        if (mounted) setTemplates(data);
      })
      .catch((err) => {
        console.error('Failed to fetch suggestions:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  // Don't render section if no suggestions
  if (!loading && templates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Sparkles size={16} className="text-amber-500" />
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">
          Suggested for You
        </h4>
        <span className="text-xs text-gray-400">
          {isCollapsed ? '+' : '−'}
        </span>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onTemplateClick(template)}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 text-left group"
                  >
                    <div className="w-12 h-8 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {template.thumbnail_url ? (
                        <img
                          src={template.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate group-hover:text-blue-600">
                        {template.name}
                      </p>
                      {template.suggestion_reason && (
                        <p className="text-xs text-gray-400 truncate">
                          {template.suggestion_reason}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

SidebarSuggestedSection.propTypes = {
  onTemplateClick: PropTypes.func,
};

export default SidebarSuggestedSection;
