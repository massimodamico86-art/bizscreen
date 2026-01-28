/**
 * Skeleton Loading Components
 *
 * Provides animated placeholder UI while content loads.
 * Uses CSS animation for smooth shimmer effect.
 */
import PropTypes from 'prop-types';
import { Card } from '../design-system';

// Base skeleton element with shimmer animation
/**
 *
 * @param root0
 * @param root0.className
 * @param root0.children
 */
export function Skeleton({ className = '', children }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

Skeleton.propTypes = {
  /** Additional CSS classes for sizing/positioning */
  className: PropTypes.string,
  /** Optional children for nested skeletons */
  children: PropTypes.node,
};

Skeleton.defaultProps = {
  className: '',
  children: null,
};

// Text line skeleton
/**
 *
 * @param root0
 * @param root0.width
 * @param root0.height
 * @param root0.className
 */
export function SkeletonText({ width = 'w-full', height = 'h-4', className = '' }) {
  return <Skeleton className={`${width} ${height} ${className}`} />;
}

SkeletonText.propTypes = {
  /** Tailwind width class */
  width: PropTypes.string,
  /** Tailwind height class */
  height: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

SkeletonText.defaultProps = {
  width: 'w-full',
  height: 'h-4',
  className: '',
};

// Circle skeleton (avatars, icons)
/**
 *
 * @param root0
 * @param root0.size
 * @param root0.className
 */
export function SkeletonCircle({ size = 'w-10 h-10', className = '' }) {
  return <Skeleton className={`${size} rounded-full ${className}`} />;
}

SkeletonCircle.propTypes = {
  /** Tailwind size class (width and height) */
  size: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

SkeletonCircle.defaultProps = {
  size: 'w-10 h-10',
  className: '',
};

// Image/media skeleton
/**
 *
 * @param root0
 * @param root0.aspectRatio
 * @param root0.className
 */
export function SkeletonImage({ aspectRatio = 'aspect-video', className = '' }) {
  return <Skeleton className={`${aspectRatio} w-full ${className}`} />;
}

SkeletonImage.propTypes = {
  /** Tailwind aspect ratio class */
  aspectRatio: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

SkeletonImage.defaultProps = {
  aspectRatio: 'aspect-video',
  className: '',
};

// Stat card skeleton
/**
 *
 */
export function SkeletonStatCard() {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start justify-between mb-2">
        <SkeletonText width="w-24" height="h-3" />
        <SkeletonCircle size="w-5 h-5" />
      </div>
      <SkeletonText width="w-20" height="h-8" className="mb-2" />
      <SkeletonText width="w-32" height="h-3" />
    </Card>
  );
}

// Dashboard stats row skeleton
/**
 *
 * @param root0
 * @param root0.count
 */
export function SkeletonDashboardStats({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

SkeletonDashboardStats.propTypes = {
  /** Number of stat cards to show */
  count: PropTypes.number,
};

SkeletonDashboardStats.defaultProps = {
  count: 4,
};

// Table row skeleton
/**
 *
 * @param root0
 * @param root0.columns
 */
export function SkeletonTableRow({ columns = 4 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <SkeletonText width={i === 0 ? 'w-32' : 'w-20'} height="h-4" />
        </td>
      ))}
    </tr>
  );
}

SkeletonTableRow.propTypes = {
  /** Number of columns in the row */
  columns: PropTypes.number,
};

SkeletonTableRow.defaultProps = {
  columns: 4,
};

// Table skeleton
/**
 *
 * @param root0
 * @param root0.rows
 * @param root0.columns
 */
export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <SkeletonText width="w-20" height="h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

SkeletonTable.propTypes = {
  /** Number of rows to show */
  rows: PropTypes.number,
  /** Number of columns per row */
  columns: PropTypes.number,
};

SkeletonTable.defaultProps = {
  rows: 5,
  columns: 4,
};

// List item skeleton
/**
 *
 * @param root0
 * @param root0.hasImage
 * @param root0.hasActions
 */
export function SkeletonListItem({ hasImage = false, hasActions = true }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0">
      {hasImage && <SkeletonImage aspectRatio="aspect-video" className="w-24 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <SkeletonText width="w-48" height="h-4" className="mb-2" />
        <SkeletonText width="w-32" height="h-3" />
      </div>
      {hasActions && (
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      )}
    </div>
  );
}

SkeletonListItem.propTypes = {
  /** Show image placeholder */
  hasImage: PropTypes.bool,
  /** Show action button placeholders */
  hasActions: PropTypes.bool,
};

SkeletonListItem.defaultProps = {
  hasImage: false,
  hasActions: true,
};

// List skeleton
/**
 *
 * @param root0
 * @param root0.count
 * @param root0.hasImage
 * @param root0.hasActions
 */
export function SkeletonList({ count = 5, hasImage = false, hasActions = true }) {
  return (
    <Card className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} hasImage={hasImage} hasActions={hasActions} />
      ))}
    </Card>
  );
}

SkeletonList.propTypes = {
  /** Number of list items to show */
  count: PropTypes.number,
  /** Show image placeholders */
  hasImage: PropTypes.bool,
  /** Show action button placeholders */
  hasActions: PropTypes.bool,
};

SkeletonList.defaultProps = {
  count: 5,
  hasImage: false,
  hasActions: true,
};

// Card grid skeleton (for media, screens, playlists)
/**
 *
 * @param root0
 * @param root0.count
 * @param root0.columns
 */
export function SkeletonCardGrid({ count = 6, columns = 'grid-cols-2 md:grid-cols-3' }) {
  return (
    <div className={`grid ${columns} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <SkeletonImage aspectRatio="aspect-video" />
          <div className="p-3">
            <SkeletonText width="w-3/4" height="h-4" className="mb-2" />
            <SkeletonText width="w-1/2" height="h-3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

SkeletonCardGrid.propTypes = {
  /** Number of cards to show */
  count: PropTypes.number,
  /** Tailwind grid column classes */
  columns: PropTypes.string,
};

SkeletonCardGrid.defaultProps = {
  count: 6,
  columns: 'grid-cols-2 md:grid-cols-3',
};

// Screen card skeleton
/**
 *
 */
export function SkeletonScreenCard() {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <SkeletonImage aspectRatio="aspect-video" />
        <div className="absolute top-2 right-2">
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>
      </div>
      <div className="p-3">
        <SkeletonText width="w-32" height="h-4" className="mb-2" />
        <SkeletonText width="w-24" height="h-3" className="mb-1" />
        <SkeletonText width="w-20" height="h-3" />
      </div>
    </Card>
  );
}

// Screen grid skeleton
/**
 *
 * @param root0
 * @param root0.count
 */
export function SkeletonScreenGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonScreenCard key={i} />
      ))}
    </div>
  );
}

SkeletonScreenGrid.propTypes = {
  /** Number of screen cards to show */
  count: PropTypes.number,
};

SkeletonScreenGrid.defaultProps = {
  count: 6,
};

// Form skeleton
/**
 *
 * @param root0
 * @param root0.fields
 */
export function SkeletonForm({ fields = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <SkeletonText width="w-24" height="h-3" className="mb-2" />
          <Skeleton className="w-full h-10 rounded-lg" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="w-24 h-10 rounded-lg" />
        <Skeleton className="w-20 h-10 rounded-lg" />
      </div>
    </div>
  );
}

SkeletonForm.propTypes = {
  /** Number of form fields to show */
  fields: PropTypes.number,
};

SkeletonForm.defaultProps = {
  fields: 3,
};

// Page header skeleton
/**
 *
 * @param root0
 * @param root0.hasActions
 */
export function SkeletonPageHeader({ hasActions = true }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <SkeletonText width="w-48" height="h-7" className="mb-2" />
        <SkeletonText width="w-64" height="h-4" />
      </div>
      {hasActions && (
        <div className="flex gap-2">
          <Skeleton className="w-32 h-10 rounded-lg" />
        </div>
      )}
    </div>
  );
}

SkeletonPageHeader.propTypes = {
  /** Show action button placeholders */
  hasActions: PropTypes.bool,
};

SkeletonPageHeader.defaultProps = {
  hasActions: true,
};

// Analytics chart skeleton
/**
 *
 * @param root0
 * @param root0.height
 */
export function SkeletonChart({ height = 'h-64' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <SkeletonText width="w-32" height="h-5" />
        <div className="flex gap-2">
          <Skeleton className="w-20 h-8 rounded" />
          <Skeleton className="w-20 h-8 rounded" />
        </div>
      </div>
      <Skeleton className={`w-full ${height} rounded-lg`} />
    </Card>
  );
}

SkeletonChart.propTypes = {
  /** Tailwind height class for chart area */
  height: PropTypes.string,
};

SkeletonChart.defaultProps = {
  height: 'h-64',
};

// Sidebar skeleton
/**
 *
 */
export function SkeletonSidebar() {
  return (
    <div className="w-64 h-full bg-gray-50 p-4 space-y-2">
      <Skeleton className="w-32 h-8 rounded-lg mb-6" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="w-full h-10 rounded-lg" />
      ))}
    </div>
  );
}

// Full page loading skeleton
/**
 *
 */
export function SkeletonPage() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonDashboardStats />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

// Export all components
export default {
  Skeleton,
  SkeletonText,
  SkeletonCircle,
  SkeletonImage,
  SkeletonStatCard,
  SkeletonDashboardStats,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonListItem,
  SkeletonList,
  SkeletonCardGrid,
  SkeletonScreenCard,
  SkeletonScreenGrid,
  SkeletonForm,
  SkeletonPageHeader,
  SkeletonChart,
  SkeletonSidebar,
  SkeletonPage,
};
