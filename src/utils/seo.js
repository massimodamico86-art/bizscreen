/**
 * SEO Utilities
 *
 * Centralized metadata configuration for BizScreen pages.
 * Used with the <Seo> component for runtime head management.
 */

// Base URL for canonical links - update per environment
export const BASE_URL = 'https://bizscreen.app';

// Default site name
export const SITE_NAME = 'BizScreen';

// Default social image (placeholder - replace with actual image URL)
export const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/**
 * Page metadata configuration
 * Keys match route paths or page identifiers
 */
export const PAGE_METADATA = {
  // Marketing pages
  home: {
    title: 'BizScreen - Digital Signage for Vacation Rentals',
    description: 'Transform your vacation rental TVs into powerful guest communication tools. Display property info, local recommendations, and custom content with BizScreen.',
    keywords: 'digital signage, vacation rental, hospitality, TV display, guest communication',
  },
  pricing: {
    title: 'Pricing - BizScreen',
    description: 'Simple, transparent pricing for BizScreen digital signage. Start free, scale as you grow. Plans for individual hosts to enterprise property managers.',
    keywords: 'pricing, plans, digital signage cost, vacation rental software',
  },
  features: {
    title: 'Features - BizScreen',
    description: 'Explore BizScreen features: media library, playlists, scheduling, screen management, analytics, and more. Everything you need for professional digital signage.',
    keywords: 'features, digital signage, media library, playlists, scheduling, analytics',
  },

  // Auth pages
  login: {
    title: 'Sign In - BizScreen',
    description: 'Sign in to your BizScreen account to manage your digital signage displays and content.',
    robots: 'noindex, nofollow',
  },
  signup: {
    title: 'Create Account - BizScreen',
    description: 'Create your free BizScreen account and start displaying beautiful content on your vacation rental TVs in minutes.',
    keywords: 'sign up, create account, free trial, digital signage',
  },
  resetPassword: {
    title: 'Reset Password - BizScreen',
    description: 'Reset your BizScreen account password.',
    robots: 'noindex, nofollow',
  },

  // App pages (protected - minimal SEO)
  dashboard: {
    title: 'Dashboard - BizScreen',
    robots: 'noindex, nofollow',
  },
  media: {
    title: 'Media Library - BizScreen',
    robots: 'noindex, nofollow',
  },
  playlists: {
    title: 'Playlists - BizScreen',
    robots: 'noindex, nofollow',
  },
  screens: {
    title: 'Screens - BizScreen',
    robots: 'noindex, nofollow',
  },
  settings: {
    title: 'Settings - BizScreen',
    robots: 'noindex, nofollow',
  },
};

/**
 * Get page title
 * @param {string} pageKey - Key from PAGE_METADATA
 * @returns {string} Page title
 */
export function getPageTitle(pageKey) {
  return PAGE_METADATA[pageKey]?.title || `${SITE_NAME}`;
}

/**
 * Get page description
 * @param {string} pageKey - Key from PAGE_METADATA
 * @returns {string} Page description
 */
export function getPageDescription(pageKey) {
  return PAGE_METADATA[pageKey]?.description || 'Digital signage and TV display management for vacation rentals and hospitality.';
}

/**
 * Get page robots directive
 * @param {string} pageKey - Key from PAGE_METADATA
 * @returns {string} Robots directive
 */
export function getPageRobots(pageKey) {
  return PAGE_METADATA[pageKey]?.robots || 'index, follow';
}

/**
 * Get Open Graph metadata for a page
 * @param {string} pageKey - Key from PAGE_METADATA
 * @param {string} url - Current page URL (optional)
 * @returns {object} Open Graph metadata
 */
export function getOpenGraphMeta(pageKey, url = '') {
  const meta = PAGE_METADATA[pageKey] || {};
  return {
    'og:title': meta.title || SITE_NAME,
    'og:description': meta.description || getPageDescription(pageKey),
    'og:type': 'website',
    'og:url': url || BASE_URL,
    'og:image': meta.ogImage || DEFAULT_OG_IMAGE,
    'og:site_name': SITE_NAME,
  };
}

/**
 * Get Twitter Card metadata for a page
 * @param {string} pageKey - Key from PAGE_METADATA
 * @returns {object} Twitter Card metadata
 */
export function getTwitterMeta(pageKey) {
  const meta = PAGE_METADATA[pageKey] || {};
  return {
    'twitter:card': 'summary_large_image',
    'twitter:title': meta.title || SITE_NAME,
    'twitter:description': meta.description || getPageDescription(pageKey),
    'twitter:image': meta.ogImage || DEFAULT_OG_IMAGE,
  };
}

/**
 * Get canonical URL for a path
 * @param {string} path - URL path (e.g., '/pricing')
 * @returns {string} Full canonical URL
 */
export function getCanonicalUrl(path = '/') {
  // Remove trailing slash except for root
  const cleanPath = path === '/' ? '' : path.replace(/\/$/, '');
  return `${BASE_URL}${cleanPath}`;
}

/**
 * Map route path to page key
 * @param {string} pathname - Current pathname
 * @returns {string} Page key for metadata lookup
 */
export function getPageKeyFromPath(pathname) {
  const pathMap = {
    '/': 'home',
    '/pricing': 'pricing',
    '/features': 'features',
    '/auth/login': 'login',
    '/auth/signup': 'signup',
    '/auth/reset-password': 'resetPassword',
    '/app': 'dashboard',
    '/app/media': 'media',
    '/app/playlists': 'playlists',
    '/app/screens': 'screens',
    '/app/settings': 'settings',
  };

  // Check exact match first
  if (pathMap[pathname]) {
    return pathMap[pathname];
  }

  // Check prefix matches for nested routes
  for (const [path, key] of Object.entries(pathMap)) {
    if (pathname.startsWith(path + '/')) {
      return key;
    }
  }

  return 'home';
}
