/**
 * SVG Template Gallery Page - OptiSigns Style
 *
 * Browse and select SVG templates for editing.
 * Features:
 * - Collapsible filter sidebar with categories, industries, styles
 * - Featured, Popular, Recent sections with horizontal scroll
 * - Quick filter chips
 * - Search functionality
 * - User's saved designs section
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Folder,
  Monitor,
  Smartphone,
  Loader2,
  Trash2,
  Edit,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  X,
  FileType,
  Sparkles,
  Home,
  Square,
} from 'lucide-react';
import {
  fetchSvgTemplates,
  fetchUserSvgDesigns,
  deleteUserSvgDesign,
} from '../services/svgTemplateService';

// Filter configurations
const FILTER_CONFIG = {
  categories: {
    label: 'Categories',
    items: [
      'All', 'Featured', 'Popular', 'Your Templates', 'Recent Designs',
      'Top 20 Promo Designs', 'Holidays and Observances', 'Seasonal Promotions',
      'Occasions', 'Menu', 'Restaurants', 'Promotion Series', 'Events',
      'Announcements', 'Social Media', 'Sales & Discounts',
    ],
    defaultShow: 6,
  },
  orientation: {
    label: 'Orientation',
    items: ['Landscape', 'Portrait'],
    type: 'toggle',
  },
  visualMode: {
    label: 'Visual Mode',
    items: ['Static', 'Animation'],
    type: 'toggle',
  },
  industries: {
    label: 'Industries',
    items: [
      'Retail', 'Hospitality', 'Food & Beverage', 'Services', 'Corporate',
      'Fitness', 'Education', 'Healthcare', 'Real Estate', 'Automotive',
      'Entertainment', 'Finance',
    ],
    defaultShow: 8,
  },
  templateTypes: {
    label: 'Template Types',
    items: [
      'Promotion', 'Event', 'Announcement', 'Menu', 'event_notification',
      'sale', 'Welcome', 'Directory', 'Schedule', 'Info Board',
    ],
    defaultShow: 6,
  },
  visualStyles: {
    label: 'Visual Styles',
    items: [
      'Playful', 'casual', 'Professional', 'formal', 'celebratory',
      'energetic', 'Minimalist', 'Bold', 'Elegant', 'Modern',
    ],
    defaultShow: 6,
  },
  colorMoods: {
    label: 'Color Moods',
    items: [
      'Vibrant', 'Warm', 'complementary', 'neutral', 'Cool',
      'warm and vibrant', 'Earthy', 'Pastel', 'Monochrome',
    ],
    defaultShow: 6,
  },
  tags: {
    label: 'Tags',
    items: [
      'Animated', 'Motion', 'Dynamic', 'Video', 'Digital signage',
      'Interactive', 'QR Code', 'Weather', 'Clock', 'Social Feed',
      'RSS Feed', 'Countdown', 'Live Data',
    ],
    defaultShow: 5,
  },
};

// Quick filter chips
const QUICK_FILTERS = [
  'Holiday Sale Promotion',
  'Year-End Event Announcement',
  'Winter Fitness Class Schedule',
  'School Winter Break Closure Notice',
  'New Year Customer Appreciation',
];

export default function SvgTemplateGalleryPage({ showToast, onNavigate }) {
  // State
  const [templates, setTemplates] = useState([]);
  const [userDesigns, setUserDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('home'); // 'home' | 'your-designs'
  const [expandedFilters, setExpandedFilters] = useState({
    categories: true,
    industries: false,
    templateTypes: false,
    visualStyles: false,
    colorMoods: false,
    tags: false,
  });
  const [showMoreFilters, setShowMoreFilters] = useState({});
  const [activeFilters, setActiveFilters] = useState({
    orientation: null,
    visualMode: null,
    category: 'All',
    industry: null,
    templateType: null,
    visualStyle: null,
    colorMood: null,
    tag: null,
  });

  // Scroll refs for horizontal sections
  const featuredRef = useRef(null);
  const popularRef = useRef(null);
  const recentRef = useRef(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, designsData] = await Promise.all([
        fetchSvgTemplates(),
        fetchUserSvgDesigns().catch(() => []),
      ]);
      setTemplates(templatesData);
      setUserDesigns(designsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast?.('Error loading templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    const query = searchQuery || headerSearchQuery;

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (activeFilters.orientation) {
      result = result.filter(t =>
        t.orientation?.toLowerCase() === activeFilters.orientation.toLowerCase()
      );
    }

    if (activeFilters.category && activeFilters.category !== 'All') {
      result = result.filter(t =>
        t.category?.toLowerCase().includes(activeFilters.category.toLowerCase())
      );
    }

    return result;
  }, [templates, searchQuery, headerSearchQuery, activeFilters]);

  // Get featured templates (is_featured or first 10)
  const featuredTemplates = useMemo(() => {
    const featured = templates.filter(t => t.is_featured || t.isFeatured);
    return featured.length > 0 ? featured : templates.slice(0, 10);
  }, [templates]);

  // Get popular templates (by use_count or random selection)
  const popularTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) => (b.use_count || 0) - (a.use_count || 0));
    return sorted.slice(0, 10);
  }, [templates]);

  // Get recent templates
  const recentTemplates = useMemo(() => {
    const sorted = [...templates].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
    return sorted.slice(0, 10);
  }, [templates]);

  // Handle template click
  const handleTemplateClick = (template) => {
    // Store template data in sessionStorage for the editor to retrieve
    const templateData = {
      id: template.id,
      name: template.name,
      svgUrl: template.svgUrl || template.svg_url,
      svgContent: template.svgContent,
      width: template.width || 1920,
      height: template.height || 1080,
      originalWidth: template.originalWidth,
      originalHeight: template.originalHeight,
    };
    sessionStorage.setItem('pendingTemplate', JSON.stringify(templateData));
    onNavigate?.(`svg-editor?templateId=${template.id}`);
  };

  // Handle user design click
  const handleDesignClick = (design) => {
    onNavigate?.(`svg-editor?designId=${design.id}`);
  };

  // Handle delete
  const handleDeleteDesign = async (e, designId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this design?')) return;

    try {
      await deleteUserSvgDesign(designId);
      setUserDesigns(prev => prev.filter(d => d.id !== designId));
      showToast?.('Design deleted', 'success');
    } catch (error) {
      console.error('Error deleting design:', error);
      showToast?.('Failed to delete design', 'error');
    }
  };

  // Toggle filter section
  const toggleFilterSection = (key) => {
    setExpandedFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Toggle show more for a filter
  const toggleShowMore = (key) => {
    setShowMoreFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Scroll horizontal section
  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 400;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Collapsible Section with chips (for Industries, Template Types, etc.)
  const CollapsibleFilterSection = ({ filterKey, config }) => {
    const isExpanded = expandedFilters[filterKey];
    const showAll = showMoreFilters[filterKey];
    const items = config.items;
    const displayItems = showAll ? items : items.slice(0, config.defaultShow || 6);
    const hasMore = items.length > (config.defaultShow || 6);

    return (
      <div className="py-3 border-b border-gray-100">
        <button
          onClick={() => toggleFilterSection(filterKey)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-800"
        >
          <span>{config.label}</span>
          <ChevronRight size={16} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </button>
        {isExpanded && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {displayItems.map((item) => (
                <button
                  key={item}
                  onClick={() => setActiveFilters(prev => ({
                    ...prev,
                    [filterKey]: prev[filterKey] === item ? null : item,
                  }))}
                  className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                    activeFilters[filterKey] === item
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => toggleShowMore(filterKey)}
                className="mt-3 text-xs text-emerald-500 hover:text-emerald-600 font-medium"
              >
                {showAll ? '- Show less' : `+ View ${items.length - (config.defaultShow || 6)} more`}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Template Card Component
  const TemplateCard = ({ template, isUserDesign = false, size = 'normal', inGrid = false }) => {
    // Consistent sizing for both grid and scroll views
    const cardClass = inGrid
      ? 'w-full h-44'  // Fixed height for grid items
      : (size === 'large' ? 'w-80 h-44 flex-shrink-0' : 'w-72 h-40 flex-shrink-0');

    return (
      <div
        onClick={() => isUserDesign ? handleDesignClick(template) : handleTemplateClick(template)}
        className={`${cardClass} group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:-translate-y-1`}
      >
        {/* Thumbnail */}
        <div className="w-full h-full bg-gray-100 relative overflow-hidden">
          {template.thumbnail || template.background_image || template.svgUrl || template.svg_url ? (
            <img
              src={template.thumbnail || template.background_image || template.svgUrl || template.svg_url}
              alt={template.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
              <FileType size={40} className="text-emerald-300" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium shadow-lg flex items-center gap-1.5">
              <Edit size={14} />
              {isUserDesign ? 'Edit' : 'Use Template'}
            </span>
          </div>

          {/* Delete button for user designs */}
          {isUserDesign && (
            <button
              onClick={(e) => handleDeleteDesign(e, template.id)}
              className="absolute top-2 left-2 p-1.5 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          )}

          {/* Design name overlay at bottom */}
          {isUserDesign && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-sm font-medium truncate">{template.name}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Horizontal Scroll Section
  const HorizontalSection = ({ title, templates, scrollRef, isUserDesign = false }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button className="text-sm text-emerald-600 hover:text-emerald-700">View all</button>
      </div>
      <div className="relative group/scroll">
        {/* Left scroll button */}
        <button
          onClick={() => scroll(scrollRef, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-white"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} isUserDesign={isUserDesign} />
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll(scrollRef, 'right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity hover:bg-white"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-6 -mt-6">
      {/* Left Sidebar */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Try "Building Directory"'
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Home Button */}
          <button
            onClick={() => setActiveView('home')}
            className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
              activeView === 'home'
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Home
          </button>

          {/* New Design Button */}
          <button
            onClick={() => onNavigate?.('svg-editor')}
            className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium text-sm rounded-lg transition-colors"
          >
            New Design
          </button>

          {/* Your Designs Button */}
          <button
            onClick={() => setActiveView('your-designs')}
            className={`w-full py-2 border font-medium text-sm rounded-lg transition-colors ${
              activeView === 'your-designs'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Your Designs
          </button>

          {/* Filters Section - OptiSigns Style */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
              FILTERS
            </h3>

            {/* Orientation */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Orientation</h4>
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveFilters(prev => ({
                    ...prev,
                    orientation: prev.orientation === 'landscape' ? null : 'landscape',
                  }))}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    activeFilters.orientation === 'landscape'
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Monitor size={14} />
                  <span>Landscape</span>
                </button>
                <button
                  onClick={() => setActiveFilters(prev => ({
                    ...prev,
                    orientation: prev.orientation === 'portrait' ? null : 'portrait',
                  }))}
                  className={`flex items-center gap-1.5 text-sm transition-colors ${
                    activeFilters.orientation === 'portrait'
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>Portrait</span>
                </button>
              </div>
            </div>

            {/* Visual Mode */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Visual Mode</h4>
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveFilters(prev => ({
                    ...prev,
                    visualMode: prev.visualMode === 'static' ? null : 'static',
                  }))}
                  className={`text-sm transition-colors ${
                    activeFilters.visualMode === 'static'
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Static
                </button>
                <button
                  onClick={() => setActiveFilters(prev => ({
                    ...prev,
                    visualMode: prev.visualMode === 'animation' ? null : 'animation',
                  }))}
                  className={`text-sm transition-colors ${
                    activeFilters.visualMode === 'animation'
                      ? 'text-emerald-600 font-medium'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Animation
                </button>
              </div>
            </div>

            {/* Categories - Always Expanded */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-800">Categories</h4>
                <ChevronDown size={16} className="text-gray-400" />
              </div>
              <div className="space-y-1">
                {(showMoreFilters.categories
                  ? FILTER_CONFIG.categories.items
                  : FILTER_CONFIG.categories.items.slice(0, 6)
                ).map((item) => (
                  <button
                    key={item}
                    onClick={() => setActiveFilters(prev => ({
                      ...prev,
                      category: prev.category === item ? 'All' : item,
                    }))}
                    className={`block w-full text-left text-sm py-0.5 transition-colors ${
                      activeFilters.category === item
                        ? 'text-emerald-600 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {FILTER_CONFIG.categories.items.length > 6 && (
                <button
                  onClick={() => toggleShowMore('categories')}
                  className="mt-2 text-xs text-emerald-500 hover:text-emerald-600 font-medium"
                >
                  {showMoreFilters.categories
                    ? '- Show less'
                    : `+ View ${FILTER_CONFIG.categories.items.length - 6} more`}
                </button>
              )}
            </div>

            {/* Collapsible Sections */}
            <CollapsibleFilterSection filterKey="industries" config={FILTER_CONFIG.industries} />
            <CollapsibleFilterSection filterKey="templateTypes" config={FILTER_CONFIG.templateTypes} />
            <CollapsibleFilterSection filterKey="visualStyles" config={FILTER_CONFIG.visualStyles} />
            <CollapsibleFilterSection filterKey="colorMoods" config={FILTER_CONFIG.colorMoods} />
            <CollapsibleFilterSection filterKey="tags" config={FILTER_CONFIG.tags} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Green Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-10">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            What Template Are You Looking For?
          </h1>

          {/* Header Search */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  placeholder='Try "Building Directory"'
                  className="w-full pl-12 pr-4 py-3 text-base rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <button className="px-6 py-3 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
                Search Templates
              </button>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {QUICK_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setHeaderSearchQuery(filter)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full transition-colors"
              >
                {filter}
              </button>
            ))}
          </div>

          {/* AI Designer Button */}
          <div className="text-center">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
              <Sparkles size={16} className="text-emerald-500" />
              Try AI Designer
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {activeView === 'your-designs' ? (
            /* Your Designs View */
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Designs</h2>
              {userDesigns.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <Folder size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved designs</h3>
                  <p className="text-gray-500 mb-4">
                    Create a new design or customize a template to get started
                  </p>
                  <button
                    onClick={() => onNavigate?.('svg-editor')}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    Create New Design
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {userDesigns.map((design) => (
                    <TemplateCard key={design.id} template={design} isUserDesign inGrid />
                  ))}
                </div>
              )}
            </div>
          ) : searchQuery || headerSearchQuery ? (
            /* Search Results */
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Search Results ({filteredTemplates.length})
              </h2>
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No templates found matching your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {filteredTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} inGrid />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Home View with Sections */
            <>
              <HorizontalSection
                title="Featured"
                templates={featuredTemplates}
                scrollRef={featuredRef}
              />
              <HorizontalSection
                title="Popular"
                templates={popularTemplates}
                scrollRef={popularRef}
              />
              <HorizontalSection
                title="Recent Designs"
                templates={recentTemplates}
                scrollRef={recentRef}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
