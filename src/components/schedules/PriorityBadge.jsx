/**
 * PriorityBadge Component
 *
 * 5-level priority display with named levels and color coding.
 * Implements SCHED-02 requirements: named priority levels.
 *
 * @example
 * // Display mode
 * <PriorityBadge priority={3} />
 *
 * // Editable mode with dropdown
 * <PriorityBadge
 *   priority={priority}
 *   onChange={(newPriority) => setPriority(newPriority)}
 * />
 */

import { forwardRef, useState, useRef, useEffect } from 'react';

// Priority configuration per CONTEXT.md decisions
export const PRIORITY_LEVELS = [
  {
    value: 1,
    label: 'Lowest',
    color: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
    hoverBg: 'hover:bg-gray-50'
  },
  {
    value: 2,
    label: 'Low',
    color: 'bg-blue-50 text-blue-700',
    dot: 'bg-blue-400',
    hoverBg: 'hover:bg-blue-50'
  },
  {
    value: 3,
    label: 'Normal',
    color: 'bg-green-50 text-green-700',
    dot: 'bg-green-500',
    hoverBg: 'hover:bg-green-50'
  },
  {
    value: 4,
    label: 'High',
    color: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    hoverBg: 'hover:bg-amber-50'
  },
  {
    value: 5,
    label: 'Critical',
    color: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
    hoverBg: 'hover:bg-red-50'
  }
];

// Default priority is Normal (3)
export const DEFAULT_PRIORITY = 3;

// Get priority config by value
export const getPriorityConfig = (value) => {
  return PRIORITY_LEVELS.find(p => p.value === value) || PRIORITY_LEVELS[2]; // Default to Normal
};

export const PriorityBadge = forwardRef(function PriorityBadge(
  {
    priority = DEFAULT_PRIORITY,
    size = 'md', // 'sm' | 'md' | 'lg'
    showLabel = true,
    onChange = null, // If provided, enables editable dropdown mode
    className = '',
    ...props
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isEditable = typeof onChange === 'function';

  const config = getPriorityConfig(priority);

  // Size styles following Badge.jsx patterns
  const sizeStyles = {
    sm: {
      badge: 'px-1.5 py-0.5 text-xs gap-1',
      dot: 'w-1.5 h-1.5'
    },
    md: {
      badge: 'px-2 py-0.5 text-xs gap-1.5',
      dot: 'w-2 h-2'
    },
    lg: {
      badge: 'px-2.5 py-1 text-sm gap-1.5',
      dot: 'w-2 h-2'
    }
  };

  const sizeConfig = sizeStyles[size] || sizeStyles.md;

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle priority selection
  const handleSelect = (newPriority) => {
    onChange?.(newPriority);
    setIsOpen(false);
  };

  // Display-only badge
  if (!isEditable) {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center font-medium rounded-full
          ${config.color}
          ${sizeConfig.badge}
          ${className}
        `.trim()}
        {...props}
      >
        <span
          className={`${sizeConfig.dot} rounded-full ${config.dot}`}
          aria-hidden="true"
        />
        {showLabel && config.label}
      </span>
    );
  }

  // Editable badge with dropdown
  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`} {...props}>
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center font-medium rounded-full
          ${config.color}
          ${sizeConfig.badge}
          cursor-pointer transition-all
          hover:ring-2 hover:ring-offset-1 hover:ring-gray-300
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#f26f21]
        `.trim()}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span
          className={`${sizeConfig.dot} rounded-full ${config.dot}`}
          aria-hidden="true"
        />
        {showLabel && config.label}
        <ChevronDown
          size={size === 'sm' ? 12 : 14}
          className={`ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 left-0"
          role="listbox"
          aria-label="Select priority"
        >
          {PRIORITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => handleSelect(level.value)}
              className={`
                w-full px-3 py-2 text-left text-sm flex items-center gap-2
                ${level.hoverBg}
                ${level.value === priority ? 'bg-gray-50' : ''}
                transition-colors
              `}
              role="option"
              aria-selected={level.value === priority}
            >
              <span
                className={`w-2 h-2 rounded-full ${level.dot}`}
                aria-hidden="true"
              />
              <span className={level.value === priority ? 'font-medium' : ''}>
                {level.label}
              </span>
              {level.value === priority && (
                <span className="ml-auto text-[#f26f21]">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M11.6667 3.5L5.25 9.91667L2.33333 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default PriorityBadge;
