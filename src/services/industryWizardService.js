/**
 * Industry Wizard Service
 *
 * Central service for industry-specific content wizards that generate
 * professional slide blueprints based on business type.
 *
 * Features:
 * - Pre-built wizard templates per industry
 * - Brand theme integration
 * - Professional default designs
 * - Customizable content inputs
 */

import { createSlide, normalizeDesign } from './sceneDesignService';
import { getBrandTheme, getThemedBlockDefaults } from './brandThemeService';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('IndustryWizardService');

// ===========================================
// WIZARD DEFINITIONS BY INDUSTRY
// ===========================================

const WIZARD_DEFINITIONS = {
  restaurant: [
    {
      key: 'menu',
      title: 'Digital Menu Board',
      description: 'Display your menu items with categories, prices, and images',
      icon: 'utensils',
      fields: [
        { name: 'restaurantName', label: 'Restaurant Name', type: 'text', placeholder: 'Your Restaurant' },
        { name: 'menuCategories', label: 'Menu Categories (comma-separated)', type: 'text', placeholder: 'Appetizers, Mains, Desserts' },
        { name: 'showPrices', label: 'Show price placeholders', type: 'checkbox', default: true },
      ],
      slideCount: 1,
    },
    {
      key: 'specials',
      title: 'Daily Specials',
      description: 'Highlight today\'s specials and featured dishes',
      icon: 'star',
      fields: [
        { name: 'headline', label: 'Headline', type: 'text', placeholder: 'Today\'s Specials' },
        { name: 'specialCount', label: 'Number of specials', type: 'select', options: ['1', '2', '3'], default: '2' },
      ],
      slideCount: 1,
    },
    {
      key: 'happy-hour',
      title: 'Happy Hour',
      description: 'Promote your happy hour deals and times',
      icon: 'clock',
      fields: [
        { name: 'times', label: 'Happy Hour Times', type: 'text', placeholder: '4PM - 7PM' },
        { name: 'headline', label: 'Headline', type: 'text', placeholder: 'Happy Hour!' },
      ],
      slideCount: 1,
    },
    {
      key: 'welcome',
      title: 'Welcome Screen',
      description: 'Greet customers with your branding and ambiance',
      icon: 'home',
      fields: [
        { name: 'restaurantName', label: 'Restaurant Name', type: 'text', placeholder: 'Your Restaurant' },
        { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Fine Dining Since 1985' },
      ],
      slideCount: 1,
    },
  ],

  salon: [
    {
      key: 'services',
      title: 'Service Menu',
      description: 'Display your salon services with pricing',
      icon: 'scissors',
      fields: [
        { name: 'salonName', label: 'Salon Name', type: 'text', placeholder: 'Your Salon' },
        { name: 'serviceCategories', label: 'Service Categories', type: 'text', placeholder: 'Hair, Nails, Spa' },
      ],
      slideCount: 1,
    },
    {
      key: 'promotions',
      title: 'Promotions & Packages',
      description: 'Highlight special offers and service packages',
      icon: 'tag',
      fields: [
        { name: 'promoTitle', label: 'Promotion Title', type: 'text', placeholder: 'Summer Special' },
        { name: 'discount', label: 'Discount/Offer', type: 'text', placeholder: '20% Off' },
      ],
      slideCount: 1,
    },
    {
      key: 'team',
      title: 'Meet Our Team',
      description: 'Introduce your stylists and specialists',
      icon: 'users',
      fields: [
        { name: 'teamCount', label: 'Number of team members', type: 'select', options: ['2', '3', '4'], default: '3' },
      ],
      slideCount: 1,
    },
    {
      key: 'booking',
      title: 'Book Now',
      description: 'Encourage appointments with booking info',
      icon: 'calendar',
      fields: [
        { name: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567' },
        { name: 'website', label: 'Website/Booking URL', type: 'text', placeholder: 'book.yoursalon.com' },
      ],
      slideCount: 1,
    },
  ],

  gym: [
    {
      key: 'classes',
      title: 'Class Schedule',
      description: 'Display fitness class times and instructors',
      icon: 'calendar',
      fields: [
        { name: 'gymName', label: 'Gym Name', type: 'text', placeholder: 'Your Fitness Center' },
        { name: 'dayOfWeek', label: 'Day of Week', type: 'select', options: ['Today', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], default: 'Today' },
      ],
      slideCount: 1,
    },
    {
      key: 'membership',
      title: 'Membership Plans',
      description: 'Showcase membership options and pricing',
      icon: 'credit-card',
      fields: [
        { name: 'planCount', label: 'Number of plans', type: 'select', options: ['2', '3', '4'], default: '3' },
      ],
      slideCount: 1,
    },
    {
      key: 'motivation',
      title: 'Motivational Display',
      description: 'Inspire members with quotes and imagery',
      icon: 'zap',
      fields: [
        { name: 'quote', label: 'Motivational Quote', type: 'text', placeholder: 'Push Your Limits' },
      ],
      slideCount: 1,
    },
    {
      key: 'trainers',
      title: 'Personal Trainers',
      description: 'Highlight your training staff',
      icon: 'users',
      fields: [
        { name: 'trainerCount', label: 'Number of trainers', type: 'select', options: ['2', '3', '4'], default: '3' },
      ],
      slideCount: 1,
    },
  ],

  retail: [
    {
      key: 'sale',
      title: 'Sale Announcement',
      description: 'Promote sales and discounts',
      icon: 'percent',
      fields: [
        { name: 'saleTitle', label: 'Sale Title', type: 'text', placeholder: 'Summer Sale' },
        { name: 'discount', label: 'Discount Amount', type: 'text', placeholder: 'Up to 50% Off' },
        { name: 'endDate', label: 'Sale End Date', type: 'text', placeholder: 'Ends Sunday' },
      ],
      slideCount: 1,
    },
    {
      key: 'new-arrivals',
      title: 'New Arrivals',
      description: 'Showcase new products and collections',
      icon: 'package',
      fields: [
        { name: 'collectionName', label: 'Collection Name', type: 'text', placeholder: 'Fall Collection' },
      ],
      slideCount: 1,
    },
    {
      key: 'featured',
      title: 'Featured Products',
      description: 'Highlight specific products',
      icon: 'star',
      fields: [
        { name: 'productCount', label: 'Number of products', type: 'select', options: ['1', '2', '3', '4'], default: '3' },
      ],
      slideCount: 1,
    },
    {
      key: 'loyalty',
      title: 'Loyalty Program',
      description: 'Promote your rewards program',
      icon: 'award',
      fields: [
        { name: 'programName', label: 'Program Name', type: 'text', placeholder: 'Rewards Club' },
        { name: 'benefit', label: 'Key Benefit', type: 'text', placeholder: 'Earn points on every purchase' },
      ],
      slideCount: 1,
    },
  ],

  medical: [
    {
      key: 'services',
      title: 'Services Overview',
      description: 'Display available medical services',
      icon: 'stethoscope',
      fields: [
        { name: 'practiceName', label: 'Practice Name', type: 'text', placeholder: 'Your Medical Practice' },
        { name: 'specialty', label: 'Specialty', type: 'text', placeholder: 'Family Medicine' },
      ],
      slideCount: 1,
    },
    {
      key: 'health-tips',
      title: 'Health Tips',
      description: 'Share wellness and health information',
      icon: 'heart',
      fields: [
        { name: 'topic', label: 'Health Topic', type: 'text', placeholder: 'Staying Healthy This Season' },
      ],
      slideCount: 1,
    },
    {
      key: 'team',
      title: 'Meet Our Doctors',
      description: 'Introduce your medical staff',
      icon: 'users',
      fields: [
        { name: 'doctorCount', label: 'Number of doctors', type: 'select', options: ['1', '2', '3'], default: '2' },
      ],
      slideCount: 1,
    },
    {
      key: 'appointment',
      title: 'Book Appointment',
      description: 'Encourage patients to schedule visits',
      icon: 'calendar',
      fields: [
        { name: 'phoneNumber', label: 'Phone Number', type: 'text', placeholder: '(555) 123-4567' },
        { name: 'acceptingNew', label: 'Accepting new patients', type: 'checkbox', default: true },
      ],
      slideCount: 1,
    },
  ],

  hotel: [
    {
      key: 'welcome',
      title: 'Welcome Screen',
      description: 'Greet guests with hotel branding',
      icon: 'home',
      fields: [
        { name: 'hotelName', label: 'Hotel Name', type: 'text', placeholder: 'Grand Hotel' },
        { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Experience Luxury' },
      ],
      slideCount: 1,
    },
    {
      key: 'amenities',
      title: 'Hotel Amenities',
      description: 'Showcase facilities and services',
      icon: 'star',
      fields: [
        { name: 'amenityCount', label: 'Number of amenities', type: 'select', options: ['4', '6', '8'], default: '6' },
      ],
      slideCount: 1,
    },
    {
      key: 'dining',
      title: 'Dining Options',
      description: 'Highlight restaurants and room service',
      icon: 'utensils',
      fields: [
        { name: 'restaurantName', label: 'Restaurant Name', type: 'text', placeholder: 'The Grand Bistro' },
        { name: 'hours', label: 'Operating Hours', type: 'text', placeholder: '6AM - 11PM' },
      ],
      slideCount: 1,
    },
    {
      key: 'events',
      title: 'Events & Activities',
      description: 'Display scheduled events and activities',
      icon: 'calendar',
      fields: [
        { name: 'eventCount', label: 'Number of events', type: 'select', options: ['2', '3', '4'], default: '3' },
      ],
      slideCount: 1,
    },
  ],

  coffee: [
    {
      key: 'menu',
      title: 'Coffee Menu',
      description: 'Display drinks and prices',
      icon: 'coffee',
      fields: [
        { name: 'shopName', label: 'Shop Name', type: 'text', placeholder: 'Your Coffee Shop' },
        { name: 'categories', label: 'Categories', type: 'text', placeholder: 'Hot Drinks, Cold Drinks, Pastries' },
      ],
      slideCount: 1,
    },
    {
      key: 'specials',
      title: 'Seasonal Specials',
      description: 'Highlight seasonal drinks and treats',
      icon: 'star',
      fields: [
        { name: 'season', label: 'Season/Theme', type: 'text', placeholder: 'Fall Favorites' },
        { name: 'featuredDrink', label: 'Featured Drink', type: 'text', placeholder: 'Pumpkin Spice Latte' },
      ],
      slideCount: 1,
    },
    {
      key: 'loyalty',
      title: 'Loyalty Program',
      description: 'Promote your rewards card',
      icon: 'award',
      fields: [
        { name: 'reward', label: 'Reward', type: 'text', placeholder: 'Free drink after 10 purchases' },
      ],
      slideCount: 1,
    },
    {
      key: 'wifi',
      title: 'WiFi & Hours',
      description: 'Display WiFi info and operating hours',
      icon: 'wifi',
      fields: [
        { name: 'wifiPassword', label: 'WiFi Password', type: 'text', placeholder: 'coffeelover123' },
        { name: 'hours', label: 'Operating Hours', type: 'text', placeholder: '6AM - 8PM' },
      ],
      slideCount: 1,
    },
  ],

  realestate: [
    {
      key: 'listing',
      title: 'Property Listing',
      description: 'Showcase a featured property',
      icon: 'home',
      fields: [
        { name: 'address', label: 'Property Address', type: 'text', placeholder: '123 Main Street' },
        { name: 'price', label: 'Listing Price', type: 'text', placeholder: '$450,000' },
        { name: 'bedsBaths', label: 'Beds/Baths', type: 'text', placeholder: '3 Bed / 2 Bath' },
      ],
      slideCount: 1,
    },
    {
      key: 'open-house',
      title: 'Open House',
      description: 'Announce open house events',
      icon: 'calendar',
      fields: [
        { name: 'date', label: 'Date', type: 'text', placeholder: 'Sunday, 1-4 PM' },
        { name: 'address', label: 'Address', type: 'text', placeholder: '123 Main Street' },
      ],
      slideCount: 1,
    },
    {
      key: 'agent',
      title: 'Agent Profile',
      description: 'Introduce your real estate agent',
      icon: 'user',
      fields: [
        { name: 'agentName', label: 'Agent Name', type: 'text', placeholder: 'Jane Smith' },
        { name: 'title', label: 'Title', type: 'text', placeholder: 'Senior Real Estate Agent' },
        { name: 'phone', label: 'Phone', type: 'text', placeholder: '(555) 123-4567' },
      ],
      slideCount: 1,
    },
    {
      key: 'just-sold',
      title: 'Just Sold',
      description: 'Celebrate recent sales',
      icon: 'check-circle',
      fields: [
        { name: 'address', label: 'Property Address', type: 'text', placeholder: '456 Oak Avenue' },
        { name: 'daysOnMarket', label: 'Days on Market', type: 'text', placeholder: '14 days' },
      ],
      slideCount: 1,
    },
  ],

  auto: [
    {
      key: 'featured',
      title: 'Featured Vehicle',
      description: 'Highlight a featured car',
      icon: 'car',
      fields: [
        { name: 'make', label: 'Make/Model', type: 'text', placeholder: '2024 Honda Accord' },
        { name: 'price', label: 'Price', type: 'text', placeholder: 'Starting at $28,990' },
      ],
      slideCount: 1,
    },
    {
      key: 'specials',
      title: 'Sales Event',
      description: 'Promote sales and financing deals',
      icon: 'tag',
      fields: [
        { name: 'eventName', label: 'Event Name', type: 'text', placeholder: 'Year-End Clearance' },
        { name: 'offer', label: 'Main Offer', type: 'text', placeholder: '0% APR for 60 months' },
      ],
      slideCount: 1,
    },
    {
      key: 'service',
      title: 'Service Specials',
      description: 'Promote service department deals',
      icon: 'wrench',
      fields: [
        { name: 'serviceType', label: 'Service Type', type: 'text', placeholder: 'Oil Change Special' },
        { name: 'price', label: 'Price', type: 'text', placeholder: '$29.99' },
      ],
      slideCount: 1,
    },
    {
      key: 'inventory',
      title: 'New Inventory',
      description: 'Showcase new arrivals',
      icon: 'truck',
      fields: [
        { name: 'vehicleCount', label: 'Number of vehicles', type: 'select', options: ['3', '4', '6'], default: '4' },
      ],
      slideCount: 1,
    },
  ],

  other: [
    {
      key: 'welcome',
      title: 'Welcome Screen',
      description: 'Professional welcome display',
      icon: 'home',
      fields: [
        { name: 'businessName', label: 'Business Name', type: 'text', placeholder: 'Your Business' },
        { name: 'tagline', label: 'Tagline', type: 'text', placeholder: 'Your tagline here' },
      ],
      slideCount: 1,
    },
    {
      key: 'services',
      title: 'Services Overview',
      description: 'Display your services',
      icon: 'list',
      fields: [
        { name: 'serviceCount', label: 'Number of services', type: 'select', options: ['3', '4', '6'], default: '4' },
      ],
      slideCount: 1,
    },
    {
      key: 'contact',
      title: 'Contact Information',
      description: 'Share your contact details',
      icon: 'phone',
      fields: [
        { name: 'phone', label: 'Phone', type: 'text', placeholder: '(555) 123-4567' },
        { name: 'email', label: 'Email', type: 'text', placeholder: 'info@yourbusiness.com' },
        { name: 'website', label: 'Website', type: 'text', placeholder: 'www.yourbusiness.com' },
      ],
      slideCount: 1,
    },
    {
      key: 'announcement',
      title: 'Announcement',
      description: 'General announcement display',
      icon: 'megaphone',
      fields: [
        { name: 'headline', label: 'Headline', type: 'text', placeholder: 'Important Announcement' },
        { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Your message here...' },
      ],
      slideCount: 1,
    },
  ],
};

// ===========================================
// BLUEPRINT GENERATORS
// ===========================================

/**
 * Generate a design blueprint for a specific wizard and industry
 */
function generateBlueprint(industry, wizardKey, formData = {}, brandTheme = null) {
  const themeDefaults = brandTheme ? getThemedBlockDefaults(brandTheme) : {};

  // Theme colors with fallbacks
  const colors = {
    primary: brandTheme?.primary_color || '#3B82F6',
    secondary: brandTheme?.secondary_color || '#1D4ED8',
    accent: brandTheme?.accent_color || '#10B981',
    neutral: brandTheme?.neutral_color || '#6B7280',
    background: brandTheme?.background_color || '#0F172A',
    textPrimary: brandTheme?.text_primary_color || '#FFFFFF',
    textSecondary: brandTheme?.text_secondary_color || '#94A3B8',
  };

  const fonts = {
    heading: brandTheme?.font_heading || 'Inter',
    body: brandTheme?.font_body || 'Inter',
  };

  // Get the blueprint generator for this industry/wizard combo
  const blueprintFn = BLUEPRINT_GENERATORS[industry]?.[wizardKey] || BLUEPRINT_GENERATORS.other.welcome;

  // Generate the blueprint and normalize to ensure all blocks have proper structure
  const blueprint = blueprintFn(formData, colors, fonts);
  return normalizeDesign(blueprint);
}

/**
 * Blueprint generators organized by industry and wizard key
 */
const BLUEPRINT_GENERATORS = {
  restaurant: {
    menu: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.03, width: 0.9, height: 0.12,
          text: data.restaurantName || 'Our Menu',
          fontSize: 48,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.3, y: 0.14, width: 0.4, height: 0.005,
          fill: colors.accent,
          borderRadius: 2,
        },
        // Menu categories section
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.2, width: 0.28, height: 0.08,
          text: (data.menuCategories?.split(',')[0]?.trim()) || 'Appetizers',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.28, width: 0.28, height: 0.35,
          text: 'Item Name................$12\nItem Name................$14\nItem Name................$10\nItem Name................$15',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.36, y: 0.2, width: 0.28, height: 0.08,
          text: (data.menuCategories?.split(',')[1]?.trim()) || 'Main Courses',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.36, y: 0.28, width: 0.28, height: 0.35,
          text: 'Item Name................$24\nItem Name................$28\nItem Name................$22\nItem Name................$26',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.67, y: 0.2, width: 0.28, height: 0.08,
          text: (data.menuCategories?.split(',')[2]?.trim()) || 'Desserts',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.67, y: 0.28, width: 0.28, height: 0.35,
          text: 'Item Name..................$8\nItem Name................$10\nItem Name..................$9\nItem Name................$12',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
        // Footer with image placeholder
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.05, y: 0.7, width: 0.25, height: 0.25,
          src: null,
          placeholder: 'Food Image',
          borderRadius: 12,
        },
      ],
    }),

    specials: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#1a0a1a', angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0, y: 0, width: 1, height: 0.15,
          fill: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.03, width: 0.9, height: 0.1,
          text: data.headline || "Today's Specials",
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.08, y: 0.22, width: 0.38, height: 0.7,
          fill: `${colors.primary}15`,
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.25, width: 0.34, height: 0.08,
          text: 'Special #1',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.34, width: 0.34, height: 0.15,
          text: 'Delicious dish description goes here with all the details',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.82, width: 0.34, height: 0.08,
          text: '$24.99',
          fontSize: 32,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.54, y: 0.22, width: 0.38, height: 0.7,
          fill: `${colors.primary}15`,
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.56, y: 0.25, width: 0.34, height: 0.08,
          text: 'Special #2',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.56, y: 0.34, width: 0.34, height: 0.15,
          text: 'Another amazing dish with fresh ingredients',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.56, y: 0.82, width: 0.34, height: 0.08,
          text: '$19.99',
          fontSize: 32,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
      ],
    }),

    'happy-hour': (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#1a0a2e', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.1, width: 0.9, height: 0.15,
          text: data.headline || 'Happy Hour!',
          fontSize: 64,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.28, width: 0.9, height: 0.1,
          text: data.times || '4PM - 7PM',
          fontSize: 42,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.15, y: 0.45, width: 0.7, height: 0.4,
          fill: `${colors.primary}20`,
          borderRadius: 20,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.5, width: 0.6, height: 0.08,
          text: 'Drink Specials',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.6, width: 0.6, height: 0.2,
          text: '$5 Draft Beers\n$7 House Wine\n$8 Well Cocktails',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
          lineHeight: 1.6,
        },
      ],
    }),

    welcome: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a0a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.3, width: 0.9, height: 0.15,
          text: data.restaurantName || 'Welcome',
          fontSize: 72,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.35, y: 0.48, width: 0.3, height: 0.005,
          fill: colors.accent,
          borderRadius: 2,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.52, width: 0.9, height: 0.1,
          text: data.tagline || 'Fine Dining Experience',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'widget',
          x: 0.4, y: 0.75, width: 0.2, height: 0.1,
          widgetType: 'clock',
          props: {
            format: '12h',
            textColor: colors.accent,
          },
        },
      ],
    }),
  },

  gym: {
    classes: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0, y: 0, width: 1, height: 0.12,
          fill: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.02, width: 0.6, height: 0.08,
          text: data.gymName || 'Class Schedule',
          fontSize: 36,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.7, y: 0.02, width: 0.25, height: 0.08,
          text: data.dayOfWeek || 'Today',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'right',
        },
        // Class rows
        ...['6:00 AM - Yoga', '8:00 AM - HIIT', '10:00 AM - Spin', '12:00 PM - Strength', '5:00 PM - CrossFit', '7:00 PM - Boxing'].map((classInfo, i) => ({
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.16 + (i * 0.12), width: 0.9, height: 0.1,
          text: classInfo,
          fontSize: 24,
          fontFamily: fonts.body,
          color: i % 2 === 0 ? colors.textPrimary : colors.textSecondary,
          background: i % 2 === 0 ? `${colors.primary}10` : 'transparent',
        })),
      ],
    }),

    membership: (data, colors, fonts) => {
      // Plan definitions with names and prices
      const planDefs = [
        { name: 'Basic', price: '$29/mo' },
        { name: 'Pro', price: '$49/mo', featured: true },
        { name: 'Elite', price: '$79/mo' },
        { name: 'Premium', price: '$99/mo' },
      ];

      // Get the number of plans from form data (default to 3)
      const planCount = parseInt(data.planCount || '3');
      const plans = planDefs.slice(0, planCount);

      // Calculate card layout based on plan count
      const margin = 0.03;
      const totalMargin = margin * (planCount + 1);
      const cardWidth = (1 - totalMargin) / planCount;
      const cardHeight = 0.72;
      const cardY = 0.2;

      // Generate plan cards dynamically
      const planBlocks = plans.flatMap((plan, i) => {
        const cardX = margin + i * (cardWidth + margin);
        const isFeatured = plan.featured;
        const cardYOffset = isFeatured ? -0.02 : 0;
        const cardHeightBonus = isFeatured ? 0.04 : 0;
        const textPadding = 0.02;

        return [
          // Card background
          {
            id: crypto.randomUUID(),
            type: 'shape',
            x: cardX,
            y: cardY + cardYOffset,
            width: cardWidth,
            height: cardHeight + cardHeightBonus,
            fill: isFeatured ? colors.primary : `${colors.neutral}20`,
            borderRadius: 16,
          },
          // Plan name
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: cardX + textPadding,
            y: cardY + 0.03 + cardYOffset,
            width: cardWidth - textPadding * 2,
            height: 0.08,
            text: plan.name,
            fontSize: planCount === 4 ? 24 : 28,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          // Price
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: cardX + textPadding,
            y: cardY + 0.12 + cardYOffset,
            width: cardWidth - textPadding * 2,
            height: 0.1,
            text: plan.price,
            fontSize: planCount === 4 ? 30 : 36,
            fontWeight: '700',
            fontFamily: fonts.heading,
            color: isFeatured ? colors.accent : colors.primary,
            align: 'center',
          },
        ];
      });

      return {
        background: { type: 'gradient', from: colors.background, to: '#0a1a0a', angle: 180 },
        blocks: [
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05, y: 0.05, width: 0.9, height: 0.12,
            text: 'Membership Plans',
            fontSize: 44,
            fontWeight: '700',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          ...planBlocks,
        ],
      };
    },

    motivation: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#0a0a0a', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.35, width: 0.8, height: 0.3,
          text: `"${data.quote || 'Push Your Limits'}"`,
          fontSize: 56,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.4, y: 0.7, width: 0.2, height: 0.006,
          fill: colors.accent,
          borderRadius: 3,
        },
      ],
    }),

    trainers: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Personal Trainers',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        // Trainer cards
        ...Array.from({ length: parseInt(data.trainerCount || '3') }, (_, i) => [
          {
            id: crypto.randomUUID(),
            type: 'image',
            x: 0.05 + (i * 0.32), y: 0.2, width: 0.28, height: 0.45,
            src: null,
            placeholder: 'Trainer Photo',
            borderRadius: 12,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.68, width: 0.28, height: 0.08,
            text: `Trainer ${i + 1}`,
            fontSize: 22,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.76, width: 0.28, height: 0.06,
            text: 'Specialty',
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.accent,
            align: 'center',
          },
        ]).flat(),
      ],
    }),
  },

  salon: {
    services: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#1a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.12,
          text: data.salonName || 'Our Services',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.35, y: 0.16, width: 0.3, height: 0.005,
          fill: colors.accent,
          borderRadius: 2,
        },
        // Service categories
        ...['Hair', 'Nails', 'Spa'].map((category, i) => [
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.22, width: 0.28, height: 0.08,
            text: category,
            fontSize: 28,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.accent,
            align: 'center',
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.32, width: 0.28, height: 0.55,
            text: 'Service....................$45\nService....................$55\nService....................$35\nService....................$65',
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.textSecondary,
            lineHeight: 1.8,
          },
        ]).flat(),
      ],
    }),

    promotions: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#2a0a2a', to: colors.background, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.1, y: 0.15, width: 0.8, height: 0.7,
          fill: `${colors.primary}15`,
          borderRadius: 24,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.2, width: 0.7, height: 0.12,
          text: data.promoTitle || 'Special Offer',
          fontSize: 48,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.38, width: 0.7, height: 0.15,
          text: data.discount || '20% Off',
          fontSize: 72,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.primary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.58, width: 0.7, height: 0.1,
          text: 'All Services',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.72, width: 0.7, height: 0.08,
          text: 'Book Now',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
      ],
    }),

    team: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Meet Our Team',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.teamCount || '3') }, (_, i) => [
          {
            id: crypto.randomUUID(),
            type: 'image',
            x: 0.05 + (i * 0.32), y: 0.18, width: 0.28, height: 0.5,
            src: null,
            placeholder: 'Photo',
            borderRadius: 12,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.7, width: 0.28, height: 0.08,
            text: `Stylist ${i + 1}`,
            fontSize: 22,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.78, width: 0.28, height: 0.06,
            text: 'Hair Specialist',
            fontSize: 14,
            fontFamily: fonts.body,
            color: colors.accent,
            align: 'center',
          },
        ]).flat(),
      ],
    }),

    booking: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.2, width: 0.9, height: 0.12,
          text: 'Book Your Appointment',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.4, width: 0.9, height: 0.1,
          text: data.phoneNumber || '(555) 123-4567',
          fontSize: 48,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.55, width: 0.9, height: 0.08,
          text: data.website || 'book.yoursalon.com',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.primary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.75, width: 0.9, height: 0.06,
          text: 'Walk-ins Welcome',
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),
  },

  retail: {
    sale: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#2a0a0a', to: colors.background, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.15,
          text: data.saleTitle || 'SALE',
          fontSize: 72,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: '#FF4444',
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.3, width: 0.9, height: 0.2,
          text: data.discount || 'Up to 50% Off',
          fontSize: 64,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.2, y: 0.55, width: 0.6, height: 0.2,
          fill: colors.primary,
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.22, y: 0.58, width: 0.56, height: 0.14,
          text: 'Shop Now',
          fontSize: 36,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.82, width: 0.9, height: 0.08,
          text: data.endDate || 'Limited Time Only',
          fontSize: 24,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),

    'new-arrivals': (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.12,
          text: 'New Arrivals',
          fontSize: 48,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.16, width: 0.9, height: 0.06,
          text: data.collectionName || 'Fall Collection',
          fontSize: 24,
          fontFamily: fonts.body,
          color: colors.accent,
          align: 'center',
        },
        // Product grid
        ...Array.from({ length: 4 }, (_, i) => ({
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.05 + ((i % 2) * 0.48), y: 0.26 + (Math.floor(i / 2) * 0.36), width: 0.44, height: 0.32,
          src: null,
          placeholder: 'Product Image',
          borderRadius: 12,
        })),
      ],
    }),

    featured: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Featured Products',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.productCount || '3') }, (_, i) => [
          {
            id: crypto.randomUUID(),
            type: 'image',
            x: 0.05 + (i * 0.32), y: 0.18, width: 0.28, height: 0.45,
            src: null,
            placeholder: 'Product',
            borderRadius: 12,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.66, width: 0.28, height: 0.08,
            text: 'Product Name',
            fontSize: 18,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.05 + (i * 0.32), y: 0.74, width: 0.28, height: 0.06,
            text: '$49.99',
            fontSize: 20,
            fontWeight: '700',
            fontFamily: fonts.heading,
            color: colors.accent,
            align: 'center',
          },
        ]).flat(),
      ],
    }),

    loyalty: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.primary, to: colors.secondary, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.15, width: 0.9, height: 0.12,
          text: data.programName || 'Rewards Club',
          fontSize: 52,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.35, width: 0.8, height: 0.15,
          text: data.benefit || 'Earn points on every purchase',
          fontSize: 32,
          fontFamily: fonts.body,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.25, y: 0.6, width: 0.5, height: 0.18,
          fill: colors.textPrimary,
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.27, y: 0.64, width: 0.46, height: 0.1,
          text: 'Join Today',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
          align: 'center',
        },
      ],
    }),
  },

  coffee: {
    menu: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#1a0f0a', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.03, width: 0.9, height: 0.1,
          text: data.shopName || 'Coffee Menu',
          fontSize: 42,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        // Menu columns
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.16, width: 0.28, height: 0.06,
          text: 'Hot Drinks',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.24, width: 0.28, height: 0.4,
          text: 'Espresso...............$3\nAmericano............$4\nLatte.....................$5\nCappuccino...........$5\nMocha...................$6',
          fontSize: 16,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.36, y: 0.16, width: 0.28, height: 0.06,
          text: 'Cold Drinks',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.36, y: 0.24, width: 0.28, height: 0.4,
          text: 'Iced Coffee............$4\nCold Brew..............$5\nIced Latte..............$6\nFrappuccino..........$6\nSmoothie...............$7',
          fontSize: 16,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.67, y: 0.16, width: 0.28, height: 0.06,
          text: 'Pastries',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.67, y: 0.24, width: 0.28, height: 0.4,
          text: 'Croissant..............$4\nMuffin....................$4\nScone.....................$4\nBrownie.................$5\nCookie...................$3',
          fontSize: 16,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.8,
        },
      ],
    }),

    specials: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#2a1a0a', to: colors.background, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.1,
          text: data.season || 'Seasonal Specials',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.1, y: 0.22, width: 0.35, height: 0.55,
          src: null,
          placeholder: 'Featured Drink',
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.3, width: 0.45, height: 0.1,
          text: data.featuredDrink || 'Pumpkin Spice Latte',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.45, width: 0.45, height: 0.15,
          text: 'Made with real pumpkin and warm spices',
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.65, width: 0.45, height: 0.1,
          text: '$5.99',
          fontSize: 36,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
      ],
    }),

    loyalty: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.1, y: 0.1, width: 0.8, height: 0.8,
          fill: `${colors.primary}20`,
          borderRadius: 24,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.18, width: 0.7, height: 0.12,
          text: 'Loyalty Rewards',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.38, width: 0.7, height: 0.12,
          text: data.reward || 'Free drink after 10 purchases',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        // Coffee cup icons
        ...Array.from({ length: 10 }, (_, i) => ({
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.15 + ((i % 5) * 0.14), y: 0.58 + (Math.floor(i / 5) * 0.14), width: 0.1, height: 0.1,
          fill: i < 7 ? colors.accent : colors.neutral,
          borderRadius: 8,
        })),
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.85, width: 0.7, height: 0.06,
          text: 'Ask for your rewards card!',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.accent,
          align: 'center',
        },
      ],
    }),

    wifi: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.1, width: 0.9, height: 0.12,
          text: 'Free WiFi',
          fontSize: 52,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.2, y: 0.28, width: 0.6, height: 0.25,
          fill: `${colors.primary}20`,
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.22, y: 0.32, width: 0.56, height: 0.06,
          text: 'Password',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.22, y: 0.4, width: 0.56, height: 0.1,
          text: data.wifiPassword || 'coffeelover123',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.6, width: 0.9, height: 0.08,
          text: 'Hours of Operation',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.7, width: 0.9, height: 0.08,
          text: data.hours || '6AM - 8PM Daily',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'widget',
          x: 0.4, y: 0.85, width: 0.2, height: 0.08,
          widgetType: 'clock',
          props: { format: '12h', textColor: colors.accent },
        },
      ],
    }),
  },

  medical: {
    services: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: data.practiceName || 'Our Services',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.14, width: 0.9, height: 0.06,
          text: data.specialty || 'Family Medicine',
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.accent,
          align: 'center',
        },
        // Service list
        ...['Primary Care', 'Preventive Care', 'Chronic Disease Management', 'Vaccinations', 'Lab Services', 'Telehealth'].map((service, i) => ({
          id: crypto.randomUUID(),
          type: 'text',
          x: i < 3 ? 0.08 : 0.52, y: 0.26 + ((i % 3) * 0.2), width: 0.4, height: 0.16,
          text: `✓ ${service}`,
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        })),
      ],
    }),

    'health-tips': (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#0a1a0a', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.1,
          text: 'Health Tip',
          fontSize: 36,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.1, y: 0.22, width: 0.8, height: 0.6,
          fill: `${colors.primary}15`,
          borderRadius: 20,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.28, width: 0.7, height: 0.1,
          text: data.topic || 'Stay Healthy This Season',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.42, width: 0.7, height: 0.35,
          text: '• Wash hands frequently\n• Stay hydrated\n• Get enough sleep\n• Exercise regularly\n• Eat nutritious foods',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.6,
        },
      ],
    }),

    team: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Meet Our Doctors',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.doctorCount || '2') }, (_, i) => [
          {
            id: crypto.randomUUID(),
            type: 'image',
            x: 0.1 + (i * 0.45), y: 0.2, width: 0.35, height: 0.45,
            src: null,
            placeholder: 'Doctor Photo',
            borderRadius: 12,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.1 + (i * 0.45), y: 0.68, width: 0.35, height: 0.08,
            text: `Dr. Name ${i + 1}`,
            fontSize: 24,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
            align: 'center',
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.1 + (i * 0.45), y: 0.76, width: 0.35, height: 0.06,
            text: 'Specialty',
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.accent,
            align: 'center',
          },
        ]).flat(),
      ],
    }),

    appointment: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.15, width: 0.9, height: 0.12,
          text: 'Schedule Your Visit',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.35, width: 0.9, height: 0.1,
          text: data.phoneNumber || '(555) 123-4567',
          fontSize: 48,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        data.acceptingNew && {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.25, y: 0.55, width: 0.5, height: 0.12,
          fill: colors.primary,
          borderRadius: 8,
        },
        data.acceptingNew && {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.27, y: 0.57, width: 0.46, height: 0.08,
          text: 'Now Accepting New Patients',
          fontSize: 20,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.75, width: 0.9, height: 0.06,
          text: 'Same-day appointments available',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ].filter(Boolean),
    }),
  },

  hotel: {
    welcome: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.3, width: 0.9, height: 0.15,
          text: data.hotelName || 'Welcome',
          fontSize: 64,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.35, y: 0.48, width: 0.3, height: 0.005,
          fill: colors.accent,
          borderRadius: 2,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.52, width: 0.9, height: 0.08,
          text: data.tagline || 'Experience Luxury',
          fontSize: 28,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'widget',
          x: 0.4, y: 0.75, width: 0.2, height: 0.1,
          widgetType: 'clock',
          props: { format: '12h', textColor: colors.accent },
        },
      ],
    }),

    amenities: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Hotel Amenities',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        // Amenity grid
        ...['Pool & Spa', 'Fitness Center', 'Restaurant', 'Room Service', 'Free WiFi', 'Concierge'].map((amenity, i) => ({
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.08 + ((i % 3) * 0.3), y: 0.2 + (Math.floor(i / 3) * 0.35), width: 0.26, height: 0.28,
          text: `✦ ${amenity}`,
          fontSize: 22,
          fontWeight: '500',
          fontFamily: fonts.body,
          color: i % 2 === 0 ? colors.accent : colors.textSecondary,
          align: 'center',
        })),
      ],
    }),

    dining: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#1a0a0a', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.1,
          text: 'Dining',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.05, y: 0.22, width: 0.4, height: 0.55,
          src: null,
          placeholder: 'Restaurant Image',
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.28, width: 0.45, height: 0.1,
          text: data.restaurantName || 'The Grand Bistro',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.42, width: 0.45, height: 0.15,
          text: 'Fine dining featuring international cuisine and local favorites',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.62, width: 0.45, height: 0.08,
          text: `Hours: ${data.hours || '6AM - 11PM'}`,
          fontSize: 20,
          fontWeight: '500',
          fontFamily: fonts.body,
          color: colors.primary,
        },
      ],
    }),

    events: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: "Today's Events",
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.eventCount || '3') }, (_, i) => [
          {
            id: crypto.randomUUID(),
            type: 'shape',
            x: 0.05, y: 0.18 + (i * 0.26), width: 0.9, height: 0.22,
            fill: i % 2 === 0 ? `${colors.primary}15` : `${colors.accent}10`,
            borderRadius: 12,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.08, y: 0.21 + (i * 0.26), width: 0.2, height: 0.08,
            text: `${9 + (i * 3)}:00 AM`,
            fontSize: 20,
            fontWeight: '600',
            fontFamily: fonts.heading,
            color: colors.accent,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.3, y: 0.21 + (i * 0.26), width: 0.6, height: 0.08,
            text: ['Yoga by the Pool', 'Wine Tasting', 'Live Music'][i] || 'Event Name',
            fontSize: 22,
            fontWeight: '500',
            fontFamily: fonts.heading,
            color: colors.textPrimary,
          },
          {
            id: crypto.randomUUID(),
            type: 'text',
            x: 0.3, y: 0.3 + (i * 0.26), width: 0.6, height: 0.06,
            text: ['Pool Deck', 'Wine Cellar', 'Lobby Lounge'][i] || 'Location',
            fontSize: 16,
            fontFamily: fonts.body,
            color: colors.textSecondary,
          },
        ]).flat(),
      ],
    }),
  },

  realestate: {
    listing: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0, y: 0, width: 0.55, height: 0.65,
          src: null,
          placeholder: 'Property Photo',
          borderRadius: 0,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.58, y: 0.05, width: 0.4, height: 0.1,
          text: 'For Sale',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.58, y: 0.16, width: 0.4, height: 0.12,
          text: data.price || '$450,000',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.58, y: 0.32, width: 0.4, height: 0.1,
          text: data.address || '123 Main Street',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.textPrimary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.58, y: 0.45, width: 0.4, height: 0.08,
          text: data.bedsBaths || '3 Bed / 2 Bath',
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.textSecondary,
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.05, y: 0.72, width: 0.9, height: 0.22,
          fill: `${colors.primary}15`,
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.08, y: 0.76, width: 0.84, height: 0.06,
          text: 'Contact your agent for a showing',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),

    'open-house': (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.primary, to: colors.secondary, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.1, width: 0.9, height: 0.15,
          text: 'Open House',
          fontSize: 64,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.3, width: 0.9, height: 0.1,
          text: data.date || 'Sunday, 1-4 PM',
          fontSize: 40,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.15, y: 0.48, width: 0.7, height: 0.35,
          fill: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.18, y: 0.55, width: 0.64, height: 0.1,
          text: data.address || '123 Main Street',
          fontSize: 28,
          fontWeight: '500',
          fontFamily: fonts.body,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.18, y: 0.7, width: 0.64, height: 0.08,
          text: 'Refreshments provided',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),

    agent: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.1, y: 0.12, width: 0.35, height: 0.55,
          src: null,
          placeholder: 'Agent Photo',
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.18, width: 0.45, height: 0.12,
          text: data.agentName || 'Jane Smith',
          fontSize: 36,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.32, width: 0.45, height: 0.08,
          text: data.title || 'Senior Real Estate Agent',
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.5, y: 0.44, width: 0.4, height: 0.003,
          fill: colors.neutral,
          borderRadius: 1,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.5, y: 0.5, width: 0.45, height: 0.08,
          text: data.phone || '(555) 123-4567',
          fontSize: 24,
          fontWeight: '500',
          fontFamily: fonts.body,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.1, y: 0.75, width: 0.8, height: 0.08,
          text: '"Helping you find your dream home"',
          fontSize: 20,
          fontStyle: 'italic',
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),

    'just-sold': (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#0a2a0a', to: colors.background, angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.15,
          text: 'JUST SOLD!',
          fontSize: 56,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: '#22C55E',
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.15, y: 0.28, width: 0.7, height: 0.4,
          src: null,
          placeholder: 'Property Photo',
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.72, width: 0.9, height: 0.08,
          text: data.address || '456 Oak Avenue',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.82, width: 0.9, height: 0.06,
          text: `Sold in ${data.daysOnMarket || '14 days'}`,
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.accent,
          align: 'center',
        },
      ],
    }),
  },

  auto: {
    featured: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'image',
          x: 0, y: 0, width: 0.6, height: 0.7,
          src: null,
          placeholder: 'Vehicle Photo',
          borderRadius: 0,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.62, y: 0.1, width: 0.35, height: 0.08,
          text: 'Featured Vehicle',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.accent,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.62, y: 0.2, width: 0.35, height: 0.15,
          text: data.make || '2024 Honda Accord',
          fontSize: 32,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.62, y: 0.4, width: 0.35, height: 0.1,
          text: data.price || 'Starting at $28,990',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.primary,
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.05, y: 0.78, width: 0.9, height: 0.16,
          fill: colors.primary,
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.08, y: 0.82, width: 0.84, height: 0.08,
          text: 'Schedule a Test Drive Today',
          fontSize: 24,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
      ],
    }),

    specials: (data, colors, fonts) => ({
      background: { type: 'gradient', from: '#1a0a0a', to: colors.background, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.12,
          text: data.eventName || 'Year-End Clearance',
          fontSize: 48,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.28, width: 0.9, height: 0.15,
          text: data.offer || '0% APR for 60 months',
          fontSize: 56,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.5, width: 0.9, height: 0.08,
          text: 'On Select Models',
          fontSize: 24,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.2, y: 0.65, width: 0.6, height: 0.18,
          fill: colors.primary,
          borderRadius: 12,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.22, y: 0.69, width: 0.56, height: 0.1,
          text: 'Visit Us Today',
          fontSize: 28,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
      ],
    }),

    service: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.08, width: 0.9, height: 0.1,
          text: 'Service Special',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.15, y: 0.22, width: 0.7, height: 0.55,
          fill: `${colors.primary}15`,
          borderRadius: 20,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.28, width: 0.6, height: 0.1,
          text: data.serviceType || 'Oil Change Special',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.45, width: 0.6, height: 0.12,
          text: data.price || '$29.99',
          fontSize: 56,
          fontWeight: '800',
          fontFamily: fonts.heading,
          color: colors.primary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.62, width: 0.6, height: 0.08,
          text: 'Includes filter & multi-point inspection',
          fontSize: 16,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.82, width: 0.9, height: 0.06,
          text: 'Schedule online or call today',
          fontSize: 18,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
      ],
    }),

    inventory: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.03, width: 0.9, height: 0.08,
          text: 'New Inventory',
          fontSize: 36,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.vehicleCount || '4') }, (_, i) => ({
          id: crypto.randomUUID(),
          type: 'image',
          x: 0.02 + ((i % 2) * 0.5), y: 0.14 + (Math.floor(i / 2) * 0.42), width: 0.46, height: 0.38,
          src: null,
          placeholder: 'Vehicle',
          borderRadius: 12,
        })),
      ],
    }),
  },

  other: {
    welcome: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a0a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.3, width: 0.9, height: 0.15,
          text: data.businessName || 'Welcome',
          fontSize: 64,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.35, y: 0.48, width: 0.3, height: 0.005,
          fill: colors.accent,
          borderRadius: 2,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.52, width: 0.9, height: 0.08,
          text: data.tagline || 'Your tagline here',
          fontSize: 24,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'widget',
          x: 0.4, y: 0.75, width: 0.2, height: 0.1,
          widgetType: 'clock',
          props: { format: '12h', textColor: colors.accent },
        },
      ],
    }),

    services: (data, colors, fonts) => ({
      background: { type: 'solid', color: colors.background },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.05, width: 0.9, height: 0.1,
          text: 'Our Services',
          fontSize: 40,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        ...Array.from({ length: parseInt(data.serviceCount || '4') }, (_, i) => ({
          id: crypto.randomUUID(),
          type: 'text',
          x: i < 2 ? 0.08 : 0.52, y: 0.2 + ((i % 2) * 0.35), width: 0.4, height: 0.28,
          text: `✓ Service ${i + 1}\nDescription of this service goes here`,
          fontSize: 20,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          lineHeight: 1.4,
        })),
      ],
    }),

    contact: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.background, to: '#0a0a1a', angle: 180 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.12, width: 0.9, height: 0.1,
          text: 'Contact Us',
          fontSize: 44,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.15, y: 0.28, width: 0.7, height: 0.55,
          fill: `${colors.primary}15`,
          borderRadius: 20,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.35, width: 0.6, height: 0.08,
          text: data.phone || '(555) 123-4567',
          fontSize: 32,
          fontWeight: '600',
          fontFamily: fonts.heading,
          color: colors.accent,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.48, width: 0.6, height: 0.06,
          text: data.email || 'info@yourbusiness.com',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.textSecondary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.2, y: 0.58, width: 0.6, height: 0.06,
          text: data.website || 'www.yourbusiness.com',
          fontSize: 22,
          fontFamily: fonts.body,
          color: colors.primary,
          align: 'center',
        },
      ],
    }),

    announcement: (data, colors, fonts) => ({
      background: { type: 'gradient', from: colors.primary, to: colors.secondary, angle: 135 },
      blocks: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.05, y: 0.15, width: 0.9, height: 0.15,
          text: data.headline || 'Announcement',
          fontSize: 52,
          fontWeight: '700',
          fontFamily: fonts.heading,
          color: colors.textPrimary,
          align: 'center',
        },
        {
          id: crypto.randomUUID(),
          type: 'shape',
          x: 0.1, y: 0.38, width: 0.8, height: 0.45,
          fill: 'rgba(255,255,255,0.1)',
          borderRadius: 16,
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          x: 0.15, y: 0.45, width: 0.7, height: 0.3,
          text: data.message || 'Your message here...',
          fontSize: 24,
          fontFamily: fonts.body,
          color: colors.textPrimary,
          align: 'center',
        },
      ],
    }),
  },
};

// ===========================================
// PUBLIC API
// ===========================================

/**
 * Get available wizards for an industry
 * @param {string} industry - The industry type
 * @returns {WizardDefinition[]} - Array of wizard definitions
 */
export function getAvailableWizards(industry) {
  const normalizedIndustry = normalizeIndustry(industry);
  return WIZARD_DEFINITIONS[normalizedIndustry] || WIZARD_DEFINITIONS.other;
}

/**
 * Get all supported industries
 * @returns {Array<{key: string, label: string}>}
 */
export function getSupportedIndustries() {
  return [
    { key: 'restaurant', label: 'Restaurant' },
    { key: 'salon', label: 'Salon / Spa' },
    { key: 'gym', label: 'Gym / Fitness' },
    { key: 'retail', label: 'Retail Store' },
    { key: 'medical', label: 'Medical Office' },
    { key: 'hotel', label: 'Hotel / Lobby' },
    { key: 'coffee', label: 'Coffee Shop' },
    { key: 'realestate', label: 'Real Estate' },
    { key: 'auto', label: 'Auto Dealer' },
    { key: 'other', label: 'Other' },
  ];
}

/**
 * Build wizard slides and create them in the database
 * @param {Object} options
 * @param {string} options.sceneId - The scene ID to add slides to
 * @param {string} options.industry - The business industry
 * @param {string} options.wizardKey - The wizard type key
 * @param {Object} options.formData - Form data from wizard inputs
 * @param {Object} options.brandTheme - Optional brand theme
 * @returns {Promise<Object>} - The created slide
 */
export async function buildWizardSlides({ sceneId, industry, wizardKey, formData = {}, brandTheme = null }) {
  // Get brand theme if not provided
  const theme = brandTheme || await getBrandTheme().catch(() => null);

  // Generate the blueprint
  const blueprint = generateBlueprint(industry, wizardKey, formData, theme);

  // Get wizard definition for title
  const wizards = getAvailableWizards(industry);
  const wizard = wizards.find(w => w.key === wizardKey);
  const title = wizard?.title || 'New Slide';

  // Create the slide
  const slide = await createSlide(sceneId, {
    title,
    kind: wizardKey,
    design_json: blueprint,
    duration_seconds: 10, // Default duration
  });

  return slide;
}

/**
 * Get a pure JSON blueprint without creating database records
 * @param {string} industry - The business industry
 * @param {string} wizardKey - The wizard type key
 * @param {Object} formData - Optional form data
 * @param {Object} brandTheme - Optional brand theme
 * @returns {Object} - The design blueprint
 */
export function getDefaultBlueprint(industry, wizardKey, formData = {}, brandTheme = null) {
  return generateBlueprint(industry, wizardKey, formData, brandTheme);
}

/**
 * Get a wizard definition by key
 * @param {string} industry - The business industry
 * @param {string} wizardKey - The wizard type key
 * @returns {WizardDefinition|null}
 */
export function getWizardByKey(industry, wizardKey) {
  const wizards = getAvailableWizards(industry);
  return wizards.find(w => w.key === wizardKey) || null;
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Normalize industry string to match our keys
 */
function normalizeIndustry(industry) {
  if (!industry) return 'other';

  const normalized = industry.toLowerCase().trim();

  // Handle common variations
  const mappings = {
    'restaurant': 'restaurant',
    'restaurants': 'restaurant',
    'food': 'restaurant',
    'dining': 'restaurant',
    'salon': 'salon',
    'spa': 'salon',
    'beauty': 'salon',
    'hair': 'salon',
    'gym': 'gym',
    'fitness': 'gym',
    'health club': 'gym',
    'retail': 'retail',
    'store': 'retail',
    'shop': 'retail',
    'medical': 'medical',
    'doctor': 'medical',
    'clinic': 'medical',
    'healthcare': 'medical',
    'hotel': 'hotel',
    'lobby': 'hotel',
    'hospitality': 'hotel',
    'coffee': 'coffee',
    'cafe': 'coffee',
    'coffeeshop': 'coffee',
    'realestate': 'realestate',
    'real estate': 'realestate',
    'property': 'realestate',
    'auto': 'auto',
    'automotive': 'auto',
    'car': 'auto',
    'dealer': 'auto',
    'dealership': 'auto',
  };

  return mappings[normalized] || (WIZARD_DEFINITIONS[normalized] ? normalized : 'other');
}

export default {
  getAvailableWizards,
  getSupportedIndustries,
  buildWizardSlides,
  getDefaultBlueprint,
  getWizardByKey,
};
