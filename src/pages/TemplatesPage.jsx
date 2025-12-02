/**
 * Templates Page
 *
 * Gallery of content templates and vertical packs for quick-start content.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutTemplate,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Building2,
  Sparkles,
  Package,
  List,
  Layout,
  Check,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  fetchTemplateCategories,
  fetchTemplates,
  applyTemplate,
  applyPack,
  formatTemplateForCard,
} from '../services/templateService';
import { canEditContent } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from '../design-system';

// Icon mapping for categories
const getCategoryIcon = (iconKey) => {
  const icons = {
    utensils: Utensils,
    scissors: Scissors,
    dumbbell: Dumbbell,
    'shopping-bag': ShoppingBag,
    building: Building2,
  };
  return icons[iconKey] || Building2;
};

// Badge colors for template types
const getBadgeVariant = (type) => {
  const variants = {
    playlist: 'blue',
    layout: 'purple',
    pack: 'green',
  };
  return variants[type] || 'gray';
};

const TemplatesPage = ({ showToast }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  // State
  const [categories, setCategories] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeType, setActiveType] = useState('all');

  // Apply state
  const [applying, setApplying] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  // Permissions
  const [canEdit, setCanEdit] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Check permissions
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await canEditContent();
      setCanEdit(hasPermission);
    };
    checkPermissions();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cats, temps] = await Promise.all([
        fetchTemplateCategories(),
        fetchTemplates(),
      ]);
      setCategories(cats);
      setTemplates(temps.map(formatTemplateForCard));
    } catch (error) {
      console.error('Error loading templates:', error);
      showToast?.('Error loading templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((t) => {
    const categoryMatch = activeCategory === 'all' || t.categorySlug === activeCategory;
    const typeMatch = activeType === 'all' || t.type === activeType;
    return categoryMatch && typeMatch;
  });

  // Group by type for display
  const packs = filteredTemplates.filter((t) => t.type === 'pack');
  const playlistTemplates = filteredTemplates.filter((t) => t.type === 'playlist');
  const layoutTemplates = filteredTemplates.filter((t) => t.type === 'layout');

  // Apply template handler
  const handleApply = async (template) => {
    if (!canEdit) {
      showToast?.('You do not have permission to use templates', 'error');
      return;
    }

    try {
      setApplying(template.slug);
      let result;

      if (template.type === 'pack') {
        result = await applyPack(template.slug);
      } else {
        result = await applyTemplate(template.slug);
      }

      setSuccessModal({
        template,
        result,
      });

      showToast?.('Template applied successfully!', 'success');
    } catch (error) {
      console.error('Error applying template:', error);
      showToast?.(error.message || 'Error applying template', 'error');
    } finally {
      setApplying(null);
    }
  };

  // Navigate to created content
  const navigateToPlaylist = (playlistId) => {
    setSuccessModal(null);
    navigate(`/app/playlists/${playlistId}`);
  };

  const navigateToLayout = (layoutId) => {
    setSuccessModal(null);
    navigate(`/app/layouts/${layoutId}`);
  };

  const navigateToScreens = () => {
    setSuccessModal(null);
    navigate('/app/screens');
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('templates.title', 'Templates')}
        description={t('templates.subtitle', 'Quick-start your signage with ready-made templates')}
        icon={<LayoutTemplate size={20} className="text-white" />}
        iconBackground="bg-gradient-to-br from-blue-500 to-purple-600"
      />

      <PageContent>
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label={t('templates.categoryFilter', 'Category filter')}>
          <button
            onClick={() => setActiveCategory('all')}
            role="tab"
            aria-selected={activeCategory === 'all'}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('templates.allCategories', 'All Categories')}
          </button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <button
                key={cat.slug}
                onClick={() => setActiveCategory(cat.slug)}
                role="tab"
                aria-selected={activeCategory === cat.slug}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  activeCategory === cat.slug
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-6" role="tablist" aria-label={t('templates.typeFilter', 'Type filter')}>
          <button
            onClick={() => setActiveType('all')}
            role="tab"
            aria-selected={activeType === 'all'}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeType === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('templates.allTypes', 'All Types')}
          </button>
          <button
            onClick={() => setActiveType('pack')}
            role="tab"
            aria-selected={activeType === 'pack'}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
              activeType === 'pack'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Package size={14} aria-hidden="true" />
            {t('templates.starterPacks', 'Starter Packs')}
          </button>
          <button
            onClick={() => setActiveType('playlist')}
            role="tab"
            aria-selected={activeType === 'playlist'}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeType === 'playlist'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <List size={14} aria-hidden="true" />
            {t('templates.playlists', 'Playlists')}
          </button>
          <button
            onClick={() => setActiveType('layout')}
            role="tab"
            aria-selected={activeType === 'layout'}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
              activeType === 'layout'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Layout size={14} aria-hidden="true" />
            {t('templates.layouts', 'Layouts')}
          </button>
        </div>

        {/* Starter Packs Section */}
        {(activeType === 'all' || activeType === 'pack') && packs.length > 0 && (
          <section className="space-y-4 mb-8" aria-labelledby="packs-heading">
            <div className="flex items-center gap-2">
              <Package size={20} className="text-green-600" aria-hidden="true" />
              <h2 id="packs-heading" className="text-lg font-semibold text-gray-900">{t('templates.starterPacks', 'Starter Packs')}</h2>
              <span className="text-sm text-gray-500">
                {t('templates.starterPacksDescription', 'Complete setups with playlists, layouts, and schedules')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packs.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={handleApply}
                  applying={applying === template.slug}
                  disabled={!canEdit}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {/* Playlist Templates Section */}
        {(activeType === 'all' || activeType === 'playlist') && playlistTemplates.length > 0 && (
          <section className="space-y-4 mb-8" aria-labelledby="playlists-heading">
            <div className="flex items-center gap-2">
              <List size={20} className="text-blue-600" aria-hidden="true" />
              <h2 id="playlists-heading" className="text-lg font-semibold text-gray-900">{t('templates.playlistTemplates', 'Playlist Templates')}</h2>
              <span className="text-sm text-gray-500">
                {t('templates.playlistTemplatesDescription', 'Pre-configured playlists with placeholder items')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlistTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={handleApply}
                  applying={applying === template.slug}
                  disabled={!canEdit}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {/* Layout Templates Section */}
        {(activeType === 'all' || activeType === 'layout') && layoutTemplates.length > 0 && (
          <section className="space-y-4 mb-8" aria-labelledby="layouts-heading">
            <div className="flex items-center gap-2">
              <Layout size={20} className="text-purple-600" aria-hidden="true" />
              <h2 id="layouts-heading" className="text-lg font-semibold text-gray-900">{t('templates.layoutTemplates', 'Layout Templates')}</h2>
              <span className="text-sm text-gray-500">
                {t('templates.layoutTemplatesDescription', 'Multi-zone layouts for dynamic displays')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {layoutTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={handleApply}
                  applying={applying === template.slug}
                  disabled={!canEdit}
                  t={t}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <EmptyState
            icon={LayoutTemplate}
            title={t('templates.noTemplatesFound', 'No templates found')}
            description={t('templates.adjustFilters', 'Try adjusting your filters to see more templates.')}
          />
        )}

        {/* Success Modal */}
        {successModal && (
          <Modal isOpen onClose={() => setSuccessModal(null)} size="lg">
            <ModalHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center" aria-hidden="true">
                  <Check size={24} className="text-green-600" />
                </div>
                <div>
                  <ModalTitle>{t('templates.templateApplied', 'Template Applied!')}</ModalTitle>
                  <p className="text-sm text-gray-500">
                    {t('templates.templateAddedToAccount', '{{title}} has been added to your account', { title: successModal.template.title })}
                  </p>
                </div>
              </div>
            </ModalHeader>
            <ModalContent>
              {/* Created Items */}
              <div className="space-y-3 mb-6">
                {successModal.result.playlists?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <List size={16} className="text-blue-600" aria-hidden="true" />
                      <span className="font-medium text-blue-900">
                        {t('templates.playlistsCreated', '{{count}} Playlist(s) Created', { count: successModal.result.playlists.length })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {successModal.result.playlists.map((p) => (
                        <div key={p.id} className="text-sm text-blue-700 flex items-center justify-between">
                          <span>{p.name}</span>
                          <button
                            onClick={() => navigateToPlaylist(p.id)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                          >
                            {t('common.edit', 'Edit')} <ChevronRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {successModal.result.layouts?.length > 0 && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Layout size={16} className="text-purple-600" aria-hidden="true" />
                      <span className="font-medium text-purple-900">
                        {t('templates.layoutsCreated', '{{count}} Layout(s) Created', { count: successModal.result.layouts.length })}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {successModal.result.layouts.map((l) => (
                        <div key={l.id} className="text-sm text-purple-700 flex items-center justify-between">
                          <span>{l.name}</span>
                          <button
                            onClick={() => navigateToLayout(l.id)}
                            className="text-purple-600 hover:text-purple-800 flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                          >
                            {t('common.edit', 'Edit')} <ChevronRight size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {successModal.result.schedules?.length > 0 && (
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-orange-600" aria-hidden="true" />
                      <span className="font-medium text-orange-900">
                        {t('templates.schedulesCreated', '{{count}} Schedule(s) Created', { count: successModal.result.schedules.length })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-start gap-2">
                <Info size={16} className="text-gray-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-gray-600">
                  {t('templates.replaceInfo', 'Replace the placeholder items with your own images and content, then assign to screens.')}
                </p>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSuccessModal(null)}>
                {t('common.close', 'Close')}
              </Button>
              {successModal.result.playlists?.length > 0 && (
                <Button onClick={() => navigateToPlaylist(successModal.result.playlists[0].id)}>
                  {t('templates.editPlaylist', 'Edit Playlist')}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={navigateToScreens}
                icon={<ExternalLink size={16} />}
              >
                {t('templates.assignToScreen', 'Assign to Screen')}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </PageContent>
    </PageLayout>
  );
};

// Template Card Component
const TemplateCard = ({ template, onApply, applying, disabled, t }) => {
  const Icon = getCategoryIcon(template.categoryIcon);

  const getTypeBadgeLabel = (type) => {
    switch (type) {
      case 'pack': return t('templates.starterPack', 'Starter Pack');
      case 'layout': return t('templates.layout', 'Layout');
      default: return t('templates.playlist', 'Playlist');
    }
  };

  return (
    <Card padding="none" className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative">
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
            {template.type === 'pack' ? (
              <Package size={48} className="text-gray-300" />
            ) : template.type === 'layout' ? (
              <Layout size={48} className="text-gray-300" />
            ) : (
              <List size={48} className="text-gray-300" />
            )}
          </div>
        )}

        {/* Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant={getBadgeVariant(template.type)}>
            {getTypeBadgeLabel(template.type)}
          </Badge>
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-2 left-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-xs text-gray-700">
            <Icon size={12} aria-hidden="true" />
            {template.category}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{template.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
          {template.description}
        </p>

        {/* Meta info */}
        {template.meta && (template.meta.includes || template.meta.estimated_items) && (
          <div className="text-xs text-gray-400 mb-3">
            {template.meta.includes && (
              <span>{t('templates.includes', 'Includes')}: {template.meta.includes.join(', ')}</span>
            )}
            {template.meta.estimated_items && (
              <span>{t('templates.itemCount', '{{count}} items', { count: template.meta.estimated_items })}</span>
            )}
          </div>
        )}

        {/* Apply Button */}
        <Button
          onClick={() => onApply(template)}
          disabled={disabled || applying}
          fullWidth
          variant={template.type === 'pack' ? 'primary' : 'secondary'}
          icon={applying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        >
          {applying
            ? t('templates.applying', 'Applying...')
            : template.type === 'pack'
              ? t('templates.useThisPack', 'Use This Pack')
              : t('templates.useTemplate', 'Use Template')
          }
        </Button>
      </div>
    </Card>
  );
};

export default TemplatesPage;
