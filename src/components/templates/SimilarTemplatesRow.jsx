/**
 * Similar Templates Row
 *
 * Horizontal row of similar templates shown after Quick Apply.
 * Fetches templates from same category, excluding the applied template.
 *
 * @module components/templates/SimilarTemplatesRow
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { fetchSimilarTemplates } from '../../services/marketplaceService';

export function SimilarTemplatesRow({ categoryId, excludeTemplateId, onTemplateClick }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetchSimilarTemplates(categoryId, excludeTemplateId, 4)
      .then((data) => {
        if (mounted) setTemplates(data);
      })
      .catch((err) => {
        console.error('Failed to fetch similar templates:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [categoryId, excludeTemplateId]);

  if (loading || templates.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        You might also like
      </h4>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onTemplateClick?.(template)}
            className="flex-shrink-0 w-28 text-left group"
          >
            <div className="aspect-video bg-gray-100 rounded overflow-hidden">
              {template.thumbnail_url ? (
                <img
                  src={template.thumbnail_url}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full bg-gray-200" />
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1 truncate group-hover:text-blue-600">
              {template.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

SimilarTemplatesRow.propTypes = {
  categoryId: PropTypes.string,
  excludeTemplateId: PropTypes.string,
  onTemplateClick: PropTypes.func,
};

export default SimilarTemplatesRow;
