/**
 * usePrefetch Hook
 *
 * Provides utilities for prefetching data and code before navigation.
 * Helps reduce perceived latency by loading likely next pages/data.
 */

import { useCallback, useEffect, useRef } from 'react';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('usePrefetch');
import { prefetch as prefetchData, cacheKeys } from './useDataCache';
import { supabase } from '../supabase';

// Track prefetched routes to avoid duplicate work
const prefetchedRoutes = new Set();
const prefetchedData = new Set();

// Lazy imports for code prefetching (matches App.jsx lazy imports)
const pageImports = {
  dashboard: () => import('../pages/DashboardPage'),
  screens: () => import('../pages/ScreensPage'),
  playlists: () => import('../pages/PlaylistsPage'),
  media: () => import('../pages/MediaLibraryPage'),
  layouts: () => import('../pages/LayoutsPage'),
  schedules: () => import('../pages/SchedulesPage'),
  apps: () => import('../pages/AppsPage'),
  campaigns: () => import('../pages/CampaignsPage'),
  analytics: () => import('../pages/AnalyticsPage'),
  templates: () => import('../pages/TemplatesPage'),
  settings: () => import('../pages/SettingsPage'),
  team: () => import('../pages/TeamPage'),
  locations: () => import('../pages/LocationsPage'),
  help: () => import('../pages/HelpCenterPage'),
  plan: () => import('../pages/AccountPlanPage'),
};

/**
 * Prefetch a page's JavaScript bundle
 * @param {string} pageName - Name of the page to prefetch
 */
export function prefetchPage(pageName) {
  if (prefetchedRoutes.has(pageName)) return;

  const importer = pageImports[pageName];
  if (importer) {
    prefetchedRoutes.add(pageName);
    // Low-priority prefetch using requestIdleCallback
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importer(), { timeout: 2000 });
    } else {
      setTimeout(() => importer(), 100);
    }
  }
}

/**
 * Data fetchers for common pages
 */
const dataFetchers = {
  // Dashboard stats
  dashboardStats: async (tenantId) => {
    const { data } = await supabase
      .from('tv_devices')
      .select('id, is_online')
      .eq('tenant_id', tenantId);
    return data;
  },

  // Screens list
  screensList: async (tenantId) => {
    const { data } = await supabase
      .from('tv_devices')
      .select('id, name, is_online, last_seen_at, playlist_id, location_id')
      .eq('tenant_id', tenantId)
      .order('name');
    return data;
  },

  // Playlists list
  playlistsList: async (tenantId) => {
    const { data } = await supabase
      .from('playlists')
      .select('id, name, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('name');
    return data;
  },

  // Media assets summary
  mediaSummary: async (tenantId) => {
    const { count } = await supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);
    return { count };
  },

  // Templates (public)
  templates: async () => {
    const { data } = await supabase
      .from('templates')
      .select('id, name, category, thumbnail_url')
      .eq('is_public', true)
      .order('category')
      .limit(50);
    return data;
  },

  // Help topics
  helpTopics: async () => {
    const { data } = await supabase
      .from('help_topics')
      .select('id, title, category, slug')
      .order('category')
      .order('display_order');
    return data;
  },
};

/**
 * Prefetch data for a specific page
 * @param {string} pageName - Name of the page
 * @param {string} tenantId - Current tenant ID
 */
export async function prefetchPageData(pageName, tenantId) {
  const key = `${pageName}:${tenantId || 'global'}`;
  if (prefetchedData.has(key)) return;

  prefetchedData.add(key);

  try {
    switch (pageName) {
      case 'dashboard':
        await Promise.all([
          prefetchData(cacheKeys.dashboardStats(tenantId), () => dataFetchers.dashboardStats(tenantId)),
          prefetchData(cacheKeys.screensList(tenantId), () => dataFetchers.screensList(tenantId)),
        ]);
        break;

      case 'screens':
        await prefetchData(cacheKeys.screensList(tenantId), () => dataFetchers.screensList(tenantId));
        break;

      case 'playlists':
        await prefetchData(cacheKeys.playlistsList(tenantId), () => dataFetchers.playlistsList(tenantId));
        break;

      case 'media':
        await prefetchData(cacheKeys.mediaAssets(tenantId), () => dataFetchers.mediaSummary(tenantId));
        break;

      case 'templates':
        await prefetchData(cacheKeys.templates(), () => dataFetchers.templates());
        break;

      case 'help':
        await prefetchData(cacheKeys.helpTopics(), () => dataFetchers.helpTopics());
        break;

      default:
        break;
    }
  } catch (err) {
    logger.warn(`Prefetch failed for ${pageName}:`, err.message);
  }
}

/**
 * usePrefetch - Hook for prefetching pages and data
 *
 * @param {string} tenantId - Current tenant ID for data prefetching
 * @returns {Object} Prefetch utilities
 */
export function usePrefetch(tenantId) {
  const tenantIdRef = useRef(tenantId);
  tenantIdRef.current = tenantId;

  /**
   * Prefetch on hover/focus (for nav items)
   */
  const prefetchOnHover = useCallback((pageName) => {
    return {
      onMouseEnter: () => {
        prefetchPage(pageName);
        if (tenantIdRef.current) {
          prefetchPageData(pageName, tenantIdRef.current);
        }
      },
      onFocus: () => {
        prefetchPage(pageName);
        if (tenantIdRef.current) {
          prefetchPageData(pageName, tenantIdRef.current);
        }
      },
    };
  }, []);

  /**
   * Prefetch multiple pages (for sidebar)
   */
  const prefetchPages = useCallback((pageNames) => {
    // Use idle callback to avoid blocking
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        pageNames.forEach(prefetchPage);
      }, { timeout: 3000 });
    } else {
      setTimeout(() => {
        pageNames.forEach(prefetchPage);
      }, 500);
    }
  }, []);

  /**
   * Prefetch critical data on mount
   */
  const prefetchCriticalData = useCallback(() => {
    if (!tenantIdRef.current) return;

    // Prefetch most commonly visited pages' data
    const criticalPages = ['dashboard', 'screens', 'playlists'];

    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        criticalPages.forEach((page) => {
          prefetchPageData(page, tenantIdRef.current);
        });
      }, { timeout: 5000 });
    } else {
      setTimeout(() => {
        criticalPages.forEach((page) => {
          prefetchPageData(page, tenantIdRef.current);
        });
      }, 1000);
    }
  }, []);

  return {
    prefetchPage,
    prefetchPageData: (pageName) => prefetchPageData(pageName, tenantIdRef.current),
    prefetchOnHover,
    prefetchPages,
    prefetchCriticalData,
  };
}

/**
 * usePrefetchOnMount - Prefetch likely navigation targets when component mounts
 *
 * @param {string[]} pageNames - Pages to prefetch
 * @param {string} tenantId - Tenant ID for data prefetching
 */
export function usePrefetchOnMount(pageNames, tenantId) {
  useEffect(() => {
    // Delay prefetching to prioritize current page load
    const timer = setTimeout(() => {
      pageNames.forEach((pageName) => {
        prefetchPage(pageName);
        if (tenantId) {
          prefetchPageData(pageName, tenantId);
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [pageNames, tenantId]);
}

/**
 * Clear prefetch tracking (useful for logout)
 */
export function clearPrefetchCache() {
  prefetchedRoutes.clear();
  prefetchedData.clear();
}

export default usePrefetch;
