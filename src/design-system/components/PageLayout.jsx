/**
 * PageLayout Component
 *
 * The main layout wrapper for all pages. Provides consistent spacing,
 * max-width constraints, and a standardized page structure.
 *
 * Structure:
 * - PageLayout (outer wrapper with padding)
 *   - PageHeader (title, description, actions)
 *   - PageContent (main content area)
 *
 * @example
 * <PageLayout>
 *   <PageHeader
 *     title="Dashboard"
 *     description="Overview of your screens and content"
 *     actions={<Button>Add Screen</Button>}
 *   />
 *   <PageContent>
 *     {children}
 *   </PageContent>
 * </PageLayout>
 */

import { forwardRef } from 'react';

/**
 * Main page layout wrapper
 */
export const PageLayout = forwardRef(function PageLayout(
  {
    children,
    className = '',
    maxWidth = 'default', // 'default' | 'wide' | 'full' | 'narrow'
    padding = 'default', // 'default' | 'compact' | 'none'
    ...props
  },
  ref
) {
  const maxWidthClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-none',
  };

  const paddingClasses = {
    none: '',
    compact: 'px-4 py-4 sm:px-6 sm:py-6',
    default: 'px-4 py-6 sm:px-6 lg:px-8',
  };

  return (
    <div
      ref={ref}
      className={`
        w-full mx-auto
        ${maxWidthClasses[maxWidth]}
        ${paddingClasses[padding]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Page header with title, description, and optional actions
 */
export const PageHeader = forwardRef(function PageHeader(
  {
    title,
    description,
    actions,
    backButton,
    breadcrumbs,
    className = '',
    size = 'default', // 'default' | 'large'
    ...props
  },
  ref
) {
  const titleClasses = {
    default: 'text-2xl font-semibold text-gray-900 tracking-tight',
    large: 'text-3xl font-semibold text-gray-900 tracking-tight',
  };

  return (
    <header
      ref={ref}
      className={`mb-6 sm:mb-8 ${className}`}
      {...props}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && (
        <nav className="mb-3 flex items-center gap-2 text-sm text-gray-500">
          {breadcrumbs}
        </nav>
      )}

      {/* Back button */}
      {backButton && (
        <div className="mb-3">
          {backButton}
        </div>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className={titleClasses[size]}>
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-gray-500 max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex flex-shrink-0 items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
});

/**
 * Main content area wrapper
 * Note: Uses <div> instead of <main> because App.jsx already provides the semantic <main> wrapper
 */
export const PageContent = forwardRef(function PageContent(
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
      className={`${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Section within a page with optional title
 */
export const PageSection = forwardRef(function PageSection(
  {
    title,
    description,
    actions,
    children,
    className = '',
    spacing = 'default', // 'default' | 'compact' | 'large'
    ...props
  },
  ref
) {
  const spacingClasses = {
    compact: 'mb-4 sm:mb-6',
    default: 'mb-6 sm:mb-8',
    large: 'mb-8 sm:mb-12',
  };

  return (
    <section
      ref={ref}
      className={`${spacingClasses[spacing]} ${className}`}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
});

/**
 * Container for constraining content width
 */
export const Container = forwardRef(function Container(
  {
    children,
    className = '',
    size = 'default', // 'sm' | 'default' | 'lg' | 'xl' | 'full'
    centered = false,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'max-w-2xl',
    default: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-6xl',
    full: 'max-w-none',
  };

  return (
    <div
      ref={ref}
      className={`
        w-full
        ${sizeClasses[size]}
        ${centered ? 'mx-auto' : ''}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Grid layout helper
 */
export const Grid = forwardRef(function Grid(
  {
    children,
    className = '',
    cols = 1, // 1-4 or responsive object { sm: 1, md: 2, lg: 3 }
    gap = 'default', // 'none' | 'sm' | 'default' | 'lg'
    ...props
  },
  ref
) {
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-3 sm:gap-4',
    default: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  };

  // Handle responsive cols
  let colsClass = '';
  if (typeof cols === 'number') {
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 sm:grid-cols-2',
      3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };
    colsClass = colsMap[cols] || 'grid-cols-1';
  } else if (typeof cols === 'object') {
    colsClass = [
      cols.base && `grid-cols-${cols.base}`,
      cols.sm && `sm:grid-cols-${cols.sm}`,
      cols.md && `md:grid-cols-${cols.md}`,
      cols.lg && `lg:grid-cols-${cols.lg}`,
      cols.xl && `xl:grid-cols-${cols.xl}`,
    ].filter(Boolean).join(' ');
  }

  return (
    <div
      ref={ref}
      className={`
        grid
        ${colsClass}
        ${gapClasses[gap]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Stack layout helper (vertical)
 */
export const Stack = forwardRef(function Stack(
  {
    children,
    className = '',
    gap = 'default', // 'none' | 'xs' | 'sm' | 'default' | 'lg' | 'xl'
    align = 'stretch', // 'start' | 'center' | 'end' | 'stretch'
    ...props
  },
  ref
) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    default: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div
      ref={ref}
      className={`
        flex flex-col
        ${gapClasses[gap]}
        ${alignClasses[align]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Inline layout helper (horizontal)
 */
export const Inline = forwardRef(function Inline(
  {
    children,
    className = '',
    gap = 'default', // 'none' | 'xs' | 'sm' | 'default' | 'lg'
    align = 'center', // 'start' | 'center' | 'end' | 'baseline'
    justify = 'start', // 'start' | 'center' | 'end' | 'between' | 'around'
    wrap = false,
    ...props
  },
  ref
) {
  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    default: 'gap-3',
    lg: 'gap-4',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      ref={ref}
      className={`
        flex
        ${wrap ? 'flex-wrap' : ''}
        ${gapClasses[gap]}
        ${alignClasses[align]}
        ${justifyClasses[justify]}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Divider line
 */
export const Divider = forwardRef(function Divider(
  {
    className = '',
    orientation = 'horizontal', // 'horizontal' | 'vertical'
    spacing = 'default', // 'none' | 'sm' | 'default' | 'lg'
    ...props
  },
  ref
) {
  const spacingClasses = {
    horizontal: {
      none: '',
      sm: 'my-2',
      default: 'my-4',
      lg: 'my-6',
    },
    vertical: {
      none: '',
      sm: 'mx-2',
      default: 'mx-4',
      lg: 'mx-6',
    },
  };

  if (orientation === 'vertical') {
    return (
      <div
        ref={ref}
        className={`
          w-px self-stretch bg-gray-200
          ${spacingClasses.vertical[spacing]}
          ${className}
        `.trim()}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  return (
    <hr
      ref={ref}
      className={`
        border-0 h-px bg-gray-200 w-full
        ${spacingClasses.horizontal[spacing]}
        ${className}
      `.trim()}
      role="separator"
      {...props}
    />
  );
});

/**
 * Convenience wrapper that combines PageLayout with PageHeader
 * Accepts title, description, actions props directly
 */
const PageLayoutWithHeader = forwardRef(function PageLayoutWithHeader(
  {
    title,
    description,
    actions,
    backButton,
    breadcrumbs,
    children,
    className = '',
    maxWidth = 'default',
    padding = 'default',
    ...props
  },
  ref
) {
  // If no title provided, just render basic PageLayout
  if (!title && !description && !actions) {
    return (
      <PageLayout
        ref={ref}
        className={className}
        maxWidth={maxWidth}
        padding={padding}
        {...props}
      >
        {children}
      </PageLayout>
    );
  }

  return (
    <PageLayout
      ref={ref}
      className={className}
      maxWidth={maxWidth}
      padding={padding}
      {...props}
    >
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        backButton={backButton}
        breadcrumbs={breadcrumbs}
      />
      {children}
    </PageLayout>
  );
});

export default PageLayoutWithHeader;
