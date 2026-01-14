/**
 * Service Worker for BizScreen TV Player
 * Provides offline support through caching strategies
 *
 * Capabilities:
 * - Cache app shell (Player bundle)
 * - Runtime caching for scenes, images, videos
 * - Offline fallback to cached content
 * - Background sync for missed heartbeats
 */

const CACHE_VERSION = 'bizscreen-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MEDIA_CACHE = `${CACHE_VERSION}-media`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/player',
  '/index.html',
];

// URL patterns for different cache strategies
const CACHE_PATTERNS = {
  // Scene JSON from Supabase
  scenes: /\/rest\/v1\/scenes|\/rpc\/get_scene_for_caching/,
  // Media files (images, videos)
  media: /\.(jpg|jpeg|png|gif|webp|mp4|webm|svg)($|\?)/i,
  // CDN content (Cloudinary, etc)
  cdn: /cloudinary\.com|res\.cloudinary\.com|cdn\.|images\./,
  // API calls that should not be cached
  api: /\/rest\/v1\/|\/auth\/|\/rpc\//,
};

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('bizscreen-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== MEDIA_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different request types with appropriate strategies
  if (CACHE_PATTERNS.media.test(url.pathname) || CACHE_PATTERNS.cdn.test(url.hostname)) {
    // Media: Cache-first strategy
    event.respondWith(cacheFirst(event.request, MEDIA_CACHE));
  } else if (CACHE_PATTERNS.scenes.test(url.pathname)) {
    // Scenes: Network-first with cache fallback
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
  } else if (CACHE_PATTERNS.api.test(url.pathname)) {
    // API: Network-only (don't cache)
    event.respondWith(networkOnly(event.request));
  } else {
    // Default: Stale-while-revalidate
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
  }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache-first strategy
 * Best for static assets that don't change often (images, videos)
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('[SW] Cache hit:', request.url);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Clone the response before caching
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network failed for cache-first:', error);
    return new Response('Offline - Resource not cached', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network-first strategy
 * Best for dynamic content that needs fresh data (scenes)
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, checking cache:', request.url);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    return new Response(JSON.stringify({ error: 'Offline - No cached data' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Network-only strategy
 * For requests that should never be cached (API calls)
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Stale-while-revalidate strategy
 * Best for assets that can be slightly stale (app shell)
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Start network fetch in background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise || new Response('Offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'CACHE_MEDIA':
      handleCacheMedia(payload, event);
      break;

    case 'CACHE_SCENE':
      handleCacheScene(payload, event);
      break;

    case 'CLEAR_CACHE':
      handleClearCache(event);
      break;

    case 'GET_CACHE_SIZE':
      handleGetCacheSize(event);
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Cache media files on demand
 */
async function handleCacheMedia(urls, event) {
  if (!urls || !Array.isArray(urls)) {
    event.ports[0]?.postMessage({ success: false, error: 'Invalid URLs' });
    return;
  }

  const cache = await caches.open(MEDIA_CACHE);
  let cached = 0;
  let failed = 0;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
        cached++;
      } else {
        failed++;
      }
    } catch (error) {
      console.warn('[SW] Failed to cache media:', url, error);
      failed++;
    }
  }

  event.ports[0]?.postMessage({
    success: true,
    cached,
    failed,
    total: urls.length
  });
}

/**
 * Cache scene JSON data
 */
async function handleCacheScene(sceneData, event) {
  if (!sceneData || !sceneData.id) {
    event.ports[0]?.postMessage({ success: false, error: 'Invalid scene data' });
    return;
  }

  const cache = await caches.open(DYNAMIC_CACHE);
  const cacheKey = `/scene/${sceneData.id}`;

  try {
    const response = new Response(JSON.stringify(sceneData), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(cacheKey, response);
    event.ports[0]?.postMessage({ success: true, sceneId: sceneData.id });
  } catch (error) {
    event.ports[0]?.postMessage({ success: false, error: error.message });
  }
}

/**
 * Clear all caches
 */
async function handleClearCache(event) {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('bizscreen-'))
        .map((name) => caches.delete(name))
    );
    event.ports[0]?.postMessage({ success: true });
  } catch (error) {
    event.ports[0]?.postMessage({ success: false, error: error.message });
  }
}

/**
 * Get total cache size
 */
async function handleGetCacheSize(event) {
  try {
    let totalSize = 0;
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames.filter(n => n.startsWith('bizscreen-'))) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.clone().blob();
          totalSize += blob.size;
        }
      }
    }

    event.ports[0]?.postMessage({
      success: true,
      size: totalSize,
      sizeFormatted: formatBytes(totalSize)
    });
  } catch (error) {
    event.ports[0]?.postMessage({ success: false, error: error.message });
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-heartbeats') {
    event.waitUntil(syncHeartbeats());
  } else if (event.tag === 'sync-screenshots') {
    event.waitUntil(syncScreenshots());
  }
});

/**
 * Sync missed heartbeats when back online
 */
async function syncHeartbeats() {
  console.log('[SW] Syncing missed heartbeats...');

  // Get pending heartbeats from IndexedDB (handled by cacheService)
  // This will be triggered by the main app when it detects connectivity
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_HEARTBEATS',
        payload: { timestamp: Date.now() }
      });
    });
  });
}

/**
 * Sync pending screenshots when back online
 */
async function syncScreenshots() {
  console.log('[SW] Syncing pending screenshots...');

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_SCREENSHOTS',
        payload: { timestamp: Date.now() }
      });
    });
  });
}

// ============================================================================
// PERIODIC SYNC (if supported)
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync event:', event.tag);

  if (event.tag === 'content-update') {
    event.waitUntil(checkForContentUpdates());
  }
});

/**
 * Check for content updates periodically
 */
async function checkForContentUpdates() {
  console.log('[SW] Checking for content updates...');

  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({
        type: 'CHECK_CONTENT_UPDATES',
        payload: { timestamp: Date.now() }
      });
    });
  });
}

console.log('[SW] Service worker loaded');
