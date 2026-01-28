/**
 * App Catalog - Comprehensive list of available app integrations
 * Based on Yodeck's app gallery with 80+ integrations
 */

import {
  Clock,
  CloudSun,
  Globe,
  Rss,
  Table,
  Calendar,
  LayoutDashboard,
  Briefcase,
  Share2,
  Newspaper,
  Grid3X3,
  Code,
  QrCode,
  Timer,
  Cloud,
  Sun,
  Thermometer,
  Wind,
  Play,
  Video,
  Image,
  MessageSquare,
  Users,
  Wifi,
  Quote,
  Type,
  Monitor,
  Tv,
} from 'lucide-react';

// ============================================
// CATEGORY DEFINITIONS
// ============================================

export const APP_CATEGORIES = [
  { id: 'all', label: 'All Apps', icon: Grid3X3 },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'time', label: 'Time', icon: Clock },
  { id: 'general', label: 'General', icon: Grid3X3 },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'social', label: 'Social Media', icon: Share2 },
  { id: 'calendars', label: 'Calendars', icon: Calendar },
  { id: 'dashboards', label: 'Dashboards', icon: LayoutDashboard },
  { id: 'business', label: 'Business Tools', icon: Briefcase },
  { id: 'interactivity', label: 'Interactivity', icon: QrCode },
  { id: 'custom', label: 'Custom Apps', icon: Code },
];

// ============================================
// APP CATALOG - All Available Apps
// ============================================

export const APP_CATALOG = [
  // ----------------------------------------
  // WEATHER APPS
  // ----------------------------------------
  {
    id: 'daily-weather',
    name: 'Daily Weather',
    category: 'weather',
    icon: Sun,
    iconBgColor: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    description: 'Display current weather with daily forecast',
    longDescription: 'Keep everyone informed with real-time weather updates. Display current temperature, conditions, and a 5-day forecast. Perfect for lobbies, waiting rooms, retail stores, and restaurants.',
    features: [
      'Current temperature and conditions',
      '5-day weather forecast',
      'Customizable location',
      'Imperial or metric units',
    ],
    note: 'Weather data is updated every 15 minutes.',
    featured: true,
    popularIndustries: ['restaurant', 'retail', 'hospitality'],
    configType: 'weather',
  },
  {
    id: 'hourly-weather',
    name: 'Hourly Weather',
    category: 'weather',
    icon: Clock,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Hour-by-hour weather forecast',
    configType: 'weather',
  },
  {
    id: 'current-weather',
    name: 'Current Weather',
    category: 'weather',
    icon: Thermometer,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    description: 'Simple current conditions display',
    configType: 'weather',
  },
  {
    id: 'weather-radar',
    name: 'Weather Radar',
    category: 'weather',
    icon: Cloud,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    description: 'Live radar map for your area',
    configType: 'weather-radar',
  },
  {
    id: 'weather-wall',
    name: 'Weather Wall',
    category: 'weather',
    icon: Wind,
    iconBgColor: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    description: 'Full-screen weather dashboard',
    longDescription: 'Bring your screens to life with real-time weather. Display temperature, real feel, air quality, wind direction, visibility, and more. Built for both full-screen and layout use, Weather Wall keeps teams, visitors, and guests informed at a glance with live, local conditions.',
    features: [
      'Personalize it to fit your space with your preferred language, date, and time format.',
    ],
    themes: [
      { name: 'Animation Theme', description: 'Dynamic backgrounds that change with the weather outside.' },
      { name: 'Classic Theme', description: 'Full control over colors and background.' },
      { name: 'Glass Theme', description: 'Curated, elegant designs created by us for a modern look.' },
    ],
    note: 'Weather Wall is optimized for full-screen display. You can also use it in a layout — just make sure it has enough space to appear clearly.',
    isNew: true,
    configType: 'weather',
  },
  {
    id: 'nws-weather-alert',
    name: 'NWS Weather Alert',
    category: 'weather',
    icon: CloudSun,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    description: 'National Weather Service alerts',
    configType: 'weather-alert',
  },

  // ----------------------------------------
  // TIME APPS
  // ----------------------------------------
  {
    id: 'analog-clock',
    name: 'Analog Clock',
    category: 'time',
    icon: Clock,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Classic analog clock display',
    longDescription: 'A timeless classic for your digital signage. Display a beautiful analog clock that fits any environment. Perfect for offices, schools, restaurants, and waiting areas.',
    features: [
      'Classic analog design',
      'Customizable timezone',
      'Optional date display',
      'Multiple clock face styles',
    ],
    themes: [
      { name: 'Classic', description: 'Traditional black and white design.' },
      { name: 'Modern', description: 'Sleek, minimalist appearance.' },
      { name: 'Gold', description: 'Elegant gold accents for a premium look.' },
    ],
    featured: true,
    popularIndustries: ['restaurant', 'corporate', 'education'],
    configType: 'clock',
  },
  {
    id: 'date-time',
    name: 'Date & Time',
    category: 'time',
    icon: Calendar,
    iconBgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    description: 'Digital clock with date display',
    longDescription: 'Show the current date and time in a clean digital format. Choose from 12 or 24-hour formats, multiple date styles, and customize the timezone.',
    features: [
      '12 or 24-hour format',
      'Multiple date formats',
      'Customizable timezone',
      'Optional seconds display',
    ],
    configType: 'clock',
  },
  {
    id: 'world-clock',
    name: 'World Clock',
    category: 'time',
    icon: Globe,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    description: 'Show multiple time zones',
    configType: 'world-clock',
  },
  {
    id: 'counter-down',
    name: 'Counter down',
    category: 'time',
    icon: Timer,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    description: 'Countdown to an event or deadline',
    configType: 'counter',
  },
  {
    id: 'counter-up',
    name: 'Counter up',
    category: 'time',
    icon: Timer,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: 'Count up from a start date',
    configType: 'counter',
  },
  {
    id: 'daily-weekly-calendar',
    name: 'Daily/Weekly Calendar',
    category: 'time',
    icon: Calendar,
    iconBgColor: 'bg-teal-100',
    iconColor: 'text-teal-600',
    description: 'Show daily or weekly schedule',
    configType: 'calendar',
  },
  {
    id: 'monthly-calendar',
    name: 'Monthly Calendar',
    category: 'time',
    icon: Calendar,
    iconBgColor: 'bg-pink-100',
    iconColor: 'text-pink-600',
    description: 'Full month calendar view',
    configType: 'calendar',
  },

  // ----------------------------------------
  // NEWS APPS
  // ----------------------------------------
  {
    id: 'bbc',
    name: 'BBC',
    category: 'news',
    logoUrl: '/icons/apps/bbc.svg',
    iconBgColor: 'bg-white',
    description: 'BBC News headlines',
    configType: 'rss-preset',
    presetFeedUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
  },
  {
    id: 'cnn',
    name: 'CNN',
    category: 'news',
    logoUrl: '/icons/apps/cnn.svg',
    iconBgColor: 'bg-red-50',
    description: 'CNN breaking news',
    configType: 'rss-preset',
    presetFeedUrl: 'http://rss.cnn.com/rss/cnn_topstories.rss',
  },
  {
    id: 'espn',
    name: 'ESPN',
    category: 'news',
    logoUrl: '/icons/apps/espn.svg',
    iconBgColor: 'bg-red-50',
    description: 'Sports news and scores',
    featured: true,
    popularIndustries: ['restaurant', 'bar', 'fitness'],
    configType: 'rss-preset',
    presetFeedUrl: 'https://www.espn.com/espn/rss/news',
  },
  {
    id: 'fox-news',
    name: 'Fox News',
    category: 'news',
    logoUrl: '/icons/apps/foxnews.svg',
    iconBgColor: 'bg-blue-50',
    description: 'Fox News headlines',
    configType: 'rss-preset',
    presetFeedUrl: 'https://moxie.foxnews.com/google-publisher/latest.xml',
  },
  {
    id: 'google-news',
    name: 'Google News',
    category: 'news',
    logoUrl: '/icons/apps/google-news.svg',
    iconBgColor: 'bg-white',
    description: 'Personalized news from Google',
    configType: 'embed',
  },
  {
    id: 'google-alerts',
    name: 'Google Alerts',
    category: 'news',
    logoUrl: '/icons/apps/google-alerts.svg',
    iconBgColor: 'bg-white',
    description: 'Monitor keywords in news',
    configType: 'rss',
  },
  {
    id: 'the-guardian',
    name: 'The Guardian',
    category: 'news',
    logoUrl: '/icons/apps/guardian.svg',
    iconBgColor: 'bg-blue-900',
    description: 'The Guardian news',
    configType: 'rss-preset',
    presetFeedUrl: 'https://www.theguardian.com/world/rss',
  },
  {
    id: 'nytimes',
    name: 'The New York Times',
    category: 'news',
    logoUrl: '/icons/apps/nytimes.svg',
    iconBgColor: 'bg-white',
    description: 'NYT top stories',
    configType: 'rss-preset',
    presetFeedUrl: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
  },
  {
    id: 'wsj',
    name: 'The Wall Street Journal',
    category: 'news',
    logoUrl: '/icons/apps/wsj.svg',
    iconBgColor: 'bg-white',
    description: 'WSJ business news',
    configType: 'rss-preset',
    presetFeedUrl: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
  },
  {
    id: 'bloomberg',
    name: 'Bloomberg',
    category: 'news',
    logoUrl: '/icons/apps/bloomberg.svg',
    iconBgColor: 'bg-black',
    description: 'Bloomberg financial news',
    configType: 'rss-preset',
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera',
    category: 'news',
    logoUrl: '/icons/apps/aljazeera.svg',
    iconBgColor: 'bg-amber-50',
    description: 'Al Jazeera international news',
    configType: 'rss-preset',
  },
  {
    id: 'sky-news',
    name: 'Sky News',
    category: 'news',
    logoUrl: '/icons/apps/skynews.svg',
    iconBgColor: 'bg-red-600',
    description: 'Sky News UK',
    configType: 'rss-preset',
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    category: 'news',
    logoUrl: '/icons/apps/yahoo.svg',
    iconBgColor: 'bg-purple-50',
    description: 'Yahoo news feed',
    configType: 'rss-preset',
  },
  {
    id: 'custom-rss',
    name: 'Custom RSS',
    category: 'news',
    icon: Rss,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    description: 'Add any RSS feed URL',
    featured: true,
    popularIndustries: ['restaurant', 'corporate'],
    configType: 'rss',
  },
  {
    id: 'ticker',
    name: 'Ticker',
    category: 'news',
    icon: Type,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    description: 'Scrolling text ticker',
    configType: 'ticker',
  },

  // ----------------------------------------
  // SOCIAL MEDIA APPS
  // ----------------------------------------
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    logoUrl: '/icons/apps/instagram.svg',
    iconBgColor: 'bg-gradient-to-br from-purple-500 to-pink-500',
    description: 'Display Instagram feed',
    featured: true,
    configType: 'social-instagram',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    logoUrl: '/icons/apps/facebook.svg',
    iconBgColor: 'bg-blue-600',
    description: 'Facebook page feed',
    featured: true,
    configType: 'social-facebook',
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    category: 'social',
    logoUrl: '/icons/apps/twitter.svg',
    iconBgColor: 'bg-black',
    description: 'Twitter/X feed display',
    configType: 'social-twitter',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    logoUrl: '/icons/apps/linkedin.svg',
    iconBgColor: 'bg-blue-700',
    description: 'LinkedIn company feed',
    configType: 'social-linkedin',
  },
  {
    id: 'walls-io',
    name: 'Walls.io',
    category: 'social',
    logoUrl: '/icons/apps/wallsio.svg',
    iconBgColor: 'bg-green-500',
    description: 'Social wall aggregator',
    configType: 'embed',
  },
  {
    id: 'viva-engage',
    name: 'Viva Engage',
    category: 'social',
    logoUrl: '/icons/apps/viva.svg',
    iconBgColor: 'bg-blue-500',
    description: 'Microsoft Viva Engage feed',
    configType: 'embed',
  },
  {
    id: 'taggbox',
    name: 'Taggbox display',
    category: 'social',
    logoUrl: '/icons/apps/taggbox.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Social media aggregator',
    configType: 'embed',
  },

  // ----------------------------------------
  // CALENDAR APPS
  // ----------------------------------------
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendars',
    logoUrl: '/icons/apps/google-calendar.svg',
    iconBgColor: 'bg-white',
    description: 'Display Google Calendar events',
    featured: true,
    configType: 'google-calendar',
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    category: 'calendars',
    logoUrl: '/icons/apps/outlook.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Microsoft Outlook calendar',
    configType: 'outlook-calendar',
  },
  {
    id: 'calendar-events',
    name: 'Calendar Events Feed',
    category: 'calendars',
    icon: Calendar,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    description: 'Display events from iCal URL',
    configType: 'ical',
  },

  // ----------------------------------------
  // DASHBOARD APPS
  // ----------------------------------------
  {
    id: 'power-bi',
    name: 'Power BI',
    category: 'dashboards',
    logoUrl: '/icons/apps/powerbi.svg',
    iconBgColor: 'bg-yellow-100',
    description: 'Microsoft Power BI dashboards',
    configType: 'embed',
  },
  {
    id: 'tableau',
    name: 'Tableau',
    category: 'dashboards',
    logoUrl: '/icons/apps/tableau.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Tableau visualizations',
    configType: 'embed',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    category: 'dashboards',
    logoUrl: '/icons/apps/grafana.svg',
    iconBgColor: 'bg-orange-100',
    description: 'Grafana monitoring dashboards',
    configType: 'embed',
  },
  {
    id: 'google-looker',
    name: 'Google Looker Studio',
    category: 'dashboards',
    logoUrl: '/icons/apps/looker.svg',
    iconBgColor: 'bg-blue-50',
    description: 'Looker Studio reports',
    configType: 'embed',
  },
  {
    id: 'luzmo',
    name: 'Luzmo',
    category: 'dashboards',
    logoUrl: '/icons/apps/luzmo.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Luzmo embedded analytics',
    configType: 'embed',
  },
  {
    id: 'my-dashboard',
    name: 'My Dashboard',
    category: 'dashboards',
    icon: LayoutDashboard,
    iconBgColor: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    description: 'Custom dashboard builder',
    configType: 'dashboard',
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    category: 'dashboards',
    logoUrl: '/icons/apps/google-analytics.svg',
    iconBgColor: 'bg-orange-50',
    description: 'Real-time analytics display',
    configType: 'embed',
  },
  {
    id: 'baremetrics',
    name: 'BareMetrics',
    category: 'dashboards',
    logoUrl: '/icons/apps/baremetrics.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Subscription analytics',
    configType: 'embed',
  },
  {
    id: 'chartmogul',
    name: 'ChartMogul',
    category: 'dashboards',
    logoUrl: '/icons/apps/chartmogul.svg',
    iconBgColor: 'bg-blue-900',
    description: 'Revenue analytics',
    configType: 'embed',
  },
  {
    id: 'fathom',
    name: 'Fathom',
    category: 'dashboards',
    logoUrl: '/icons/apps/fathom.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Privacy-focused analytics',
    configType: 'embed',
  },
  {
    id: 'cyfe',
    name: 'Cyfe',
    category: 'dashboards',
    logoUrl: '/icons/apps/cyfe.svg',
    iconBgColor: 'bg-green-100',
    description: 'All-in-one dashboard',
    configType: 'embed',
  },
  {
    id: 'putler',
    name: 'Putler',
    category: 'dashboards',
    logoUrl: '/icons/apps/putler.svg',
    iconBgColor: 'bg-green-100',
    description: 'E-commerce analytics',
    configType: 'embed',
  },
  {
    id: 'chargebee',
    name: 'Chargebee',
    category: 'dashboards',
    logoUrl: '/icons/apps/chargebee.svg',
    iconBgColor: 'bg-orange-100',
    description: 'Subscription billing dashboard',
    configType: 'embed',
  },
  {
    id: 'xero',
    name: 'Xero',
    category: 'dashboards',
    logoUrl: '/icons/apps/xero.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Accounting dashboard',
    configType: 'embed',
  },

  // ----------------------------------------
  // BUSINESS TOOLS
  // ----------------------------------------
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'business',
    logoUrl: '/icons/apps/google-sheets.svg',
    iconBgColor: 'bg-green-100',
    description: 'Display spreadsheet data',
    featured: true,
    popularIndustries: ['restaurant', 'corporate', 'education'],
    configType: 'google-sheets',
  },
  {
    id: 'google-slides',
    name: 'Google Slides',
    category: 'business',
    logoUrl: '/icons/apps/google-slides.svg',
    iconBgColor: 'bg-yellow-100',
    description: 'Slideshow presentations',
    featured: true,
    popularIndustries: ['restaurant', 'corporate'],
    configType: 'google-slides',
  },
  {
    id: 'airtable',
    name: 'Airtable',
    category: 'business',
    logoUrl: '/icons/apps/airtable.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Airtable database views',
    configType: 'embed',
  },
  {
    id: 'asana',
    name: 'Asana',
    category: 'business',
    logoUrl: '/icons/apps/asana.svg',
    iconBgColor: 'bg-pink-100',
    description: 'Project management tasks',
    configType: 'embed',
  },
  {
    id: 'jira',
    name: 'Jira',
    category: 'business',
    logoUrl: '/icons/apps/jira.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Jira project boards',
    configType: 'embed',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    category: 'business',
    logoUrl: '/icons/apps/monday.svg',
    iconBgColor: 'bg-red-100',
    description: 'Monday.com workspaces',
    configType: 'embed',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'business',
    logoUrl: '/icons/apps/notion.svg',
    iconBgColor: 'bg-gray-100',
    description: 'Notion pages and databases',
    configType: 'embed',
  },
  {
    id: 'trello',
    name: 'Trello',
    category: 'business',
    logoUrl: '/icons/apps/trello.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Trello boards',
    configType: 'embed',
  },
  {
    id: 'smartsheet',
    name: 'SmartSheet',
    category: 'business',
    logoUrl: '/icons/apps/smartsheet.svg',
    iconBgColor: 'bg-blue-100',
    description: 'SmartSheet views',
    configType: 'embed',
  },
  {
    id: 'planner',
    name: 'Planner',
    category: 'business',
    logoUrl: '/icons/apps/planner.svg',
    iconBgColor: 'bg-green-100',
    description: 'Microsoft Planner tasks',
    configType: 'embed',
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    category: 'business',
    logoUrl: '/icons/apps/sharepoint.svg',
    iconBgColor: 'bg-teal-100',
    description: 'SharePoint documents',
    configType: 'embed',
  },
  {
    id: 'sharepoint-news',
    name: 'SharePoint News',
    category: 'business',
    logoUrl: '/icons/apps/sharepoint.svg',
    iconBgColor: 'bg-green-100',
    description: 'SharePoint news feed',
    configType: 'embed',
  },
  {
    id: 'onedrive',
    name: 'OneDrive Playlist',
    category: 'business',
    logoUrl: '/icons/apps/onedrive.svg',
    iconBgColor: 'bg-blue-100',
    description: 'OneDrive image/video slideshow',
    configType: 'onedrive',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    category: 'business',
    logoUrl: '/icons/apps/dropbox.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Dropbox folder slideshow',
    configType: 'dropbox',
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'business',
    logoUrl: '/icons/apps/canva.svg',
    iconBgColor: 'bg-cyan-100',
    description: 'Canva designs',
    configType: 'canva',
  },
  {
    id: 'canva-export',
    name: 'Canva Export',
    category: 'business',
    logoUrl: '/icons/apps/canva.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Export Canva to BizScreen',
    configType: 'canva',
  },
  {
    id: 'postermywall',
    name: 'PosterMyWall',
    category: 'business',
    logoUrl: '/icons/apps/postermywall.svg',
    iconBgColor: 'bg-yellow-100',
    description: 'PosterMyWall designs',
    configType: 'embed',
  },
  {
    id: 'online-slideshow',
    name: 'Online Slideshow',
    category: 'business',
    icon: Image,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Remote image slideshow',
    configType: 'slideshow',
  },
  {
    id: 'zenkit',
    name: 'Zenkit',
    category: 'business',
    logoUrl: '/icons/apps/zenkit.svg',
    iconBgColor: 'bg-red-100',
    description: 'Zenkit project views',
    configType: 'embed',
  },
  {
    id: 'zoho',
    name: 'Zoho',
    category: 'business',
    logoUrl: '/icons/apps/zoho.svg',
    iconBgColor: 'bg-red-100',
    description: 'Zoho apps and sheets',
    configType: 'embed',
  },

  // ----------------------------------------
  // INTERACTIVITY / QR / KIOSK
  // ----------------------------------------
  {
    id: 'qr-code',
    name: 'QR Code',
    category: 'interactivity',
    icon: QrCode,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-800',
    description: 'Generate QR codes for URLs',
    configType: 'qr-code',
  },
  {
    id: 'interactive-library',
    name: 'Interactive Library',
    category: 'interactivity',
    icon: Grid3X3,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: 'Touch-enabled content browser',
    featured: true,
    isNew: true,
    configType: 'interactive',
  },
  {
    id: 'interactive-playlist',
    name: 'Interactive Playlist',
    category: 'interactivity',
    icon: Play,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    description: 'Touch to select content',
    configType: 'interactive',
  },
  {
    id: 'interactive-kiosk',
    name: 'Interactive Kiosk',
    category: 'interactivity',
    icon: Monitor,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Self-service kiosk mode',
    configType: 'interactive',
  },
  {
    id: 'wifi-share',
    name: 'WiFi Share',
    category: 'interactivity',
    icon: Wifi,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Display WiFi QR code',
    configType: 'wifi',
  },

  // ----------------------------------------
  // CUSTOM / EMBED APPS
  // ----------------------------------------
  {
    id: 'web-pages',
    name: 'Web Pages',
    category: 'custom',
    icon: Globe,
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
    description: 'Embed any web page',
    featured: true,
    configType: 'webpage',
  },
  {
    id: 'embed-app',
    name: 'Embed App',
    category: 'custom',
    icon: Code,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: 'Embed HTML/iframe content',
    configType: 'embed',
  },
  {
    id: 'rich-text',
    name: 'Rich Text',
    category: 'custom',
    icon: Type,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    description: 'Custom formatted text',
    configType: 'rich-text',
  },
  {
    id: 'embeddable-feeds',
    name: 'Embeddable Feeds',
    category: 'custom',
    icon: Rss,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    description: 'RSS/Atom feed display',
    featured: true,
    configType: 'rss',
  },

  // ----------------------------------------
  // GENERAL / MISC APPS
  // ----------------------------------------
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'general',
    logoUrl: '/icons/apps/youtube.svg',
    iconBgColor: 'bg-red-100',
    description: 'YouTube videos and playlists',
    configType: 'youtube',
  },
  {
    id: 'stream',
    name: 'Stream',
    category: 'general',
    icon: Video,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: 'RTSP/HLS video streams',
    configType: 'stream',
  },
  {
    id: 'tv-source',
    name: 'TV Source',
    category: 'general',
    icon: Tv,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    description: 'Live TV input (HDMI)',
    configType: 'tv-source',
  },
  {
    id: 'video-wall',
    name: 'Video Wall',
    category: 'general',
    icon: Grid3X3,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    description: 'Multi-screen video wall',
    configType: 'video-wall',
  },
  {
    id: 'wikiquotes',
    name: 'WikiQuotes',
    category: 'general',
    icon: Quote,
    iconBgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
    description: 'Random inspirational quotes',
    configType: 'quotes',
  },
  {
    id: 'word-clock',
    name: 'Word Clock',
    category: 'general',
    icon: Clock,
    iconBgColor: 'bg-gray-800',
    iconColor: 'text-white',
    description: 'Time displayed in words',
    configType: 'clock',
  },
  {
    id: 'player-info',
    name: 'Player Basic Info',
    category: 'general',
    icon: Monitor,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-600',
    description: 'Show player device info',
    configType: 'player-info',
  },
  {
    id: 'dsmenu',
    name: 'DSMenu',
    category: 'general',
    icon: Table,
    iconBgColor: 'bg-orange-100',
    iconColor: 'text-orange-600',
    description: 'Digital menu board',
    configType: 'menu',
  },
  {
    id: 'birthday',
    name: 'Birthday Notification',
    category: 'general',
    icon: MessageSquare,
    iconBgColor: 'bg-pink-100',
    iconColor: 'text-pink-600',
    description: 'Employee birthday alerts',
    configType: 'birthday',
  },
  {
    id: 'team-celebrations',
    name: 'Team Celebrations',
    category: 'general',
    icon: Users,
    iconBgColor: 'bg-purple-100',
    iconColor: 'text-purple-600',
    description: 'Team milestones and events',
    configType: 'celebrations',
  },
  {
    id: 'suggest-app',
    name: 'Suggest a new app',
    category: 'general',
    icon: MessageSquare,
    iconBgColor: 'bg-gray-100',
    iconColor: 'text-gray-500',
    description: 'Request a new integration',
    configType: 'suggest',
  },

  // ----------------------------------------
  // MICROSOFT TEAMS APPS
  // ----------------------------------------
  {
    id: 'teams-channels',
    name: 'Teams Channels',
    category: 'business',
    logoUrl: '/icons/apps/teams.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Microsoft Teams channel feed',
    configType: 'teams',
  },
  {
    id: 'teams-live',
    name: 'Teams Live (Townhall)',
    category: 'business',
    logoUrl: '/icons/apps/teams.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Teams live events',
    isBeta: true,
    configType: 'teams',
  },
  {
    id: 'teams-rooms',
    name: 'Teams Rooms',
    category: 'business',
    logoUrl: '/icons/apps/teams.svg',
    iconBgColor: 'bg-purple-100',
    description: 'Room availability display',
    configType: 'teams',
  },
  {
    id: 'zoom-room',
    name: 'Zoom Room',
    category: 'business',
    logoUrl: '/icons/apps/zoom.svg',
    iconBgColor: 'bg-blue-100',
    description: 'Zoom room scheduling',
    configType: 'zoom',
  },
  {
    id: 'shedul',
    name: 'Shedul',
    category: 'business',
    logoUrl: '/icons/apps/shedul.svg',
    iconBgColor: 'bg-teal-100',
    description: 'Appointment scheduling',
    configType: 'embed',
  },
];

// ============================================
// FEATURED APPS (for empty state / landing)
// ============================================

export const FEATURED_APPS = APP_CATALOG.filter(app => app.featured);

// ============================================
// POPULAR BY INDUSTRY
// ============================================

export const INDUSTRY_POPULAR = {
  restaurant: {
    label: 'Restaurant/Bar/Cafe',
    appIds: ['daily-weather', 'analog-clock', 'espn', 'google-slides', 'custom-rss', 'dsmenu'],
  },
  retail: {
    label: 'Retail',
    appIds: ['daily-weather', 'instagram', 'facebook', 'google-sheets', 'qr-code'],
  },
  corporate: {
    label: 'Corporate',
    appIds: ['google-calendar', 'power-bi', 'teams-channels', 'sharepoint-news', 'analog-clock'],
  },
  education: {
    label: 'Education',
    appIds: ['google-calendar', 'google-sheets', 'analog-clock', 'daily-weather', 'ticker'],
  },
  healthcare: {
    label: 'Healthcare',
    appIds: ['daily-weather', 'analog-clock', 'ticker', 'google-calendar', 'qr-code'],
  },
  hospitality: {
    label: 'Hospitality',
    appIds: ['daily-weather', 'google-calendar', 'instagram', 'wifi-share', 'youtube'],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get app by ID
 */
export function getAppById(appId) {
  return APP_CATALOG.find(app => app.id === appId);
}

/**
 * Get apps by category
 */
export function getAppsByCategory(categoryId) {
  if (categoryId === 'all') return APP_CATALOG;
  return APP_CATALOG.filter(app => app.category === categoryId);
}

/**
 * Search apps by name or description
 */
export function searchApps(query) {
  const lowerQuery = query.toLowerCase();
  return APP_CATALOG.filter(
    app =>
      app.name.toLowerCase().includes(lowerQuery) ||
      app.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get popular apps for an industry
 */
export function getPopularAppsForIndustry(industry) {
  const industryConfig = INDUSTRY_POPULAR[industry];
  if (!industryConfig) return [];
  return industryConfig.appIds
    .map(id => getAppById(id))
    .filter(Boolean);
}

/**
 * Sort apps alphabetically
 */
export function sortAppsAlphabetically(apps) {
  return [...apps].sort((a, b) => a.name.localeCompare(b.name));
}
