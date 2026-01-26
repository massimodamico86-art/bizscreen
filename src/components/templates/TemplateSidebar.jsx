/**
 * Template Sidebar
 *
 * Persistent left sidebar for template marketplace category navigation.
 * Displays category list with "All Templates" option and orientation filter.
 *
 * @module components/templates/TemplateSidebar
 */

import PropTypes from 'prop-types';

/**
 * TemplateSidebar component
 *
 * @param {Object} props
 * @param {Array} props.categories - Array of category objects { id, name }
 * @param {string|null} props.selectedCategory - Currently selected category ID
 * @param {string|null} props.selectedOrientation - Current orientation filter ('landscape', 'portrait', or null)
 * @param {Function} props.onFilterChange - Callback for filter changes ({ category?: string, orientation?: string })
 */
export function TemplateSidebar({
  categories = [],
  selectedCategory = null,
  selectedOrientation = null,
  onFilterChange,
}) {
  const handleCategoryClick = (categoryId) => {
    onFilterChange({ category: categoryId });
  };

  const handleOrientationChange = (orientation) => {
    // Toggle: if clicking the currently selected orientation, clear it
    const newOrientation = selectedOrientation === orientation ? null : orientation;
    onFilterChange({ orientation: newOrientation });
  };

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="sticky top-4 space-y-6">
        {/* Categories Section */}
        <div className="space-y-1">
          {/* All Templates button */}
          <button
            onClick={() => handleCategoryClick(null)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              !selectedCategory
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Templates
          </button>

          {/* Category buttons */}
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedCategory === category.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Orientation Section */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Orientation
          </h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedOrientation === 'landscape'}
                onChange={() => handleOrientationChange('landscape')}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Landscape</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedOrientation === 'portrait'}
                onChange={() => handleOrientationChange('portrait')}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Portrait</span>
            </label>
          </div>
        </div>
      </div>
    </aside>
  );
}

TemplateSidebar.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
  selectedCategory: PropTypes.string,
  selectedOrientation: PropTypes.oneOf(['landscape', 'portrait', null]),
  onFilterChange: PropTypes.func.isRequired,
};

export default TemplateSidebar;
