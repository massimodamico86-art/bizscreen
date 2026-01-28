/**
 * HelpCenterPage - In-App Help Center
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  Rocket,
  Monitor,
  ListVideo,
  Layout,
  Zap,
  LayoutTemplate,
  CreditCard,
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from 'lucide-react';


import { sanitizeHTML } from '../security/sanitize.js';
import {
  HELP_CATEGORIES,
  searchHelpTopics,
  getHelpTopic,
  getTopicsByCategory,
} from '../services/helpService';
import { PageLayout, PageHeader, PageContent, Button, Card, EmptyState } from '../design-system';

const CATEGORY_ICONS = {
  getting_started: Rocket,
  screens: Monitor,
  playlists: ListVideo,
  layouts: Layout,
  campaigns: Zap,
  templates: LayoutTemplate,
  billing: CreditCard
};

/**
 *
 * @param root0
 * @param root0.onNavigate
 */
export default function HelpCenterPage({ onNavigate }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('categories');

  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setTopics([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchHelpTopics(query);
      setTopics(results);
      setView('list');
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const loadCategoryTopics = async (categoryId) => {
    setLoading(true);
    setSelectedCategory(categoryId);
    try {
      const results = await getTopicsByCategory(categoryId);
      setTopics(results);
      setView('list');
    } catch (err) {
      console.error('Error loading category:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopic = async (slug) => {
    setLoading(true);
    try {
      const topic = await getHelpTopic(slug);
      if (topic) {
        setSelectedTopic(topic);
        setView('topic');
      }
    } catch (err) {
      console.error('Error loading topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (view === 'topic') {
      setSelectedTopic(null);
      setView(selectedCategory ? 'list' : 'categories');
    } else if (view === 'list') {
      setSelectedCategory(null);
      setTopics([]);
      setSearchQuery('');
      setView('categories');
    }
  };

  const handleInternalLink = (route) => {
    if (onNavigate) onNavigate(route);
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('helpCenter.title', 'Help Center')}
        description={t('helpCenter.description', 'Find answers and learn how to use BizScreen')}
        actions={view !== 'categories' && (
          <Button variant="ghost" onClick={goBack} icon={<ArrowLeft size={18} />}>
            {t('common.back', 'Back')}
          </Button>
        )}
      />

      <PageContent className="max-w-4xl mx-auto">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
          <input
            type="text"
            placeholder={t('helpCenter.searchPlaceholder', 'Search help articles...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            aria-label={t('helpCenter.searchArticles', 'Search help articles')}
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" size={20} aria-label={t('common.loading', 'Loading')} />
          )}
        </div>

        {/* Content */}
        {view === 'categories' && !searchQuery && (
          <CategoriesView categories={HELP_CATEGORIES} onSelectCategory={loadCategoryTopics} t={t} />
        )}

        {view === 'list' && (
          <TopicsListView topics={topics} selectedCategory={selectedCategory} onSelectTopic={loadTopic} searchQuery={searchQuery} t={t} />
        )}

        {view === 'topic' && selectedTopic && (
          <TopicDetailView topic={selectedTopic} onNavigate={handleInternalLink} onBack={goBack} t={t} />
        )}

        {/* Quick Links */}
        {view === 'categories' && (
          <div className="mt-8 p-4 bg-gray-50 rounded-xl">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t('helpCenter.needMoreHelp', 'Need more help?')}</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@bizscreen.io"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t('helpCenter.contactSupport', 'Contact Support')}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <button
                onClick={() => handleInternalLink('status')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t('helpCenter.systemStatus', 'System Status')}
              </button>
            </div>
          </div>
        )}
      </PageContent>
    </PageLayout>
  );
}

function CategoriesView({ categories, onSelectCategory, t }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label={t('helpCenter.categories', 'Help categories')}>
      {categories.map(category => {
        const Icon = CATEGORY_ICONS[category.id] || BookOpen;
        return (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="text-left p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            role="listitem"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors" aria-hidden="true">
                <Icon size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{category.label}</h3>
                <p className="text-sm text-gray-500">{category.description}</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500" aria-hidden="true" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TopicsListView({ topics, selectedCategory, onSelectTopic, searchQuery, t }) {
  const category = selectedCategory ? HELP_CATEGORIES.find(c => c.id === selectedCategory) : null;

  return (
    <div>
      {category && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{category.label}</h2>
          <p className="text-sm text-gray-500">{category.description}</p>
        </div>
      )}

      {searchQuery && (
        <p className="text-sm text-gray-500 mb-4">
          {t('helpCenter.searchResults', '{{count}} result(s) for "{{query}}"', { count: topics.length, query: searchQuery })}
        </p>
      )}

      {topics.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('helpCenter.noArticles', 'No articles found')}
          description={t('helpCenter.tryDifferentSearch', 'Try a different search term or browse categories')}
        />
      ) : (
        <div className="space-y-2" role="list" aria-label={t('helpCenter.articlesList', 'Help articles')}>
          {topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => onSelectTopic(topic.slug)}
              className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-between group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              role="listitem"
            >
              <div>
                <h3 className="font-medium text-gray-900 group-hover:text-blue-600">{topic.title}</h3>
                {topic.short_description && <p className="text-sm text-gray-500 mt-0.5">{topic.short_description}</p>}
              </div>
              <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TopicDetailView({ topic, onNavigate, onBack, t }) {
  const renderContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        if (inList) { elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<h2 key={index} className="text-xl font-bold text-gray-900 mt-6 mb-3">{trimmed.replace('## ', '')}</h2>);
      } else if (trimmed.startsWith('### ')) {
        if (inList) { elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>); listItems = []; inList = false; }
        elements.push(<h3 key={index} className="text-lg font-semibold text-gray-900 mt-4 mb-2">{trimmed.replace('### ', '')}</h3>);
      } else if (trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
        inList = true;
        const text = trimmed.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '');
        const formatted = sanitizeHTML(text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'));
        listItems.push(<li key={index} className="text-gray-700" dangerouslySetInnerHTML={{ __html: formatted }} />);
      } else if (trimmed) {
        if (inList) { elements.push(<ul key={`list-${index}`} className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>); listItems = []; inList = false; }
        const formatted = sanitizeHTML(trimmed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'));
        elements.push(<p key={index} className="text-gray-700 mb-3" dangerouslySetInnerHTML={{ __html: formatted }} />);
      }
    });

    if (inList && listItems.length > 0) elements.push(<ul key="final-list" className="list-disc pl-6 mb-4 space-y-1">{listItems}</ul>);
    return elements;
  };

  return (
    <div>
      <Card padding="default">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{topic.title}</h1>
        {topic.short_description && <p className="text-gray-600 mb-6">{topic.short_description}</p>}
        <div className="prose prose-gray max-w-none">{renderContent(topic.content)}</div>

        {topic.related_routes && topic.related_routes.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('helpCenter.relatedPages', 'Related Pages')}</h4>
            <div className="flex flex-wrap gap-2">
              {topic.related_routes.map(route => (
                <button
                  key={route}
                  onClick={() => onNavigate(route)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {t('helpCenter.goTo', 'Go to {{page}}', { page: route.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase()) })}
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      <button onClick={onBack} className="mt-4 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
        <ChevronLeft size={18} aria-hidden="true" />
        {t('helpCenter.backToArticles', 'Back to articles')}
      </button>
    </div>
  );
}
