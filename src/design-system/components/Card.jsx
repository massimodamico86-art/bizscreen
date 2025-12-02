/**
 * Card Component
 *
 * A versatile card component for content containers.
 * Supports multiple variants, interactive states, and compound patterns.
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>Content here</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 */

import { forwardRef, createContext, useContext } from 'react';

// Context for card state
const CardContext = createContext({ interactive: false });

/**
 * Main Card component
 */
export const Card = forwardRef(function Card(
  {
    children,
    variant = 'default', // 'default' | 'elevated' | 'outlined' | 'ghost'
    padding = 'default', // 'none' | 'sm' | 'default' | 'lg'
    interactive = false,
    selected = false,
    className = '',
    onClick,
    ...props
  },
  ref
) {
  const variantStyles = {
    default: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-sm border-0',
    outlined: 'bg-transparent border border-gray-200',
    ghost: 'bg-gray-50 border-0',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3 sm:p-4',
    default: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const interactiveStyles = interactive
    ? `
      cursor-pointer
      transition-all duration-200 ease-out
      hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5
      active:scale-[0.98] active:shadow-md active:translate-y-0
    `
    : 'transition-shadow duration-200';

  const selectedStyles = selected
    ? 'ring-2 ring-blue-500 ring-offset-1 border-blue-500'
    : '';

  // Handle keyboard events for interactive cards
  const handleKeyDown = (e) => {
    if (interactive && onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
    // Forward any other keydown handler
    props.onKeyDown?.(e);
  };

  return (
    <CardContext.Provider value={{ interactive }}>
      <div
        ref={ref}
        className={`
          rounded-xl
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactiveStyles}
          ${selectedStyles}
          ${interactive ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : ''}
          ${className}
        `.trim()}
        onClick={onClick}
        onKeyDown={interactive ? handleKeyDown : props.onKeyDown}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
});

/**
 * Card Header
 */
export const CardHeader = forwardRef(function CardHeader(
  {
    children,
    className = '',
    actions,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`flex items-start justify-between gap-4 mb-4 ${className}`}
      {...props}
    >
      <div className="min-w-0 flex-1">
        {children}
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
});

/**
 * Card Title
 */
export const CardTitle = forwardRef(function CardTitle(
  {
    children,
    as: Component = 'h3',
    className = '',
    ...props
  },
  ref
) {
  return (
    <Component
      ref={ref}
      className={`text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});

/**
 * Card Description
 */
export const CardDescription = forwardRef(function CardDescription(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <p
      ref={ref}
      className={`text-sm text-gray-500 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});

/**
 * Card Content
 */
export const CardContent = forwardRef(function CardContent(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Card Footer
 */
export const CardFooter = forwardRef(function CardFooter(
  {
    children,
    className = '',
    align = 'end', // 'start' | 'center' | 'end' | 'between'
    ...props
  },
  ref
) {
  const alignStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      ref={ref}
      className={`
        flex items-center gap-3 mt-4 pt-4 border-t border-gray-100
        ${alignStyles[align]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Card with media (image/video header)
 */
export const CardMedia = forwardRef(function CardMedia(
  {
    src,
    alt = '',
    aspectRatio = '16/9',
    className = '',
    children,
    overlay = false,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-t-xl -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 ${className}`}
      style={{ aspectRatio }}
      {...props}
    >
      {src && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      )}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      )}
      {children && (
        <div className="absolute inset-0 flex items-end p-4">
          {children}
        </div>
      )}
    </div>
  );
});

/**
 * Stat Card - for displaying metrics
 */
export const StatCard = forwardRef(function StatCard(
  {
    title,
    value,
    change,
    changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
    icon,
    description,
    className = '',
    ...props
  },
  ref
) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <Card ref={ref} className={className} padding="default" {...props}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">
            {title}
          </p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {value}
          </p>
          {(change || description) && (
            <div className="mt-2 flex items-center gap-2">
              {change && (
                <span className={`text-sm font-medium ${changeColors[changeType]}`}>
                  {change}
                </span>
              )}
              {description && (
                <span className="text-sm text-gray-500">
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg text-gray-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
});

export default Card;
