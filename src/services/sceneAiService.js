/**
 * Scene AI Service
 *
 * Provides AI-powered suggestions and presets for scene design.
 * Currently uses deterministic helpers; can be wired to real LLM later.
 *
 * @module services/sceneAiService
 */

import {
  generateBlockId,
  createTextBlock,
  createShapeBlock,
  createWidgetBlock,
  normalizeDesign,
} from './sceneDesignService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('SceneAiService');

// ============================================
// INDUSTRY-SPECIFIC PRESETS
// ============================================

/**
 * Industry preset configurations
 * Each preset includes slide templates with pre-designed blocks
 */
export const INDUSTRY_PRESETS = {
  restaurant: {
    label: 'Restaurant',
    presets: [
      {
        kind: 'menu',
        title: 'Digital Menu',
        description: 'Display your menu items with categories',
        design: {
          background: { type: 'solid', color: '#1a1a2e' },
          blocks: [
            createTextBlock({ x: 0.05, y: 0.05, width: 0.9, height: 0.12, text: 'Our Menu', fontSize: 52, fontWeight: '700', color: '#f59e0b' }),
            createShapeBlock({ x: 0.03, y: 0.2, width: 0.45, height: 0.75, fill: '#262640', borderRadius: 16 }),
            createTextBlock({ x: 0.05, y: 0.22, width: 0.4, height: 0.08, text: 'Appetizers', fontSize: 28, fontWeight: '600', align: 'left', color: '#f59e0b' }),
            createTextBlock({ x: 0.05, y: 0.32, width: 0.4, height: 0.06, text: 'Spring Rolls - $8', fontSize: 20, fontWeight: '400', align: 'left', color: '#ffffff' }),
            createTextBlock({ x: 0.05, y: 0.40, width: 0.4, height: 0.06, text: 'Soup of the Day - $6', fontSize: 20, fontWeight: '400', align: 'left', color: '#ffffff' }),
            createShapeBlock({ x: 0.52, y: 0.2, width: 0.45, height: 0.75, fill: '#262640', borderRadius: 16 }),
            createTextBlock({ x: 0.54, y: 0.22, width: 0.4, height: 0.08, text: 'Main Course', fontSize: 28, fontWeight: '600', align: 'left', color: '#f59e0b' }),
            createTextBlock({ x: 0.54, y: 0.32, width: 0.4, height: 0.06, text: 'Grilled Salmon - $24', fontSize: 20, fontWeight: '400', align: 'left', color: '#ffffff' }),
            createTextBlock({ x: 0.54, y: 0.40, width: 0.4, height: 0.06, text: 'Ribeye Steak - $32', fontSize: 20, fontWeight: '400', align: 'left', color: '#ffffff' }),
          ],
        },
      },
      {
        kind: 'promo',
        title: 'Daily Specials',
        description: 'Highlight today\'s special offers',
        design: {
          background: { type: 'solid', color: '#0f172a' },
          blocks: [
            createShapeBlock({ x: 0, y: 0, width: 1, height: 0.3, fill: '#dc2626', opacity: 0.9, layer: 0 }),
            createTextBlock({ x: 0.05, y: 0.08, width: 0.9, height: 0.14, text: "TODAY'S SPECIAL", fontSize: 48, fontWeight: '800', color: '#ffffff' }),
            createTextBlock({ x: 0.1, y: 0.35, width: 0.8, height: 0.15, text: 'Chef\'s Signature Pasta', fontSize: 42, fontWeight: '700', color: '#f8fafc' }),
            createTextBlock({ x: 0.1, y: 0.52, width: 0.8, height: 0.08, text: 'Served with fresh garlic bread', fontSize: 24, fontWeight: '400', color: '#94a3b8' }),
            createTextBlock({ x: 0.3, y: 0.7, width: 0.4, height: 0.15, text: '$14.99', fontSize: 56, fontWeight: '800', color: '#22c55e' }),
            createWidgetBlock({ widgetType: 'clock', x: 0.85, y: 0.88, width: 0.12, height: 0.08, style: 'minimal' }),
          ],
        },
      },
    ],
  },
  salon: {
    label: 'Salon / Spa',
    presets: [
      {
        kind: 'services',
        title: 'Services & Pricing',
        description: 'Display your service menu',
        design: {
          background: { type: 'solid', color: '#fdf2f8' },
          blocks: [
            createTextBlock({ x: 0.05, y: 0.05, width: 0.9, height: 0.12, text: 'Our Services', fontSize: 48, fontWeight: '700', color: '#831843' }),
            createShapeBlock({ x: 0.05, y: 0.2, width: 0.42, height: 0.35, fill: '#ffffff', borderRadius: 16 }),
            createTextBlock({ x: 0.08, y: 0.23, width: 0.35, height: 0.06, text: 'Haircuts', fontSize: 24, fontWeight: '600', color: '#831843' }),
            createTextBlock({ x: 0.08, y: 0.31, width: 0.35, height: 0.05, text: "Women's Cut - $45", fontSize: 18, color: '#4b5563' }),
            createTextBlock({ x: 0.08, y: 0.38, width: 0.35, height: 0.05, text: "Men's Cut - $30", fontSize: 18, color: '#4b5563' }),
            createShapeBlock({ x: 0.53, y: 0.2, width: 0.42, height: 0.35, fill: '#ffffff', borderRadius: 16 }),
            createTextBlock({ x: 0.56, y: 0.23, width: 0.35, height: 0.06, text: 'Color', fontSize: 24, fontWeight: '600', color: '#831843' }),
            createTextBlock({ x: 0.56, y: 0.31, width: 0.35, height: 0.05, text: 'Full Color - $120', fontSize: 18, color: '#4b5563' }),
            createTextBlock({ x: 0.56, y: 0.38, width: 0.35, height: 0.05, text: 'Highlights - $150', fontSize: 18, color: '#4b5563' }),
            createShapeBlock({ x: 0.05, y: 0.6, width: 0.9, height: 0.35, fill: '#ffffff', borderRadius: 16 }),
            createTextBlock({ x: 0.08, y: 0.63, width: 0.35, height: 0.06, text: 'Spa Treatments', fontSize: 24, fontWeight: '600', color: '#831843' }),
          ],
        },
      },
      {
        kind: 'gallery',
        title: 'Style Gallery',
        description: 'Showcase your work',
        design: {
          background: { type: 'solid', color: '#18181b' },
          blocks: [
            createTextBlock({ x: 0.05, y: 0.05, width: 0.9, height: 0.1, text: 'Style Inspiration', fontSize: 40, fontWeight: '600', color: '#f9a8d4' }),
            createShapeBlock({ x: 0.05, y: 0.18, width: 0.28, height: 0.38, fill: '#27272a', borderRadius: 12 }),
            createShapeBlock({ x: 0.36, y: 0.18, width: 0.28, height: 0.38, fill: '#27272a', borderRadius: 12 }),
            createShapeBlock({ x: 0.67, y: 0.18, width: 0.28, height: 0.38, fill: '#27272a', borderRadius: 12 }),
            createShapeBlock({ x: 0.05, y: 0.6, width: 0.28, height: 0.35, fill: '#27272a', borderRadius: 12 }),
            createShapeBlock({ x: 0.36, y: 0.6, width: 0.28, height: 0.35, fill: '#27272a', borderRadius: 12 }),
            createShapeBlock({ x: 0.67, y: 0.6, width: 0.28, height: 0.35, fill: '#27272a', borderRadius: 12 }),
            createTextBlock({ x: 0.05, y: 0.52, width: 0.28, height: 0.05, text: 'Balayage', fontSize: 16, color: '#a1a1aa', align: 'center' }),
          ],
        },
      },
    ],
  },
  gym: {
    label: 'Gym / Fitness',
    presets: [
      {
        kind: 'schedule',
        title: 'Class Schedule',
        description: 'Show today\'s fitness classes',
        design: {
          background: { type: 'solid', color: '#0c0a09' },
          blocks: [
            createShapeBlock({ x: 0, y: 0, width: 1, height: 0.18, fill: '#ea580c', layer: 0 }),
            createTextBlock({ x: 0.05, y: 0.04, width: 0.6, height: 0.1, text: "TODAY'S CLASSES", fontSize: 40, fontWeight: '800', color: '#ffffff', align: 'left' }),
            createWidgetBlock({ widgetType: 'clock', x: 0.82, y: 0.04, width: 0.15, height: 0.1, style: 'bold' }),
            createShapeBlock({ x: 0.03, y: 0.22, width: 0.94, height: 0.15, fill: '#1c1917', borderRadius: 12 }),
            createTextBlock({ x: 0.05, y: 0.24, width: 0.15, height: 0.1, text: '6:00 AM', fontSize: 20, fontWeight: '700', color: '#ea580c', align: 'left' }),
            createTextBlock({ x: 0.22, y: 0.24, width: 0.4, height: 0.1, text: 'Morning Yoga', fontSize: 24, fontWeight: '600', color: '#ffffff', align: 'left' }),
            createShapeBlock({ x: 0.03, y: 0.4, width: 0.94, height: 0.15, fill: '#1c1917', borderRadius: 12 }),
            createTextBlock({ x: 0.05, y: 0.42, width: 0.15, height: 0.1, text: '9:00 AM', fontSize: 20, fontWeight: '700', color: '#ea580c', align: 'left' }),
            createTextBlock({ x: 0.22, y: 0.42, width: 0.4, height: 0.1, text: 'HIIT Training', fontSize: 24, fontWeight: '600', color: '#ffffff', align: 'left' }),
            createShapeBlock({ x: 0.03, y: 0.58, width: 0.94, height: 0.15, fill: '#1c1917', borderRadius: 12 }),
            createTextBlock({ x: 0.05, y: 0.6, width: 0.15, height: 0.1, text: '12:00 PM', fontSize: 20, fontWeight: '700', color: '#ea580c', align: 'left' }),
            createTextBlock({ x: 0.22, y: 0.6, width: 0.4, height: 0.1, text: 'Spin Class', fontSize: 24, fontWeight: '600', color: '#ffffff', align: 'left' }),
            createShapeBlock({ x: 0.03, y: 0.76, width: 0.94, height: 0.15, fill: '#1c1917', borderRadius: 12 }),
            createTextBlock({ x: 0.05, y: 0.78, width: 0.15, height: 0.1, text: '5:30 PM', fontSize: 20, fontWeight: '700', color: '#ea580c', align: 'left' }),
            createTextBlock({ x: 0.22, y: 0.78, width: 0.4, height: 0.1, text: 'CrossFit', fontSize: 24, fontWeight: '600', color: '#ffffff', align: 'left' }),
          ],
        },
      },
      {
        kind: 'motivation',
        title: 'Motivation & Quotes',
        description: 'Inspire your members',
        design: {
          background: { type: 'solid', color: '#020617' },
          blocks: [
            createShapeBlock({ x: 0.1, y: 0.2, width: 0.8, height: 0.6, fill: '#0f172a', borderRadius: 24, opacity: 0.8 }),
            createTextBlock({ x: 0.15, y: 0.28, width: 0.7, height: 0.35, text: '"The only bad workout is the one that didn\'t happen."', fontSize: 36, fontWeight: '600', color: '#f8fafc' }),
            createTextBlock({ x: 0.15, y: 0.65, width: 0.7, height: 0.08, text: '— Unknown', fontSize: 20, fontWeight: '400', color: '#94a3b8' }),
          ],
        },
      },
    ],
  },
  retail: {
    label: 'Retail Store',
    presets: [
      {
        kind: 'arrivals',
        title: 'New Arrivals',
        description: 'Showcase new products',
        design: {
          background: { type: 'solid', color: '#fafaf9' },
          blocks: [
            createShapeBlock({ x: 0, y: 0, width: 1, height: 0.2, fill: '#0f172a', layer: 0 }),
            createTextBlock({ x: 0.05, y: 0.06, width: 0.9, height: 0.1, text: 'NEW ARRIVALS', fontSize: 44, fontWeight: '800', color: '#ffffff' }),
            createShapeBlock({ x: 0.05, y: 0.25, width: 0.28, height: 0.5, fill: '#e7e5e4', borderRadius: 16 }),
            createTextBlock({ x: 0.05, y: 0.77, width: 0.28, height: 0.06, text: 'Product Name', fontSize: 18, fontWeight: '600', color: '#0f172a', align: 'center' }),
            createTextBlock({ x: 0.05, y: 0.84, width: 0.28, height: 0.05, text: '$49.99', fontSize: 20, fontWeight: '700', color: '#16a34a', align: 'center' }),
            createShapeBlock({ x: 0.36, y: 0.25, width: 0.28, height: 0.5, fill: '#e7e5e4', borderRadius: 16 }),
            createTextBlock({ x: 0.36, y: 0.77, width: 0.28, height: 0.06, text: 'Product Name', fontSize: 18, fontWeight: '600', color: '#0f172a', align: 'center' }),
            createTextBlock({ x: 0.36, y: 0.84, width: 0.28, height: 0.05, text: '$79.99', fontSize: 20, fontWeight: '700', color: '#16a34a', align: 'center' }),
            createShapeBlock({ x: 0.67, y: 0.25, width: 0.28, height: 0.5, fill: '#e7e5e4', borderRadius: 16 }),
            createTextBlock({ x: 0.67, y: 0.77, width: 0.28, height: 0.06, text: 'Product Name', fontSize: 18, fontWeight: '600', color: '#0f172a', align: 'center' }),
            createTextBlock({ x: 0.67, y: 0.84, width: 0.28, height: 0.05, text: '$34.99', fontSize: 20, fontWeight: '700', color: '#16a34a', align: 'center' }),
          ],
        },
      },
      {
        kind: 'sale',
        title: 'Limited-Time Sale',
        description: 'Promote your sales',
        design: {
          background: { type: 'solid', color: '#dc2626' },
          blocks: [
            createTextBlock({ x: 0.1, y: 0.15, width: 0.8, height: 0.2, text: 'FLASH SALE', fontSize: 72, fontWeight: '900', color: '#ffffff' }),
            createTextBlock({ x: 0.1, y: 0.38, width: 0.8, height: 0.25, text: 'UP TO 50% OFF', fontSize: 56, fontWeight: '800', color: '#fef08a' }),
            createTextBlock({ x: 0.1, y: 0.68, width: 0.8, height: 0.1, text: 'This weekend only!', fontSize: 28, fontWeight: '500', color: '#ffffff' }),
            createShapeBlock({ x: 0.3, y: 0.82, width: 0.4, height: 0.12, fill: '#ffffff', borderRadius: 50 }),
            createTextBlock({ x: 0.3, y: 0.84, width: 0.4, height: 0.08, text: 'Shop Now', fontSize: 24, fontWeight: '700', color: '#dc2626', align: 'center' }),
          ],
        },
      },
    ],
  },
  medical: {
    label: 'Medical Office',
    presets: [
      {
        kind: 'welcome',
        title: 'Welcome Screen',
        description: 'Greet patients warmly',
        design: {
          background: { type: 'solid', color: '#f0f9ff' },
          blocks: [
            createShapeBlock({ x: 0, y: 0, width: 1, height: 0.35, fill: '#0284c7', layer: 0 }),
            createTextBlock({ x: 0.1, y: 0.1, width: 0.8, height: 0.15, text: 'Welcome to Our Clinic', fontSize: 44, fontWeight: '700', color: '#ffffff' }),
            createTextBlock({ x: 0.1, y: 0.4, width: 0.8, height: 0.1, text: 'Please check in at the front desk', fontSize: 28, fontWeight: '500', color: '#0c4a6e' }),
            createWidgetBlock({ widgetType: 'clock', x: 0.4, y: 0.55, width: 0.2, height: 0.15, style: 'minimal' }),
            createTextBlock({ x: 0.1, y: 0.78, width: 0.8, height: 0.08, text: 'Free WiFi: GuestClinic', fontSize: 20, fontWeight: '400', color: '#64748b' }),
          ],
        },
      },
    ],
  },
  hotel: {
    label: 'Hotel / Lobby',
    presets: [
      {
        kind: 'welcome',
        title: 'Welcome Display',
        description: 'Elegant lobby welcome',
        design: {
          background: { type: 'solid', color: '#1c1917' },
          blocks: [
            createTextBlock({ x: 0.1, y: 0.35, width: 0.8, height: 0.15, text: 'Welcome', fontSize: 64, fontWeight: '300', color: '#d4af37' }),
            createTextBlock({ x: 0.1, y: 0.52, width: 0.8, height: 0.1, text: 'To Our Hotel', fontSize: 36, fontWeight: '400', color: '#ffffff' }),
            createWidgetBlock({ widgetType: 'clock', x: 0.4, y: 0.72, width: 0.2, height: 0.12, style: 'elegant' }),
          ],
        },
      },
    ],
  },
  coffee: {
    label: 'Coffee Shop',
    presets: [
      {
        kind: 'menu',
        title: 'Coffee Menu',
        description: 'Display your drinks',
        design: {
          background: { type: 'solid', color: '#292524' },
          blocks: [
            createTextBlock({ x: 0.1, y: 0.05, width: 0.8, height: 0.12, text: '☕ Our Coffee', fontSize: 44, fontWeight: '700', color: '#fbbf24' }),
            createShapeBlock({ x: 0.05, y: 0.2, width: 0.42, height: 0.7, fill: '#1c1917', borderRadius: 16 }),
            createTextBlock({ x: 0.08, y: 0.24, width: 0.35, height: 0.06, text: 'Espresso', fontSize: 22, fontWeight: '600', color: '#fbbf24', align: 'left' }),
            createTextBlock({ x: 0.08, y: 0.32, width: 0.35, height: 0.04, text: 'Single Shot - $3.50', fontSize: 16, color: '#a8a29e', align: 'left' }),
            createTextBlock({ x: 0.08, y: 0.38, width: 0.35, height: 0.04, text: 'Double Shot - $4.50', fontSize: 16, color: '#a8a29e', align: 'left' }),
            createTextBlock({ x: 0.08, y: 0.48, width: 0.35, height: 0.06, text: 'Latte', fontSize: 22, fontWeight: '600', color: '#fbbf24', align: 'left' }),
            createTextBlock({ x: 0.08, y: 0.56, width: 0.35, height: 0.04, text: 'Regular - $4.50', fontSize: 16, color: '#a8a29e', align: 'left' }),
            createTextBlock({ x: 0.08, y: 0.62, width: 0.35, height: 0.04, text: 'Large - $5.50', fontSize: 16, color: '#a8a29e', align: 'left' }),
            createShapeBlock({ x: 0.53, y: 0.2, width: 0.42, height: 0.7, fill: '#1c1917', borderRadius: 16 }),
            createTextBlock({ x: 0.56, y: 0.24, width: 0.35, height: 0.06, text: 'Specialty', fontSize: 22, fontWeight: '600', color: '#fbbf24', align: 'left' }),
            createTextBlock({ x: 0.56, y: 0.32, width: 0.35, height: 0.04, text: 'Mocha - $5.50', fontSize: 16, color: '#a8a29e', align: 'left' }),
            createTextBlock({ x: 0.56, y: 0.38, width: 0.35, height: 0.04, text: 'Caramel Macchiato - $6.00', fontSize: 16, color: '#a8a29e', align: 'left' }),
          ],
        },
      },
    ],
  },
  other: {
    label: 'Business',
    presets: [
      {
        kind: 'welcome',
        title: 'Welcome Screen',
        description: 'Generic welcome display',
        design: {
          background: { type: 'solid', color: '#0f172a' },
          blocks: [
            createTextBlock({ x: 0.1, y: 0.35, width: 0.8, height: 0.15, text: 'Welcome', fontSize: 56, fontWeight: '700', color: '#ffffff' }),
            createTextBlock({ x: 0.1, y: 0.52, width: 0.8, height: 0.08, text: 'To Our Business', fontSize: 28, fontWeight: '400', color: '#94a3b8' }),
            createWidgetBlock({ widgetType: 'clock', x: 0.4, y: 0.7, width: 0.2, height: 0.1, style: 'minimal' }),
          ],
        },
      },
      {
        kind: 'promo',
        title: 'Announcement',
        description: 'Display important announcements',
        design: {
          background: { type: 'solid', color: '#1e3a8a' },
          blocks: [
            createTextBlock({ x: 0.1, y: 0.3, width: 0.8, height: 0.2, text: 'Important Announcement', fontSize: 48, fontWeight: '700', color: '#ffffff' }),
            createTextBlock({ x: 0.1, y: 0.55, width: 0.8, height: 0.15, text: 'Add your message here', fontSize: 28, fontWeight: '400', color: '#bfdbfe' }),
          ],
        },
      },
    ],
  },
};

// ============================================
// AI SUGGESTION FUNCTIONS
// ============================================

/**
 * Get preset slides for a business type
 * @param {string} businessType - The business type
 * @returns {Array} List of available presets
 */
export function getPresetsForBusinessType(businessType) {
  return INDUSTRY_PRESETS[businessType]?.presets || INDUSTRY_PRESETS.other.presets;
}

/**
 * Suggest improvements to a slide design
 * Makes it "look more modern" by adjusting colors and adding polish
 * @param {Object} params - { scene, slide }
 * @returns {Object} Improved design JSON
 */
export function suggestImprovements({ scene, slide }) {
  const design = { ...slide.design_json };

  // Modern color palette
  const modernColors = ['#0f172a', '#1e293b', '#18181b', '#09090b'];
  const accentColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  // Update background to a modern dark color
  design.background = {
    type: 'solid',
    color: modernColors[Math.floor(Math.random() * modernColors.length)],
  };

  // Improve text blocks with better styling
  design.blocks = design.blocks.map(block => {
    if (block.type === 'text') {
      return {
        ...block,
        props: {
          ...block.props,
          // Slightly larger fonts
          fontSize: Math.min((block.props.fontSize || 24) * 1.1, 72),
          // Clean white or accent text
          color: block.props.fontSize > 30 ? '#ffffff' : '#e2e8f0',
        },
      };
    }
    if (block.type === 'shape') {
      return {
        ...block,
        props: {
          ...block.props,
          // Add rounded corners for modern look
          borderRadius: Math.max(block.props.borderRadius || 0, 12),
          // Softer fills
          opacity: Math.max(block.props.opacity || 1, 0.85),
        },
      };
    }
    return block;
  });

  // Add a subtle accent shape if none exists
  const hasShapes = design.blocks.some(b => b.type === 'shape');
  if (!hasShapes) {
    design.blocks.unshift({
      id: generateBlockId(),
      type: 'shape',
      x: 0,
      y: 0,
      width: 1,
      height: 0.08,
      layer: 0,
      props: {
        shape: 'rectangle',
        fill: accentColors[Math.floor(Math.random() * accentColors.length)],
        opacity: 0.9,
        borderRadius: 0,
      },
    });
  }

  // Normalize output to ensure all blocks have required properties
  return normalizeDesign(design);
}

/**
 * Generate a promo slide for the business type
 * @param {Object} params - { scene, businessType }
 * @returns {Object} Slide data with design
 */
export function suggestPromoSlide({ scene, businessType }) {
  const presets = getPresetsForBusinessType(businessType);
  const promoPreset = presets.find(p => p.kind === 'promo' || p.kind === 'sale') || presets[0];

  return {
    title: promoPreset.title,
    kind: promoPreset.kind,
    design_json: promoPreset.design,
  };
}

/**
 * Generate a menu slide (for restaurant/coffee)
 * @param {Object} params - { scene, businessType }
 * @returns {Object} Slide data with design
 */
export function suggestMenuSlide({ scene, businessType }) {
  const presets = getPresetsForBusinessType(businessType);
  const menuPreset = presets.find(p => p.kind === 'menu' || p.kind === 'services') || presets[0];

  return {
    title: menuPreset.title,
    kind: menuPreset.kind,
    design_json: menuPreset.design,
  };
}

/**
 * Make text more concise by shortening it
 * @param {string} text - Original text
 * @returns {string} Shortened text
 */
export function makeTextConcise(text) {
  if (!text || text.length < 30) return text;

  // Simple shortening logic
  const words = text.split(' ');
  if (words.length > 6) {
    return words.slice(0, 5).join(' ') + '...';
  }
  return text;
}

/**
 * Get AI quick actions based on context
 * @param {Object} params - { businessType, currentSlide }
 * @returns {Array} List of available AI actions
 */
export function getAiQuickActions({ businessType, currentSlide }) {
  const actions = [
    {
      id: 'improve',
      label: '✨ Improve layout',
      description: 'Make the design more modern',
    },
    {
      id: 'promo',
      label: '✨ Add promo slide',
      description: 'Create an eye-catching promotion',
    },
  ];

  // Add menu slide for food-related businesses
  if (['restaurant', 'coffee'].includes(businessType)) {
    actions.push({
      id: 'menu',
      label: '✨ Add menu slide',
      description: 'Display your menu items',
    });
  }

  // Add services slide for service businesses
  if (['salon', 'medical', 'gym'].includes(businessType)) {
    actions.push({
      id: 'services',
      label: '✨ Add services slide',
      description: 'Show your services and pricing',
    });
  }

  // Add schedule for gym
  if (businessType === 'gym') {
    actions.push({
      id: 'schedule',
      label: '✨ Add class schedule',
      description: 'Display today\'s classes',
    });
  }

  return actions;
}

// ============================================
// AI "POLISH SLIDE" FUNCTIONS (Phase 5)
// ============================================

/**
 * Color utility: convert hex to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Color utility: convert RGB to hex
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.min(255, Math.max(0, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate relative luminance
 */
function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1, color2) {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensure text color has sufficient contrast with background
 */
function ensureContrast(textColor, bgColor, minRatio = 4.5) {
  const ratio = getContrastRatio(textColor, bgColor);
  if (ratio >= minRatio) return textColor;

  // If contrast is too low, pick white or black based on background luminance
  const bgLuminance = getLuminance(bgColor);
  return bgLuminance > 0.5 ? '#1f2937' : '#ffffff';
}

/**
 * Lighten a color
 */
function lightenColor(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount
  );
}

/**
 * Darken a color
 */
function darkenColor(hex, amount = 0.2) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/**
 * Modern color palettes for different styles
 */
const MODERN_PALETTES = [
  { bg: '#0f172a', accent: '#3b82f6', text: '#ffffff', secondary: '#94a3b8' },
  { bg: '#18181b', accent: '#8b5cf6', text: '#ffffff', secondary: '#a1a1aa' },
  { bg: '#0c0a09', accent: '#ea580c', text: '#ffffff', secondary: '#a8a29e' },
  { bg: '#1e293b', accent: '#06b6d4', text: '#ffffff', secondary: '#cbd5e1' },
  { bg: '#1a1a2e', accent: '#f59e0b', text: '#ffffff', secondary: '#9ca3af' },
];

/**
 * Improve slide to look more modern
 * Adjusts colors, fonts, spacing, and adds subtle animations
 * @param {Object} params - { slide, brandTheme, industry }
 * @returns {Object} New design JSON
 */
export function improveSlideModern({ slide, brandTheme, industry }) {
  const design = JSON.parse(JSON.stringify(slide.design_json || slide));

  // Choose a modern palette - prefer brand theme if available
  let palette;
  if (brandTheme && brandTheme.primary_color) {
    palette = {
      bg: brandTheme.background_color || '#0f172a',
      accent: brandTheme.primary_color,
      text: brandTheme.text_primary_color || '#ffffff',
      secondary: brandTheme.text_secondary_color || '#94a3b8',
    };
  } else {
    // Pick a palette based on industry or random
    const industryPaletteMap = {
      restaurant: 0,
      coffee: 4,
      gym: 2,
      salon: 1,
      retail: 3,
    };
    const paletteIdx = industryPaletteMap[industry] ?? Math.floor(Math.random() * MODERN_PALETTES.length);
    palette = MODERN_PALETTES[paletteIdx];
  }

  // Update background
  design.background = {
    type: 'solid',
    color: palette.bg,
  };

  // Add subtle slide transition
  design.transition = {
    type: 'fade',
    durationMs: 600,
  };

  // Process blocks
  let blockIndex = 0;
  design.blocks = (design.blocks || []).map(block => {
    const newBlock = { ...block };
    const delay = blockIndex * 100; // Stagger animations
    blockIndex++;

    if (block.type === 'text') {
      const fontSize = block.props?.fontSize || 24;
      const isHeading = fontSize > 32;

      // Update text styling
      newBlock.props = {
        ...newBlock.props,
        color: ensureContrast(
          isHeading ? palette.text : palette.secondary,
          palette.bg
        ),
        fontWeight: isHeading ? '700' : (block.props?.fontWeight || '400'),
      };

      // Add fade animation for text
      newBlock.animation = {
        type: 'fade',
        delayMs: delay,
        durationMs: 500,
      };
    } else if (block.type === 'shape') {
      // Modernize shapes
      newBlock.props = {
        ...newBlock.props,
        borderRadius: Math.max(block.props?.borderRadius || 0, 16),
        opacity: Math.min(block.props?.opacity || 1, 0.9),
      };

      // Use accent color for important shapes (layer 0 or large ones)
      if (block.layer === 0 || (block.width > 0.5 && block.height < 0.3)) {
        newBlock.props.fill = palette.accent;
      }

      // Add slide animation for shapes
      newBlock.animation = {
        type: 'slide',
        direction: 'up',
        delayMs: delay,
        durationMs: 400,
      };
    } else if (block.type === 'image') {
      newBlock.props = {
        ...newBlock.props,
        borderRadius: Math.max(block.props?.borderRadius || 0, 12),
      };

      // Add zoom animation for images
      newBlock.animation = {
        type: 'zoom',
        delayMs: delay,
        durationMs: 600,
      };
    }

    return newBlock;
  });

  // If no accent shape exists at top, add one for modern look
  const hasTopShape = design.blocks.some(b =>
    b.type === 'shape' && b.layer === 0 && b.y < 0.2
  );

  if (!hasTopShape && design.blocks.length > 0) {
    design.blocks.unshift({
      id: generateBlockId(),
      type: 'shape',
      x: 0,
      y: 0,
      width: 1,
      height: 0.06,
      layer: 0,
      props: {
        shape: 'rectangle',
        fill: palette.accent,
        opacity: 0.85,
        borderRadius: 0,
      },
      animation: {
        type: 'slide',
        direction: 'down',
        delayMs: 0,
        durationMs: 400,
      },
    });
  }

  // Normalize output to ensure all blocks have required properties
  return normalizeDesign(design);
}

/**
 * Improve slide readability
 * Increases text sizes, improves contrast, simplifies layout
 * @param {Object} params - { slide, brandTheme }
 * @returns {Object} New design JSON
 */
export function improveSlideReadable({ slide, brandTheme }) {
  const design = JSON.parse(JSON.stringify(slide.design_json || slide));
  const bgColor = design.background?.color || '#0f172a';

  design.blocks = (design.blocks || []).map(block => {
    const newBlock = { ...block };

    if (block.type === 'text') {
      const currentFontSize = block.props?.fontSize || 24;

      // Increase font sizes for better readability (min 20px, max 80px)
      const newFontSize = Math.min(Math.max(currentFontSize * 1.15, 20), 80);

      // Ensure good contrast
      const textColor = block.props?.color || '#ffffff';
      const contrastSafe = ensureContrast(textColor, bgColor, 4.5);

      newBlock.props = {
        ...newBlock.props,
        fontSize: Math.round(newFontSize),
        color: contrastSafe,
        // Increase line height for body text
        lineHeight: currentFontSize < 30 ? 1.6 : 1.3,
      };

      // Truncate very long headings
      if (currentFontSize >= 32 && newBlock.props.text && newBlock.props.text.length > 40) {
        newBlock.props.text = newBlock.props.text.substring(0, 37) + '...';
      }
    } else if (block.type === 'shape') {
      // Ensure shape backgrounds don't obscure text
      newBlock.props = {
        ...newBlock.props,
        opacity: Math.min(block.props?.opacity || 1, 0.85),
        borderRadius: Math.max(block.props?.borderRadius || 0, 12),
      };
    }

    return newBlock;
  });

  // Add a subtle fade transition for smoother viewing
  design.transition = {
    type: 'fade',
    durationMs: 500,
  };

  // Normalize output to ensure all blocks have required properties
  return normalizeDesign(design);
}

/**
 * Highlight the promo/primary block on the slide
 * Identifies the most important block and makes it stand out
 * @param {Object} params - { slide, brandTheme }
 * @returns {Object} New design JSON
 */
export function highlightPromo({ slide, brandTheme }) {
  const design = JSON.parse(JSON.stringify(slide.design_json || slide));

  if (!design.blocks || design.blocks.length === 0) {
    return design;
  }

  // Find the "promo" block - prioritize:
  // 1. Block with "promo" or "special" or "$" in text
  // 2. Largest text block by font size
  // 3. Block with highest layer

  let promoBlockIndex = -1;
  let maxScore = -1;

  design.blocks.forEach((block, idx) => {
    let score = 0;

    if (block.type === 'text') {
      const text = (block.props?.text || '').toLowerCase();
      const fontSize = block.props?.fontSize || 24;

      // Keywords boost
      if (text.includes('$') || text.includes('price') || text.includes('off')) score += 50;
      if (text.includes('special') || text.includes('promo') || text.includes('sale')) score += 40;
      if (text.includes('today') || text.includes('now') || text.includes('limited')) score += 30;

      // Size boost
      score += fontSize;

      // Layer boost
      score += (block.layer || 0) * 5;
    }

    if (score > maxScore) {
      maxScore = score;
      promoBlockIndex = idx;
    }
  });

  // If we found a promo block, highlight it
  if (promoBlockIndex >= 0) {
    const promoBlock = design.blocks[promoBlockIndex];
    const accentColor = brandTheme?.accent_color || brandTheme?.primary_color || '#f59e0b';

    // Create a highlight background shape behind the promo block
    const highlightShape = {
      id: generateBlockId(),
      type: 'shape',
      x: Math.max(0, promoBlock.x - 0.02),
      y: Math.max(0, promoBlock.y - 0.02),
      width: Math.min(1 - promoBlock.x + 0.02, promoBlock.width + 0.04),
      height: Math.min(1 - promoBlock.y + 0.02, promoBlock.height + 0.04),
      layer: (promoBlock.layer || 1) - 1,
      props: {
        shape: 'rectangle',
        fill: accentColor,
        opacity: 0.15,
        borderRadius: 16,
      },
      animation: {
        type: 'pop',
        delayMs: 100,
        durationMs: 500,
      },
    };

    // Update the promo block itself
    design.blocks[promoBlockIndex] = {
      ...promoBlock,
      props: {
        ...promoBlock.props,
        // Slightly increase font size
        fontSize: Math.min((promoBlock.props?.fontSize || 24) * 1.1, 80),
        // Use bold weight
        fontWeight: '700',
        // Use accent color
        color: accentColor,
      },
      animation: {
        type: 'pop',
        delayMs: 200,
        durationMs: 600,
      },
    };

    // Insert highlight shape
    design.blocks.splice(promoBlockIndex, 0, highlightShape);
  }

  // Add transition
  design.transition = {
    type: 'fade',
    durationMs: 500,
  };

  // Normalize output to ensure all blocks have required properties
  return normalizeDesign(design);
}

/**
 * Get AI polish actions for the slide panel
 * @returns {Array} List of polish actions
 */
export function getAiPolishActions() {
  return [
    {
      id: 'modern',
      label: 'Make it more modern',
      description: 'Update colors, add animations, and modernize the look',
      icon: 'sparkles',
    },
    {
      id: 'readable',
      label: 'Make it more readable',
      description: 'Increase text sizes and improve contrast',
      icon: 'eye',
    },
    {
      id: 'promo',
      label: 'Highlight the promo',
      description: 'Make the promotional content pop',
      icon: 'zap',
    },
  ];
}

// ============================================
// EXPORTS
// ============================================

export default {
  INDUSTRY_PRESETS,
  getPresetsForBusinessType,
  suggestImprovements,
  suggestPromoSlide,
  suggestMenuSlide,
  makeTextConcise,
  getAiQuickActions,
  // Phase 5: AI Polish functions
  improveSlideModern,
  improveSlideReadable,
  highlightPromo,
  getAiPolishActions,
};
