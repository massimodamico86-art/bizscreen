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
import { AlertCircle, Loader2 } from 'lucide-react';
import {
  loadUserSvgDesign,
  saveUserSvgDesign,
} from '../services/svgTemplateService';
import { FabricSvgEditor } from '../components/svg-editor/index.js';
import { createScopedLogger } from '../services/loggingService.js';

const logger = createScopedLogger('SvgEditorPage');

/**
 * Parse query params from route string
 * @param routeString
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

/**
 *
 * @param root0
 * @param root0.routeString
 * @param root0.showToast
 * @param root0.onNavigate
 */
export default function SvgEditorPage({
  routeString = '',
  showToast,
  onNavigate,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editor config
  const [editorConfig, setEditorConfig] = useState({
    svgUrl: null,
    templateId: null,
    templateName: 'New Design',
    initialJson: null,
    designId: null,
    canvasWidth: 1920,
    canvasHeight: 1080,
  });

  // Parse query parameters
  const queryParams = useMemo(() => parseQueryParams(routeString), [routeString]);
  const { designId: urlDesignId, templateId: urlTemplateId } = queryParams;

  // Load template or design
  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        logger.debug('SvgEditorPage loadContent', { designId: urlDesignId, templateId: urlTemplateId });
        // Check for existing design ID
        if (urlDesignId) {
          logger.debug('Loading existing design:', urlDesignId);
          const design = await loadUserSvgDesign(urlDesignId);
          if (cancelled) return;
          setEditorConfig({
            svgUrl: null,
            templateId: design.templateId,
            templateName: design.name,
            initialJson: design.fabricJson,
            designId: design.id,
            canvasWidth: design.width,
            canvasHeight: design.height,
          });
        }
        // Check for template ID - load from sessionStorage
        else if (urlTemplateId) {
          try {
            const storedTemplate = sessionStorage.getItem('pendingTemplate');
            if (!storedTemplate) {
              throw new Error('Template data not found');
            }
            const templateData = JSON.parse(storedTemplate);
            logger.debug('Loading template:', templateData.name);

            // Clear the stored template
            sessionStorage.removeItem('pendingTemplate');

            // Determine SVG URL - use svgContent if available (from template_library),
            // otherwise fall back to svgUrl
            let svgUrl = templateData.svgUrl;
            if (templateData.svgContent) {
              // Convert SVG content to data URL for the editor
              const encoded = btoa(unescape(encodeURIComponent(templateData.svgContent)));
              svgUrl = `data:image/svg+xml;base64,${encoded}`;
            }

            if (cancelled) return;
            setEditorConfig({
              svgUrl,
              templateId: templateData.id,
              templateName: templateData.name || 'New Design',
              initialJson: null,
              designId: null,
              canvasWidth: templateData.width || 1920,
              canvasHeight: templateData.height || 1080,
            });
          } catch (e) {
            console.error('Failed to load template:', e);
            if (!cancelled) setError('This template is no longer available in your session. Please go back to the template gallery and select a template to start editing.');
          }
        }
        // New blank design
        else {
          logger.debug('Starting blank design');
          if (cancelled) return;
          setEditorConfig({
            svgUrl: null,
            templateId: null,
            templateName: 'Untitled Design',
            initialJson: null,
            designId: null,
            canvasWidth: 1920,
            canvasHeight: 1080,
          });
        }
      } catch (err) {
        console.error('Failed to load content:', err);
        if (!cancelled) setError(err.message || 'Failed to load design');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [urlDesignId, urlTemplateId]);

  // Handle save
  const handleSave = async (designData) => {
    const savedDesign = await saveUserSvgDesign(designData);

    // Update design ID if this was a new design
    if (!editorConfig.designId && savedDesign.id) {
      setEditorConfig(prev => ({
        ...prev,
        designId: savedDesign.id,
      }));
    }

    return savedDesign;
  };

  // Handle close - return to gallery
  const handleClose = () => {
    onNavigate?.('svg-templates');
  };

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Unable to Load Design</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors font-medium"
            >
              Browse Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FabricSvgEditor
      svgUrl={editorConfig.svgUrl}
      templateId={editorConfig.templateId}
      templateName={editorConfig.templateName}
      initialJson={editorConfig.initialJson}
      designId={editorConfig.designId}
      canvasWidth={editorConfig.canvasWidth}
      canvasHeight={editorConfig.canvasHeight}
      isFromTemplate={!!urlTemplateId && !urlDesignId}
      onSave={handleSave}
      onClose={handleClose}
      showToast={showToast}
    />
  );
}
