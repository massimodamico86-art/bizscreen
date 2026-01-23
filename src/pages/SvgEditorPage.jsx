/**
 * SVG Editor Page
 *
 * Page wrapper for the Fabric.js SVG editor.
 * Handles:
 * - Loading templates from URL params
 * - Loading saved designs
 * - Saving designs to database
 */

import { useState, useEffect, useMemo } from 'react';
import { FabricSvgEditor } from '../components/svg-editor';
import {
  loadUserSvgDesign,
  saveUserSvgDesign,
} from '../services/svgTemplateService';
import { Loader2 } from 'lucide-react';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Parse query params from route string
 */
function parseQueryParams(routeString) {
  if (routeString && routeString.includes('?')) {
    const queryString = routeString.split('?')[1];
    const params = new URLSearchParams(queryString);
    return {
      templateId: params.get('templateId'),
      designId: params.get('designId'),
    };
  }
  return {};
}

export default function SvgEditorPage({
  const logger = useLogger('SvgEditorPage');
