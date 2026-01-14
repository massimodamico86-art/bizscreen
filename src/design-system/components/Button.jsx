/**
 * Button Component
 *
 * A refined, Apple-like button with multiple variants and sizes.
 * Supports both controlled accent colors and default semantic colors.
 *
 * @example
 * <Button>Default</Button>
 * <Button variant="primary">Primary</Button>
 * <Button variant="secondary">Secondary</Button>
 * <Button variant="ghost">Ghost</Button>
 * <Button variant="danger">Danger</Button>
 * <Button size="sm" icon={<Plus />}>Add Item</Button>
 */

import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    accentColor, // Optional: override with branding color
    ...props
  },
  ref
) {
  // Base styles - shared across all variants
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-medium rounded-lg
    transition-all duration-150 ease-out
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:cursor-not-allowed
    select-none
    active:scale-[0.97]
    disabled:active:scale-100
  `;

  // Size variants
  const sizeStyles = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    xl: 'px-6 py-3 text-base',
  };

  // Icon-only sizes
  const iconOnlySizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };

  // Variant styles
  const variantStyles = {
    // Primary - main action button (Yodeck orange)
    primary: `
      bg-[#f26f21] text-white
      hover:bg-[#e05a10]
      active:bg-[#d04d08]
      focus-visible:ring-[#f26f21]
      disabled:bg-gray-200 disabled:text-gray-400
      shadow-sm
    `,
    // Secondary - outline button
    secondary: `
      bg-white text-gray-700
      border border-gray-300
      hover:bg-gray-50 hover:border-gray-400
      active:bg-gray-100
      focus-visible:ring-gray-500
      disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200
    `,
    // Ghost - minimal button
    ghost: `
      bg-transparent text-gray-600
      hover:bg-gray-100 hover:text-gray-900
      active:bg-gray-200
      focus-visible:ring-gray-500
      disabled:text-gray-400 disabled:hover:bg-transparent
    `,
    // Danger - destructive action
    danger: `
      bg-red-600 text-white
      hover:bg-red-700
      active:bg-red-800
      focus-visible:ring-red-500
      disabled:bg-red-200 disabled:text-red-400
    `,
    // Danger outline
    'danger-outline': `
      bg-white text-red-600
      border border-red-300
      hover:bg-red-50 hover:border-red-400
      active:bg-red-100
      focus-visible:ring-red-500
      disabled:bg-gray-50 disabled:text-red-300 disabled:border-red-200
    `,
    // Success
    success: `
      bg-green-600 text-white
      hover:bg-green-700
      active:bg-green-800
      focus-visible:ring-green-500
      disabled:bg-green-200 disabled:text-green-400
    `,
    // Link style
    link: `
      bg-transparent text-blue-600
      hover:text-blue-700 hover:underline
      active:text-blue-800
      focus-visible:ring-blue-500
      disabled:text-gray-400
      p-0
    `,
  };

  // Determine if icon-only button
  const isIconOnly = icon && !children;

  // Build className
  const buttonClassName = `
    ${baseStyles}
    ${isIconOnly ? iconOnlySizes[size] : sizeStyles[size]}
    ${variantStyles[variant] || variantStyles.primary}
    ${fullWidth ? 'w-full' : ''}
    ${loading ? 'cursor-wait' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  // Loading spinner
  const Spinner = () => (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Dynamic accent color styles (for branding)
  const accentStyle = accentColor && variant === 'primary' ? {
    backgroundColor: accentColor,
    '--tw-ring-color': accentColor,
  } : {};

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={buttonClassName}
      style={accentStyle}
      {...props}
    >
      {loading && <Spinner />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
});

/**
 * Button Group for grouping related buttons
 */
export const ButtonGroup = forwardRef(function ButtonGroup(
  {
    children,
    className = '',
    attached = false,
    ...props
  },
  ref
) {
  if (attached) {
    return (
      <div
        ref={ref}
        className={`
          inline-flex
          [&>button]:rounded-none
          [&>button:first-child]:rounded-l-lg
          [&>button:last-child]:rounded-r-lg
          [&>button:not(:last-child)]:border-r-0
          ${className}
        `.trim()}
        role="group"
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`inline-flex gap-2 ${className}`}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * IconButton - Square button for icons only
 */
export const IconButton = forwardRef(function IconButton(
  {
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    className = '',
    ...props
  },
  ref
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      icon={icon}
      aria-label={label}
      className={`!rounded-lg ${className}`}
      {...props}
    />
  );
});

export { Button };
export default Button;
