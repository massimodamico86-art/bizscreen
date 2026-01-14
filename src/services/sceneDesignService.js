/**
 * Scene Design Service
 *
 * Provides CRUD operations for scene slides and design management.
 * Used by the drag-and-drop scene editor.
 *
 * @module services/sceneDesignService
 */

import { supabase } from '../supabase';

// ============================================
// SLIDE CRUD OPERATIONS
// ============================================

/**
 * Fetch all slides for a scene ordered by position
 * @param {string} sceneId - The scene ID
 * @returns {Promise<Array>} List of slides with design data
 */
export async function fetchSlidesForScene(sceneId) {
  const { data, error } = await supabase
    .from('scene_slides')
    .select('*')
    .eq('scene_id', sceneId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Create a new slide for a scene
 * @param {string} sceneId - The scene ID
 * @param {Object} partial - Partial slide data
 * @returns {Promise<Object>} The created slide
 */
export async function createSlide(sceneId, partial = {}) {
  // Get the next position
  const { data: existing } = await supabase
    .from('scene_slides')
    .select('position')
    .eq('scene_id', sceneId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existing?.length > 0 ? existing[0].position + 1 : 0;

  const slideData = {
    scene_id: sceneId,
    position: partial.position ?? nextPosition,
    title: partial.title || `Slide ${nextPosition + 1}`,
    kind: partial.kind || 'default',
    design_json: partial.design_json || getDefaultDesign(),
    duration_seconds: partial.duration_seconds || null,
  };

  const { data, error } = await supabase
    .from('scene_slides')
    .insert(slideData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a slide's design and metadata
 * @param {string} slideId - The slide ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} The updated slide
 */
export async function updateSlide(slideId, updates) {
  const allowedFields = ['title', 'kind', 'design_json', 'duration_seconds', 'position'];
  const updateData = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from('scene_slides')
    .update(updateData)
    .eq('id', slideId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a slide
 * @param {string} slideId - The slide ID
 * @returns {Promise<void>}
 */
export async function deleteSlide(slideId) {
  const { error } = await supabase
    .from('scene_slides')
    .delete()
    .eq('id', slideId);

  if (error) throw error;
}

/**
 * Reorder slides by updating their positions
 * @param {string} sceneId - The scene ID
 * @param {string[]} orderedIds - Array of slide IDs in new order
 * @returns {Promise<void>}
 */
export async function reorderSlides(sceneId, orderedIds) {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  // Update each slide's position
  for (const update of updates) {
    const { error } = await supabase
      .from('scene_slides')
      .update({ position: update.position })
      .eq('id', update.id)
      .eq('scene_id', sceneId);

    if (error) throw error;
  }
}

// ============================================
// DEFAULT BLOCK SCHEMAS
// ============================================

/**
 * Default animation schema for all block types
 */
export const DEFAULT_BLOCK_ANIMATION = {
  type: 'none',
  direction: 'none',
  duration: 0.6,
  delay: 0,
};

/**
 * Default shadow schema for text blocks
 */
export const DEFAULT_TEXT_SHADOW = {
  enabled: false,
  color: 'rgba(0,0,0,0.3)',
  blur: 4,
  offsetX: 0,
  offsetY: 2,
};

/**
 * Default data binding schema for blocks
 * Allows binding block content to a data source field
 */
export const DEFAULT_DATA_BINDING = null; // No binding by default

/**
 * Default properties for TEXT blocks
 */
export const TEXT_BLOCK_DEFAULTS = {
  type: 'text',
  x: 0.1,
  y: 0.1,
  width: 0.2,
  height: 0.1,
  layer: 1,
  props: {
    text: 'New Text',
    color: '#ffffff',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '600',
    align: 'left',
    lineHeight: 1.2,
  },
  animation: { ...DEFAULT_BLOCK_ANIMATION },
  shadow: { ...DEFAULT_TEXT_SHADOW },
  dataBinding: DEFAULT_DATA_BINDING,
};

/**
 * Default properties for IMAGE blocks
 */
export const IMAGE_BLOCK_DEFAULTS = {
  type: 'image',
  x: 0.1,
  y: 0.1,
  width: 0.3,
  height: 0.3,
  layer: 1,
  props: {
    url: '',
    fit: 'cover',
    borderRadius: 0,
  },
  animation: { ...DEFAULT_BLOCK_ANIMATION },
};

/**
 * Default properties for SHAPE blocks
 */
export const SHAPE_BLOCK_DEFAULTS = {
  type: 'shape',
  x: 0.05,
  y: 0.05,
  width: 0.2,
  height: 0.2,
  layer: 0,
  props: {
    shape: 'rect',
    fill: '#cccccc',
    opacity: 1,
    borderRadius: 0,
  },
  animation: { ...DEFAULT_BLOCK_ANIMATION },
};

/**
 * Default properties for WIDGET blocks
 * Supports: clock, date, weather, qr
 */
export const WIDGET_BLOCK_DEFAULTS = {
  type: 'widget',
  widgetType: 'clock',
  x: 0.8,
  y: 0.8,
  width: 0.15,
  height: 0.1,
  layer: 10,
  props: {
    // Common styling
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
    align: 'center',
    style: 'minimal',
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    // Size variant for clock/date/weather: 'small' | 'medium' | 'large' | 'custom'
    size: 'medium',
    customFontSize: null, // Custom font size in px (used when size='custom')
    // Weather-specific props
    location: 'Miami, FL',
    units: 'imperial', // 'imperial' or 'metric'
    // QR-specific props
    url: '',
    label: '',
    cornerRadius: 8,
    errorCorrection: 'M', // 'L' | 'M' | 'Q' | 'H'
    qrScale: 1.0, // Size multiplier (0.5 - 2.0)
    qrFgColor: '#000000', // QR foreground color
    qrBgColor: '#ffffff', // QR background color
  },
  animation: { ...DEFAULT_BLOCK_ANIMATION },
};

/**
 * Default background schema
 */
export const DEFAULT_BACKGROUND = {
  type: 'solid',
  color: '#111827',
};

/**
 * Default slide duration in seconds
 */
export const DEFAULT_SLIDE_DURATION = 10;

// ============================================
// NORMALIZATION FUNCTIONS
// ============================================

/**
 * Get default props for a block type
 * @param {string} type - Block type
 * @returns {Object} Default block schema
 */
export function getBlockDefaults(type) {
  switch (type) {
    case 'text':
      return TEXT_BLOCK_DEFAULTS;
    case 'image':
      return IMAGE_BLOCK_DEFAULTS;
    case 'shape':
      return SHAPE_BLOCK_DEFAULTS;
    case 'widget':
      return WIDGET_BLOCK_DEFAULTS;
    default:
      return TEXT_BLOCK_DEFAULTS;
  }
}

/**
 * Deep merge two objects, with target values taking precedence
 * @param {Object} defaults - Default values
 * @param {Object} target - Target values (takes precedence)
 * @returns {Object} Merged object
 */
function deepMerge(defaults, target) {
  if (!target) return { ...defaults };
  if (!defaults) return target;

  const result = { ...defaults };
  for (const key of Object.keys(target)) {
    if (target[key] !== undefined && target[key] !== null) {
      if (typeof target[key] === 'object' && !Array.isArray(target[key]) && target[key] !== null) {
        result[key] = deepMerge(defaults[key], target[key]);
      } else {
        result[key] = target[key];
      }
    }
  }
  return result;
}

/**
 * Properties that should be inside `props` for each block type.
 * Used to migrate legacy blocks where these were on the block root.
 */
const PROPS_FIELDS = {
  text: ['text', 'color', 'fontSize', 'fontWeight', 'fontFamily', 'align', 'lineHeight', 'letterSpacing'],
  image: ['url', 'src', 'fit', 'borderRadius', 'media_asset_id', 'placeholder'],
  shape: ['shape', 'fill', 'opacity', 'borderRadius', 'stroke', 'strokeWidth'],
  widget: ['style', 'textColor', 'backgroundColor', 'accentColor', 'size', 'customFontSize', 'location', 'units', 'url', 'label', 'cornerRadius', 'errorCorrection', 'qrScale', 'qrFgColor', 'qrBgColor'],
};

/**
 * Migrate legacy block properties into props object
 * Handles blocks where text, fontSize, etc. are on root instead of in props
 * @param {Object} block - Block to migrate
 * @returns {Object} Block with properties moved into props
 */
function migrateBlockProps(block) {
  if (!block) return block;

  const type = block.type || 'text';
  const propsFields = PROPS_FIELDS[type] || PROPS_FIELDS.text;
  const migrated = { ...block };

  // Ensure props exists
  if (!migrated.props) {
    migrated.props = {};
  }

  // Move any root-level props fields into props object
  for (const field of propsFields) {
    if (migrated[field] !== undefined && migrated.props[field] === undefined) {
      migrated.props[field] = migrated[field];
      delete migrated[field];
    }
  }

  return migrated;
}

/**
 * Normalize a single block to ensure all required properties exist
 * @param {Object} block - Block to normalize
 * @returns {Object} Normalized block with complete schema
 */
export function normalizeBlock(block) {
  if (!block) return null;

  // First, migrate any legacy props from root level into props object
  const migrated = migrateBlockProps(block);

  const type = migrated.type || 'text';
  const defaults = getBlockDefaults(type);

  // Generate ID if missing
  const id = migrated.id || generateBlockId();

  // Merge block with defaults, block values take precedence
  const normalized = deepMerge(defaults, migrated);
  normalized.id = id;
  normalized.type = type;

  // Ensure props exists and has all required fields for the type
  if (!normalized.props) {
    normalized.props = { ...defaults.props };
  } else {
    normalized.props = deepMerge(defaults.props, normalized.props);
  }

  // Ensure position values are valid numbers (0-1 range)
  normalized.x = typeof normalized.x === 'number' ? Math.max(0, Math.min(1, normalized.x)) : defaults.x;
  normalized.y = typeof normalized.y === 'number' ? Math.max(0, Math.min(1, normalized.y)) : defaults.y;
  normalized.width = typeof normalized.width === 'number' ? Math.max(0.01, Math.min(1, normalized.width)) : defaults.width;
  normalized.height = typeof normalized.height === 'number' ? Math.max(0.01, Math.min(1, normalized.height)) : defaults.height;
  normalized.layer = typeof normalized.layer === 'number' ? normalized.layer : defaults.layer;

  // Ensure animation exists
  if (!normalized.animation) {
    normalized.animation = { ...DEFAULT_BLOCK_ANIMATION };
  }

  // Preserve dataBinding if it exists (don't override with default null)
  // dataBinding schema: { sourceId, field, rowSelector: { mode, index?, matchField?, matchValue? }, format? }
  if (migrated.dataBinding && typeof migrated.dataBinding === 'object') {
    normalized.dataBinding = {
      sourceId: migrated.dataBinding.sourceId || null,
      field: migrated.dataBinding.field || null,
      rowSelector: migrated.dataBinding.rowSelector || { mode: 'index', index: 0 },
      ...(migrated.dataBinding.format && { format: migrated.dataBinding.format }),
    };
    // Only keep valid bindings (must have sourceId and field)
    if (!normalized.dataBinding.sourceId || !normalized.dataBinding.field) {
      normalized.dataBinding = null;
    }
  } else {
    normalized.dataBinding = null;
  }

  return normalized;
}

/**
 * Normalize a background object
 * @param {Object} background - Background to normalize
 * @returns {Object} Normalized background
 */
export function normalizeBackground(background) {
  if (!background) return { ...DEFAULT_BACKGROUND };

  const normalized = { ...DEFAULT_BACKGROUND, ...background };

  // Ensure type is valid
  if (!['solid', 'gradient', 'image'].includes(normalized.type)) {
    normalized.type = 'solid';
  }

  // Ensure color exists for solid backgrounds
  if (normalized.type === 'solid' && !normalized.color) {
    normalized.color = DEFAULT_BACKGROUND.color;
  }

  return normalized;
}

/**
 * Normalize a slide's design_json
 * @param {Object} slide - Slide object (with design_json or design property)
 * @returns {Object} Normalized slide
 */
export function normalizeSlide(slide) {
  if (!slide) return null;

  const result = { ...slide };

  // Get the design - could be in design_json or design
  let design = slide.design_json || slide.design || {};

  // Normalize background
  design.background = normalizeBackground(design.background);

  // Normalize blocks
  if (!Array.isArray(design.blocks)) {
    design.blocks = [];
  } else {
    design.blocks = design.blocks
      .filter(block => block !== null && block !== undefined)
      .map(block => normalizeBlock(block));
  }

  // Ensure transition exists if specified
  if (design.transition && typeof design.transition === 'object') {
    design.transition = {
      type: design.transition.type || 'none',
      durationMs: design.transition.durationMs || 700,
    };
  }

  // Update the slide with normalized design
  if (slide.design_json !== undefined) {
    result.design_json = design;
  }
  if (slide.design !== undefined) {
    result.design = design;
  }

  // Ensure duration exists
  if (result.duration_seconds === undefined || result.duration_seconds === null) {
    result.duration_seconds = DEFAULT_SLIDE_DURATION;
  }

  return result;
}

/**
 * Normalize all slides in a scene
 * @param {Object} scene - Scene object with slides array
 * @returns {Object} Scene with normalized slides
 */
export function normalizeScene(scene) {
  if (!scene) return null;

  const result = { ...scene };

  if (Array.isArray(scene.slides)) {
    result.slides = scene.slides.map(slide => normalizeSlide(slide));
  }

  return result;
}

/**
 * Normalize a design object (for direct design updates)
 * @param {Object} design - Design JSON object
 * @returns {Object} Normalized design
 */
export function normalizeDesign(design) {
  if (!design) return getDefaultDesign();

  const normalized = { ...design };

  // Normalize background
  normalized.background = normalizeBackground(design.background);

  // Normalize blocks
  if (!Array.isArray(normalized.blocks)) {
    normalized.blocks = [];
  } else {
    normalized.blocks = normalized.blocks
      .filter(block => block !== null && block !== undefined)
      .map(block => normalizeBlock(block));
  }

  return normalized;
}

// ============================================
// DESIGN HELPERS
// ============================================

/**
 * Get default design JSON for a new blank slide
 * @returns {Object} Default design structure
 */
export function getDefaultDesign() {
  return {
    background: { ...DEFAULT_BACKGROUND },
    blocks: [],
  };
}

/**
 * Generate a unique block ID
 * @returns {string} Unique block ID
 */
export function generateBlockId() {
  return `blk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new text block
 * @param {Object} options - Block options
 * @returns {Object} Text block
 */
export function createTextBlock(options = {}) {
  return {
    id: generateBlockId(),
    type: 'text',
    x: options.x ?? 0.1,
    y: options.y ?? 0.4,
    width: options.width ?? 0.8,
    height: options.height ?? 0.2,
    layer: options.layer ?? 1,
    props: {
      text: options.text || 'New Text',
      fontSize: options.fontSize || 32,
      fontWeight: options.fontWeight || '600',
      align: options.align || 'center',
      color: options.color || '#ffffff',
    },
  };
}

/**
 * Create a new image block
 * @param {Object} options - Block options
 * @returns {Object} Image block
 */
export function createImageBlock(options = {}) {
  return {
    id: generateBlockId(),
    type: 'image',
    x: options.x ?? 0.1,
    y: options.y ?? 0.1,
    width: options.width ?? 0.3,
    height: options.height ?? 0.4,
    layer: options.layer ?? 1,
    props: {
      media_asset_id: options.media_asset_id || null,
      url: options.url || null,
      fit: options.fit || 'cover',
      borderRadius: options.borderRadius || 8,
    },
  };
}

/**
 * Create a new widget block (clock, etc.)
 * @param {Object} options - Block options
 * @returns {Object} Widget block
 */
export function createWidgetBlock(options = {}) {
  return {
    id: generateBlockId(),
    type: 'widget',
    widgetType: options.widgetType || 'clock',
    x: options.x ?? 0.8,
    y: options.y ?? 0.85,
    width: options.width ?? 0.15,
    height: options.height ?? 0.1,
    layer: options.layer ?? 10,
    props: {
      style: options.style || 'minimal',
      ...options.props,
    },
  };
}

/**
 * Create a new shape block
 * @param {Object} options - Block options
 * @returns {Object} Shape block
 */
export function createShapeBlock(options = {}) {
  return {
    id: generateBlockId(),
    type: 'shape',
    x: options.x ?? 0.1,
    y: options.y ?? 0.1,
    width: options.width ?? 0.3,
    height: options.height ?? 0.3,
    layer: options.layer ?? 0,
    props: {
      shape: options.shape || 'rectangle',
      fill: options.fill || '#3B82F6',
      opacity: options.opacity ?? 0.8,
      borderRadius: options.borderRadius || 0,
    },
  };
}

/**
 * Update a block in the design JSON
 * @param {Object} design - Current design JSON
 * @param {string} blockId - Block ID to update
 * @param {Object} updates - Updates to apply
 * @returns {Object} New design with updated block
 */
export function updateBlockInDesign(design, blockId, updates) {
  return {
    ...design,
    blocks: design.blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    ),
  };
}

/**
 * Remove a block from the design JSON
 * @param {Object} design - Current design JSON
 * @param {string} blockId - Block ID to remove
 * @returns {Object} New design without the block
 */
export function removeBlockFromDesign(design, blockId) {
  return {
    ...design,
    blocks: design.blocks.filter(block => block.id !== blockId),
  };
}

/**
 * Add a block to the design JSON
 * @param {Object} design - Current design JSON
 * @param {Object} block - Block to add
 * @returns {Object} New design with the block added
 */
export function addBlockToDesign(design, block) {
  return {
    ...design,
    blocks: [...design.blocks, block],
  };
}

// ============================================
// ANIMATION HELPERS
// ============================================

/**
 * Animation type options
 */
export const ANIMATION_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide In' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'pop', label: 'Pop In' },
];

/**
 * Animation direction options (for slide animation)
 */
export const ANIMATION_DIRECTIONS = [
  { value: 'up', label: 'From Bottom' },
  { value: 'down', label: 'From Top' },
  { value: 'left', label: 'From Right' },
  { value: 'right', label: 'From Left' },
];

/**
 * Transition type options for slides
 */
export const TRANSITION_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'zoom', label: 'Zoom' },
  // Extended transitions
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'wipe-right', label: 'Wipe Right' },
  { value: 'wipe-left', label: 'Wipe Left' },
  { value: 'wipe-up', label: 'Wipe Up' },
  { value: 'wipe-down', label: 'Wipe Down' },
  { value: 'push-right', label: 'Push Right' },
  { value: 'push-left', label: 'Push Left' },
  { value: 'flip-x', label: 'Flip Horizontal' },
  { value: 'flip-y', label: 'Flip Vertical' },
  { value: 'cube', label: '3D Cube' },
];

/**
 * Default animation settings
 */
export const DEFAULT_ANIMATION = {
  type: 'none',
  direction: 'up',
  delayMs: 0,
  durationMs: 600,
};

/**
 * Default transition settings
 */
export const DEFAULT_TRANSITION = {
  type: 'none',
  durationMs: 700,
};

/**
 * Apply animation to a block in the design
 * @param {Object} design - Current design JSON
 * @param {string} blockId - Block ID to apply animation to
 * @param {Object} animation - Animation settings
 * @returns {Object} New design with animation applied
 */
export function applyBlockAnimation(design, blockId, animation) {
  return {
    ...design,
    blocks: design.blocks.map(block =>
      block.id === blockId
        ? { ...block, animation: { ...DEFAULT_ANIMATION, ...animation } }
        : block
    ),
  };
}

/**
 * Clear animation from a block
 * @param {Object} design - Current design JSON
 * @param {string} blockId - Block ID to clear animation from
 * @returns {Object} New design without animation on block
 */
export function clearBlockAnimation(design, blockId) {
  return {
    ...design,
    blocks: design.blocks.map(block => {
      if (block.id === blockId) {
        const { animation, ...rest } = block;
        return rest;
      }
      return block;
    }),
  };
}

/**
 * Apply transition to the slide design
 * @param {Object} design - Current design JSON
 * @param {Object} transition - Transition settings
 * @returns {Object} New design with transition applied
 */
export function applySlideTransition(design, transition) {
  return {
    ...design,
    transition: { ...DEFAULT_TRANSITION, ...transition },
  };
}

/**
 * Clear transition from the slide design
 * @param {Object} design - Current design JSON
 * @returns {Object} New design without transition
 */
export function clearSlideTransition(design) {
  const { transition, ...rest } = design;
  return rest;
}

/**
 * Get animation for a block
 * @param {Object} block - Block object
 * @returns {Object} Animation settings or default
 */
export function getBlockAnimation(block) {
  return block?.animation || { type: 'none' };
}

/**
 * Get transition for a design
 * @param {Object} design - Design JSON
 * @returns {Object} Transition settings or default
 */
export function getSlideTransition(design) {
  return design?.transition || { type: 'none' };
}

/**
 * Generate CSS animation styles for a block
 * @param {Object} animation - Animation settings
 * @returns {Object} CSS style object for animation
 */
export function getBlockAnimationStyles(animation) {
  if (!animation || animation.type === 'none') {
    return {};
  }

  const { type, direction = 'up', delayMs = 0, durationMs = 600 } = animation;

  const baseStyles = {
    animationDuration: `${durationMs}ms`,
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  };

  switch (type) {
    case 'fade':
      return {
        ...baseStyles,
        animationName: 'fadeIn',
      };
    case 'slide':
      const slideAnimations = {
        up: 'slideInUp',
        down: 'slideInDown',
        left: 'slideInLeft',
        right: 'slideInRight',
      };
      return {
        ...baseStyles,
        animationName: slideAnimations[direction] || 'slideInUp',
      };
    case 'zoom':
      return {
        ...baseStyles,
        animationName: 'zoomIn',
      };
    case 'pop':
      return {
        ...baseStyles,
        animationName: 'popIn',
        animationTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      };
    default:
      return {};
  }
}

/**
 * Generate CSS transition styles for slide transitions
 * @param {Object} transition - Transition settings
 * @returns {Object} CSS style object for transition
 */
export function getSlideTransitionStyles(transition) {
  if (!transition || transition.type === 'none') {
    return {};
  }

  const { type, durationMs = 700 } = transition;

  const baseStyles = {
    animationDuration: `${durationMs}ms`,
    animationFillMode: 'both',
    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
  };

  // Map transition types to animation names
  const animationMap = {
    fade: 'fadeIn',
    slide: 'slideInRight',
    zoom: 'zoomIn',
    dissolve: 'dissolveIn',
    'wipe-right': 'wipeRight',
    'wipe-left': 'wipeLeft',
    'wipe-up': 'wipeUp',
    'wipe-down': 'wipeDown',
    'push-right': 'pushRight',
    'push-left': 'pushLeft',
    'flip-x': 'flipX',
    'flip-y': 'flipY',
    cube: 'cubeRotate',
  };

  const animationName = animationMap[type];
  if (!animationName) {
    return {};
  }

  // 3D transitions need perspective on parent
  const is3D = ['flip-x', 'flip-y', 'cube'].includes(type);

  return {
    ...baseStyles,
    animationName,
    ...(is3D && { transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }),
  };
}

/**
 * CSS keyframes for animations (to be injected into page)
 */
export const ANIMATION_KEYFRAMES = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInDown {
  from {
    transform: translateY(-30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(-30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes zoomIn {
  from {
    transform: scale(0.85);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes popIn {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  70% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Extended Slide Transitions */

@keyframes dissolveIn {
  from {
    opacity: 0;
    filter: blur(8px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

@keyframes wipeRight {
  from {
    clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

@keyframes wipeLeft {
  from {
    clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%);
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

@keyframes wipeUp {
  from {
    clip-path: polygon(0 100%, 100% 100%, 100% 100%, 0 100%);
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

@keyframes wipeDown {
  from {
    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
  }
  to {
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}

@keyframes pushRight {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pushLeft {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes flipX {
  from {
    transform: perspective(1000px) rotateY(-90deg);
    opacity: 0;
  }
  to {
    transform: perspective(1000px) rotateY(0deg);
    opacity: 1;
  }
}

@keyframes flipY {
  from {
    transform: perspective(1000px) rotateX(-90deg);
    opacity: 0;
  }
  to {
    transform: perspective(1000px) rotateX(0deg);
    opacity: 1;
  }
}

@keyframes cubeRotate {
  from {
    transform: perspective(1000px) rotateY(-90deg) translateZ(50%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  to {
    transform: perspective(1000px) rotateY(0deg) translateZ(0);
    opacity: 1;
  }
}
`;

// ============================================
// SMART SNAP & ALIGNMENT GUIDES
// ============================================

/**
 * Default snap threshold in percentage of canvas (0.01 = 1%)
 */
export const SNAP_THRESHOLD = 0.01;

/**
 * Guide types for alignment
 */
export const GUIDE_TYPES = {
  LEFT: 'left',
  RIGHT: 'right',
  TOP: 'top',
  BOTTOM: 'bottom',
  CENTER_H: 'center-h',
  CENTER_V: 'center-v',
  CANVAS_CENTER_H: 'canvas-center-h',
  CANVAS_CENTER_V: 'canvas-center-v',
};

/**
 * Get edges and centers of a block
 * @param {Object} block - Block with x, y, width, height
 * @returns {Object} Edges and centers { left, right, top, bottom, centerX, centerY }
 */
export function getBlockEdges(block) {
  const left = block.x;
  const right = block.x + block.width;
  const top = block.y;
  const bottom = block.y + block.height;
  const centerX = block.x + block.width / 2;
  const centerY = block.y + block.height / 2;
  return { left, right, top, bottom, centerX, centerY };
}

/**
 * Find alignment guides for a moving block against other blocks and canvas
 * @param {Object} block - The block being moved/resized
 * @param {Array} otherBlocks - Other blocks to snap to (excludes the moving block)
 * @param {number} threshold - Snap threshold (default 0.01 = 1%)
 * @returns {Array} Array of guide objects { type, position, from, to }
 */
export function findAlignmentGuides(block, otherBlocks, threshold = SNAP_THRESHOLD) {
  const guides = [];
  const moving = getBlockEdges(block);

  // Canvas center guides (0.5, 0.5)
  if (Math.abs(moving.centerX - 0.5) < threshold) {
    guides.push({
      type: GUIDE_TYPES.CANVAS_CENTER_V,
      position: 0.5,
      axis: 'vertical',
      from: 0,
      to: 1,
    });
  }
  if (Math.abs(moving.centerY - 0.5) < threshold) {
    guides.push({
      type: GUIDE_TYPES.CANVAS_CENTER_H,
      position: 0.5,
      axis: 'horizontal',
      from: 0,
      to: 1,
    });
  }

  // Check against other blocks
  for (const other of otherBlocks) {
    if (!other || other.id === block.id) continue;

    const target = getBlockEdges(other);

    // Vertical guides (snap x positions)
    // Left edge to left edge
    if (Math.abs(moving.left - target.left) < threshold) {
      guides.push({
        type: GUIDE_TYPES.LEFT,
        position: target.left,
        axis: 'vertical',
        from: Math.min(moving.top, target.top),
        to: Math.max(moving.bottom, target.bottom),
        sourceBlockId: other.id,
      });
    }
    // Right edge to right edge
    if (Math.abs(moving.right - target.right) < threshold) {
      guides.push({
        type: GUIDE_TYPES.RIGHT,
        position: target.right,
        axis: 'vertical',
        from: Math.min(moving.top, target.top),
        to: Math.max(moving.bottom, target.bottom),
        sourceBlockId: other.id,
      });
    }
    // Left to right
    if (Math.abs(moving.left - target.right) < threshold) {
      guides.push({
        type: GUIDE_TYPES.LEFT,
        position: target.right,
        axis: 'vertical',
        from: Math.min(moving.top, target.top),
        to: Math.max(moving.bottom, target.bottom),
        sourceBlockId: other.id,
      });
    }
    // Right to left
    if (Math.abs(moving.right - target.left) < threshold) {
      guides.push({
        type: GUIDE_TYPES.RIGHT,
        position: target.left,
        axis: 'vertical',
        from: Math.min(moving.top, target.top),
        to: Math.max(moving.bottom, target.bottom),
        sourceBlockId: other.id,
      });
    }
    // Center vertical alignment
    if (Math.abs(moving.centerX - target.centerX) < threshold) {
      guides.push({
        type: GUIDE_TYPES.CENTER_V,
        position: target.centerX,
        axis: 'vertical',
        from: Math.min(moving.top, target.top),
        to: Math.max(moving.bottom, target.bottom),
        sourceBlockId: other.id,
      });
    }

    // Horizontal guides (snap y positions)
    // Top edge to top edge
    if (Math.abs(moving.top - target.top) < threshold) {
      guides.push({
        type: GUIDE_TYPES.TOP,
        position: target.top,
        axis: 'horizontal',
        from: Math.min(moving.left, target.left),
        to: Math.max(moving.right, target.right),
        sourceBlockId: other.id,
      });
    }
    // Bottom edge to bottom edge
    if (Math.abs(moving.bottom - target.bottom) < threshold) {
      guides.push({
        type: GUIDE_TYPES.BOTTOM,
        position: target.bottom,
        axis: 'horizontal',
        from: Math.min(moving.left, target.left),
        to: Math.max(moving.right, target.right),
        sourceBlockId: other.id,
      });
    }
    // Top to bottom
    if (Math.abs(moving.top - target.bottom) < threshold) {
      guides.push({
        type: GUIDE_TYPES.TOP,
        position: target.bottom,
        axis: 'horizontal',
        from: Math.min(moving.left, target.left),
        to: Math.max(moving.right, target.right),
        sourceBlockId: other.id,
      });
    }
    // Bottom to top
    if (Math.abs(moving.bottom - target.top) < threshold) {
      guides.push({
        type: GUIDE_TYPES.BOTTOM,
        position: target.top,
        axis: 'horizontal',
        from: Math.min(moving.left, target.left),
        to: Math.max(moving.right, target.right),
        sourceBlockId: other.id,
      });
    }
    // Center horizontal alignment
    if (Math.abs(moving.centerY - target.centerY) < threshold) {
      guides.push({
        type: GUIDE_TYPES.CENTER_H,
        position: target.centerY,
        axis: 'horizontal',
        from: Math.min(moving.left, target.left),
        to: Math.max(moving.right, target.right),
        sourceBlockId: other.id,
      });
    }
  }

  // Deduplicate guides by position and axis
  const seen = new Set();
  return guides.filter(guide => {
    const key = `${guide.axis}-${guide.position.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Calculate snapped position for a block based on nearby blocks and canvas
 * @param {Object} block - The block being moved { x, y, width, height }
 * @param {Array} otherBlocks - Other blocks to snap to
 * @param {number} threshold - Snap threshold (default 0.01 = 1%)
 * @returns {Object} Snapped position { x, y, snappedX, snappedY }
 */
export function calculateSnapPosition(block, otherBlocks, threshold = SNAP_THRESHOLD) {
  let snappedX = block.x;
  let snappedY = block.y;
  let didSnapX = false;
  let didSnapY = false;

  const moving = getBlockEdges(block);

  // Snap to canvas center
  if (Math.abs(moving.centerX - 0.5) < threshold) {
    snappedX = 0.5 - block.width / 2;
    didSnapX = true;
  }
  if (Math.abs(moving.centerY - 0.5) < threshold) {
    snappedY = 0.5 - block.height / 2;
    didSnapY = true;
  }

  // Check against other blocks
  for (const other of otherBlocks) {
    if (!other || other.id === block.id) continue;

    const target = getBlockEdges(other);

    // Horizontal snapping (x)
    if (!didSnapX) {
      // Left to left
      if (Math.abs(moving.left - target.left) < threshold) {
        snappedX = target.left;
        didSnapX = true;
      }
      // Right to right
      else if (Math.abs(moving.right - target.right) < threshold) {
        snappedX = target.right - block.width;
        didSnapX = true;
      }
      // Left to right
      else if (Math.abs(moving.left - target.right) < threshold) {
        snappedX = target.right;
        didSnapX = true;
      }
      // Right to left
      else if (Math.abs(moving.right - target.left) < threshold) {
        snappedX = target.left - block.width;
        didSnapX = true;
      }
      // Center to center
      else if (Math.abs(moving.centerX - target.centerX) < threshold) {
        snappedX = target.centerX - block.width / 2;
        didSnapX = true;
      }
    }

    // Vertical snapping (y)
    if (!didSnapY) {
      // Top to top
      if (Math.abs(moving.top - target.top) < threshold) {
        snappedY = target.top;
        didSnapY = true;
      }
      // Bottom to bottom
      else if (Math.abs(moving.bottom - target.bottom) < threshold) {
        snappedY = target.bottom - block.height;
        didSnapY = true;
      }
      // Top to bottom
      else if (Math.abs(moving.top - target.bottom) < threshold) {
        snappedY = target.bottom;
        didSnapY = true;
      }
      // Bottom to top
      else if (Math.abs(moving.bottom - target.top) < threshold) {
        snappedY = target.top - block.height;
        didSnapY = true;
      }
      // Center to center
      else if (Math.abs(moving.centerY - target.centerY) < threshold) {
        snappedY = target.centerY - block.height / 2;
        didSnapY = true;
      }
    }

    if (didSnapX && didSnapY) break;
  }

  return {
    x: snappedX,
    y: snappedY,
    snappedX: didSnapX,
    snappedY: didSnapY,
  };
}

/**
 * Find equal spacing indicators between blocks
 * @param {Object} block - The moving block
 * @param {Array} otherBlocks - Other blocks
 * @param {number} threshold - Spacing match threshold
 * @returns {Array} Equal spacing indicators
 */
export function findEqualSpacing(block, otherBlocks, threshold = 0.005) {
  const spacings = [];
  const moving = getBlockEdges(block);

  // Group blocks that are horizontally or vertically aligned
  const horizontallyAligned = otherBlocks.filter(other => {
    if (!other || other.id === block.id) return false;
    const target = getBlockEdges(other);
    return Math.abs(moving.centerY - target.centerY) < 0.1;
  });

  const verticallyAligned = otherBlocks.filter(other => {
    if (!other || other.id === block.id) return false;
    const target = getBlockEdges(other);
    return Math.abs(moving.centerX - target.centerX) < 0.1;
  });

  // Check horizontal equal spacing
  if (horizontallyAligned.length >= 2) {
    // Sort by x position
    const sorted = [...horizontallyAligned].sort((a, b) => a.x - b.x);

    for (let i = 0; i < sorted.length - 1; i++) {
      const gap1 = sorted[i + 1].x - (sorted[i].x + sorted[i].width);
      const movingGapLeft = moving.left - (sorted[i].x + sorted[i].width);
      const movingGapRight = sorted[i + 1].x - moving.right;

      if (Math.abs(gap1 - movingGapLeft) < threshold || Math.abs(gap1 - movingGapRight) < threshold) {
        spacings.push({
          axis: 'horizontal',
          spacing: gap1,
          blocks: [sorted[i].id, sorted[i + 1].id],
        });
      }
    }
  }

  // Check vertical equal spacing
  if (verticallyAligned.length >= 2) {
    const sorted = [...verticallyAligned].sort((a, b) => a.y - b.y);

    for (let i = 0; i < sorted.length - 1; i++) {
      const gap1 = sorted[i + 1].y - (sorted[i].y + sorted[i].height);
      const movingGapTop = moving.top - (sorted[i].y + sorted[i].height);
      const movingGapBottom = sorted[i + 1].y - moving.bottom;

      if (Math.abs(gap1 - movingGapTop) < threshold || Math.abs(gap1 - movingGapBottom) < threshold) {
        spacings.push({
          axis: 'vertical',
          spacing: gap1,
          blocks: [sorted[i].id, sorted[i + 1].id],
        });
      }
    }
  }

  return spacings;
}

// ============================================
// EXPORTS
// ============================================

export default {
  fetchSlidesForScene,
  createSlide,
  updateSlide,
  deleteSlide,
  reorderSlides,
  getDefaultDesign,
  generateBlockId,
  createTextBlock,
  createImageBlock,
  createWidgetBlock,
  createShapeBlock,
  updateBlockInDesign,
  removeBlockFromDesign,
  addBlockToDesign,
  // Animation exports
  ANIMATION_TYPES,
  ANIMATION_DIRECTIONS,
  TRANSITION_TYPES,
  DEFAULT_ANIMATION,
  DEFAULT_TRANSITION,
  applyBlockAnimation,
  clearBlockAnimation,
  applySlideTransition,
  clearSlideTransition,
  getBlockAnimation,
  getSlideTransition,
  getBlockAnimationStyles,
  getSlideTransitionStyles,
  ANIMATION_KEYFRAMES,
  // Snap & alignment exports
  SNAP_THRESHOLD,
  GUIDE_TYPES,
  getBlockEdges,
  findAlignmentGuides,
  calculateSnapPosition,
  findEqualSpacing,
};
