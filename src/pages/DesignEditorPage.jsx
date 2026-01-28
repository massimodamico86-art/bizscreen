/**
 * Design Editor Page
 *
 * Full-page Polotno design editor with media library integration.
 * Supports:
 * - Creating new blank designs
 * - Editing existing layouts
 * - Customizing templates from the gallery
 */

import { useState, useEffect, lazy, useMemo } from 'react';
import { uploadMediaFromDataUrl, getMediaAsset, updateMediaAsset } from '../services/mediaService';
import { fetchLayoutTemplates } from '../services/layoutTemplateService';

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
  designId = 'new',
  routeString = '',
  showToast,
  onNavigate,
}) {
  const [loading, setLoading] = useState(true);
  const [initialDesign, setInitialDesign] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [existingMediaId, setExistingMediaId] = useState(null); // Track if editing existing design

  // Fetch templates for the side panel
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const result = await fetchLayoutTemplates({ pageSize: 100 });
        setTemplates(result.templates || []);
      } catch (err) {
        console.error('Failed to load templates:', err);
      }
    };
    loadTemplates();
  }, []);

  // Parse query parameters for template data from routeString
  const queryParams = useMemo(() => parseQueryParams(routeString), [routeString]);

  // Parse template from query params if present
  const templateData = useMemo(() => {
    if (queryParams.template) {
      try {
        const parsed = JSON.parse(decodeURIComponent(queryParams.template));
        console.log('DesignEditorPage received templateData:', parsed);
        return parsed;
      } catch (e) {
        console.error('Failed to parse template data:', e);
        return null;
      }
    }
    return null;
  }, [queryParams.template]);

  // Determine dimensions and name from template, layout, or preset
  const dimensions = useMemo(() => {
    // Template takes priority
    if (templateData) {
      const dims = {
        width: templateData.width || 1920,  // Default to landscape HD
        height: templateData.height || 1080,
        name: templateData.name || 'Template Design',
      };
      console.log('Dimensions calculated from templateData:', dims);
      return dims;
    }

    // Layout name from query params
    if (queryParams.name) {
      const presetKey = designId.replace('new-', '').replace('new', 'landscape-hd');
      const preset = PRESETS[presetKey] || PRESETS['landscape-hd'];
      return {
        width: preset.width,
        height: preset.height,
        name: decodeURIComponent(queryParams.name),
      };
    }

    // Fall back to preset from designId
    const presetKey = designId.replace('new-', '').replace('new', 'landscape-hd');
    const preset = PRESETS[presetKey] || PRESETS['landscape-hd'];
    return {
      width: preset.width,
      height: preset.height,
      name: `Untitled ${preset.name || 'Design'}`,
    };
  }, [templateData, queryParams.name, designId]);

  const [designName, setDesignName] = useState(dimensions.name);

  // Load existing design or template
  useEffect(() => {
    const loadDesign = async () => {
      // If we have template data, prepare the initial design with the template image
      if (templateData) {
        // Determine canvas size from template orientation or explicit dimensions
        let canvasWidth = 1920;
        let canvasHeight = 1080;

        // First check if template has explicit width/height
        if (templateData.width && templateData.height) {
          canvasWidth = templateData.width;
          canvasHeight = templateData.height;
        }
        // Then check orientation field (from database templates)
        else if (templateData.orientation) {
          switch (templateData.orientation) {
            case '9_16':
            case 'portrait':
              canvasWidth = 1080;
              canvasHeight = 1920;
              break;
            case '16_9':
            case 'landscape':
              canvasWidth = 1920;
              canvasHeight = 1080;
              break;
            case 'square':
            case '1_1':
              canvasWidth = 1080;
              canvasHeight = 1080;
              break;
            default:
              // Default to landscape
              canvasWidth = 1920;
              canvasHeight = 1080;
          }
        }

        setInitialDesign({
          type: 'template',
          backgroundImage: templateData.thumbnail,
          width: canvasWidth,
          height: canvasHeight,
          name: templateData.name,
        });
        setDesignName(templateData.name || 'Template Design');

        setLoading(false);
        return;
      }

      // For new designs, no loading needed
      if (designId === 'new' || designId.startsWith('new-')) {
        setLoading(false);
        return;
      }

      // Check if designId is a UUID (existing media asset)
      const mediaIdToLoad = UUID_PATTERN.test(designId) ? designId : queryParams.layoutId;

      if (mediaIdToLoad && UUID_PATTERN.test(mediaIdToLoad)) {
        try {
          const mediaAsset = await getMediaAsset(mediaIdToLoad);

          if (mediaAsset) {
            setExistingMediaId(mediaAsset.id);
            setDesignName(mediaAsset.name?.replace(/\.(png|jpg|jpeg)$/i, '') || 'Design');

            // Check if this design has saved JSON (editable design)
            const metadata = mediaAsset.metadata || mediaAsset.config_json || {};
            const designJson = metadata.designJson;

            if (designJson) {
              // Has design JSON - can fully restore the design
              setInitialDesign({
                type: 'json',
                json: designJson,
                backgroundImage: mediaAsset.url,
                width: metadata.width || 1920,
                height: metadata.height || 1080,
                name: mediaAsset.name,
              });
            } else {
              // No JSON - treat as background image
              setInitialDesign({
                type: 'image',
                backgroundImage: mediaAsset.url,
                width: mediaAsset.width || 1920,
                height: mediaAsset.height || 1080,
                name: mediaAsset.name,
              });
            }
          }
        } catch (err) {
          console.error('Failed to load existing design:', err);
          showToast?.('Failed to load design', 'error');
        }
      }

      setLoading(false);
    };

    loadDesign();
  }, [designId, templateData, queryParams, showToast]);

  // Handle save to media library
  const handleSave = async ({ name, imageDataUrl, json, width, height }) => {
    try {
      // If editing existing design, update it
      if (existingMediaId) {
        // Upload new image and update the existing record
        const mediaItem = await uploadMediaFromDataUrl(imageDataUrl, {
          name: `${name}.png`,
          type: 'image/png',
          source: 'design_editor',
          metadata: {
            designJson: json,
            width,
            height,
            createdWith: 'polotno',
            updatedFrom: existingMediaId,
          },
        });

        // Optionally update the original record's metadata
        try {
          await updateMediaAsset(existingMediaId, {
            metadata: {
              designJson: json,
              width,
              height,
              createdWith: 'polotno',
              latestVersion: mediaItem.id,
            },
          });
        } catch (updateErr) {
          console.warn('Could not update original design metadata:', updateErr);
        }

        showToast?.(`Design "${name}" updated!`, 'success');
        onNavigate?.('media-images');
        return mediaItem;
      }

      // Create new design
      const mediaItem = await uploadMediaFromDataUrl(imageDataUrl, {
        name: `${name}.png`,
        type: 'image/png',
        source: 'design_editor',
        metadata: {
          designJson: json,
          width,
          height,
          createdWith: 'polotno',
        },
      });

      showToast?.(`Design "${name}" saved to Media Library!`, 'success');
      onNavigate?.('media-images');

      return mediaItem;
    } catch (err) {
      console.error('Failed to save design:', err);
      showToast?.('Failed to save design: ' + err.message, 'error');
      throw err;
    }
  };

  // Handle close
  const handleClose = () => {
    onNavigate?.('layouts');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading design editor...</p>
          </div>
        </div>
      }
    >
      <DesignEditor
        key={`${initialDesign?.width || dimensions.width}-${initialDesign?.height || dimensions.height}`}
        onSave={handleSave}
        onClose={handleClose}
        initialDesign={initialDesign}
        designName={designName}
        width={initialDesign?.width || dimensions.width}
        height={initialDesign?.height || dimensions.height}
        templates={templates}
      />
    </Suspense>
  );
}
