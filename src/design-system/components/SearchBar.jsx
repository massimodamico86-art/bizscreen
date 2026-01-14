/**
 * SearchBar Component
 *
 * Yodeck-inspired search input with rounded styling.
 *
 * @example
 * <SearchBar
 *   value={search}
 *   onChange={setSearch}
 *   placeholder="Search templates..."
 * />
 *
 * // Pill variant (fully rounded)
 * <SearchBar
 *   variant="pill"
 *   value={search}
 *   onChange={setSearch}
 * />
 */

import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = forwardRef(function SearchBar(
  {
    value = '',
    onChange,
    placeholder = 'Search...',
    variant = 'default', // 'default' | 'pill'
    size = 'md', // 'sm' | 'md' | 'lg'
    showClear = true,
    onClear,
    autoFocus = false,
    className = '',
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: {
      wrapper: 'text-sm',
      input: 'py-1.5 pl-9 pr-8',
      icon: 'left-3 w-4 h-4',
      clear: 'right-2 w-4 h-4',
    },
    md: {
      wrapper: 'text-sm',
      input: 'py-2.5 pl-11 pr-10',
      icon: 'left-4 w-5 h-5',
      clear: 'right-3 w-4 h-4',
    },
    lg: {
      wrapper: 'text-base',
      input: 'py-3 pl-12 pr-12',
      icon: 'left-4 w-5 h-5',
      clear: 'right-4 w-5 h-5',
    },
  };

  const variantClasses = {
    default: 'rounded-lg',
    pill: 'rounded-full',
  };

  const sizes = sizeClasses[size];
  const hasValue = value.length > 0;

  const handleClear = () => {
    onChange?.('');
    onClear?.();
  };

  return (
    <div
      ref={ref}
      className={`relative ${sizes.wrapper} ${className}`}
      {...props}
    >
      <Search
        className={`
          absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none
          ${sizes.icon}
        `.trim()}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`
          w-full bg-white border border-gray-200
          ${sizes.input}
          ${variantClasses[variant]}
          text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500
          transition-colors
        `.trim()}
      />
      {showClear && hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className={`
            absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
            p-0.5 rounded-full hover:bg-gray-100 transition-colors
            ${sizes.clear}
          `.trim()}
        >
          <X className="w-full h-full" />
        </button>
      )}
    </div>
  );
});

export default SearchBar;
