/**
 * BizScreen Motion Primitives
 *
 * Reusable animation presets for consistent micro-interactions
 * across the application. Uses Framer Motion for complex animations
 * and CSS transitions for simple cases.
 *
 * Usage:
 * import { fadeIn, slideUp, scaleTap, modal, dropdown } from '../design-system/motion';
 *
 * <motion.div {...fadeIn}>Content</motion.div>
 */

// ============================================
// TIMING CONSTANTS
// ============================================

export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
};

export const easing = {
  // Smooth ease for general use
  smooth: [0.4, 0, 0.2, 1],
  // Bouncy ease for playful interactions
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Quick ease for snappy feedback
  snappy: [0.4, 0, 0.6, 1],
  // Ease out for entering elements
  easeOut: [0, 0, 0.2, 1],
  // Ease in for exiting elements
  easeIn: [0.4, 0, 1, 1],
};

// ============================================
// FRAMER MOTION VARIANTS
// ============================================

/**
 * Fade in animation
 * Use for general content appearance
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: duration.normal, ease: easing.smooth },
};

/**
 * Fade in with slight scale
 * Use for content that needs emphasis
 */
export const fadeInScale = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: duration.normal, ease: easing.smooth },
};

/**
 * Slide up animation
 * Use for content entering from below
 */
export const slideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: duration.normal, ease: easing.easeOut },
};

/**
 * Slide down animation
 * Use for dropdowns and menus
 */
export const slideDown = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: duration.fast, ease: easing.easeOut },
};

/**
 * Scale tap animation
 * Use for buttons and clickable elements
 */
export const scaleTap = {
  whileTap: { scale: 0.97 },
  transition: { duration: duration.instant, ease: easing.snappy },
};

/**
 * Scale hover animation
 * Use for cards and interactive surfaces
 */
export const scaleHover = {
  whileHover: { scale: 1.02 },
  transition: { duration: duration.fast, ease: easing.smooth },
};

// ============================================
// COMPONENT-SPECIFIC ANIMATIONS
// ============================================

/**
 * Modal animation preset
 * Combines backdrop fade with content scale
 */
export const modal = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.normal, ease: easing.smooth },
  },
  content: {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

/**
 * Dropdown animation preset
 * Quick slide down with fade
 */
export const dropdown = {
  initial: { opacity: 0, y: -8, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.95 },
  transition: { duration: duration.fast, ease: easing.easeOut },
};

/**
 * Drawer animation preset
 * Slide in from the side
 */
export const drawer = {
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: duration.normal, ease: easing.smooth },
  },
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

/**
 * Page transition animation
 * Subtle fade for page content
 */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: duration.normal, ease: easing.smooth },
};

/**
 * Stagger children animation
 * Use for lists and grids
 */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: duration.fast, ease: easing.easeOut },
};

// ============================================
// CSS TRANSITION CLASSES
// ============================================

/**
 * CSS class names for simple transitions
 * Use when Framer Motion is overkill
 */
export const cssTransitions = {
  // Base transition
  base: 'transition-all duration-150 ease-out',
  // Button press effect
  buttonPress: 'active:scale-[0.97] transition-transform duration-100',
  // Card hover lift
  cardHover: 'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
  // Icon button hover
  iconHover: 'hover:bg-gray-100 active:bg-gray-200 transition-colors duration-150',
  // Fade transition
  fade: 'transition-opacity duration-200',
  // Scale transition
  scale: 'transition-transform duration-150',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a custom fade animation with specified duration
 */
export function createFade(durationMs = 200) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: durationMs / 1000, ease: easing.smooth },
  };
}

/**
 * Create a custom slide animation
 */
export function createSlide(direction = 'up', distance = 10, durationMs = 200) {
  const axis = direction === 'up' || direction === 'down' ? 'y' : 'x';
  const value = direction === 'up' || direction === 'left' ? distance : -distance;

  return {
    initial: { opacity: 0, [axis]: value },
    animate: { opacity: 1, [axis]: 0 },
    exit: { opacity: 0, [axis]: value },
    transition: { duration: durationMs / 1000, ease: easing.easeOut },
  };
}
