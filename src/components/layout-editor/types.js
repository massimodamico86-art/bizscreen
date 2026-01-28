/**
 * Layout Editor Types
 *
 * Type definitions and helpers for the Yodeck-style layout editor.
 * Uses JSDoc for type safety without TypeScript.
 */

/* eslint-disable no-dupe-keys */
// NOTE: Duplicate keys are intentional for deep merge pattern with spread operator.
// The pattern: {...defaults, ...overrides, props: {...props, ...overrides?.props}}
// ensures both shallow and deep properties are properly merged.

/**
 * @typedef {'text' | 'image' | 'widget' | 'shape'} ElementType
 */

/**
 * @typedef {'clock' | 'date' | 'weather' | 'qr' | 'data' | 'countdown' | 'ticker'} WidgetType
 */

/**
 * @typedef {'rectangle' | 'circle' | 'line'} ShapeType
 */

/**
 * @typedef {Object} Position
 * @property {number} x - X position as fraction (0-1)
 * @property {number} y - Y position as fraction (0-1)
 * @property {number} width - Width as fraction (0-1)
 * @property {number} height - Height as fraction (0-1)
 */

/**
 * @typedef {Object} TextElementProps
 * @property {string} text - Text content
 * @property {number} [fontSize=32] - Font size in pixels
 * @property {string} [fontFamily='Inter'] - Font family
 * @property {'normal' | 'bold' | '600' | '700'} [fontWeight='normal'] - Font weight
 * @property {'left' | 'center' | 'right'} [align='left'] - Text alignment
 * @property {string} [color='#ffffff'] - Text color
 * @property {string} [backgroundColor] - Optional background color
 * @property {number} [padding=0] - Padding in pixels
 * @property {number} [borderRadius=0] - Border radius in pixels
 */

/**
 * @typedef {Object} ImageElementProps
 * @property {string} url - Image URL
 * @property {'cover' | 'contain' | 'fill'} [fit='cover'] - Object fit mode
 * @property {number} [borderRadius=0] - Border radius in pixels
 * @property {number} [opacity=1] - Opacity (0-1)
 * @property {string} [alt] - Alt text for accessibility
 */

/**
 * @typedef {Object} ShapeElementProps
 * @property {ShapeType} shapeType - Type of shape
 * @property {string} [fill='#3b82f6'] - Fill color
 * @property {string} [stroke] - Stroke color
 * @property {number} [strokeWidth=0] - Stroke width
 * @property {number} [borderRadius=0] - Border radius for rectangles
 * @property {number} [opacity=1] - Opacity (0-1)
 */

/**
 * @typedef {Object} WidgetClockProps
 * @property {string} [textColor='#ffffff'] - Text color
 * @property {'12h' | '24h'} [format='12h'] - Time format
 * @property {boolean} [showSeconds=false] - Show seconds
 * @property {string} [timezone] - Optional timezone
 */

/**
 * @typedef {Object} WidgetDateProps
 * @property {string} [textColor='#ffffff'] - Text color
 * @property {'short' | 'long' | 'full'} [format='short'] - Date format
 */

/**
 * @typedef {Object} WidgetWeatherProps
 * @property {string} [textColor='#ffffff'] - Text color
 * @property {string} [location='Miami, FL'] - Location
 * @property {'imperial' | 'metric'} [units='imperial'] - Temperature units
 * @property {'minimal' | 'card'} [style='minimal'] - Display style
 */

/**
 * @typedef {Object} WidgetQRProps
 * @property {string} url - QR code URL
 * @property {string} [label] - Optional label
 * @property {string} [fgColor='#000000'] - QR foreground color
 * @property {string} [bgColor='#ffffff'] - QR background color
 * @property {number} [cornerRadius=8] - Corner radius
 */

/**
 * @typedef {Object} WidgetDataProps
 * @property {string} dataSourceId - Data source ID
 * @property {string} field - Field name to display
 * @property {number} [rowIndex=0] - Row index
 * @property {string} [textColor='#ffffff'] - Text color
 * @property {number} [fontSize=24] - Font size
 */

/**
 * @typedef {WidgetClockProps | WidgetDateProps | WidgetWeatherProps | WidgetQRProps | WidgetDataProps} WidgetProps
 */

/**
 * @typedef {Object} BaseElement
 * @property {string} id - Unique element ID
 * @property {ElementType} type - Element type
 * @property {Position} position - Position and size
 * @property {number} [layer=1] - Z-index layer
 * @property {boolean} [locked=false] - Whether element is locked
 * @property {string} [name] - Optional element name for layers panel
 */

/**
 * @typedef {BaseElement & { type: 'text', props: TextElementProps }} TextElement
 */

/**
 * @typedef {BaseElement & { type: 'image', props: ImageElementProps }} ImageElement
 */

/**
 * @typedef {BaseElement & { type: 'widget', widgetType: WidgetType, props: WidgetProps }} WidgetElement
 */

/**
 * @typedef {BaseElement & { type: 'shape', props: ShapeElementProps }} ShapeElement
 */

/**
 * @typedef {TextElement | ImageElement | WidgetElement | ShapeElement} LayoutElement
 */

/**
 * @typedef {Object} LayoutBackground
 * @property {'solid' | 'gradient' | 'image'} type - Background type
 * @property {string} [color] - Solid color (for type='solid')
 * @property {string} [from] - Gradient start color (for type='gradient')
 * @property {string} [to] - Gradient end color (for type='gradient')
 * @property {string} [direction='180deg'] - Gradient direction (for type='gradient')
 * @property {string} [imageUrl] - Image URL (for type='image')
 * @property {'cover' | 'contain' | 'fill'} [fit='cover'] - Image fit (for type='image')
 */

/**
 * @typedef {Object} Layout
 * @property {string} id - Layout ID
 * @property {string} name - Layout name
 * @property {string} owner_id - Owner/Tenant ID
 * @property {LayoutElement[]} elements - Layout elements
 * @property {LayoutBackground} background - Background settings
 * @property {'16:9' | '9:16' | '4:3' | '1:1'} [aspectRatio='16:9'] - Aspect ratio
 * @property {string} [description] - Layout description
 * @property {string} [created_at] - Creation timestamp
 * @property {string} [updated_at] - Last update timestamp
 */

/**
 * Default element dimensions
 */
export const DEFAULT_ELEMENT_SIZE = {
  text: { width: 0.3, height: 0.1 },
  image: { width: 0.25, height: 0.25 },
  widget: { width: 0.15, height: 0.1 },
  shape: { width: 0.15, height: 0.15 },
};

/**
 * Grid configuration
 */
export const GRID_CONFIG = {
  columns: 12,
  rows: 12,
  color: 'rgba(255, 255, 255, 0.1)',
  lineWidth: 1,
};

/**
 * Zoom levels
 */
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

/**
 * Snap threshold for smart guides (as fraction of canvas)
 */
export const SNAP_THRESHOLD = 0.01;

/**
 * Available aspect ratios
 */
export const ASPECT_RATIOS = {
  '16:9': { width: 16, height: 9, label: '16:9 (Landscape)' },
  '9:16': { width: 9, height: 16, label: '9:16 (Portrait)' },
  '4:3': { width: 4, height: 3, label: '4:3 (Standard)' },
  '1:1': { width: 1, height: 1, label: '1:1 (Square)' },
};

/**
 * Generate unique element ID
 * @param {ElementType} type - Element type
 * @returns {string} Unique ID
 */
export function generateElementId(type) {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new text element
 * @param {Partial<TextElement>} overrides - Element overrides
 * @returns {TextElement} New text element
 */
export function createTextElement(overrides = {}) {
  return {
    id: generateElementId('text'),
    type: 'text',
    position: {
      x: 0.35,
      y: 0.45,
      ...DEFAULT_ELEMENT_SIZE.text,
    },
    layer: 1,
    locked: false,
    props: {
      text: 'New Text',
      fontSize: 32,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      align: 'center',
      color: '#ffffff',
    },
    ...overrides,
    props: {
      text: 'New Text',
      fontSize: 32,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      align: 'center',
      color: '#ffffff',
      ...overrides?.props,
    },
    position: {
      x: 0.35,
      y: 0.45,
      ...DEFAULT_ELEMENT_SIZE.text,
      ...overrides?.position,
    },
  };
}

/**
 * Create a new image element
 * @param {string} url - Image URL
 * @param {Partial<ImageElement>} overrides - Element overrides
 * @returns {ImageElement} New image element
 */
export function createImageElement(url, overrides = {}) {
  return {
    id: generateElementId('image'),
    type: 'image',
    position: {
      x: 0.375,
      y: 0.375,
      ...DEFAULT_ELEMENT_SIZE.image,
    },
    layer: 1,
    locked: false,
    props: {
      url,
      fit: 'cover',
      borderRadius: 0,
      opacity: 1,
    },
    ...overrides,
    props: {
      url,
      fit: 'cover',
      borderRadius: 0,
      opacity: 1,
      ...overrides?.props,
    },
    position: {
      x: 0.375,
      y: 0.375,
      ...DEFAULT_ELEMENT_SIZE.image,
      ...overrides?.position,
    },
  };
}

/**
 * Create a new widget element
 * @param {WidgetType} widgetType - Widget type
 * @param {Partial<WidgetElement>} overrides - Element overrides
 * @returns {WidgetElement} New widget element
 */
export function createWidgetElement(widgetType, overrides = {}) {
  const defaultProps = {
    clock: { textColor: '#ffffff', format: '12h', showSeconds: false },
    date: { textColor: '#ffffff', format: 'short' },
    weather: { textColor: '#ffffff', location: 'Miami, FL', units: 'imperial', style: 'minimal' },
    qr: { url: 'https://example.com', fgColor: '#000000', bgColor: '#ffffff', cornerRadius: 8 },
    data: { dataSourceId: '', field: '', rowIndex: 0, textColor: '#ffffff', fontSize: 24 },
    countdown: { textColor: '#ffffff', targetDate: '', label: '' },
    ticker: { textColor: '#ffffff', items: [], speed: 'medium' },
  };

  return {
    id: generateElementId('widget'),
    type: 'widget',
    widgetType,
    position: {
      x: 0.425,
      y: 0.45,
      ...DEFAULT_ELEMENT_SIZE.widget,
    },
    layer: 1,
    locked: false,
    props: defaultProps[widgetType] || {},
    ...overrides,
    props: {
      ...defaultProps[widgetType],
      ...overrides?.props,
    },
    position: {
      x: 0.425,
      y: 0.45,
      ...DEFAULT_ELEMENT_SIZE.widget,
      ...overrides?.position,
    },
  };
}

/**
 * Create a new shape element
 * @param {ShapeType} shapeType - Shape type
 * @param {Partial<ShapeElement>} overrides - Element overrides
 * @returns {ShapeElement} New shape element
 */
export function createShapeElement(shapeType, overrides = {}) {
  return {
    id: generateElementId('shape'),
    type: 'shape',
    position: {
      x: 0.425,
      y: 0.425,
      ...DEFAULT_ELEMENT_SIZE.shape,
    },
    layer: 1,
    locked: false,
    props: {
      shapeType,
      fill: '#3b82f6',
      stroke: undefined,
      strokeWidth: 0,
      borderRadius: shapeType === 'rectangle' ? 8 : 0,
      opacity: 1,
    },
    ...overrides,
    props: {
      shapeType,
      fill: '#3b82f6',
      stroke: undefined,
      strokeWidth: 0,
      borderRadius: shapeType === 'rectangle' ? 8 : 0,
      opacity: 1,
      ...overrides?.props,
    },
    position: {
      x: 0.425,
      y: 0.425,
      ...DEFAULT_ELEMENT_SIZE.shape,
      ...overrides?.position,
    },
  };
}

/**
 * Create default layout structure
 * @param {string} ownerId - Owner ID
 * @returns {Layout} New layout
 */
export function createDefaultLayout(ownerId) {
  return {
    id: null,
    owner_id: ownerId,
    name: 'Untitled Layout',
    description: '',
    elements: [],
    background: { type: 'solid', color: '#1a1a2e' },
    aspectRatio: '16:9',
    created_at: null,
    updated_at: null,
  };
}
