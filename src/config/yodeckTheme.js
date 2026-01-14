/**
 * Yodeck Design Tokens
 *
 * Exact color, spacing, and styling tokens matching Yodeck's Layout Editor.
 * These tokens ensure visual parity with Yodeck's interface.
 *
 * @module config/yodeckTheme
 */

export const YODECK_COLORS = {
  // Primary accent (coral/orange)
  primary: '#f26f21',
  primaryHover: '#e05a10',
  primaryLight: '#fff5f0',
  primaryLighter: '#fef3ed',

  // Secondary (blue for links/info)
  secondary: '#3b82f6',
  secondaryHover: '#2563eb',

  // Neutrals
  white: '#ffffff',
  gray50: '#fafafa',
  gray100: '#f5f5f5',  // Sidebar background
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Canvas
  canvasBackground: '#e5e7eb',
  gridLine: 'rgba(59, 130, 246, 0.2)',  // Blue at 20% opacity

  // Selection
  selectionBorder: '#3b82f6',
  selectionHandle: '#ffffff',
  selectionHandleBorder: '#3b82f6',

  // Status colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Borders
  borderLight: '#e5e7eb',
  borderMedium: '#d1d5db',

  // Page/Shell
  pageBg: '#fafafa',
  sidebarBg: '#ffffff',
  cardBg: '#ffffff',
};

// Sidebar-specific tokens matching Yodeck exactly
export const YODECK_SIDEBAR = {
  width: '220px',
  collapsedWidth: '64px',
  logoIconSize: '36px',
  navItemHeight: '44px',
  navItemPadding: '10px 16px',
  navIconSize: '20px',
  subItemIndent: '32px',
  activeBorderWidth: '3px',
};

// Button tokens
export const YODECK_BUTTON = {
  primary: {
    bg: '#f26f21',
    text: '#ffffff',
    hoverBg: '#e05a10',
    borderRadius: '8px',
    paddingX: '16px',
    paddingY: '10px',
    fontSize: '14px',
    fontWeight: '500',
  },
  outline: {
    bg: 'transparent',
    text: '#374151',
    border: '#d1d5db',
    hoverBg: '#f9fafb',
    borderRadius: '8px',
  },
};

export const YODECK_SPACING = {
  // Sidebar
  sidebarWidth: 280,
  sidebarPadding: 16,
  tabIconSize: 20,
  tabGap: 4,

  // Content areas
  sectionGap: 24,
  itemGap: 8,
  cardGap: 12,

  // Toolbar
  toolbarHeight: 56,
  toolbarPadding: 16,
  toolbarButtonGap: 8,

  // Canvas
  canvasPadding: 24,
  gridSize: 20,

  // Elements
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },

  // Handle sizes
  resizeHandleSize: 8,
  rotateHandleOffset: 24,
};

export const YODECK_TYPOGRAPHY = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",

  // Font sizes
  xs: '11px',
  sm: '12px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '24px',
  '3xl': '30px',

  // Font weights
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,

  // Line heights
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

export const YODECK_SHADOWS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',

  // Floating panels
  panel: '0 4px 20px rgba(0, 0, 0, 0.15)',
  dropdown: '0 4px 12px rgba(0, 0, 0, 0.15)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

export const YODECK_TRANSITIONS = {
  fast: '150ms ease-in-out',
  normal: '200ms ease-in-out',
  slow: '300ms ease-in-out',
};

// Shape types available in Yodeck
export const YODECK_SHAPES = [
  { id: 'rectangle', label: 'Rectangle', icon: 'Square' },
  { id: 'rounded-rectangle', label: 'Rounded Rectangle', icon: 'RectangleRound' },
  { id: 'circle', label: 'Circle', icon: 'Circle' },
  { id: 'oval', label: 'Oval', icon: 'Oval' },
  { id: 'triangle', label: 'Triangle', icon: 'Triangle' },
  { id: 'star', label: 'Star', icon: 'Star' },
  { id: 'pentagon', label: 'Pentagon', icon: 'Pentagon' },
  { id: 'hexagon', label: 'Hexagon', icon: 'Hexagon' },
  { id: 'diamond', label: 'Diamond', icon: 'Diamond' },
  { id: 'arrow-right', label: 'Arrow Right', icon: 'ArrowRight' },
  { id: 'arrow-left', label: 'Arrow Left', icon: 'ArrowLeft' },
  { id: 'line', label: 'Line', icon: 'Minus' },
];

// Text style presets
export const YODECK_TEXT_STYLES = [
  {
    id: 'heading',
    label: 'Add a heading',
    fontSize: 48,
    fontWeight: 700,
    fontFamily: 'Inter',
    preview: 'Aa',
  },
  {
    id: 'subheading',
    label: 'Add a subheading',
    fontSize: 32,
    fontWeight: 600,
    fontFamily: 'Inter',
    preview: 'Aa',
  },
  {
    id: 'body',
    label: 'Add a body text',
    fontSize: 18,
    fontWeight: 400,
    fontFamily: 'Inter',
    preview: 'Aa',
  },
];

// Orientation presets
export const YODECK_ORIENTATIONS = [
  { id: 'custom', label: 'Add Custom Ratio', isCustom: true },
  { id: 'separator-landscape', label: 'Landscape', isSeparator: true },
  { id: '16:9', label: '16:9 (1920 x 1080)', width: 1920, height: 1080 },
  { id: '4:3', label: '4:3 (1440 x 1080)', width: 1440, height: 1080 },
  { id: '21:9', label: '21:9 (2560 x 1080)', width: 2560, height: 1080 },
  { id: 'separator-portrait', label: 'Portrait', isSeparator: true },
  { id: '9:16', label: '9:16 (1080 x 1920)', width: 1080, height: 1920 },
  { id: '3:4', label: '3:4 (1080 x 1440)', width: 1080, height: 1440 },
  { id: 'separator-square', label: 'Square', isSeparator: true },
  { id: '1:1', label: '1:1 (1080 x 1080)', width: 1080, height: 1080 },
];

// Grid configuration
export const YODECK_GRID = {
  size: 20,
  color: 'rgba(59, 130, 246, 0.15)',
  strokeWidth: 1,
  snapThreshold: 10,
};

// Export combined theme object
export const yodeckTheme = {
  colors: YODECK_COLORS,
  spacing: YODECK_SPACING,
  typography: YODECK_TYPOGRAPHY,
  shadows: YODECK_SHADOWS,
  transitions: YODECK_TRANSITIONS,
  shapes: YODECK_SHAPES,
  textStyles: YODECK_TEXT_STYLES,
  orientations: YODECK_ORIENTATIONS,
  grid: YODECK_GRID,
};

export default yodeckTheme;
