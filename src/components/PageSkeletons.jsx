/**
 * Page-Type Skeleton Loaders
 *
 * Composes base Skeleton primitives into page-layout-appropriate
 * loading placeholders. Each variant matches the actual structure
 * of its target page type (cards, tables, grids, forms, editors).
 */
import {
  Skeleton,
  SkeletonPageHeader,
  SkeletonDashboardStats,
  SkeletonChart,
  SkeletonTable,
  SkeletonCardGrid,
  SkeletonScreenGrid,
  SkeletonForm,
  SkeletonPage,
} from './Skeleton';

// Dashboard: stats row + charts + table
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonDashboardStats count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonTable rows={5} columns={4} />
      </div>
    </div>
  );
}

// Card pages: media, screens (generic), apps, playlists, scenes, menu-boards, etc.
export function CardPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={6} columns="grid-cols-2 md:grid-cols-3" />
    </div>
  );
}

// Table pages: admin lists, audit logs, activity, team
export function TablePageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

// Grid pages: templates, marketplace (denser grid)
export function GridPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonCardGrid count={8} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
    </div>
  );
}

// Form pages: settings, branding, developer, white-label
export function FormPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader hasActions={false} />
      <SkeletonForm fields={5} />
    </div>
  );
}

// Editor pages: layout, playlist, schedule, SVG, scene editors
export function EditorSkeleton() {
  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-2 flex-shrink-0">
        <Skeleton className="w-32 h-8 rounded-lg mb-6" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-10 rounded-lg" />
        ))}
      </div>
      {/* Main editor area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-gray-200 bg-white px-4 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
          <Skeleton className="w-8 h-8 rounded" />
          <div className="flex-1" />
          <Skeleton className="w-24 h-8 rounded-lg" />
        </div>
        {/* Canvas area */}
        <div className="flex-1 p-6">
          <Skeleton className="w-full h-96 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Screens page: uses screen-specific cards with status badges
export function ScreensPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonScreenGrid count={6} />
    </div>
  );
}

// Analytics pages: stats + charts (no table)
export function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <SkeletonPageHeader />
      <SkeletonDashboardStats count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}

/**
 * Maps a page ID to the appropriate skeleton component.
 * Dynamic routes (editors) are matched by prefix.
 * Falls back to the generic SkeletonPage for unknown pages.
 */
export function getSkeletonForPage(pageId) {
  // Static page mappings
  const skeletonMap = {
    // Dashboard variants
    dashboard: DashboardSkeleton,
    welcome: DashboardSkeleton,

    // Card pages (media, content, devices)
    'media-all': CardPageSkeleton,
    'media-images': CardPageSkeleton,
    'media-videos': CardPageSkeleton,
    'media-audio': CardPageSkeleton,
    'media-documents': CardPageSkeleton,
    'media-webpages': CardPageSkeleton,
    apps: CardPageSkeleton,
    playlists: CardPageSkeleton,
    scenes: CardPageSkeleton,
    'menu-boards': CardPageSkeleton,
    campaigns: CardPageSkeleton,
    'data-sources': CardPageSkeleton,
    'review-inbox': CardPageSkeleton,
    'social-accounts': CardPageSkeleton,
    'content-moderation': CardPageSkeleton,
    alerts: CardPageSkeleton,
    'screen-groups': CardPageSkeleton,
    'video-walls': CardPageSkeleton,

    // Screens page (status badge cards)
    screens: ScreensPageSkeleton,

    // Grid pages (templates)
    templates: GridPageSkeleton,
    'svg-templates': GridPageSkeleton,
    'template-marketplace': GridPageSkeleton,

    // Table pages (admin, management)
    'admin-tenants': TablePageSkeleton,
    'admin-audit-logs': TablePageSkeleton,
    'admin-system-events': TablePageSkeleton,
    'admin-templates': TablePageSkeleton,
    activity: TablePageSkeleton,
    team: TablePageSkeleton,
    locations: TablePageSkeleton,
    clients: TablePageSkeleton,
    'feature-flags': TablePageSkeleton,
    listings: TablePageSkeleton,

    // Form pages (settings)
    settings: FormPageSkeleton,
    branding: FormPageSkeleton,
    developer: FormPageSkeleton,
    'white-label': FormPageSkeleton,
    'enterprise-security': FormPageSkeleton,
    'account-plan': FormPageSkeleton,
    'notification-settings': FormPageSkeleton,
    usage: FormPageSkeleton,

    // Analytics pages
    analytics: AnalyticsSkeleton,
    'content-performance': AnalyticsSkeleton,
    'analytics-dashboard': AnalyticsSkeleton,
    'proof-of-play': AnalyticsSkeleton,

    // Generic fallback pages
    help: SkeletonPage,
    status: SkeletonPage,
    'ops-console': SkeletonPage,
    'demo-tools': SkeletonPage,
    security: SkeletonPage,
    translations: SkeletonPage,
    'reseller-dashboard': SkeletonPage,
    'reseller-billing': SkeletonPage,
    'device-diagnostics': SkeletonPage,
    'service-quality': SkeletonPage,
    assistant: SkeletonPage,
    'admin-test': SkeletonPage,
    'tenant-admin': SkeletonPage,
  };

  // Check static map first
  if (skeletonMap[pageId]) {
    return skeletonMap[pageId];
  }

  // Check dynamic route prefixes (editors)
  const editorPrefixes = [
    'playlist-editor-',
    'layout-editor-',
    'schedule-editor-',
    'scene-editor-',
    'campaign-editor-',
    'admin-template-',
    'admin-tenant-',
    'design-editor',
    'svg-editor',
    'yodeck-layout-',
  ];

  for (const prefix of editorPrefixes) {
    if (pageId.startsWith(prefix)) {
      return EditorSkeleton;
    }
  }

  // Also match detail pages that aren't editors
  if (pageId.startsWith('scene-detail-') || pageId.startsWith('screen-group-detail-')) {
    return CardPageSkeleton;
  }

  // Default fallback
  return SkeletonPage;
}
