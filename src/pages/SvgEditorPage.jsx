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
import { supabase } from '../supabase';
import { Loader2 } from 'lucide-react';

/**
 * Parse query params from route string
 */
function parseQueryParams(routeString) {
  if (routeString && routeString.includes('?')) {
    const queryString = routeString.split('?')[1];
    const params = new URLSearchParams(queryString);
    return {
      sceneId: params.get('sceneId'),
      designId: params.get('designId'),
    };
  }
  return {};
}

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
  const { designId: urlDesignId, sceneId: urlSceneId } = queryParams;

  // Load template or design
  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      setLoading(true);
      setError(null);

      console.log('SvgEditorPage loadContent - designId:', urlDesignId, 'sceneId:', urlSceneId);

      try {
        // Check for existing design ID
        if (urlDesignId) {
          console.log('Loading existing design:', urlDesignId);
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
        // Phase 172 (D-15): load a scene by ID — the Apply flow writes scenes +
        // scene_slides atomically via clone_template_with_customization. We
        // read slide.design_json.svgContent directly; no svg_designs row exists.
        else if (urlSceneId) {
          const { data: scene, error: sceneErr } = await supabase
            .from('scenes')
            .select('id, name, settings')
            .eq('id', urlSceneId)
            .single();
          if (sceneErr) throw sceneErr;

          const { data: slides, error: slidesErr } = await supabase
            .from('scene_slides')
            .select('design_json')
            .eq('scene_id', urlSceneId)
            .order('position', { ascending: true })
            .limit(1);
          if (slidesErr) throw slidesErr;

          const svgContent = slides?.[0]?.design_json?.svgContent;
          const svgUrl = svgContent
            ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
            : null;

          if (cancelled) return;
          setEditorConfig({
            svgUrl,
            templateId: null,
            templateName: scene.name,
            initialJson: null,
            designId: null,
            canvasWidth: scene.settings?.width || 1920,
            canvasHeight: scene.settings?.height || 1080,
          });
        }
        // New blank design
        else {
          console.log('Starting blank design');
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
  }, [urlDesignId, urlSceneId]);

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
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
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
      onSave={handleSave}
      onClose={handleClose}
      showToast={showToast}
    />
  );
}
