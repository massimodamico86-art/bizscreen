/**
 * ContextualHelpDrawer Component
 *
 * Slide-in drawer that shows page-specific help content.
 * Triggered by a "?" icon on key pages.
 *
 * @module components/ContextualHelpDrawer
 */
import { useState, useEffect } from 'react';
import {
  X,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Lightbulb,
  BookOpen,
  Loader2
} from 'lucide-react';
import {
  getContextualHelp,
  getQuickTips,
  getCategoryForPage,
  HELP_CATEGORIES
} from '../services/helpService';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Help button that triggers the drawer
 */
export function HelpButton({ pageId, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      title="Get help with this page"
      aria-label="Open help"
    >
      <HelpCircle size={20} />
    </button>
  );
}

/**
 * ContextualHelpDrawer Component
 */
export default function ContextualHelpDrawer({
  isOpen,
  onClose,
  pageId,
  onNavigate
}) {
  const logger = useLogger('ContextualHelpDrawer');
  const [loading, setLoading] = useState(false);
  const [relatedTopics, setRelatedTopics] = useState([]);
  const tips = getQuickTips(pageId);
  const category = getCategoryForPage(pageId);

  // Load related topics
  useEffect(() => {
    if (isOpen && pageId) {
      loadRelatedTopics();
    }
  }, [isOpen, pageId]);

  const loadRelatedTopics = async () => {
    setLoading(true);
    try {
      const topics = await getContextualHelp(pageId);
      setRelatedTopics(topics);
    } catch (err) {
      logger.error('Error loading contextual help', { pageId, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleViewHelpCenter = () => {
    if (onNavigate) {
      onNavigate('help');
    }
    onClose();
  };

  const handleViewTopic = (slug) => {
    if (onNavigate) {
      onNavigate(`help?topic=${slug}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  const pageTitle = pageId
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900">Help</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Page title */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">Help for</p>
            <h3 className="text-lg font-semibold text-gray-900">{pageTitle}</h3>
          </div>

          {/* Quick Tips */}
          {tips.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} className="text-yellow-500" />
                <h4 className="font-medium text-gray-700">Quick Tips</h4>
              </div>
              <ul className="space-y-2">
                {tips.map((tip, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-blue-500 mt-1">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Articles */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-blue-500" />
              <h4 className="font-medium text-gray-700">Related Articles</h4>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-gray-400" size={24} />
              </div>
            ) : relatedTopics.length > 0 ? (
              <div className="space-y-2">
                {relatedTopics.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => handleViewTopic(topic.slug)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm group-hover:text-blue-600">
                        {topic.title}
                      </p>
                      {topic.short_description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {topic.short_description}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">
                No specific articles for this page yet.
              </p>
            )}
          </div>

          {/* Category Link */}
          {category && (
            <div className="mb-6">
              <button
                onClick={handleViewHelpCenter}
                className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
                    <BookOpen size={18} className="text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-blue-900">
                      {category.label}
                    </p>
                    <p className="text-xs text-blue-700">
                      View all articles in this category
                    </p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-blue-400" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleViewHelpCenter}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            Open Help Center
            <ExternalLink size={16} />
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Or email support@bizscreen.io
          </p>
        </div>
      </div>
    </>
  );
}
