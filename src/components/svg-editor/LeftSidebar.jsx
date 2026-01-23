/**
 * Left Sidebar
 *
 * OptiSigns-style left sidebar with multiple content panels.
 * Features:
 * - Templates browser (with Your Templates)
 * - Widgets (Time, Weather, Video, etc.)
 * - Stock photos (Unsplash)
 * - GIPHY (Stickers, GIFs, Emoji, Text)
 * - Repeaters (component templates)
 * - Text presets
 * - Elements (shapes, icons)
 * - QR Code generator (multiple types)
 * - DataSource
 * - Brand Kit
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { fetchSvgTemplates } from '../../services/svgTemplateService';
import { useLogger } from '../../hooks/useLogger.js';
import {
  LayoutTemplate,
  Image,
  Type,
  Shapes,
  QrCode,
  Grid3X3,
  Search,
  ChevronLeft,
  Loader2,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Star,
  Heart,
  Hexagon,
  Octagon,
  Pentagon,
  Diamond,
  Clock,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Linkedin,
  ShoppingCart,
  Gift,
  Award,
  BarChart3,
  Sun,
  Cloud,
  Video,
  FileText,
  AppWindow,
  ListMusic,
  ScrollText,
  Users,
  Repeat,
  Database,
  Palette,
  Wifi,
  MessageSquare,
  Smartphone,
  Link2,
  Hash,
  AtSign,
  PhoneCall,
  Store,
  Plus,
  ImagePlus,
  Tv,
  CloudSun,
  CalendarDays,
  Timer,
  Building2,
  ArrowUpDown,
  Radio,
  Smile,
  Sticker,
  Play,
  TypeIcon,
} from 'lucide-react';

// Sidebar panel types
const PANELS = {
  TEMPLATES: 'templates',
  WIDGETS: 'widgets',
  PHOTOS: 'photos',
  GIPHY: 'giphy',
  REPEATERS: 'repeaters',
  TEXT: 'text',
  ELEMENTS: 'elements',
  QR_CODE: 'qrcode',
  DATASOURCE: 'datasource',
  BRAND_KIT: 'brandkit',
};

// Widget types matching OptiSigns
const WIDGET_TYPES = [
  { id: 'overlay', icon: ImagePlus, label: 'Overlay Image', color: 'text-blue-400' },
  { id: 'video', icon: Video, label: 'Video', color: 'text-purple-400' },
  { id: 'document', icon: FileText, label: 'Document', color: 'text-green-400' },
  { id: 'apps', icon: AppWindow, label: 'Apps', color: 'text-yellow-400' },
  { id: 'playlist', icon: ListMusic, label: 'Playlist', color: 'text-pink-400' },
  { id: 'time', icon: Clock, label: 'Time', color: 'text-orange-400' },
  { id: 'weather', icon: CloudSun, label: 'Weather', color: 'text-cyan-400' },
  { id: 'date', icon: CalendarDays, label: 'Date', color: 'text-indigo-400' },
  { id: 'scrollingtext', icon: ScrollText, label: 'Scrolling Text', color: 'text-red-400' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', color: 'text-teal-400' },
  { id: 'meetingroom', icon: Building2, label: 'Meeting Room', color: 'text-violet-400' },
  { id: 'scrollingvertical', icon: ArrowUpDown, label: 'Scrolling Vertical', color: 'text-emerald-400' },
  { id: 'aericast', icon: Radio, label: 'AeriCast', color: 'text-amber-400' },
  { id: 'countdown', icon: Timer, label: 'Countdown', color: 'text-rose-400' },
  { id: 'social', icon: Instagram, label: 'Social Feed', color: 'text-fuchsia-400' },
  { id: 'news', icon: FileText, label: 'News Ticker', color: 'text-lime-400' },
];

// Shape elements - expanded
const SHAPE_ELEMENTS = [
  { id: 'circle', icon: Circle, label: 'Circle', type: 'circle' },
  { id: 'circle-filled', icon: Circle, label: 'Circle Filled', type: 'circle', filled: true },
  { id: 'square', icon: Square, label: 'Square', type: 'rect' },
  { id: 'square-filled', icon: Square, label: 'Square Filled', type: 'rect', filled: true },
  { id: 'rect', icon: Square, label: 'Rectangle', type: 'rect', scaleX: 1.5 },
  { id: 'rect-filled', icon: Square, label: 'Rectangle Filled', type: 'rect', scaleX: 1.5, filled: true },
  { id: 'triangle', icon: Triangle, label: 'Triangle', type: 'triangle' },
  { id: 'triangle-filled', icon: Triangle, label: 'Triangle Filled', type: 'triangle', filled: true },
  { id: 'diamond', icon: Diamond, label: 'Diamond', type: 'diamond' },
  { id: 'pentagon', icon: Pentagon, label: 'Pentagon', type: 'pentagon' },
  { id: 'hexagon', icon: Hexagon, label: 'Hexagon', type: 'hexagon' },
  { id: 'octagon', icon: Octagon, label: 'Octagon', type: 'octagon' },
  { id: 'line', icon: Minus, label: 'Line', type: 'line' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow', type: 'arrow' },
  { id: 'arrow-double', icon: ArrowRight, label: 'Double Arrow', type: 'arrow-double' },
  { id: 'star', icon: Star, label: 'Star', type: 'star' },
  { id: 'star-filled', icon: Star, label: 'Star Filled', type: 'star', filled: true },
  { id: 'heart', icon: Heart, label: 'Heart', type: 'heart' },
  { id: 'heart-filled', icon: Heart, label: 'Heart Filled', type: 'heart', filled: true },
];

// Icon elements - expanded with FontAwesome-style icons
const ICON_ELEMENTS = [
  // Numbers
  { id: '0', label: '0', symbol: '0', category: 'numbers' },
  { id: '1', label: '1', symbol: '1', category: 'numbers' },
  { id: '2', label: '2', symbol: '2', category: 'numbers' },
  { id: '3', label: '3', symbol: '3', category: 'numbers' },
  { id: '4', label: '4', symbol: '4', category: 'numbers' },
  { id: '5', label: '5', symbol: '5', category: 'numbers' },
  { id: '6', label: '6', symbol: '6', category: 'numbers' },
  { id: '7', label: '7', symbol: '7', category: 'numbers' },
  { id: '8', label: '8', symbol: '8', category: 'numbers' },
  { id: '9', label: '9', symbol: '9', category: 'numbers' },
  // Common icons
  { id: 'clock', icon: Clock, label: 'Clock' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'location', icon: MapPin, label: 'Location' },
  { id: 'phone', icon: Phone, label: 'Phone' },
  { id: 'email', icon: Mail, label: 'Email' },
  { id: 'globe', icon: Globe, label: 'Globe' },
  { id: 'shopping', icon: ShoppingCart, label: 'Shopping' },
  { id: 'gift', icon: Gift, label: 'Gift' },
  { id: 'award', icon: Award, label: 'Award' },
  { id: 'chart', icon: BarChart3, label: 'Chart' },
  { id: 'sun', icon: Sun, label: 'Sun' },
  { id: 'cloud', icon: Cloud, label: 'Cloud' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'video', icon: Video, label: 'Video' },
  { id: 'wifi', icon: Wifi, label: 'WiFi' },
];

// Social icons
const SOCIAL_ICONS = [
  { id: 'instagram', icon: Instagram, label: 'Instagram', color: '#E4405F' },
  { id: 'facebook', icon: Facebook, label: 'Facebook', color: '#1877F2' },
  { id: 'twitter', icon: Twitter, label: 'Twitter/X', color: '#000000' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#FF0000' },
  { id: 'linkedin', icon: Linkedin, label: 'LinkedIn', color: '#0A66C2' },
];

// Text presets matching OptiSigns
const TEXT_PRESETS = [
  { id: 'heading1', label: 'Heading 1', fontSize: 72, fontWeight: 'bold', fontFamily: 'Poppins' },
  { id: 'heading2', label: 'Heading 2', fontSize: 56, fontWeight: 'bold', fontFamily: 'Poppins' },
  { id: 'subheading', label: 'Subheading', fontSize: 36, fontWeight: '500', fontFamily: 'Poppins' },
  { id: 'body', label: 'Body text', fontSize: 24, fontWeight: 'normal', fontFamily: 'Open Sans' },
  { id: 'small', label: 'Small text', fontSize: 18, fontWeight: 'normal', fontFamily: 'Open Sans' },
];

// QR Code types matching OptiSigns
const QR_CODE_TYPES = [
  { id: 'url', icon: Link2, label: 'Website URL', placeholder: 'https://www.example.com/' },
  { id: 'email', icon: Mail, label: 'Email', placeholder: 'email@example.com' },
  { id: 'text', icon: TypeIcon, label: 'Text', placeholder: 'Enter text message' },
  { id: 'call', icon: PhoneCall, label: 'Call', placeholder: '+1234567890' },
  { id: 'sms', icon: MessageSquare, label: 'SMS', placeholder: '+1234567890' },
  { id: 'appstore', icon: Smartphone, label: 'App Store', placeholder: 'App Store URL' },
  { id: 'facebook', icon: Facebook, label: 'Facebook', placeholder: 'facebook.com/username' },
  { id: 'instagram', icon: Instagram, label: 'Instagram', placeholder: 'instagram.com/username' },
  { id: 'twitter', icon: Twitter, label: 'X', placeholder: 'x.com/username' },
  { id: 'wifi', icon: Wifi, label: 'Wifi', placeholder: 'Network name' },
  { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp', placeholder: '+1234567890' },
  { id: 'asset', icon: FileText, label: 'Asset', placeholder: 'Asset URL' },
];

// GIPHY tabs
const GIPHY_TABS = [
  { id: 'stickers', label: 'Stickers', icon: Sticker },
  { id: 'gifs', label: 'GIFs', icon: Play },
  { id: 'emoji', label: 'Emoji', icon: Smile },
  { id: 'text', label: 'Text', icon: TypeIcon },
];

// Repeater categories
const REPEATER_CATEGORIES = [
  { id: 'workiversary', label: 'Workiversary Components' },
  { id: 'meettheteam', label: 'Meet the Team Components' },
  { id: 'birthday', label: 'Birthday Components' },
  { id: 'menu', label: 'Menu Components' },
  { id: 'event', label: 'Event Components' },
];

export default function LeftSidebar({
  onAddShape,
  onAddText,
  onAddImage,
  onAddIcon,
  onAddQRCode,
  onAddWidget,
  onSelectTemplate,
  onSaveAsTemplate,
  templates = [],
  userTemplates = [],
}) {
  const logger = useLogger('LeftSidebar');
  const [activePanel, setActivePanel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [qrCodeType, setQrCodeType] = useState('url');
  const [qrCodeText, setQrCodeText] = useState('');
  const [giphyTab, setGiphyTab] = useState('stickers');
  const [giphyResults, setGiphyResults] = useState([]);
  const [loadingGiphy, setLoadingGiphy] = useState(false);
  const [erroredGiphyImages, setErroredGiphyImages] = useState(new Set());
  const [templateTab, setTemplateTab] = useState('templates');
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Unsplash API configuration
  const UNSPLASH_ACCESS_KEY = 'vWbf4D7AsEBx99UbqXK_Bf7Uv1rAfkLFc7PWqjDrSls';

  // Fetch stock photos from Unsplash
  const searchPhotos = useCallback(async (query) => {
    setLoadingPhotos(true);

    try {
      // Try Unsplash API first (if key is configured)
      if (UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== 'demo') {
        const searchQuery = query.trim() || 'nature';
        const response = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20&orientation=landscape`,
          {
            headers: {
              'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          const unsplashPhotos = data.results.map((photo) => ({
            id: photo.id,
            url: photo.urls.regular,
            thumb: photo.urls.small,
            alt: photo.alt_description || photo.description || 'Unsplash photo',
            author: photo.user.name,
          }));
          setPhotos(unsplashPhotos);
          return;
        }
      }

      // Fallback: Use Lorem Picsum (reliable free image service)
      const searchTerm = query.trim() || 'nature';
      const picsumPhotos = [];

      // Generate varied photos using Picsum with different seeds
      const seeds = ['business', 'office', 'nature', 'city', 'food', 'technology',
        'people', 'abstract', 'architecture', 'travel', 'sports', 'fashion',
        'animals', 'health', 'education', 'music', 'art', 'science', 'home', 'garden'];

      for (let i = 0; i < 20; i++) {
        const seed = searchTerm === 'nature' ? seeds[i % seeds.length] : `${searchTerm}-${i}`;
        picsumPhotos.push({
          id: `picsum-${i}-${Date.now()}`,
          url: `https://picsum.photos/seed/${seed}/800/600`,
          thumb: `https://picsum.photos/seed/${seed}/300/200`,
          alt: `${searchTerm} photo ${i + 1}`,
        });
      }

      setPhotos(picsumPhotos);
    } catch (error) {
      logger.error('Error fetching photos', { error });
      // Ultimate fallback with placeholder images
      const fallbackPhotos = [];
      for (let i = 0; i < 12; i++) {
        fallbackPhotos.push({
          id: `fallback-${i}`,
          url: `https://picsum.photos/800/600?random=${i}`,
          thumb: `https://picsum.photos/300/200?random=${i}`,
          alt: `Photo ${i + 1}`,
        });
      }
      setPhotos(fallbackPhotos);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  // GIPHY API configuration
  const GIPHY_API_KEY = 'ZhPq2lyo9BmnTkVOy7jQRgv1nKOsgJJ9';

  // Fetch GIPHY content
  const searchGiphy = useCallback(async (query, type) => {
    setLoadingGiphy(true);
    try {
      // Try GIPHY API if key is configured
      if (GIPHY_API_KEY && GIPHY_API_KEY !== 'demo') {
        const searchQuery = query.trim() || 'trending';
        const endpoint = type === 'stickers'
          ? `https://api.giphy.com/v1/stickers/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20`
          : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20`;

        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          const giphyResults = data.data.map((gif) => ({
            id: gif.id,
            url: gif.images.original.url,
            thumb: gif.images.fixed_width_small.url,
            alt: gif.title,
          }));
          setGiphyResults(giphyResults);
          return;
        }
      }

      // Fallback: Use emoji and static content
      const results = [];

      if (type === 'emoji') {
        // Popular emojis with Unicode
        const emojis = [
          { char: '😀', name: 'grinning' }, { char: '😂', name: 'joy' },
          { char: '🥰', name: 'love' }, { char: '😎', name: 'cool' },
          { char: '🤔', name: 'thinking' }, { char: '👍', name: 'thumbsup' },
          { char: '👏', name: 'clap' }, { char: '🎉', name: 'party' },
          { char: '❤️', name: 'heart' }, { char: '🔥', name: 'fire' },
          { char: '⭐', name: 'star' }, { char: '✨', name: 'sparkles' },
          { char: '💯', name: '100' }, { char: '🚀', name: 'rocket' },
          { char: '💪', name: 'muscle' }, { char: '🙌', name: 'raised_hands' },
          { char: '👀', name: 'eyes' }, { char: '💡', name: 'bulb' },
          { char: '✅', name: 'check' }, { char: '🎯', name: 'target' },
        ];
        emojis.forEach((emoji, i) => {
          // Use Twemoji CDN for high-quality emoji images
          const codePoint = [...emoji.char].map(c => c.codePointAt(0).toString(16)).join('-');
          results.push({
            id: `emoji-${i}`,
            url: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`,
            thumb: `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codePoint}.png`,
            alt: emoji.name,
            isEmoji: true,
            emojiChar: emoji.char,
          });
        });
      } else if (type === 'text') {
        // Animated text styles
        const textStyles = [
          'HELLO', 'WOW', 'YES', 'NO', 'THANKS', 'LOVE',
          'COOL', 'NICE', 'OK', 'HI', 'BYE', 'OMG',
        ];
        textStyles.forEach((text, i) => {
          results.push({
            id: `text-${i}`,
            url: `https://dummyimage.com/200x100/6366f1/fff&text=${text}`,
            thumb: `https://dummyimage.com/100x50/6366f1/fff&text=${text}`,
            alt: text,
            isText: true,
            textContent: text,
          });
        });
      } else {
        // GIFs and Stickers - use placeholder animated GIFs
        const categories = ['happy', 'dance', 'celebrate', 'thumbs', 'heart', 'star',
          'confetti', 'clap', 'wave', 'laugh', 'wow', 'cool'];
        categories.forEach((cat, i) => {
          results.push({
            id: `${type}-${i}`,
            url: `https://dummyimage.com/200x200/ec4899/fff&text=${cat.toUpperCase()}`,
            thumb: `https://dummyimage.com/100x100/ec4899/fff&text=${cat}`,
            alt: `${type} - ${cat}`,
          });
        });
      }

      setGiphyResults(results);
    } catch (error) {
      logger.error('Error fetching GIPHY', { error });
      setGiphyResults([]);
    } finally {
      setLoadingGiphy(false);
    }
  }, []);

  // Handle photo search with debounce
  useEffect(() => {
    if (activePanel === PANELS.PHOTOS) {
      const timer = setTimeout(() => searchPhotos(searchQuery), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activePanel, searchPhotos]);

  // Handle GIPHY search
  useEffect(() => {
    if (activePanel === PANELS.GIPHY) {
      const timer = setTimeout(() => searchGiphy(searchQuery, giphyTab), 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activePanel, giphyTab, searchGiphy]);

  // Handle template search with debounce
  useEffect(() => {
    if (activePanel === PANELS.TEMPLATES) {
      setLoadingTemplates(true);
      const timer = setTimeout(async () => {
        try {
          // Fetch templates from database with search
          const results = await fetchSvgTemplates({
            search: searchQuery || undefined,
            includeLocal: true,
          });
          setFilteredTemplates(results);
        } catch (err) {
          logger.error('Error fetching templates', { error: err });
          // Fallback to prop templates with local filtering
          if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const filtered = templates.filter(t =>
              t.name?.toLowerCase().includes(searchLower) ||
              t.description?.toLowerCase().includes(searchLower) ||
              t.category?.toLowerCase().includes(searchLower) ||
              t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
            );
            setFilteredTemplates(filtered);
          } else {
            setFilteredTemplates(templates);
          }
        } finally {
          setLoadingTemplates(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activePanel, templates]);

  // Nav items matching OptiSigns
  const navItems = [
    { id: PANELS.TEMPLATES, icon: LayoutTemplate, label: 'Templates' },
    { id: PANELS.WIDGETS, icon: Grid3X3, label: 'Widgets' },
    { id: PANELS.PHOTOS, icon: Image, label: 'Photos' },
    { id: PANELS.GIPHY, icon: Smile, label: 'GIPHY' },
    { id: PANELS.REPEATERS, icon: Repeat, label: 'Repeaters' },
    { id: PANELS.TEXT, icon: Type, label: 'Text' },
    { id: PANELS.ELEMENTS, icon: Shapes, label: 'Elements' },
    { id: PANELS.QR_CODE, icon: QrCode, label: 'QR Code' },
    { id: PANELS.DATASOURCE, icon: Database, label: 'DataSource' },
    { id: PANELS.BRAND_KIT, icon: Palette, label: 'Brand Kit' },
  ];

  // Get current QR code type config
  const currentQrType = QR_CODE_TYPES.find(t => t.id === qrCodeType) || QR_CODE_TYPES[0];

  // Render panel content
  const renderPanelContent = () => {
    switch (activePanel) {
      case PANELS.TEMPLATES:
        return (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setTemplateTab('templates')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  templateTab === 'templates'
                    ? 'text-green-500 border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Templates
              </button>
              <button
                onClick={() => setTemplateTab('components')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  templateTab === 'components'
                    ? 'text-green-500 border-b-2 border-green-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Components
              </button>
            </div>

            {/* Add as template button */}
            <button
              onClick={() => onSaveAsTemplate?.()}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Current Design as Template
            </button>
            <p className="text-xs text-gray-400 text-center">
              A copy of current design will be added to your team template library.
            </p>

            {/* Template search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Template grid */}
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <>
                {/* Search results info */}
                {searchQuery && (
                  <p className="text-xs text-gray-400 mb-2">
                    Found {templateTab === 'templates' ? filteredTemplates.length : userTemplates.length} templates
                    {searchQuery && ` for "${searchQuery}"`}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {(templateTab === 'templates' ? filteredTemplates : userTemplates).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => onSelectTemplate?.(template)}
                      className="relative aspect-video bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all group"
                    >
                      {template.thumbnail || template.svgUrl ? (
                        <img
                          src={template.thumbnail || template.svgUrl}
                          alt={template.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <LayoutTemplate className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-xs text-white truncate">{template.name}</span>
                      </div>
                      {/* Category badge */}
                      {template.category && (
                        <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-black/50 text-white rounded">
                          {template.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {/* No results message */}
                {(templateTab === 'templates' ? filteredTemplates : userTemplates).length === 0 && (
                  <div className="text-center py-8">
                    <LayoutTemplate className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {searchQuery ? `No templates found for "${searchQuery}"` : 'No templates available'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );

      case PANELS.WIDGETS:
        return (
          <div className="grid grid-cols-2 gap-3">
            {WIDGET_TYPES.map((widget) => {
              const Icon = widget.icon;
              return (
                <button
                  key={widget.id}
                  onClick={() => {
                    logger.debug('Widget button clicked', { widgetId: widget.id });
                    if (onAddWidget) {
                      onAddWidget(widget.id);
                    } else {
                      logger.error('onAddWidget handler not provided');
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors group"
                >
                  <div className={`p-3 rounded-xl bg-gray-600 group-hover:bg-gray-500 ${widget.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs text-gray-300 mt-2 text-center">{widget.label}</span>
                </button>
              );
            })}
          </div>
        );

      case PANELS.PHOTOS:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <p className="text-xs text-gray-400 text-center">
              Photos by <span className="text-green-500">Unsplash</span>
            </p>

            {loadingPhotos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => onAddImage?.(photo.url)}
                    className="aspect-square bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all"
                  >
                    <img
                      src={photo.thumb}
                      alt={photo.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case PANELS.GIPHY:
        return (
          <div className="space-y-4">
            {/* GIPHY Tabs */}
            <div className="flex border-b border-gray-700">
              {GIPHY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setGiphyTab(tab.id)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    giphyTab === tab.id
                      ? 'text-green-500 border-b-2 border-green-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <p className="text-xs text-gray-400 text-center">
              POWERED BY <span className="font-bold text-white">GIPHY</span>
            </p>

            {loadingGiphy ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {giphyResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.isEmoji && item.emojiChar) {
                        // Add emoji as text element
                        onAddIcon?.(item.alt, null, null, item.emojiChar);
                      } else if (item.isText && item.textContent) {
                        // Add as text
                        onAddText?.({ label: item.textContent, fontSize: 48, fontWeight: 'bold' });
                      } else {
                        // Add as image
                        onAddImage?.(item.url);
                      }
                    }}
                    className="aspect-square bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all flex items-center justify-center"
                  >
                    {item.isEmoji ? (
                      <span className="text-3xl">{item.emojiChar}</span>
                    ) : erroredGiphyImages.has(item.id) ? (
                      <span className="text-xs text-gray-400">{item.alt}</span>
                    ) : (
                      <img
                        src={item.thumb}
                        alt={item.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={() => setErroredGiphyImages(prev => new Set(prev).add(item.id))}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case PANELS.REPEATERS:
        return (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            <button className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors">
              Add Blank Repeater
            </button>

            <p className="text-sm text-white font-medium">Repeater Components</p>

            {REPEATER_CATEGORIES.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{category.label}</span>
                  <button className="text-xs text-green-500 hover:underline">Show all</button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={`${category.id}-${i}`}
                      className="flex-shrink-0 w-24 h-16 bg-gray-700 rounded-lg flex items-center justify-center"
                    >
                      <Repeat className="w-6 h-6 text-gray-500" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );

      case PANELS.TEXT:
        return (
          <div className="space-y-4">
            <button
              onClick={() => onAddText?.()}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              Add a text box
            </button>

            <p className="text-xs text-gray-400">Predefined texts</p>

            <div className="space-y-2">
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onAddText?.(preset)}
                  className="w-full p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                >
                  <span
                    className="text-white block"
                    style={{
                      fontFamily: preset.fontFamily,
                      fontSize: Math.min(preset.fontSize / 2.5, 28),
                      fontWeight: preset.fontWeight,
                    }}
                  >
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );

      case PANELS.ELEMENTS:
        return (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Shapes */}
            <div>
              <h4 className="text-sm text-white font-medium mb-3">Shapes</h4>
              <div className="grid grid-cols-8 gap-1">
                {SHAPE_ELEMENTS.map((element) => {
                  const Icon = element.icon;
                  return (
                    <button
                      key={element.id}
                      onClick={() => onAddShape?.(element.type, element)}
                      className="aspect-square flex items-center justify-center p-1.5 bg-transparent hover:bg-gray-700 rounded transition-colors"
                      title={element.label}
                    >
                      <Icon
                        className={`w-5 h-5 ${element.filled ? 'fill-gray-300 text-gray-300' : 'text-gray-300'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Icons/Elements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm text-white font-medium">Elements</h4>
                <span className="text-xs text-gray-400">
                  Icons by <span className="text-green-500">FontAwesome</span>
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1">
                {ICON_ELEMENTS.map((element) => {
                  if (element.symbol) {
                    return (
                      <button
                        key={element.id}
                        onClick={() => onAddIcon?.(element.id, null, null, element.symbol)}
                        className="aspect-square flex items-center justify-center text-lg font-bold text-gray-300 hover:bg-gray-700 rounded transition-colors"
                        title={element.label}
                      >
                        {element.symbol}
                      </button>
                    );
                  }
                  const Icon = element.icon;
                  return (
                    <button
                      key={element.id}
                      onClick={() => onAddIcon?.(element.id, Icon)}
                      className="aspect-square flex items-center justify-center p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title={element.label}
                    >
                      <Icon className="w-4 h-4 text-gray-300" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Social Icons */}
            <div>
              <h4 className="text-sm text-white font-medium mb-3">Social</h4>
              <div className="grid grid-cols-8 gap-1">
                {SOCIAL_ICONS.map((element) => {
                  const Icon = element.icon;
                  return (
                    <button
                      key={element.id}
                      onClick={() => onAddIcon?.(element.id, Icon, element.color)}
                      className="aspect-square flex items-center justify-center p-1.5 hover:bg-gray-700 rounded transition-colors"
                      title={element.label}
                    >
                      <Icon className="w-4 h-4" style={{ color: element.color }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case PANELS.QR_CODE:
        return (
          <div className="space-y-4">
            <button
              onClick={() => onAddQRCode?.(qrCodeText, qrCodeType)}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-5 h-5" />
              Add QR Code
            </button>

            {/* QR Code Type Selector */}
            <div className="grid grid-cols-4 gap-2">
              {QR_CODE_TYPES.map((type) => {
                const Icon = type.icon;
                const isActive = qrCodeType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setQrCodeType(type.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] text-center leading-tight">{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* QR Code Input */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">{currentQrType.label}</label>
              <input
                type="text"
                value={qrCodeText}
                onChange={(e) => setQrCodeText(e.target.value)}
                placeholder={currentQrType.placeholder}
                className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              />
            </div>

            <button
              onClick={() => onAddQRCode?.(qrCodeText, qrCodeType)}
              disabled={!qrCodeText.trim()}
              className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Update QR Code
            </button>
          </div>
        );

      case PANELS.DATASOURCE:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Connect dynamic data sources to your designs
            </p>
            <button className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              <Database className="w-5 h-5" />
              Add Data Source
            </button>
            <div className="space-y-2">
              {['Google Sheets', 'Excel Online', 'Airtable', 'REST API', 'RSS Feed'].map((source) => (
                <button
                  key={source}
                  className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left text-gray-300"
                >
                  {source}
                </button>
              ))}
            </div>
          </div>
        );

      case PANELS.BRAND_KIT:
        return (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-white font-medium mb-2">Font Management</h4>
              <button className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors">
                Uploaded Fonts
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm text-white font-medium">Enforce Branding</h4>
                <span className="text-gray-400 text-xs cursor-help">(?)</span>
              </div>
              <div className="space-y-2">
                {['None', 'Guideline', 'Enforce'].map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700 cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-green-500 flex items-center justify-center">
                      {option === 'None' && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                    <span className="text-sm text-gray-300">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="text-green-500 text-sm hover:underline">
              How to use Brand Kit?
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full">
      {/* Icon navigation bar */}
      <div className="w-14 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(isActive ? null : item.id)}
              className={`
                w-12 h-12 flex flex-col items-center justify-center rounded-lg mb-1 transition-colors flex-shrink-0
                ${isActive
                  ? 'bg-green-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }
              `}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] mt-0.5 leading-tight">{item.label.slice(0, 8)}</span>
            </button>
          );
        })}
      </div>

      {/* Expandable panel */}
      {activePanel && (
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
            <h3 className="text-white font-medium">
              {navItems.find(n => n.id === activePanel)?.label}
            </h3>
            <button
              onClick={() => setActivePanel(null)}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderPanelContent()}
          </div>
        </div>
      )}
    </div>
  );
}
