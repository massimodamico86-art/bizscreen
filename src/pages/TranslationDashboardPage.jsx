/**
 * Translation Dashboard Page
 *
 * Central management view for translation workflow.
 * Shows all scenes with their language variants and translation status.
 * Supports bulk status updates and AI translation suggestions.
 */

import { useState, useEffect } from 'react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Checkbox,
  EmptyState,
} from '../design-system';
import {
  Globe,
  Check,
  Clock,
  AlertCircle,
  Languages,
  Sparkles,
} from 'lucide-react';
import { fetchTranslationDashboard } from '../services/translationService';
import { getLanguageDisplayInfo, getLanguageColor } from '../services/languageService';
import TranslationFilters from '../components/translations/TranslationFilters';
import BulkActionsBar from '../components/translations/BulkActionsBar';
import AiSuggestionPanel from '../components/translations/AiSuggestionPanel';
import { useLogger } from '../hooks/useLogger';

// Status configuration for styling
const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-500 bg-gray-100' },
  review: { label: 'In Review', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
  approved: { label: 'Approved', icon: Check, color: 'text-green-600 bg-green-50' },
};

export default function TranslationDashboardPage({ showToast }) {
  const logger = useLogger('TranslationDashboardPage');
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ status: '', languageCode: '' });
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiTargetScene, setAiTargetScene] = useState(null);

  // Load scenes when filters change
  useEffect(() => {
    const loadScenes = async () => {
      setLoading(true);
      try {
        const data = await fetchTranslationDashboard({
          status: filters.status || null,
          languageCode: filters.languageCode || null,
        });
        setScenes(data);
        // Clear selection when filters change
        setSelected([]);
      } catch (error) {
        logger.error('Failed to load translation dashboard', { error });
        showToast?.('Failed to load translation data', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadScenes();
  }, [filters]);

  // Handle row selection
  const toggleSelect = (sceneId) => {
    setSelected((prev) =>
      prev.includes(sceneId)
        ? prev.filter((id) => id !== sceneId)
        : [...prev, sceneId]
    );
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selected.length === scenes.length) {
      setSelected([]);
    } else {
      setSelected(scenes.map((s) => s.scene_id));
    }
  };

  // Handle bulk action complete
  const handleBulkComplete = async () => {
    setSelected([]);
    // Reload data
    const data = await fetchTranslationDashboard({
      status: filters.status || null,
      languageCode: filters.languageCode || null,
    });
    setScenes(data);
  };

  // Open AI panel for a scene
  const openAiPanel = (scene) => {
    setAiTargetScene(scene);
    setShowAiPanel(true);
  };

  // Close AI panel
  const closeAiPanel = () => {
    setShowAiPanel(false);
    setAiTargetScene(null);
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon size={12} aria-hidden="true" />
        {config.label}
      </span>
    );
  };

  // Render language pills for a scene
  const renderLanguagePills = (variants) => {
    if (!variants || variants.length === 0) {
      return <span className="text-gray-400 text-sm">No variants</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {variants.map((variant) => {
          const langInfo = getLanguageDisplayInfo(variant.language_code);
          const statusConfig = STATUS_CONFIG[variant.status] || STATUS_CONFIG.draft;
          const StatusIcon = statusConfig.icon;

          return (
            <span
              key={variant.language_code}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${getLanguageColor(
                variant.language_code
              )}`}
              title={`${langInfo.name}: ${statusConfig.label}`}
            >
              {langInfo.code.toUpperCase()}
              <StatusIcon size={10} className="ml-0.5" aria-hidden="true" />
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <PageLayout>
      <PageHeader
        title="Translation Dashboard"
        description={`${scenes.length} scene${scenes.length !== 1 ? 's' : ''} with translation status`}
        icon={<Globe className="text-blue-600" aria-hidden="true" />}
      />

      <PageContent>
        {/* Filters */}
        <div className="mb-6">
          <TranslationFilters filters={filters} onChange={setFilters} />
        </div>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <div className="mb-4">
            <BulkActionsBar
              selectedIds={selected}
              onComplete={handleBulkComplete}
              showToast={showToast}
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div
            className="flex items-center justify-center h-64"
            role="status"
            aria-label="Loading"
          >
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              aria-hidden="true"
            ></div>
          </div>
        ) : scenes.length === 0 ? (
          <EmptyState
            icon={Languages}
            title="No Scenes Found"
            description={
              filters.status || filters.languageCode
                ? 'No scenes match your current filters. Try adjusting your filter criteria.'
                : 'Create scenes with language variants to manage translations here.'
            }
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table
                className="w-full"
                role="table"
                aria-label="Translation dashboard table"
              >
                <thead>
                  <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                    <th scope="col" className="p-4 w-12">
                      <Checkbox
                        checked={
                          scenes.length > 0 && selected.length === scenes.length
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all scenes"
                      />
                    </th>
                    <th scope="col" className="p-4 font-medium">
                      SCENE NAME
                    </th>
                    <th scope="col" className="p-4 font-medium">
                      LANGUAGES
                    </th>
                    <th scope="col" className="p-4 font-medium">
                      STATUS
                    </th>
                    <th scope="col" className="p-4 font-medium w-32">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scenes.map((scene) => (
                    <tr
                      key={scene.scene_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-4">
                        <Checkbox
                          checked={selected.includes(scene.scene_id)}
                          onChange={() => toggleSelect(scene.scene_id)}
                          aria-label={`Select ${scene.scene_name}`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"
                            aria-hidden="true"
                          >
                            <Globe size={20} className="text-blue-600" />
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">
                              {scene.scene_name}
                            </span>
                            {scene.language_code && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({scene.language_code.toUpperCase()})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {renderLanguagePills(scene.variants)}
                      </td>
                      <td className="p-4">
                        {renderStatusBadge(scene.translation_status)}
                      </td>
                      <td className="p-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openAiPanel(scene)}
                          icon={<Sparkles size={14} aria-hidden="true" />}
                        >
                          Translate
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* AI Suggestion Panel */}
        {showAiPanel && aiTargetScene && (
          <AiSuggestionPanel
            scene={aiTargetScene}
            isOpen={showAiPanel}
            onClose={closeAiPanel}
            showToast={showToast}
          />
        )}
      </PageContent>
    </PageLayout>
  );
}
