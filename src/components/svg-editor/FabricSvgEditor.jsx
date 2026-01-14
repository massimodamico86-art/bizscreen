/**
 * Fabric.js SVG Editor
 *
 * A full-featured SVG template editor using Fabric.js.
 * Features:
 * - Load SVG templates with editable text
 * - Rich text editing (fonts, colors, sizes)
 * - Add new text, shapes, and images
 * - Move, resize, rotate objects
 * - Undo/redo support
 * - Save/load via JSON serialization
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import LeftSidebar from './LeftSidebar';
import TopToolbar from './TopToolbar';
import LayersPanel from './LayersPanel';
import CanvasControls from './CanvasControls';
import EffectsPanel from './EffectsPanel';
import AnimatePanel from './AnimatePanel';
import PositionPanel from './PositionPanel';
import ContextMenu from './ContextMenu';
import FiltersPanel from './FiltersPanel';
import { loadSvgContent, LOCAL_SVG_TEMPLATES } from '../../services/svgTemplateService';
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  Save,
  Download,
  Eye,
  EyeOff,
  Palette,
  X,
  Layers,
} from 'lucide-react';
import QRCode from 'qrcode';

// Google Fonts to load
const GOOGLE_FONTS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Oswald',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Ubuntu',
  'Nunito',
  'Fredericka the Great',
];

// Color presets
export const COLOR_PRESETS = [
  '#000000', '#FFFFFF', '#333333', '#666666', '#999999',
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#546E7A', '#E98813', '#EEAB37',
];

export default function FabricSvgEditor({
  svgUrl,
  templateId,
  templateName,
  initialJson = null,
  designId = null,
  canvasWidth = 1920,
  canvasHeight = 1080,
  onSave,
  onClose,
  showToast,
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [designName, setDesignName] = useState(templateName || 'Untitled Design');

  // New features state
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [canvasObjects, setCanvasObjects] = useState([]);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const fileInputRef = useRef(null);

  // History for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Pan mode
  const [isPanMode, setIsPanMode] = useState(false);

  // Active panel (effects, animate, position)
  const [activePanel, setActivePanel] = useState(null);

  // Track used colors and fonts for "Used in this design" sections
  const [usedColors, setUsedColors] = useState([]);
  const [usedFonts, setUsedFonts] = useState([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [clipboard, setClipboard] = useState(null);
  const [styleClipboard, setStyleClipboard] = useState(null);

  // Counter to force re-renders when object properties change
  const [updateCounter, setUpdateCounter] = useState(0);

  // Load Google Fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS.map(f => f.replace(/ /g, '+')).join('&family=')}&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    // Selection events
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Track changes
    canvas.on('object:modified', () => {
      if (!isUndoRedoAction.current) {
        saveToHistory();
      }
      setHasUnsavedChanges(true);
    });

    canvas.on('object:added', () => {
      if (!isUndoRedoAction.current) {
        saveToHistory();
      }
      syncCanvasObjects();
    });

    canvas.on('object:removed', () => {
      if (!isUndoRedoAction.current) {
        saveToHistory();
      }
      syncCanvasObjects();
    });

    // Text editing events
    canvas.on('text:changed', () => {
      setHasUnsavedChanges(true);
    });

    // Load content after a small delay to ensure canvas is fully initialized
    const timeoutId = setTimeout(() => {
      if (fabricCanvasRef.current && !fabricCanvasRef.current.disposed) {
        loadContent(fabricCanvasRef.current);
      }
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasWidth, canvasHeight]);

  // Auto-fit canvas to container
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !fabricCanvasRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth - 48; // padding
      const containerHeight = container.clientHeight - 48;

      const scaleX = containerWidth / canvasWidth;
      const scaleY = containerHeight / canvasHeight;
      const scale = Math.min(scaleX, scaleY, 1);

      setZoom(scale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasWidth, canvasHeight]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const json = canvas.toJSON(['id', 'name', 'selectable', 'evented']);

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(json));
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Load SVG or saved JSON content
  const loadContent = async (canvas) => {
    setIsLoading(true);
    setError(null);

    try {
      if (initialJson) {
        // Load from saved JSON
        console.log('Loading from saved JSON...');
        // Ensure canvas is ready
        if (!canvas || canvas.disposed) {
          throw new Error('Canvas not ready or disposed');
        }
        // Fabric.js 6.x loadFromJSON expects the JSON object directly
        const jsonData = typeof initialJson === 'string' ? JSON.parse(initialJson) : initialJson;
        console.log('JSON data to load:', { version: jsonData.version, objectCount: jsonData.objects?.length });

        // Check if JSON has valid structure
        if (!jsonData || typeof jsonData !== 'object') {
          throw new Error('Invalid JSON structure');
        }

        try {
          await canvas.loadFromJSON(jsonData);
          canvas.renderAll();
          saveToHistory();
        } catch (loadErr) {
          console.error('Fabric loadFromJSON error:', loadErr);
          // Try to recover by loading objects manually
          if (jsonData.objects && Array.isArray(jsonData.objects)) {
            console.log('Attempting manual object loading...');
            canvas.clear();
            if (jsonData.background) {
              canvas.backgroundColor = jsonData.background;
            }
            for (const objData of jsonData.objects) {
              try {
                const obj = await fabric.util.enlivenObjects([objData]);
                if (obj && obj[0]) {
                  canvas.add(obj[0]);
                }
              } catch (objErr) {
                console.warn('Failed to load object:', objData.type, objErr);
              }
            }
            canvas.renderAll();
            saveToHistory();
          } else {
            throw loadErr;
          }
        }
      } else if (svgUrl) {
        // Load SVG template
        console.log('Loading SVG from URL:', svgUrl);
        const svgString = await loadSvgContent(svgUrl);
        console.log('SVG content loaded, length:', svgString.length);
        await loadSvgIntoCanvas(canvas, svgString);
        saveToHistory();
        console.log('SVG loaded into canvas successfully');
      } else {
        // Blank canvas - just finish loading
        console.log('Starting with blank canvas');
      }
    } catch (err) {
      console.error('Failed to load content:', err);
      setError(err.message || 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  };

  // Load SVG into Fabric.js canvas with editable text
  // targetWidth/targetHeight: target canvas dimensions
  // originalSvgWidth/originalSvgHeight: original SVG viewBox dimensions (for proper scaling)
  const loadSvgIntoCanvas = async (canvas, svgString, targetWidth = null, targetHeight = null, originalSvgWidth = null, originalSvgHeight = null) => {
    // Use provided dimensions or fall back to props
    const effectiveCanvasWidth = targetWidth || canvasWidth;
    const effectiveCanvasHeight = targetHeight || canvasHeight;

    try {
      // Fabric.js 6.x returns { objects, options } from loadSVGFromString
      const result = await fabric.loadSVGFromString(svgString);

      // Handle both array return and object return formats
      let objects, options;
      if (Array.isArray(result)) {
        objects = result;
        options = { width: effectiveCanvasWidth, height: effectiveCanvasHeight };
      } else {
        objects = result.objects || [];
        options = result.options || {};
      }

      console.log('SVG loaded:', { objectCount: objects.length, options, effectiveCanvasWidth, effectiveCanvasHeight });

      if (!objects || objects.length === 0) {
        // If no objects, try to group the SVG as a single object
        const group = fabric.util.groupSVGElements(objects, options);
        if (group) {
          canvas.add(group);
          canvas.renderAll();
          return;
        }
        throw new Error('No objects found in SVG');
      }

      // Get SVG dimensions for proper scaling
      // Priority: 1. Explicitly passed original dimensions (from template metadata)
      //           2. SVG viewBox dimensions (most accurate for SVG content)
      //           3. SVG width/height attributes
      //           4. Canvas dimensions as fallback
      let svgWidth, svgHeight;

      if (originalSvgWidth && originalSvgHeight) {
        // Use explicitly provided dimensions (from template metadata)
        svgWidth = originalSvgWidth;
        svgHeight = originalSvgHeight;
      } else if (options.viewBoxWidth && options.viewBoxHeight) {
        // Use viewBox dimensions from the SVG
        svgWidth = options.viewBoxWidth;
        svgHeight = options.viewBoxHeight;
      } else {
        // Fall back to width/height attributes or canvas size
        svgWidth = parseFloat(options.width) || effectiveCanvasWidth;
        svgHeight = parseFloat(options.height) || effectiveCanvasHeight;
      }

      console.log('SVG source dimensions:', { svgWidth, svgHeight, originalSvgWidth, originalSvgHeight, viewBox: { w: options.viewBoxWidth, h: options.viewBoxHeight }, attrs: { w: options.width, h: options.height } });

      // Calculate scale to FIT the canvas (content should fill canvas)
      const scaleX = effectiveCanvasWidth / svgWidth;
      const scaleY = effectiveCanvasHeight / svgHeight;
      // Use uniform scaling to maintain aspect ratio - use min to fit, max to fill
      // For digital signage, we want to fit the content within the canvas
      const scale = Math.min(scaleX, scaleY);

      console.log('Scaling SVG:', { svgWidth, svgHeight, effectiveCanvasWidth, effectiveCanvasHeight, scaleX, scaleY, scale });

      // Calculate offset to center the content
      const scaledWidth = svgWidth * scale;
      const scaledHeight = svgHeight * scale;
      const offsetX = (effectiveCanvasWidth - scaledWidth) / 2;
      const offsetY = (effectiveCanvasHeight - scaledHeight) / 2;

      console.log('Positioning:', { scaledWidth, scaledHeight, offsetX, offsetY });

      // Track text counter for naming
      let textCount = 0;
      let objectCount = 0;

      // Process objects - recursively handle groups
      const processObject = (obj, parentScale = scale) => {
        if (!obj) return;

        // Handle groups recursively
        if (obj.type === 'group' && obj._objects) {
          obj._objects.forEach(child => processObject(child, parentScale));
          return;
        }

        // Apply scaling and offset
        obj.set({
          left: ((obj.left || 0) * parentScale) + offsetX,
          top: ((obj.top || 0) * parentScale) + offsetY,
          scaleX: (obj.scaleX || 1) * parentScale,
          scaleY: (obj.scaleY || 1) * parentScale,
        });

        // Make text elements editable
        if (obj.type === 'text' || obj.type === 'i-text' || obj.type === 'textbox') {
          textCount++;
          const text = obj.text || '';

          // Skip empty text
          if (!text.trim()) {
            objectCount++;
            obj.set({
              id: `obj-${objectCount}`,
              name: `Empty Text`,
              selectable: true,
              evented: true,
            });
            canvas.add(obj);
            return;
          }

          // Get the font family, handling CSS font stacks
          let fontFamily = obj.fontFamily || 'Poppins';
          // Clean up font family (remove quotes and take first font)
          fontFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim();

          // Map common SVG fonts to available Google Fonts
          const fontMap = {
            'sans-serif': 'Roboto',
            'serif': 'Playfair Display',
            'monospace': 'Roboto Mono',
            'Arial': 'Roboto',
            'Helvetica': 'Roboto',
            'Times New Roman': 'Playfair Display',
            'Georgia': 'Merriweather',
          };

          if (fontMap[fontFamily]) {
            fontFamily = fontMap[fontFamily];
          }

          // Create editable text object
          const textObj = new fabric.IText(text, {
            left: obj.left,
            top: obj.top,
            fontSize: (obj.fontSize || 16) * parentScale,
            fontFamily: fontFamily,
            fontWeight: obj.fontWeight || 'normal',
            fontStyle: obj.fontStyle || 'normal',
            fill: obj.fill || '#333333',
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            textAlign: obj.textAlign || 'left',
            originX: obj.originX || 'left',
            originY: obj.originY || 'top',
            angle: obj.angle || 0,
            opacity: obj.opacity !== undefined ? obj.opacity : 1,
            scaleX: 1,
            scaleY: 1,
            id: `text-${textCount}`,
            name: text.substring(0, 20) + (text.length > 20 ? '...' : ''),
            editable: true,
          });
          canvas.add(textObj);
        } else {
          // Add other objects as-is
          objectCount++;

          // Determine a meaningful name based on type
          let name = `Object ${objectCount}`;
          if (obj.type === 'rect') name = `Rectangle ${objectCount}`;
          else if (obj.type === 'circle') name = `Circle ${objectCount}`;
          else if (obj.type === 'path') name = `Shape ${objectCount}`;
          else if (obj.type === 'line') name = `Line ${objectCount}`;
          else if (obj.type === 'polygon') name = `Polygon ${objectCount}`;
          else if (obj.type === 'image') name = `Image ${objectCount}`;

          obj.set({
            id: `obj-${objectCount}`,
            name: name,
            selectable: true,
            evented: true,
          });
          canvas.add(obj);
        }
      };

      // Process all objects
      objects.forEach(obj => processObject(obj));

      canvas.renderAll();
      console.log(`SVG processed: ${textCount} text elements, ${objectCount} other objects`);
    } catch (err) {
      console.error('Error loading SVG into canvas:', err);
      throw err;
    }
  };

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoAction.current = true;
    const newIndex = historyIndex - 1;
    const json = JSON.parse(history[newIndex]);

    canvas.loadFromJSON(json).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = false;
      setHasUnsavedChanges(true);
    });
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    isUndoRedoAction.current = true;
    const newIndex = historyIndex + 1;
    const json = JSON.parse(history[newIndex]);

    canvas.loadFromJSON(json).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = false;
      setHasUnsavedChanges(true);
    });
  }, [history, historyIndex]);

  // Delete selected object
  const handleDelete = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (active) {
      if (active.type === 'activeSelection') {
        active.forEachObject((obj) => canvas.remove(obj));
      } else {
        canvas.remove(active);
      }
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObject(null);
      setHasUnsavedChanges(true);
    }
  }, []);

  // Duplicate selected object
  const handleDuplicate = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    if (active) {
      active.clone().then((cloned) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
          id: `${cloned.type}-${Date.now()}`,
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
        setHasUnsavedChanges(true);
      });
    }
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!selectedObject) return;
    selectedObject.clone().then((cloned) => {
      setClipboard(cloned);
    });
  }, [selectedObject]);

  // Cut to clipboard
  const handleCut = useCallback(() => {
    if (!selectedObject) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    selectedObject.clone().then((cloned) => {
      setClipboard(cloned);
      canvas.remove(selectedObject);
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedObject(null);
      setHasUnsavedChanges(true);
    });
  }, [selectedObject]);

  // Paste from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    clipboard.clone().then((cloned) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `${cloned.type}-${Date.now()}`,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      setHasUnsavedChanges(true);
    });
  }, [clipboard]);

  // Copy style
  const handleCopyStyle = useCallback(() => {
    if (!selectedObject) return;
    setStyleClipboard({
      fill: selectedObject.fill,
      stroke: selectedObject.stroke,
      strokeWidth: selectedObject.strokeWidth,
      opacity: selectedObject.opacity,
      shadow: selectedObject.shadow,
      fontFamily: selectedObject.fontFamily,
      fontSize: selectedObject.fontSize,
      fontWeight: selectedObject.fontWeight,
      fontStyle: selectedObject.fontStyle,
    });
  }, [selectedObject]);

  // Paste style
  const handlePasteStyle = useCallback(() => {
    if (!selectedObject || !styleClipboard) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    Object.entries(styleClipboard).forEach(([key, value]) => {
      if (value !== undefined) {
        selectedObject.set(key, value);
      }
    });
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject, styleClipboard]);

  // Bring forward (one step)
  const handleBringForward = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.bringObjectForward(selectedObject);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Send backward (one step)
  const handleSendBackward = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    canvas.sendObjectBackwards(selectedObject);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Context menu handler
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  // Add new text
  const handleAddText = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new fabric.IText('Double-click to edit', {
      left: canvasWidth / 2 - 100,
      top: canvasHeight / 2 - 20,
      fontSize: 32,
      fontFamily: 'Poppins',
      fill: '#333333',
      id: `text-${Date.now()}`,
      name: 'New Text',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [canvasWidth, canvasHeight]);

  // Sync canvas objects for layers panel and track used colors/fonts
  const syncCanvasObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects().map((obj, index) => ({
      id: obj.id || `obj-${index}`,
      name: obj.name || obj.type || `Object ${index + 1}`,
      type: obj.type,
      visible: obj.visible !== false,
      locked: obj.lockMovementX && obj.lockMovementY,
    }));
    setCanvasObjects(objects);

    // Track used colors and fonts
    const colors = new Set();
    const fonts = new Set();
    canvas.getObjects().forEach((obj) => {
      if (obj.fill && typeof obj.fill === 'string') colors.add(obj.fill);
      if (obj.stroke && typeof obj.stroke === 'string') colors.add(obj.stroke);
      if (obj.fontFamily) fonts.add(obj.fontFamily);
    });
    setUsedColors(Array.from(colors).slice(0, 10));
    setUsedFonts(Array.from(fonts));
  }, []);

  // Add image from file
  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle image file selection
  const handleImageFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result;

      fabric.FabricImage.fromURL(imgUrl).then((img) => {
        // Scale image to fit within canvas
        const maxWidth = canvasWidth * 0.5;
        const maxHeight = canvasHeight * 0.5;
        const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

        img.set({
          left: canvasWidth / 2 - (img.width * scale) / 2,
          top: canvasHeight / 2 - (img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
          id: `image-${Date.now()}`,
          name: file.name.replace(/\.[^.]+$/, ''),
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setHasUnsavedChanges(true);
        syncCanvasObjects();
      });
    };
    reader.readAsDataURL(file);

    // Reset file input
    e.target.value = '';
  }, [canvasWidth, canvasHeight, syncCanvasObjects]);

  // Handle background color change
  const handleBackgroundColorChange = useCallback((color) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.backgroundColor = color;
    canvas.renderAll();
    setBackgroundColor(color);
    setHasUnsavedChanges(true);
  }, []);

  // Toggle object visibility
  const handleToggleVisibility = useCallback((objectId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.id === objectId);
    if (obj) {
      obj.set('visible', !obj.visible);
      canvas.renderAll();
      syncCanvasObjects();
      setHasUnsavedChanges(true);
    }
  }, [syncCanvasObjects]);

  // Toggle object lock
  const handleToggleLock = useCallback((objectId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.id === objectId);
    if (obj) {
      const isLocked = obj.lockMovementX && obj.lockMovementY;
      obj.set({
        lockMovementX: !isLocked,
        lockMovementY: !isLocked,
        lockRotation: !isLocked,
        lockScalingX: !isLocked,
        lockScalingY: !isLocked,
        selectable: isLocked,
      });
      canvas.renderAll();
      syncCanvasObjects();
      setHasUnsavedChanges(true);
    }
  }, [syncCanvasObjects]);

  // Select object from layers panel
  const handleSelectFromLayers = useCallback((objectId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getObjects().find(o => o.id === objectId);
    if (obj && obj.selectable !== false) {
      canvas.setActiveObject(obj);
      canvas.renderAll();
    }
  }, []);

  // Reorder layers
  const handleReorderLayers = useCallback((fromIndex, toIndex) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= objects.length || toIndex >= objects.length) return;

    const obj = objects[fromIndex];
    canvas.remove(obj);

    // Insert at new position
    canvas.insertAt(obj, toIndex);

    canvas.renderAll();
    syncCanvasObjects();
    setHasUnsavedChanges(true);
  }, [syncCanvasObjects]);

  // Add shape with options (filled, scaleX, etc.)
  const handleAddShape = useCallback((shapeType, options = {}) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let shape;
    const isFilled = options.filled !== false;
    const baseProps = {
      left: canvasWidth / 2 - 50,
      top: canvasHeight / 2 - 50,
      fill: isFilled ? '#E98813' : 'transparent',
      stroke: '#333333',
      strokeWidth: isFilled ? 0 : 2,
      id: `shape-${Date.now()}`,
      scaleX: options.scaleX || 1,
      scaleY: options.scaleY || 1,
    };

    switch (shapeType) {
      case 'rect':
        shape = new fabric.Rect({
          ...baseProps,
          width: 100,
          height: 100,
          name: options.filled ? 'Rectangle (Filled)' : 'Rectangle',
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          ...baseProps,
          radius: 50,
          name: options.filled ? 'Circle (Filled)' : 'Circle',
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          ...baseProps,
          width: 100,
          height: 100,
          name: options.filled ? 'Triangle (Filled)' : 'Triangle',
        });
        break;
      case 'diamond':
        shape = new fabric.Rect({
          ...baseProps,
          width: 70,
          height: 70,
          angle: 45,
          name: 'Diamond',
        });
        break;
      case 'star':
        // Create a 5-point star using polygon
        const starPoints = [];
        const outerRadius = 50;
        const innerRadius = 25;
        for (let i = 0; i < 10; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          starPoints.push({
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
          });
        }
        shape = new fabric.Polygon(starPoints, {
          ...baseProps,
          name: options.filled ? 'Star (Filled)' : 'Star',
        });
        break;
      case 'heart':
        // Approximate heart using path
        shape = new fabric.Path('M 50 30 C 50 20, 30 0, 10 20 C -10 40, 10 60, 50 90 C 90 60, 110 40, 90 20 C 70 0, 50 20, 50 30 Z', {
          ...baseProps,
          scaleX: 0.8,
          scaleY: 0.8,
          name: options.filled ? 'Heart (Filled)' : 'Heart',
        });
        break;
      case 'hexagon':
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          hexPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new fabric.Polygon(hexPoints, {
          ...baseProps,
          name: 'Hexagon',
        });
        break;
      case 'pentagon':
        const pentPoints = [];
        for (let i = 0; i < 5; i++) {
          const angle = (2 * Math.PI / 5) * i - Math.PI / 2;
          pentPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new fabric.Polygon(pentPoints, {
          ...baseProps,
          name: 'Pentagon',
        });
        break;
      case 'octagon':
        const octPoints = [];
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI / 4) * i - Math.PI / 8;
          octPoints.push({
            x: 50 * Math.cos(angle),
            y: 50 * Math.sin(angle),
          });
        }
        shape = new fabric.Polygon(octPoints, {
          ...baseProps,
          name: 'Octagon',
        });
        break;
      case 'line':
        shape = new fabric.Line([0, 0, 100, 0], {
          left: canvasWidth / 2 - 50,
          top: canvasHeight / 2,
          stroke: '#333333',
          strokeWidth: 3,
          id: `shape-${Date.now()}`,
          name: 'Line',
        });
        break;
      case 'arrow':
        // Create arrow using polyline
        const arrowPoints = [
          { x: 0, y: 10 },
          { x: 80, y: 10 },
          { x: 80, y: 0 },
          { x: 100, y: 15 },
          { x: 80, y: 30 },
          { x: 80, y: 20 },
          { x: 0, y: 20 },
        ];
        shape = new fabric.Polygon(arrowPoints, {
          ...baseProps,
          name: 'Arrow',
        });
        break;
      case 'arrow-double':
        const dblArrowPoints = [
          { x: 20, y: 0 },
          { x: 0, y: 15 },
          { x: 20, y: 30 },
          { x: 20, y: 20 },
          { x: 80, y: 20 },
          { x: 80, y: 30 },
          { x: 100, y: 15 },
          { x: 80, y: 0 },
          { x: 80, y: 10 },
          { x: 20, y: 10 },
        ];
        shape = new fabric.Polygon(dblArrowPoints, {
          ...baseProps,
          name: 'Double Arrow',
        });
        break;
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [canvasWidth, canvasHeight]);

  // Add image from URL (for stock photos)
  const handleAddImageFromUrl = useCallback((url) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !url) return;

    fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img) => {
      const maxWidth = canvasWidth * 0.5;
      const maxHeight = canvasHeight * 0.5;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);

      img.set({
        left: canvasWidth / 2 - (img.width * scale) / 2,
        top: canvasHeight / 2 - (img.height * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        id: `image-${Date.now()}`,
        name: 'Stock Photo',
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      setHasUnsavedChanges(true);
      syncCanvasObjects();
    }).catch((err) => {
      console.error('Failed to load image:', err);
      showToast?.('Failed to load image', 'error');
    });
  }, [canvasWidth, canvasHeight, syncCanvasObjects, showToast]);

  // Add text with preset style
  const handleAddTextWithPreset = useCallback((preset) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const textContent = preset?.label || 'Double-click to edit';
    const text = new fabric.IText(textContent, {
      left: canvasWidth / 2 - 100,
      top: canvasHeight / 2 - 20,
      fontSize: preset?.fontSize || 32,
      fontFamily: preset?.fontFamily || 'Poppins',
      fontWeight: preset?.fontWeight || 'normal',
      fontStyle: preset?.fontStyle || 'normal',
      fill: '#333333',
      id: `text-${Date.now()}`,
      name: preset?.label || 'New Text',
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [canvasWidth, canvasHeight]);

  // Add QR code with type support
  const handleAddQRCode = useCallback(async (text, qrType = 'url') => {
    if (!text?.trim()) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Format text based on QR type
    let qrContent = text;
    switch (qrType) {
      case 'email':
        qrContent = `mailto:${text}`;
        break;
      case 'call':
        qrContent = `tel:${text}`;
        break;
      case 'sms':
        qrContent = `sms:${text}`;
        break;
      case 'wifi':
        qrContent = `WIFI:T:WPA;S:${text};;`;
        break;
      case 'whatsapp':
        qrContent = `https://wa.me/${text.replace(/[^0-9]/g, '')}`;
        break;
      case 'facebook':
        qrContent = text.startsWith('http') ? text : `https://facebook.com/${text}`;
        break;
      case 'instagram':
        qrContent = text.startsWith('http') ? text : `https://instagram.com/${text}`;
        break;
      case 'twitter':
        qrContent = text.startsWith('http') ? text : `https://x.com/${text}`;
        break;
      default:
        qrContent = text;
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(qrContent, {
        width: 200,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      fabric.FabricImage.fromURL(qrDataUrl).then((img) => {
        img.set({
          left: canvasWidth / 2 - 100,
          top: canvasHeight / 2 - 100,
          id: `qrcode-${Date.now()}`,
          name: `QR (${qrType}): ${text.substring(0, 15)}...`,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        setHasUnsavedChanges(true);
        syncCanvasObjects();
        showToast?.('QR code added', 'success');
      });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      showToast?.('Failed to generate QR code', 'error');
    }
  }, [canvasWidth, canvasHeight, syncCanvasObjects, showToast]);

  // Add icon as text (using Unicode/emoji or custom symbol)
  const handleAddIcon = useCallback((iconId, _IconComponent, color, customSymbol) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Use custom symbol if provided, otherwise use icon mapping
    const iconSymbols = {
      clock: '🕐', calendar: '📅', location: '📍', phone: '📞',
      email: '✉️', globe: '🌐', shopping: '🛒', gift: '🎁',
      award: '🏆', chart: '📊', sun: '☀️', cloud: '☁️',
      instagram: '📷', facebook: 'f', twitter: '𝕏', youtube: '▶',
      linkedin: 'in', users: '👥', video: '🎬', wifi: '📶',
    };

    const symbol = customSymbol || iconSymbols[iconId] || '●';

    const text = new fabric.IText(symbol, {
      left: canvasWidth / 2 - 30,
      top: canvasHeight / 2 - 30,
      fontSize: customSymbol && customSymbol.length === 1 && /[0-9]/.test(customSymbol) ? 80 : 60,
      fontFamily: customSymbol && /[0-9]/.test(customSymbol) ? 'Oswald' : 'Arial',
      fontWeight: customSymbol && /[0-9]/.test(customSymbol) ? 'bold' : 'normal',
      fill: color || '#333333',
      id: `icon-${Date.now()}`,
      name: customSymbol ? `Number: ${customSymbol}` : `Icon: ${iconId}`,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [canvasWidth, canvasHeight]);

  // Add widget - supports live data widgets (time, date, weather, etc.)
  const handleAddWidget = useCallback((widgetType) => {
    console.log('handleAddWidget called with:', widgetType);

    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.error('Canvas not available');
      showToast?.('Canvas not ready', 'error');
      return;
    }

    try {
      // Handle different widget types
      switch (widgetType) {
        case 'time': {
          // Live time widget
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          const timeText = new fabric.IText(timeStr, {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            fontSize: 72,
            fontFamily: 'Poppins',
            fontWeight: 'bold',
            fill: '#333333',
            originX: 'center',
            originY: 'center',
            id: `widget-time-${Date.now()}`,
            name: 'Time Widget',
            widgetType: 'time',
          });

          canvas.add(timeText);
          canvas.setActiveObject(timeText);
          showToast?.('Time widget added - updates when played', 'success');
          break;
        }

        case 'date': {
          // Live date widget
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });

          const dateText = new fabric.IText(dateStr, {
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            fontSize: 36,
            fontFamily: 'Poppins',
            fontWeight: '500',
            fill: '#333333',
            originX: 'center',
            originY: 'center',
            id: `widget-date-${Date.now()}`,
            name: 'Date Widget',
            widgetType: 'date',
          });

          canvas.add(dateText);
          canvas.setActiveObject(dateText);
          showToast?.('Date widget added', 'success');
          break;
        }

        case 'weather': {
          // Weather widget - shows placeholder with icon
          const weatherGroup = createWeatherWidget();
          canvas.add(weatherGroup);
          canvas.setActiveObject(weatherGroup);
          showToast?.('Weather widget added - configure location in settings', 'success');
          break;
        }

        case 'countdown': {
          // Countdown widget
          const countdownGroup = createCountdownWidget();
          canvas.add(countdownGroup);
          canvas.setActiveObject(countdownGroup);
          showToast?.('Countdown widget added - set target date in properties', 'success');
          break;
        }

        case 'video': {
          // Video widget - prompt for URL
          const videoUrl = window.prompt('Enter video URL (YouTube, Vimeo, or direct link):', 'https://www.youtube.com/watch?v=');
          if (videoUrl) {
            const videoWidget = createVideoWidget(videoUrl);
            canvas.add(videoWidget);
            canvas.setActiveObject(videoWidget);
            showToast?.('Video widget added', 'success');
          }
          break;
        }

        case 'overlay': {
          // Overlay Image - prompt for URL
          const imageUrl = window.prompt('Enter image URL:', 'https://');
          if (imageUrl && imageUrl !== 'https://') {
            // Use existing image handler
            fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
              const maxWidth = canvasWidth * 0.5;
              const maxHeight = canvasHeight * 0.5;
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
              img.set({
                left: canvasWidth / 2,
                top: canvasHeight / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                id: `widget-overlay-${Date.now()}`,
                name: 'Overlay Image',
                widgetType: 'overlay',
              });
              canvas.add(img);
              canvas.setActiveObject(img);
              canvas.renderAll();
              showToast?.('Overlay image added', 'success');
            }).catch(() => {
              showToast?.('Failed to load image', 'error');
            });
          }
          break;
        }

        case 'scrollingtext': {
          // Scrolling text widget - prompt for text
          const scrollText = window.prompt('Enter scrolling text:', 'Breaking News: Your message here...');
          if (scrollText) {
            const scrollWidget = createScrollingTextWidget(scrollText);
            canvas.add(scrollWidget);
            canvas.setActiveObject(scrollWidget);
            showToast?.('Scrolling text widget added', 'success');
          }
          break;
        }

        case 'social': {
          // Social feed widget
          const socialWidget = createSocialFeedWidget();
          canvas.add(socialWidget);
          canvas.setActiveObject(socialWidget);
          showToast?.('Social feed widget added - configure account in settings', 'success');
          break;
        }

        case 'news': {
          // News ticker widget
          const newsWidget = createNewsTickerWidget();
          canvas.add(newsWidget);
          canvas.setActiveObject(newsWidget);
          showToast?.('News ticker widget added', 'success');
          break;
        }

        case 'calendar': {
          // Calendar widget
          const calendarWidget = createCalendarWidget();
          canvas.add(calendarWidget);
          canvas.setActiveObject(calendarWidget);
          showToast?.('Calendar widget added - connect Google Calendar in settings', 'success');
          break;
        }

        case 'playlist': {
          // Playlist widget
          const playlistWidget = createPlaylistWidget();
          canvas.add(playlistWidget);
          canvas.setActiveObject(playlistWidget);
          showToast?.('Playlist widget added - select playlist in properties', 'success');
          break;
        }

        default: {
          // Generic placeholder widget for other types
          const config = getWidgetConfig(widgetType);
          const group = createPlaceholderWidget(config, widgetType);
          canvas.add(group);
          canvas.setActiveObject(group);
          showToast?.(`${config.label} widget added`, 'success');
        }
      }

      canvas.renderAll();
      setHasUnsavedChanges(true);
      syncCanvasObjects();
      console.log('Widget added successfully');
    } catch (err) {
      console.error('Error adding widget:', err);
      showToast?.('Failed to add widget', 'error');
    }

    // Helper function to get widget config
    function getWidgetConfig(type) {
      const configs = {
        overlay: { label: 'Overlay Image', icon: '🖼️', color: '#3b82f6' },
        video: { label: 'Video', icon: '▶️', color: '#8b5cf6' },
        document: { label: 'Document', icon: '📄', color: '#22c55e' },
        apps: { label: 'Apps', icon: '📱', color: '#eab308' },
        playlist: { label: 'Playlist', icon: '🎵', color: '#ec4899' },
        scrollingtext: { label: 'Scrolling Text', icon: '📝', color: '#ef4444' },
        calendar: { label: 'Calendar', icon: '📆', color: '#14b8a6' },
        meetingroom: { label: 'Meeting Room', icon: '🏢', color: '#8b5cf6' },
        scrollingvertical: { label: 'Scrolling Vertical', icon: '↕️', color: '#10b981' },
        aericast: { label: 'AeriCast', icon: '📡', color: '#f59e0b' },
        social: { label: 'Social Feed', icon: '📱', color: '#d946ef' },
        news: { label: 'News Ticker', icon: '📰', color: '#84cc16' },
      };
      return configs[type] || { label: 'Widget', icon: '📦', color: '#6b7280' };
    }

    // Helper to create weather widget
    function createWeatherWidget() {
      const bg = new fabric.Rect({
        width: 280,
        height: 120,
        fill: '#06b6d4',
        rx: 16,
        ry: 16,
        originX: 'center',
        originY: 'center',
      });

      const icon = new fabric.FabricText('☀️', {
        fontSize: 48,
        originX: 'center',
        originY: 'center',
        left: -80,
        top: -5,
      });

      const temp = new fabric.FabricText('72°F', {
        fontSize: 42,
        fontFamily: 'Poppins',
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        left: 20,
        top: -15,
      });

      const condition = new fabric.FabricText('Sunny', {
        fontSize: 18,
        fontFamily: 'Poppins',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        left: 20,
        top: 25,
      });

      return new fabric.Group([bg, icon, temp, condition], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-weather-${Date.now()}`,
        name: 'Weather Widget',
        widgetType: 'weather',
      });
    }

    // Helper to create countdown widget
    function createCountdownWidget() {
      const bg = new fabric.Rect({
        width: 320,
        height: 140,
        fill: '#f43f5e',
        rx: 16,
        ry: 16,
        originX: 'center',
        originY: 'center',
      });

      const title = new fabric.FabricText('COUNTDOWN', {
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '600',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: -45,
      });

      const timeDisplay = new fabric.FabricText('10 : 05 : 32 : 15', {
        fontSize: 32,
        fontFamily: 'Poppins',
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: 0,
      });

      const labels = new fabric.FabricText('DAYS    HRS    MIN    SEC', {
        fontSize: 10,
        fontFamily: 'Poppins',
        fill: 'rgba(255,255,255,0.8)',
        originX: 'center',
        originY: 'center',
        top: 35,
      });

      return new fabric.Group([bg, title, timeDisplay, labels], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-countdown-${Date.now()}`,
        name: 'Countdown Widget',
        widgetType: 'countdown',
      });
    }

    // Helper to create placeholder widget
    function createPlaceholderWidget(config, type) {
      const rect = new fabric.Rect({
        width: 300,
        height: 150,
        fill: config.color,
        rx: 12,
        ry: 12,
        opacity: 0.9,
        originX: 'center',
        originY: 'center',
      });

      const iconText = new fabric.FabricText(config.icon, {
        fontSize: 40,
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: -25,
        left: 0,
      });

      const labelText = new fabric.FabricText(config.label, {
        fontSize: 18,
        fill: '#ffffff',
        fontFamily: 'Poppins',
        fontWeight: '500',
        originX: 'center',
        originY: 'center',
        top: 30,
        left: 0,
      });

      return new fabric.Group([rect, iconText, labelText], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-${type}-${Date.now()}`,
        name: config.label,
        widgetType: type,
      });
    }

    // Helper to create video widget
    function createVideoWidget(url) {
      const bg = new fabric.Rect({
        width: 400,
        height: 225,
        fill: '#1a1a2e',
        rx: 8,
        ry: 8,
        originX: 'center',
        originY: 'center',
      });

      const playButton = new fabric.Circle({
        radius: 35,
        fill: 'rgba(255,255,255,0.9)',
        originX: 'center',
        originY: 'center',
      });

      const playIcon = new fabric.FabricText('▶', {
        fontSize: 30,
        fill: '#1a1a2e',
        originX: 'center',
        originY: 'center',
        left: 5,
      });

      const urlText = new fabric.FabricText(url.substring(0, 40) + '...', {
        fontSize: 10,
        fontFamily: 'monospace',
        fill: 'rgba(255,255,255,0.6)',
        originX: 'center',
        originY: 'center',
        top: 95,
      });

      return new fabric.Group([bg, playButton, playIcon, urlText], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-video-${Date.now()}`,
        name: 'Video Widget',
        widgetType: 'video',
        videoUrl: url,
      });
    }

    // Helper to create scrolling text widget
    function createScrollingTextWidget(text) {
      const bg = new fabric.Rect({
        width: 600,
        height: 50,
        fill: '#ef4444',
        originX: 'center',
        originY: 'center',
      });

      const scrollText = new fabric.FabricText(`◀ ${text} ▶`, {
        fontSize: 20,
        fontFamily: 'Poppins',
        fontWeight: '500',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
      });

      return new fabric.Group([bg, scrollText], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-scrollingtext-${Date.now()}`,
        name: 'Scrolling Text',
        widgetType: 'scrollingtext',
        scrollContent: text,
      });
    }

    // Helper to create social feed widget
    function createSocialFeedWidget() {
      const bg = new fabric.Rect({
        width: 300,
        height: 350,
        fill: '#ffffff',
        rx: 12,
        ry: 12,
        stroke: '#e5e7eb',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
      });

      const header = new fabric.Rect({
        width: 300,
        height: 50,
        fill: '#f3f4f6',
        originX: 'center',
        originY: 'center',
        top: -150,
      });

      const instaIcon = new fabric.FabricText('📷', {
        fontSize: 24,
        originX: 'center',
        originY: 'center',
        left: -110,
        top: -150,
      });

      const username = new fabric.FabricText('@yourbrand', {
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: '600',
        fill: '#333333',
        originX: 'center',
        originY: 'center',
        left: -30,
        top: -150,
      });

      const postPlaceholder = new fabric.Rect({
        width: 260,
        height: 200,
        fill: '#e5e7eb',
        originX: 'center',
        originY: 'center',
        top: -20,
      });

      const caption = new fabric.FabricText('Your latest Instagram post will appear here', {
        fontSize: 12,
        fontFamily: 'Poppins',
        fill: '#666666',
        originX: 'center',
        originY: 'center',
        top: 120,
      });

      return new fabric.Group([bg, header, instaIcon, username, postPlaceholder, caption], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-social-${Date.now()}`,
        name: 'Social Feed',
        widgetType: 'social',
      });
    }

    // Helper to create news ticker widget
    function createNewsTickerWidget() {
      const bg = new fabric.Rect({
        width: 700,
        height: 60,
        fill: '#1e3a5f',
        originX: 'center',
        originY: 'center',
      });

      const label = new fabric.Rect({
        width: 100,
        height: 60,
        fill: '#dc2626',
        originX: 'center',
        originY: 'center',
        left: -300,
      });

      const breakingText = new fabric.FabricText('BREAKING', {
        fontSize: 14,
        fontFamily: 'Poppins',
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        left: -300,
      });

      const newsText = new fabric.FabricText('Latest headlines will scroll here • Configure RSS feed in settings', {
        fontSize: 18,
        fontFamily: 'Poppins',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        left: 50,
      });

      return new fabric.Group([bg, label, breakingText, newsText], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-news-${Date.now()}`,
        name: 'News Ticker',
        widgetType: 'news',
      });
    }

    // Helper to create calendar widget
    function createCalendarWidget() {
      const now = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

      const bg = new fabric.Rect({
        width: 280,
        height: 300,
        fill: '#ffffff',
        rx: 12,
        ry: 12,
        stroke: '#e5e7eb',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
      });

      const headerBg = new fabric.Rect({
        width: 280,
        height: 50,
        fill: '#3b82f6',
        originX: 'center',
        originY: 'center',
        top: -125,
      });

      const monthYear = new fabric.FabricText(`${monthNames[now.getMonth()]} ${now.getFullYear()}`, {
        fontSize: 18,
        fontFamily: 'Poppins',
        fontWeight: '600',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: -125,
      });

      const days = new fabric.FabricText('Sun  Mon  Tue  Wed  Thu  Fri  Sat', {
        fontSize: 10,
        fontFamily: 'Poppins',
        fontWeight: '500',
        fill: '#666666',
        originX: 'center',
        originY: 'center',
        top: -80,
      });

      const todayCircle = new fabric.Circle({
        radius: 18,
        fill: '#3b82f6',
        originX: 'center',
        originY: 'center',
        top: 0,
      });

      const todayNum = new fabric.FabricText(String(now.getDate()), {
        fontSize: 16,
        fontFamily: 'Poppins',
        fontWeight: 'bold',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: 0,
      });

      const event = new fabric.FabricText('📅 Connect Google Calendar', {
        fontSize: 12,
        fontFamily: 'Poppins',
        fill: '#666666',
        originX: 'center',
        originY: 'center',
        top: 100,
      });

      return new fabric.Group([bg, headerBg, monthYear, days, todayCircle, todayNum, event], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-calendar-${Date.now()}`,
        name: 'Calendar Widget',
        widgetType: 'calendar',
      });
    }

    // Helper to create playlist widget
    function createPlaylistWidget() {
      const bg = new fabric.Rect({
        width: 300,
        height: 180,
        fill: '#1a1a2e',
        rx: 12,
        ry: 12,
        originX: 'center',
        originY: 'center',
      });

      const icon = new fabric.FabricText('🎵', {
        fontSize: 40,
        originX: 'center',
        originY: 'center',
        top: -40,
      });

      const title = new fabric.FabricText('Playlist', {
        fontSize: 20,
        fontFamily: 'Poppins',
        fontWeight: '600',
        fill: '#ffffff',
        originX: 'center',
        originY: 'center',
        top: 10,
      });

      const subtitle = new fabric.FabricText('Select a playlist from your library', {
        fontSize: 12,
        fontFamily: 'Poppins',
        fill: 'rgba(255,255,255,0.6)',
        originX: 'center',
        originY: 'center',
        top: 40,
      });

      const progress = new fabric.Rect({
        width: 200,
        height: 4,
        fill: '#4b5563',
        rx: 2,
        ry: 2,
        originX: 'center',
        originY: 'center',
        top: 70,
      });

      return new fabric.Group([bg, icon, title, subtitle, progress], {
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center',
        id: `widget-playlist-${Date.now()}`,
        name: 'Playlist Widget',
        widgetType: 'playlist',
      });
    }
  }, [canvasWidth, canvasHeight, showToast, syncCanvasObjects]);

  // Alignment handlers
  const handleAlignLeft = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('left', 0);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  const handleAlignCenter = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const objWidth = selectedObject.getScaledWidth();
    selectedObject.set('left', (canvasWidth - objWidth) / 2);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject, canvasWidth]);

  const handleAlignRight = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const objWidth = selectedObject.getScaledWidth();
    selectedObject.set('left', canvasWidth - objWidth);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject, canvasWidth]);

  const handleAlignTop = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('top', 0);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  const handleAlignMiddle = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const objHeight = selectedObject.getScaledHeight();
    selectedObject.set('top', (canvasHeight - objHeight) / 2);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject, canvasHeight]);

  const handleAlignBottom = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    const objHeight = selectedObject.getScaledHeight();
    selectedObject.set('top', canvasHeight - objHeight);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject, canvasHeight]);

  // Flip handlers
  const handleFlipH = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('flipX', !selectedObject.flipX);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  const handleFlipV = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set('flipY', !selectedObject.flipY);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Rotate handlers
  const handleRotateCW = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) + 90);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  const handleRotateCCW = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.rotate((selectedObject.angle || 0) - 90);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Toggle lock on selected object
  const handleToggleSelectedLock = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    const isLocked = selectedObject.lockMovementX && selectedObject.lockMovementY;
    selectedObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
    });
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.25));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  // Toggle pan mode
  const handleTogglePan = useCallback(() => {
    setIsPanMode((prev) => !prev);
  }, []);

  // Handle template selection
  const handleSelectTemplate = useCallback(async (template) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !template) return;

    console.log('handleSelectTemplate called with:', template);

    // Get SVG content - either from svgContent (template_library) or svgUrl
    const svgUrl = template.svgUrl || template.svg_url;
    const svgContent = template.svgContent;

    if (svgContent || svgUrl) {
      setIsLoading(true);
      try {
        let svgString;

        if (svgContent) {
          // Use direct SVG content if available (from template_library)
          svgString = svgContent;
          console.log('Using direct SVG content');
        } else if (svgUrl) {
          // Otherwise fetch from URL
          console.log('Fetching SVG from URL:', svgUrl);
          svgString = await loadSvgContent(svgUrl);
        }

        if (svgString) {
          // Determine new canvas dimensions based on template orientation
          const templateOrientation = template.orientation;
          const templateWidth = template.width || (templateOrientation === 'portrait' ? 1080 : 1920);
          const templateHeight = template.height || (templateOrientation === 'portrait' ? 1920 : 1080);

          // Get original SVG dimensions for proper scaling
          const originalWidth = template.originalWidth;
          const originalHeight = template.originalHeight;

          console.log('Resizing canvas to:', { templateWidth, templateHeight, templateOrientation, originalWidth, originalHeight });

          // Update canvas dimensions
          canvas.setDimensions({ width: templateWidth, height: templateHeight });

          // Clear canvas after resizing
          canvas.clear();
          canvas.backgroundColor = '#ffffff';

          // Load the SVG into the resized canvas with the new dimensions and original SVG dimensions
          await loadSvgIntoCanvas(canvas, svgString, templateWidth, templateHeight, originalWidth, originalHeight);
          setDesignName(template.name || 'Untitled Design');
          setHasUnsavedChanges(true);

          // Re-center the view after resize (CSS zoom only, not canvas zoom)
          setTimeout(() => {
            if (containerRef.current) {
              const containerWidth = containerRef.current.clientWidth;
              const containerHeight = containerRef.current.clientHeight;
              const newZoom = Math.min(
                (containerWidth - 100) / templateWidth,
                (containerHeight - 100) / templateHeight,
                1
              );
              setZoom(newZoom);
              // NOTE: Don't call canvas.setZoom() - zoom is handled via CSS transform on the wrapper
              canvas.renderAll();
            }
          }, 100);

          showToast?.(`Template "${template.name}" loaded`, 'success');
        }
      } catch (err) {
        console.error('Failed to load template:', err);
        showToast?.('Failed to load template', 'error');
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn('Template has no SVG content or URL:', template);
      showToast?.('Template has no content to load', 'error');
    }
  }, [showToast]);

  // Handle save as template
  const handleSaveAsTemplate = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const templateName = window.prompt('Enter template name:', designName);
    if (!templateName?.trim()) return;

    try {
      const fabricJson = canvas.toJSON(['id', 'name', 'selectable', 'evented']);
      const thumbnailDataUrl = canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.3,
      });

      // Save as user template - in production this would call an API
      console.log('Saving template:', { name: templateName, json: fabricJson, thumbnail: thumbnailDataUrl });
      showToast?.(`Template "${templateName}" saved to your library`, 'success');
    } catch (err) {
      console.error('Failed to save template:', err);
      showToast?.('Failed to save template', 'error');
    }
  }, [designName, showToast]);

  // Update selected object property
  const handleUpdateObject = useCallback((property, value) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    selectedObject.set(property, value);
    canvas.renderAll();
    setHasUnsavedChanges(true);

    // Force re-render by incrementing counter
    // This avoids spreading the Fabric object which would convert it to plain JS
    setUpdateCounter(c => c + 1);
  }, [selectedObject]);

  // Bring to front
  const handleBringToFront = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    canvas.bringObjectToFront(selectedObject);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Send to back
  const handleSendToBack = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    canvas.sendObjectToBack(selectedObject);
    canvas.renderAll();
    setHasUnsavedChanges(true);
  }, [selectedObject]);

  // Save design
  const handleSave = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const fabricJson = canvas.toJSON(['id', 'name', 'selectable', 'evented']);
      const thumbnailDataUrl = canvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 0.5, // Half size for thumbnail
      });

      await onSave?.({
        id: designId,
        name: designName,
        templateId,
        fabricJson,
        thumbnailDataUrl,
        width: canvasWidth,
        height: canvasHeight,
      });

      setHasUnsavedChanges(false);
      showToast?.('Design saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to save:', err);
      showToast?.('Failed to save design: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [designId, designName, templateId, canvasWidth, canvasHeight, onSave, showToast]);

  // Export as PNG
  const handleExport = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });

    const link = document.createElement('a');
    link.download = `${designName.replace(/[^a-z0-9]/gi, '_')}.png`;
    link.href = dataUrl;
    link.click();
  }, [designName]);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        onClose?.();
      }
    } else {
      onClose?.();
    }
  }, [hasUnsavedChanges, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to exit preview mode
      if (e.key === 'Escape' && isPreviewMode) {
        setIsPreviewMode(false);
        return;
      }

      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }

      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Duplicate: Ctrl/Cmd + D
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      }

      // Preview: Ctrl/Cmd + P
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsPreviewMode(!isPreviewMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete, handleUndo, handleRedo, handleSave, handleDuplicate, isPreviewMode]);

  // Error state - show full screen error
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to load template</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 relative">
      {/* Loading Overlay - shown on top while loading */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading template...</p>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
        {/* Back Button */}
        <button
          onClick={handleClose}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Back to gallery"
        >
          <ChevronLeft size={20} />
        </button>

        {/* Design Name */}
        <input
          type="text"
          value={designName}
          onChange={(e) => setDesignName(e.target.value)}
          className="bg-gray-700 text-white px-3 py-1.5 rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none min-w-[200px]"
          placeholder="Design name"
        />

        {/* Unsaved indicator */}
        {hasUnsavedChanges && (
          <span className="text-yellow-500 text-sm">Unsaved changes</span>
        )}

        <div className="flex-1" />

        {/* Zoom indicator */}
        <span className="text-gray-400 text-sm">
          {Math.round(zoom * 100)}%
        </span>

        {/* Background color */}
        <div className="relative">
          <button
            onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Background color"
          >
            <Palette size={18} />
            <div
              className="w-4 h-4 rounded border border-gray-500"
              style={{ backgroundColor }}
            />
          </button>
          {showBackgroundPicker && (
            <div className="absolute top-full right-0 mt-2 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Background</span>
                <button
                  onClick={() => setShowBackgroundPicker(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {COLOR_PRESETS.slice(0, 15).map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      handleBackgroundColorChange(color);
                      setShowBackgroundPicker(false);
                    }}
                    className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${
                      backgroundColor === color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleBackgroundColorChange(e.target.value)}
                className="w-full h-8 cursor-pointer rounded"
              />
            </div>
          )}
        </div>

        {/* Layers panel toggle */}
        <button
          onClick={() => setShowLayersPanel(!showLayersPanel)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            showLayersPanel
              ? 'bg-orange-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title="Layers panel"
        >
          <Layers size={18} />
        </button>

        {/* Preview mode */}
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            isPreviewMode
              ? 'bg-orange-500 text-white'
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          title={isPreviewMode ? 'Exit preview' : 'Preview'}
        >
          {isPreviewMode ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {/* Action Buttons */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          title="Export as PNG"
        >
          <Download size={18} />
          Export
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Save
        </button>
      </header>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* Top Toolbar - hide in preview mode */}
      {!isPreviewMode && (
        <TopToolbar
          selectedObject={selectedObject}
          onAddImage={handleAddImage}
          onAddText={handleAddText}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onAlignLeft={handleAlignLeft}
          onAlignCenter={handleAlignCenter}
          onAlignRight={handleAlignRight}
          onAlignTop={handleAlignTop}
          onAlignMiddle={handleAlignMiddle}
          onAlignBottom={handleAlignBottom}
          onFlipH={handleFlipH}
          onFlipV={handleFlipV}
          onRotateCW={handleRotateCW}
          onRotateCCW={handleRotateCCW}
          onToggleLock={handleToggleSelectedLock}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onUpdate={handleUpdateObject}
          isLocked={selectedObject?.lockMovementX && selectedObject?.lockMovementY}
          fonts={GOOGLE_FONTS}
          colorPresets={COLOR_PRESETS}
          usedColors={usedColors}
          usedFonts={usedFonts}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - hide in preview mode */}
        {!isPreviewMode && (
          <LeftSidebar
            onAddShape={handleAddShape}
            onAddText={handleAddTextWithPreset}
            onAddImage={handleAddImageFromUrl}
            onAddIcon={handleAddIcon}
            onAddQRCode={handleAddQRCode}
            onAddWidget={handleAddWidget}
            onSelectTemplate={handleSelectTemplate}
            onSaveAsTemplate={handleSaveAsTemplate}
            templates={LOCAL_SVG_TEMPLATES}
          />
        )}

        {/* Effects Panel - OptiSigns style */}
        {!isPreviewMode && activePanel === 'effects' && (
          <EffectsPanel
            selectedObject={selectedObject}
            onUpdate={handleUpdateObject}
            onClose={() => setActivePanel(null)}
            usedColors={usedColors}
          />
        )}

        {/* Filters Panel - for images */}
        {!isPreviewMode && activePanel === 'filters' && (
          <FiltersPanel
            selectedObject={selectedObject}
            canvas={fabricCanvasRef.current}
            onUpdate={handleUpdateObject}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Animate Panel - OptiSigns style */}
        {!isPreviewMode && activePanel === 'animate' && (
          <AnimatePanel
            selectedObject={selectedObject}
            canvas={fabricCanvasRef.current}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Position Panel - OptiSigns style */}
        {!isPreviewMode && activePanel === 'position' && (
          <PositionPanel
            selectedObject={selectedObject}
            objects={canvasObjects}
            historyItems={history.map((_, i) => ({ label: `Action ${i + 1}` }))}
            currentHistoryIndex={historyIndex}
            onAlign={(direction) => {
              switch (direction) {
                case 'left': handleAlignLeft(); break;
                case 'center-h': handleAlignCenter(); break;
                case 'right': handleAlignRight(); break;
                case 'top': handleAlignTop(); break;
                case 'center-v': handleAlignMiddle(); break;
                case 'bottom': handleAlignBottom(); break;
              }
            }}
            onFlip={(direction) => {
              if (direction === 'horizontal') handleFlipH();
              else handleFlipV();
            }}
            onSelectObject={(obj) => {
              const canvas = fabricCanvasRef.current;
              if (canvas && obj) {
                const canvasObj = canvas.getObjects().find(o => o.id === obj.id);
                if (canvasObj) {
                  canvas.setActiveObject(canvasObj);
                  canvas.renderAll();
                }
              }
            }}
            onToggleVisibility={(obj) => handleToggleVisibility(obj.id)}
            onToggleLock={(obj) => handleToggleLock(obj.id)}
            onDeleteObject={(obj) => {
              const canvas = fabricCanvasRef.current;
              if (canvas && obj) {
                const canvasObj = canvas.getObjects().find(o => o.id === obj.id);
                if (canvasObj) {
                  canvas.remove(canvasObj);
                  canvas.renderAll();
                  setHasUnsavedChanges(true);
                }
              }
            }}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onHistoryJump={(index) => {
              const canvas = fabricCanvasRef.current;
              if (!canvas || index < 0 || index >= history.length) return;
              isUndoRedoAction.current = true;
              const json = JSON.parse(history[index]);
              canvas.loadFromJSON(json).then(() => {
                canvas.renderAll();
                setHistoryIndex(index);
                isUndoRedoAction.current = false;
                setHasUnsavedChanges(true);
              });
            }}
            onClose={() => setActivePanel(null)}
          />
        )}

        {/* Canvas Area - always rendered so ref can attach */}
        <div
          ref={containerRef}
          onContextMenu={handleContextMenu}
          className={`flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-6 relative ${
            isPreviewMode ? 'cursor-none' : isPanMode ? 'cursor-grab' : ''
          }`}
        >
          <div
            className="shadow-2xl"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasRef} />
          </div>

          {/* Floating Canvas Controls - hide in preview mode */}
          {!isPreviewMode && (
            <CanvasControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
              onToggleLayers={() => setShowLayersPanel(!showLayersPanel)}
              showLayers={showLayersPanel}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              isPanMode={isPanMode}
              onTogglePan={handleTogglePan}
            />
          )}
        </div>

        {/* Right Properties Panel removed - properties now in contextual top toolbar */}

        {/* Floating Layers Panel */}
        {showLayersPanel && !isPreviewMode && (
          <LayersPanel
            objects={canvasObjects}
            selectedObjectId={selectedObject?.id}
            onSelect={handleSelectFromLayers}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onReorder={handleReorderLayers}
            onClose={() => setShowLayersPanel(false)}
          />
        )}
      </div>

      {/* Preview mode overlay with exit hint */}
      {isPreviewMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setIsPreviewMode(false)}
            className="flex items-center gap-2 px-4 py-2 bg-black/70 hover:bg-black/90 text-white rounded-full shadow-lg backdrop-blur-sm transition-colors"
          >
            <EyeOff size={16} />
            Exit Preview (or press Esc)
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && !isPreviewMode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedObject={selectedObject}
          onClose={handleCloseContextMenu}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          onCopyStyle={handleCopyStyle}
          onPasteStyle={handlePasteStyle}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onBringToFront={handleBringToFront}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
          onSendToBack={handleSendToBack}
          onAlignLeft={handleAlignLeft}
          onAlignCenter={handleAlignCenter}
          onAlignRight={handleAlignRight}
          onAlignTop={handleAlignTop}
          onAlignMiddle={handleAlignMiddle}
          onAlignBottom={handleAlignBottom}
          onToggleLock={handleToggleSelectedLock}
          onOpenAnimate={() => setActivePanel('animate')}
          onOpenLink={() => {}}
          isLocked={selectedObject?.lockMovementX && selectedObject?.lockMovementY}
          hasClipboard={!!clipboard}
          hasStyleClipboard={!!styleClipboard}
        />
      )}
    </div>
  );
}
