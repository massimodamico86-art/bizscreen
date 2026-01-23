/**
 * API Version Service
 *
 * Provides API versioning support for external integrations.
 * Handles version routing, deprecation warnings, and API key validation.
 */

import { supabase } from '../supabase';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('ApiVersionService');

// API Version configuration
export const API_VERSIONS = {
  v1: {
    version: '1.0.0',
    released: '2026-01-01',
    status: 'current', // current, deprecated, sunset
    deprecationDate: null,
    sunsetDate: null,
  },
  // Future versions can be added here
  // v2: {
  //   version: '2.0.0',
  //   released: '2026-06-01',
  //   status: 'current',
  //   deprecationDate: null,
  //   sunsetDate: null,
  // },
};

// Current default version
export const DEFAULT_VERSION = 'v1';
export const LATEST_VERSION = 'v1';

// Version-specific route prefixes
export const getApiPrefix = (version = DEFAULT_VERSION) => `/api/${version}`;

/**
 * API response wrapper with version metadata
 */
export function createApiResponse(data, options = {}) {
  const {
    version = DEFAULT_VERSION,
    deprecationWarning = null,
    meta = {},
  } = options;

  const versionInfo = API_VERSIONS[version];

  const response = {
    data,
    meta: {
      apiVersion: version,
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  // Add deprecation headers if version is deprecated
  if (versionInfo?.status === 'deprecated') {
    response.meta.deprecationWarning = deprecationWarning || {
      message: `API version ${version} is deprecated. Please migrate to ${LATEST_VERSION}.`,
      deprecatedOn: versionInfo.deprecationDate,
      sunsetDate: versionInfo.sunsetDate,
      migrationGuide: `https://docs.bizscreen.app/api/migration/${version}-to-${LATEST_VERSION}`,
    };
  }

  return response;
}

/**
 * Validate API version
 */
export function isValidVersion(version) {
  return version in API_VERSIONS;
}

/**
 * Check if version is active (not sunset)
 */
export function isVersionActive(version) {
  const info = API_VERSIONS[version];
  if (!info) return false;
  if (info.status === 'sunset') return false;
  if (info.sunsetDate && new Date(info.sunsetDate) < new Date()) return false;
  return true;
}

/**
 * Get version status with details
 */
export function getVersionStatus(version) {
  const info = API_VERSIONS[version];
  if (!info) {
    return { valid: false, error: 'Unknown API version' };
  }

  const now = new Date();
  let status = info.status;

  // Check if deprecated date has passed
  if (info.deprecationDate && new Date(info.deprecationDate) < now && status === 'current') {
    status = 'deprecated';
  }

  // Check if sunset date has passed
  if (info.sunsetDate && new Date(info.sunsetDate) < now) {
    status = 'sunset';
  }

  return {
    valid: true,
    version: info.version,
    status,
    released: info.released,
    deprecationDate: info.deprecationDate,
    sunsetDate: info.sunsetDate,
    isDeprecated: status === 'deprecated',
    isSunset: status === 'sunset',
    daysUntilSunset: info.sunsetDate
      ? Math.ceil((new Date(info.sunsetDate) - now) / (1000 * 60 * 60 * 24))
      : null,
  };
}

/**
 * Parse API version from request path or header
 */
export function parseVersion(pathOrHeader) {
  // Check for version in path (e.g., /api/v1/...)
  const pathMatch = pathOrHeader?.match(/\/api\/(v\d+)\//);
  if (pathMatch && isValidVersion(pathMatch[1])) {
    return pathMatch[1];
  }

  // Check for version header (e.g., X-API-Version: v1)
  if (pathOrHeader?.startsWith('v') && isValidVersion(pathOrHeader)) {
    return pathOrHeader;
  }

  // Default to latest
  return DEFAULT_VERSION;
}

/**
 * Generate version-specific headers for responses
 */
export function getVersionHeaders(version) {
  const status = getVersionStatus(version);
  const headers = {
    'X-API-Version': version,
    'X-API-Version-Status': status.status,
  };

  if (status.isDeprecated) {
    headers['Deprecation'] = `date="${status.deprecationDate}"`;
    headers['Sunset'] = status.sunsetDate;
    headers['Link'] = `<https://docs.bizscreen.app/api/migration/${version}-to-${LATEST_VERSION}>; rel="successor-version"`;
  }

  return headers;
}

/**
 * API endpoint registry for versioned routes
 */
const endpointRegistry = new Map();

/**
 * Register an API endpoint with version support
 */
export function registerEndpoint(path, versions) {
  endpointRegistry.set(path, versions);
}

/**
 * Get endpoint handler for a specific version
 */
export function getEndpointHandler(path, version) {
  const versions = endpointRegistry.get(path);
  if (!versions) return null;

  // Try exact version match
  if (versions[version]) {
    return versions[version];
  }

  // Fallback to latest available version
  const availableVersions = Object.keys(versions).sort().reverse();
  for (const v of availableVersions) {
    if (v <= version) {
      return versions[v];
    }
  }

  return null;
}

// Standard v1 API endpoints
export const V1_ENDPOINTS = {
  // Screens
  'GET /screens': { path: '/api/v1/screens', scopes: ['screens:read'] },
  'GET /screens/:id': { path: '/api/v1/screens/:id', scopes: ['screens:read'] },

  // Playlists
  'GET /playlists': { path: '/api/v1/playlists', scopes: ['playlists:read'] },
  'GET /playlists/:id': { path: '/api/v1/playlists/:id', scopes: ['playlists:read'] },
  'POST /playlists': { path: '/api/v1/playlists', scopes: ['playlists:write'] },
  'PUT /playlists/:id': { path: '/api/v1/playlists/:id', scopes: ['playlists:write'] },
  'DELETE /playlists/:id': { path: '/api/v1/playlists/:id', scopes: ['playlists:write'] },

  // Campaigns
  'GET /campaigns': { path: '/api/v1/campaigns', scopes: ['campaigns:read'] },
  'GET /campaigns/:id': { path: '/api/v1/campaigns/:id', scopes: ['campaigns:read'] },
  'POST /campaigns': { path: '/api/v1/campaigns', scopes: ['campaigns:write'] },
  'PUT /campaigns/:id': { path: '/api/v1/campaigns/:id', scopes: ['campaigns:write'] },
  'POST /campaigns/:id/activate': { path: '/api/v1/campaigns/:id/activate', scopes: ['campaigns:write'] },
  'POST /campaigns/:id/deactivate': { path: '/api/v1/campaigns/:id/deactivate', scopes: ['campaigns:write'] },

  // Media
  'GET /media': { path: '/api/v1/media', scopes: ['media:read'] },
  'GET /media/:id': { path: '/api/v1/media/:id', scopes: ['media:read'] },
  'POST /media': { path: '/api/v1/media', scopes: ['media:write'] },
  'DELETE /media/:id': { path: '/api/v1/media/:id', scopes: ['media:write'] },

  // Apps
  'GET /apps': { path: '/api/v1/apps', scopes: ['apps:read'] },
  'GET /apps/:id': { path: '/api/v1/apps/:id', scopes: ['apps:read'] },
  'PUT /apps/:id': { path: '/api/v1/apps/:id', scopes: ['apps:write'] },
};

/**
 * Check if token has required scopes for an endpoint
 */
export function hasRequiredScopes(tokenScopes, requiredScopes) {
  if (!requiredScopes || requiredScopes.length === 0) return true;

  return requiredScopes.every(required => {
    // Check exact match
    if (tokenScopes.includes(required)) return true;

    // Check wildcard (e.g., "playlists:*" matches "playlists:read")
    const [resource] = required.split(':');
    if (tokenScopes.includes(`${resource}:*`)) return true;

    // Check admin/full access
    if (tokenScopes.includes('*')) return true;

    return false;
  });
}

/**
 * Log API request for analytics
 */
export async function logApiRequest({
  tokenId,
  endpoint,
  method,
  version,
  statusCode,
  latencyMs,
  error = null,
}) {
  try {
    await supabase.from('api_request_logs').insert({
      token_id: tokenId,
      endpoint,
      method,
      api_version: version,
      status_code: statusCode,
      latency_ms: latencyMs,
      error_message: error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Silently fail - don't break requests due to logging errors
    logger.warn('Failed to log API request:', { data: err });
  }
}

export default {
  API_VERSIONS,
  DEFAULT_VERSION,
  LATEST_VERSION,
  getApiPrefix,
  createApiResponse,
  isValidVersion,
  isVersionActive,
  getVersionStatus,
  parseVersion,
  getVersionHeaders,
  registerEndpoint,
  getEndpointHandler,
  V1_ENDPOINTS,
  hasRequiredScopes,
  logApiRequest,
};
