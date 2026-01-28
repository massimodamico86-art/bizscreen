/**
 * FilterChips Component
 *
 * Yodeck-inspired filter chip buttons for category/tag filtering.
 *
 * @example
 * <FilterChips
 *   options={[
 *     { id: 'all', label: 'All' },
 *     { id: 'retail', label: 'Retail' },
 *     { id: 'restaurant', label: 'Restaurant' },
 *   ]}
 *   selected="all"
 *   onChange={setSelected}
 * />
 *
 * // With icons
 * <FilterChips
 *   options={[
 *     { id: 'landscape', label: 'Landscape', icon: Monitor },
 *     { id: 'portrait', label: 'Portrait', icon: Smartphone },
 *   ]}
 *   selected="landscape"
 *   onChange={setSelected}
 *   variant="primary"
 * />
 */

import { forwardRef, useState } from 'react';

/**
 * FilterChips - Horizontal filter buttons
 *
 * @param {Object} props
 * @param {Array} props.options - Array of { id, label, icon? }
 * @param {string} props.selected - Currently selected option ID
 * @param {Function} props.onChange - Callback when selection changes
 * @param {'default' | 'primary'} props.variant - Color variant for active state
 * @param {number} props.maxVisible - Max chips to show before overflow
 * @param {boolean} props.showClear - Show clear button when not default selection
 * @param {string} props.defaultValue - The default/unfiltered value (for clear logic)
 */
export const FilterChips = forwardRef(function FilterChips(
  {
    options = [],
    selected,
    onChange,
    variant = 'default', // 'default' (gray active) | 'primary' (brand active)
    maxVisible = 999,
    showClear = false,
    defaultValue = 'all',
    className = '',
    ...props
  },
  ref
) {
  const [showOverflow, setShowOverflow] = useState(false);

  const visibleOptions = options.slice(0, maxVisible);
  const overflowOptions = options.slice(maxVisible);
  const isOverflowActive = overflowOptions.some((opt) => opt.id === selected);
  const showClearButton = showClear && selected !== defaultValue;

  const getChipClasses = (isActive) => {
    const base = 'px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2';

    if (isActive) {
      return variant === 'primary'
        ? `${base} bg-brand-500 text-white`
        : `${base} bg-gray-900 text-white`;
    }

    return `${base} bg-white text-gray-600 border border-gray-200 hover:border-gray-300`;
  };

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 flex-wrap ${className}`}
      {...props}
    >
      {visibleOptions.map((option) => {
        const isActive = selected === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            onClick={() => onChange?.(option.id)}
            className={getChipClasses(isActive)}
          >
            {Icon && <Icon size={14} />}
            {option.label}
          </button>
        );
      })}

      {/* Overflow dropdown */}
      {overflowOptions.length > 0 && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverflow(!showOverflow);
            }}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              flex items-center gap-1
              ${isOverflowActive
                ? variant === 'primary'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }
            `.trim()}
          >
            More
            <ChevronDown
              size={14}
              className={`transition-transform ${showOverflow ? 'rotate-180' : ''}`}
            />
          </button>

          {showOverflow && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowOverflow(false)}
              />
              <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                {overflowOptions.map((option) => {
                  const isActive = selected === option.id;
                  const Icon = option.icon;

                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        onChange?.(option.id);
                        setShowOverflow(false);
                      }}
                      className={`
                        w-full px-4 py-2 text-sm text-left transition-colors
                        flex items-center gap-2
                        ${isActive
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `.trim()}
                    >
                      {Icon && <Icon size={14} />}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Clear button */}
      {showClearButton && (
        <button
          onClick={() => onChange?.(defaultValue)}
          className="text-sm text-gray-500 hover:text-gray-700 underline ml-2 flex items-center gap-1"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
});

/**
 * ToggleChips - Single selection toggle group (like orientation filter)
 */
export const ToggleChips = forwardRef(function ToggleChips(
  {
    options = [],
    selected,
    onChange,
    variant = 'primary',
    showCount,
    countValue,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 ${className}`}
      {...props}
    >
      {options.map((option) => {
        const isActive = selected === option.id;
        const Icon = option.icon;

        return (
          <button
            key={option.id}
            onClick={() => onChange?.(option.id)}
            className={`
              px-4 py-2 rounded-full text-sm font-medium transition-colors
              flex items-center gap-2
              ${isActive
                ? variant === 'primary'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `.trim()}
          >
            {Icon && <Icon size={14} />}
            {option.label}
          </button>
        );
      })}

      {showCount && countValue !== undefined && (
        <span className="text-sm text-gray-500 ml-2">
          {countValue} result{countValue !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
});

export default FilterChips;
