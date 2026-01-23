/**
 * Help Service
 *
 * Provides access to help center content and contextual help.
 *
 * @module services/helpService
 */
import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('HelpService');

/**
 * Help topic categories
 */
export const HELP_CATEGORIES = [
  {
    id: 'getting_started',
    label: 'Getting Started',
    icon: 'Rocket',
    description: 'Learn the basics of BizScreen'
  },
  {
    id: 'screens',
    label: 'Screens & Players',
    icon: 'Monitor',
    description: 'Set up and manage display devices'
  },
  {
    id: 'playlists',
    label: 'Playlists',
    icon: 'ListVideo',
    description: 'Create and manage content playlists'
  },
  {
    id: 'layouts',
    label: 'Layouts',
    icon: 'Layout',
    description: 'Design multi-zone displays'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: 'Zap',
    description: 'Run promotional campaigns'
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: 'LayoutTemplate',
    description: 'Use pre-built content templates'
  },
  {
    id: 'billing',
    label: 'Billing & Plans',
    icon: 'CreditCard',
    description: 'Manage subscription and payments'
  }
];

/**
 * Page-to-category mapping for contextual help
 */
const PAGE_CATEGORY_MAP = {
  'dashboard': 'getting_started',
  'media-all': 'getting_started',
  'media-images': 'getting_started',
  'media-videos': 'getting_started',
  'screens': 'screens',
  'playlists': 'playlists',
  'layouts': 'layouts',
  'schedules': 'playlists',
  'campaigns': 'campaigns',
  'templates': 'templates',
  'account-plan': 'billing',
  'settings': 'billing'
};

/**
 * Search help topics
 * @param {string} [query] - Search query
 * @param {string} [category] - Filter by category
 * @returns {Promise<Array>}
 */
export async function searchHelpTopics(query = null, category = null) {
  const { data, error } = await supabase.rpc('search_help_topics', {
    p_query: query,
    p_category: category
  });

  if (error) {
    logger.error('Error searching help topics:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Get a specific help topic by slug
 * @param {string} slug - Topic slug
 * @returns {Promise<Object|null>}
 */
export async function getHelpTopic(slug) {
  const { data, error } = await supabase.rpc('get_help_topic', {
    p_slug: slug
  });

  if (error) {
    logger.error('Error getting help topic:', { error: error });
    return null;
  }

  return data?.[0] || null;
}

/**
 * Get contextual help for a specific page/route
 * @param {string} route - Current page route
 * @returns {Promise<Array>}
 */
export async function getContextualHelp(route) {
  const { data, error } = await supabase.rpc('get_contextual_help', {
    p_route: route
  });

  if (error) {
    logger.error('Error getting contextual help:', { error: error });
    return [];
  }

  return data || [];
}

/**
 * Get all topics for a category
 * @param {string} category - Category ID
 * @returns {Promise<Array>}
 */
export async function getTopicsByCategory(category) {
  return searchHelpTopics(null, category);
}

/**
 * Get category info for a page
 * @param {string} pageId - Current page ID
 * @returns {Object|null}
 */
export function getCategoryForPage(pageId) {
  const categoryId = PAGE_CATEGORY_MAP[pageId];
  if (!categoryId) return null;

  return HELP_CATEGORIES.find(c => c.id === categoryId) || null;
}

/**
 * Get quick tips for a page (static content for common pages)
 * @param {string} pageId - Current page ID
 * @returns {Array}
 */
export function getQuickTips(pageId) {
  const tips = {
    'dashboard': [
      'Your dashboard shows an overview of all your screens and content',
      'Click on any stat card to dive into details',
      'Use the quick actions to create new content'
    ],
    'screens': [
      'Add a screen by clicking the "Add Screen" button',
      'Pair your device using the QR code or pairing code',
      'Drag content to a screen to assign it'
    ],
    'playlists': [
      'Create playlists to organize your content',
      'Drag media items to reorder them',
      'Set custom durations for each item'
    ],
    'layouts': [
      'Layouts let you show multiple content zones',
      'Choose from pre-built templates or create custom',
      'Each zone can display different content'
    ],
    'campaigns': [
      'Campaigns are time-limited promotions',
      'Set start and end dates for automatic scheduling',
      'Track performance with campaign analytics'
    ],
    'media-all': [
      'Upload images, videos, and other content here',
      'Use folders and tags to organize your library',
      'Drag files directly onto the page to upload'
    ],
    'account-plan': [
      'View your current plan and usage limits',
      'Upgrade to access more features and screens',
      'Manage billing through the Stripe portal'
    ]
  };

  return tips[pageId] || [];
}

/**
 * Fallback help content when database is unavailable
 */
export const FALLBACK_HELP_CONTENT = {
  getting_started: {
    title: 'Getting Started',
    content: `
## Welcome to BizScreen

BizScreen makes it easy to manage digital signage across all your locations.

### Quick Start

1. **Add Your Media** - Upload images and videos
2. **Create a Playlist** - Organize content for playback
3. **Set Up a Screen** - Register your display
4. **Pair Your Device** - Connect and start playing

For more help, contact support@bizscreen.io
    `
  },
  screens: {
    title: 'Screens & Players',
    content: `
## Managing Screens

### Adding a Screen
1. Go to Screens from the sidebar
2. Click Add Screen
3. Enter a name and location
4. Use the pairing code to connect your device

### Screen Status
- **Online**: Connected and playing
- **Offline**: Not connected
- **Pending**: Waiting for pairing
    `
  },
  playlists: {
    title: 'Playlists',
    content: `
## Creating Playlists

Playlists are ordered collections of media.

### Steps
1. Go to Playlists
2. Click Create Playlist
3. Add media items
4. Set durations and transitions
5. Assign to screens
    `
  }
};

/**
 * Get static help content as fallback
 * @param {string} categoryId - Category ID
 * @returns {Object|null}
 */
export function getFallbackContent(categoryId) {
  return FALLBACK_HELP_CONTENT[categoryId] || null;
}
