/**
 * LayoutsPage - OptiSigns-style Template Gallery
 *
 * Features:
 * - Left sidebar with collapsible filter categories
 * - Hero section with search and quick tags
 * - Template sections: Featured, Popular, by Category
 * - Direct template opening in Polotno editor
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  Folder,
  Gift,
  Percent,
  Calendar,
  Utensils,
  ShoppingBag,
  Dumbbell,
  Building2,
  Music,
  Shirt,
  LayoutGrid,
  Plus,
  Loader2,
  Wand2,
  ChevronLeft,
} from 'lucide-react';
import { getLayoutTemplates } from '../services/templateService';
import { fetchLayouts } from '../services/layoutService';

/**
 * Sidebar categories matching OptiSigns
 */
const SIDEBAR_CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'featured', label: 'Featured', icon: Star, special: true },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'your-templates', label: 'Your Templates', icon: Folder },
  { id: 'recent', label: 'Recent Designs', icon: Clock },
  { id: 'divider-1', type: 'divider' },
  { id: 'holidays', label: 'Holidays and Observances', icon: Gift },
  { id: 'sales', label: 'Seasonal Promotions', icon: Percent },
  { id: 'general', label: 'Occasions', icon: Calendar },
  { id: 'restaurant', label: 'Menu', icon: Utensils },
  { id: 'restaurant-2', label: 'Restaurants', icon: Utensils },
  { id: 'retail', label: 'Retail', icon: ShoppingBag },
  { id: 'gym', label: 'Fitness', icon: Dumbbell },
  { id: 'welcome', label: 'Corporate', icon: Building2 },
  { id: 'music', label: 'Entertainment', icon: Music },
  { id: 'fashion', label: 'Fashion', icon: Shirt },
];

/**
 * Quick search tags for hero section
 */
const QUICK_TAGS = [
  'Holiday Sale Promotion',
  'Winter Safety Announcement',
  'Year-End Employee Recognition',
  'Upcoming New Year Event',
  'Winter Menu Specials',
];

/**
 * Industries filter
 */
const INDUSTRIES = [
  { id: 'retail', label: 'Retail' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'corporate', label: 'Corporate' },
];

const LayoutsPage = ({ showToast, onNavigate }) => {
  // State
  const [templates, setTemplates] = useState([]);
  const [userDesigns, setUserDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [orientation, setOrientation] = useState('all'); // all, landscape, portrait
  const [visualMode, setVisualMode] = useState('all'); // all, static, animation
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    orientation: true,
    visualMode: true,
    industries: false,
  });

  // Refs for horizontal scrolling
  const featuredScrollRef = useRef(null);
  const popularScrollRef = useRef(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, layoutsResult] = await Promise.all([
        getLayoutTemplates(),
        fetchLayouts(),
      ]);
      setTemplates(templatesData);
      setUserDesigns(layoutsResult.data || []);
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

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (activeCategory === 'featured') {
      result = result.filter(t => t.is_featured);
    } else if (activeCategory === 'popular') {
      // Sort by some popularity metric or just show first N
      result = result.slice(0, 20);
    } else if (activeCategory === 'your-templates') {
      // Show user's saved templates (empty for now)
      result = [];
    } else if (activeCategory === 'recent') {
      // Show recently viewed (empty for now)
      result = [];
    } else if (activeCategory !== 'all') {
      result = result.filter(t => {
        const catSlug = t.categorySlug?.toLowerCase() || '';
        return catSlug.includes(activeCategory.replace('-2', ''));
      });
    }

    // Orientation filter
    if (orientation !== 'all') {
      result = result.filter(t => t.orientation === orientation);
    }

    // Visual mode filter (placeholder - we don't have animated templates yet)
    if (visualMode === 'animation') {
      result = result.filter(t => t.meta?.animated === true);
    }

    return result;
  }, [templates, searchQuery, activeCategory, orientation, visualMode]);

  // Get templates by category for sections
  const featuredTemplates = useMemo(() =>
    templates.filter(t => t.is_featured).slice(0, 10),
    [templates]
  );

  const popularTemplates = useMemo(() =>
    templates.slice(0, 10),
    [templates]
  );

  const holidayTemplates = useMemo(() =>
    templates.filter(t => t.categorySlug?.includes('holiday')).slice(0, 10),
    [templates]
  );

  // Handle template click - open directly in editor
  const handleTemplateClick = (template) => {
    // Debug: log template data from database
    console.log('Template clicked:', {
      name: template.name,
      width: template.width,
      height: template.height,
      orientation: template.orientation,
      thumbnail_url: template.thumbnail_url,
    });

    // Get the actual dimensions from template
    const templateWidth = template.width || 1920;
    const templateHeight = template.height || 1080;

    // Get high-res version of thumbnail for editor (replace small preview params with actual size)
    const thumbnailUrl = template.thumbnail_url || template.preview_image_url || '';
    const highResThumbnail = thumbnailUrl.includes('unsplash.com')
      ? thumbnailUrl.replace(/[?&]w=\d+/, `?w=${templateWidth}`).replace(/[?&]h=\d+/, `&h=${templateHeight}`)
      : thumbnailUrl;

    const templateData = {
      id: template.id,
      name: template.name || template.title,
      thumbnail: highResThumbnail,
      orientation: template.orientation || '16_9', // Pass orientation for proper canvas size
      width: templateWidth,   // Use resolved width
      height: templateHeight, // Use resolved height
    };

    console.log('Template data being passed:', templateData);
    onNavigate?.(`design-editor?template=${encodeURIComponent(JSON.stringify(templateData))}`);
  };

  // Handle search
  const handleSearch = (e) => {
    e?.preventDefault();
    setSearchQuery(searchInput);
    setActiveCategory('all');
  };

  // Handle quick tag click
  const handleQuickTag = (tag) => {
    setSearchInput(tag);
    setSearchQuery(tag);
    setActiveCategory('all');
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Scroll handlers for horizontal sections
  const scroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Render template card
  const TemplateCard = ({ template, size = 'medium' }) => {
    const sizeClasses = {
      small: 'w-40 h-28',
      medium: 'w-56 h-40',
      large: 'w-72 h-48',
    };

    return (
      <div
        onClick={() => handleTemplateClick(template)}
        className={`
          ${sizeClasses[size]} flex-shrink-0 relative rounded-lg overflow-hidden
          cursor-pointer group bg-gray-100 border border-gray-200
          hover:shadow-lg hover:border-teal-400 transition-all
        `}
      >
        {template.thumbnail_url || template.preview_image_url ? (
          <img
            src={template.thumbnail_url || template.preview_image_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
            <LayoutGrid size={32} className="text-teal-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-900 rounded-md text-sm font-medium shadow-lg">
            Use Template
          </span>
        </div>

        {/* Featured badge */}
        {template.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-medium rounded">
            Featured
          </div>
        )}
      </div>
    );
  };

  // Render horizontal scroll section
  const HorizontalSection = ({ title, templates, scrollRef, onViewAll }) => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-teal-600 hover:text-teal-700 text-sm font-medium"
          >
            View all
          </button>
        )}
      </div>
      <div className="relative group">
        {/* Left scroll button */}
        <button
          onClick={() => scroll(scrollRef, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {templates.map((template) => (
            <TemplateCard key={template.id || template.slug} template={template} />
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll(scrollRef, 'right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-6 -mt-6">
      {/* ===== LEFT SIDEBAR ===== */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder='Try "Building Directory"'
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            />
          </div>

          {/* Home Button */}
          <button
            onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
            className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
          >
            Home
          </button>

          {/* New Design Button */}
          <button
            onClick={() => onNavigate?.('design-editor')}
            className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
          >
            New Design
          </button>

          {/* Your Designs Button */}
          <button
            onClick={() => setActiveCategory('your-templates')}
            className={`
              w-full py-2.5 border font-medium rounded-lg transition-colors
              ${activeCategory === 'your-templates'
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
              }
            `}
          >
            Your Designs
          </button>

          {/* Divider */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Filters
            </h4>
          </div>

          {/* Categories Section */}
          <div>
            <button
              onClick={() => toggleSection('categories')}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900"
            >
              Categories
              {expandedSections.categories ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.categories && (
              <div className="space-y-0.5 ml-1">
                {SIDEBAR_CATEGORIES
                  .slice(0, showMoreCategories ? undefined : 10)
                  .map((cat) => {
                    if (cat.type === 'divider') {
                      return <div key={cat.id} className="border-t border-gray-100 my-2" />;
                    }
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                        className={`
                          w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors
                          ${isActive
                            ? 'bg-teal-50 text-teal-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        {Icon && <Icon size={14} />}
                        {cat.label}
                      </button>
                    );
                  })}
                {SIDEBAR_CATEGORIES.length > 10 && (
                  <button
                    onClick={() => setShowMoreCategories(!showMoreCategories)}
                    className="text-teal-600 hover:text-teal-700 text-sm font-medium pl-2 py-1"
                  >
                    {showMoreCategories ? 'Show less' : `+ View ${SIDEBAR_CATEGORIES.length - 10} more`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Orientation Section */}
          <div>
            <button
              onClick={() => toggleSection('orientation')}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900"
            >
              Orientation
              {expandedSections.orientation ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.orientation && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setOrientation(orientation === 'landscape' ? 'all' : 'landscape')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${orientation === 'landscape'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Monitor size={14} />
                  Landscape
                </button>
                <button
                  onClick={() => setOrientation(orientation === 'portrait' ? 'all' : 'portrait')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${orientation === 'portrait'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <Smartphone size={14} />
                  Portrait
                </button>
              </div>
            )}
          </div>

          {/* Visual Mode Section */}
          <div>
            <button
              onClick={() => toggleSection('visualMode')}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900"
            >
              Visual Mode
              {expandedSections.visualMode ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.visualMode && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setVisualMode(visualMode === 'static' ? 'all' : 'static')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${visualMode === 'static'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  Static
                </button>
                <button
                  onClick={() => setVisualMode(visualMode === 'animation' ? 'all' : 'animation')}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors
                    ${visualMode === 'animation'
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  Animation
                </button>
              </div>
            )}
          </div>

          {/* Industries Section */}
          <div>
            <button
              onClick={() => toggleSection('industries')}
              className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-900"
            >
              Industries
              {expandedSections.industries ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedSections.industries && (
              <div className="flex flex-wrap gap-2 mt-1">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.id}
                    onClick={() => setActiveCategory(ind.id)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm border transition-colors
                      ${activeCategory === ind.id
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }
                    `}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Hero Section */}
        {!searchQuery && activeCategory === 'all' && (
          <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-12">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-2xl font-bold text-white mb-6">
                What Template Are You Looking For?
              </h1>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder='Try "Building Directory"'
                  className="w-full pl-12 pr-32 py-3 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Search Templates
                </button>
              </form>

              {/* Quick Tags */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTag(tag)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* AI Designer Button */}
              <button
                onClick={() => showToast?.('AI Designer coming soon!', 'info')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-teal-600 font-medium rounded-lg transition-colors shadow-sm"
              >
                <Sparkles size={18} />
                Try AI Designer
              </button>
            </div>
          </div>
        )}

        {/* Search Results Header */}
        {searchQuery && (
          <div className="bg-gradient-to-r from-amber-600 to-orange-500 px-8 py-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-white mb-4">
                Results for: {searchQuery}
              </h2>
              <div className="flex flex-wrap gap-2">
                {['digital menu board', 'animated display', 'static template', 'promotional content'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleQuickTag(tag)}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : searchQuery || activeCategory !== 'all' ? (
            /* Grid View for Search/Filtered Results */
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeCategory === 'your-templates' ? 'Your Templates' :
                   activeCategory === 'recent' ? 'Recent Designs' :
                   activeCategory === 'featured' ? 'Featured Templates' :
                   activeCategory === 'popular' ? 'Popular Templates' :
                   searchQuery ? `${filteredTemplates.length} results` :
                   SIDEBAR_CATEGORIES.find(c => c.id === activeCategory)?.label || 'Templates'}
                </h2>
                {(searchQuery || activeCategory !== 'all') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchInput(''); setActiveCategory('all'); }}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear filters
                  </button>
                )}
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-16">
                  <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                  <p className="text-gray-500 mb-4">
                    {activeCategory === 'your-templates'
                      ? 'You haven\'t saved any templates yet'
                      : activeCategory === 'recent'
                      ? 'No recent designs'
                      : 'Try a different search or category'}
                  </p>
                  <button
                    onClick={() => onNavigate?.('design-editor')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                    Create New Design
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id || template.slug}
                      onClick={() => handleTemplateClick(template)}
                      className="aspect-video relative rounded-lg overflow-hidden cursor-pointer group bg-gray-100 border border-gray-200 hover:shadow-lg hover:border-teal-400 transition-all"
                    >
                      {template.thumbnail_url || template.preview_image_url ? (
                        <img
                          src={template.thumbnail_url || template.preview_image_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
                          <LayoutGrid size={32} className="text-teal-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-900 rounded-md text-sm font-medium shadow-lg">
                          Use Template
                        </span>
                      </div>
                      {template.is_featured && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-medium rounded">
                          Featured
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Home View with Sections */
            <div className="space-y-8">
              {/* Featured Section */}
              {featuredTemplates.length > 0 && (
                <HorizontalSection
                  title="Featured"
                  templates={featuredTemplates}
                  scrollRef={featuredScrollRef}
                  onViewAll={() => setActiveCategory('featured')}
                />
              )}

              {/* Popular Section */}
              {popularTemplates.length > 0 && (
                <HorizontalSection
                  title="Popular"
                  templates={popularTemplates}
                  scrollRef={popularScrollRef}
                  onViewAll={() => setActiveCategory('popular')}
                />
              )}

              {/* Holidays Section */}
              {holidayTemplates.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Holidays and Observances</h3>
                    <button
                      onClick={() => setActiveCategory('holidays')}
                      className="text-teal-600 hover:text-teal-700 text-sm font-medium"
                    >
                      View all
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {holidayTemplates.slice(0, 5).map((template) => (
                      <TemplateCard key={template.id || template.slug} template={template} />
                    ))}
                  </div>
                </div>
              )}

              {/* All Templates Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">All Designs</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {templates.slice(0, 20).map((template) => (
                    <div
                      key={template.id || template.slug}
                      onClick={() => handleTemplateClick(template)}
                      className="aspect-video relative rounded-lg overflow-hidden cursor-pointer group bg-gray-100 border border-gray-200 hover:shadow-lg hover:border-teal-400 transition-all"
                    >
                      {template.thumbnail_url || template.preview_image_url ? (
                        <img
                          src={template.thumbnail_url || template.preview_image_url}
                          alt={template.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-100">
                          <LayoutGrid size={32} className="text-teal-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-gray-900 rounded-md text-sm font-medium shadow-lg">
                          Use Template
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LayoutsPage;
