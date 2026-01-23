/**
 * LayoutPreviewPage
 *
 * Standalone fullscreen preview page for layouts.
 * Route: yodeck-layout-preview-{layoutId}
 *
 * Features:
 * - Full viewport layout preview
 * - No editing chrome, clean preview experience
 * - Back to editor button
 * - Fullscreen toggle
 * - Escape key to exit fullscreen / go back
 *
 * Matches Yodeck-style design.
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Edit, Maximize, Minimize, Monitor } from 'lucide-react';
import { LayoutEditorCanvas, LayoutElementRenderer } from '../../components/layout-editor';
import { useLayout } from '../../hooks/useLayout';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../../design-system';
import { YODECK_COLORS } from '../../config/yodeckTheme';
import { useLogger } from '../../hooks/useLogger.js';

export default function LayoutPreviewPage({ layoutId, showToast, onNavigate }) {
  const logger = useLogger('LayoutPreviewPage');
