/**
 * Design Editor Page
 *
 * Full-page Polotno design editor with media library integration.
 * Supports:
 * - Creating new blank designs
 * - Editing existing layouts
 * - Customizing templates from the gallery
 */

import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { uploadMediaFromDataUrl, getMediaAsset, updateMediaAsset } from '../services/mediaService';
import { fetchLayoutTemplates } from '../services/layoutTemplateService';
import { Loader2 } from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lazy load design editor for better code splitting
const DesignEditor = lazy(() => import('../components/PolotnoEditor'));

// Design presets with display names
const PRESETS = {
  'landscape-hd': { width: 1920, height: 1080, name: 'Landscape HD' },
  'portrait-hd': { width: 1080, height: 1920, name: 'Portrait HD' },
  'landscape-4k': { width: 3840, height: 2160, name: 'Landscape 4K' },
  'square': { width: 1080, height: 1080, name: 'Square' },
  'ultrawide': { width: 2560, height: 1080, name: 'Ultrawide' },
};

/**
 * Parse query params from route string (state-based routing)
 * @param {string} routeString - The route string like "design-editor?template=..."
 */
function parseQueryParams(routeString) {
  // Parse from routeString if provided (state-based routing)
  if (routeString && routeString.includes('?')) {
    const queryString = routeString.split('?')[1];
    const params = new URLSearchParams(queryString);
    return {
      template: params.get('template'),
      layoutId: params.get('layoutId'),
      name: params.get('name'),
    };
  }

  // Fallback to window.location for direct URL access
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // Also check hash params (SPA routing)
  const hashParams = hash.includes('?')
    ? new URLSearchParams(hash.split('?')[1])
    : new URLSearchParams();

  return {
    template: params.get('template') || hashParams.get('template'),
    layoutId: params.get('layoutId') || hashParams.get('layoutId'),
    name: params.get('name') || hashParams.get('name'),
  };
}

export default function DesignEditorPage({
  const logger = useLogger('DesignEditorPage');
