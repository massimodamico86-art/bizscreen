/**
 * Template Picker Modal - Select a campaign template to create new campaign
 *
 * Groups templates into "My Templates" and "System Templates"
 * Shows template preview with target types, content types, and settings
 */
import { useState, useEffect } from 'react';
import { X, FileText, Check, Tag, Loader2, Layout, ListMusic, Target } from 'lucide-react';
import { Button, Card, Badge, Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../../design-system';
import { getTemplates } from '../../services/campaignTemplateService';
import { useLogger } from '../../hooks/useLogger';

export function TemplatePickerModal({ onSelect, onClose }) {
  const logger = useLogger('TemplatePickerModal');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      logger.error('Failed to load templates', { error: err });
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Group templates
  const myTemplates = templates.filter(t => !t.is_system);
  const systemTemplates = templates.filter(t => t.is_system);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleConfirm = () => {
    if (selectedTemplateId) {
      onSelect(selectedTemplateId);
    }
  };

  // Format template data for preview
  const formatTemplatePreview = (template) => {
    const data = template.template_data || {};
    const targets = data.targets || [];
    const contents = data.contents || [];
    const settings = data.settings || {};

    return {
      targetTypes: [...new Set(targets.map(t => t.target_type))],
      contentTypes: [...new Set(contents.map(c => c.content_type))],
      contentCount: contents.length,
      priority: settings.priority || 100
    };
  };

  const renderTemplateList = (templateList, title) => {
    if (templateList.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
          {title}
        </h3>
        <div className="space-y-2">
          {templateList.map(template => {
            const preview = formatTemplatePreview(template);
            const isSelected = selectedTemplateId === template.id;

            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100'
                    }`}>
                      <FileText size={20} className={isSelected ? '' : 'text-gray-600'} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {preview.targetTypes.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Target size={12} />
                            {preview.targetTypes.join(', ')}
                          </span>
                        )}
                        {preview.contentCount > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <ListMusic size={12} />
                            {preview.contentCount} content slot{preview.contentCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Priority: {preview.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 ml-13">
                    <Tag size={12} className="text-gray-400" />
                    {template.tags.map((tag, i) => (
                      <Badge key={i} variant="gray" size="sm">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Modal open={true} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Create from Template</ModalTitle>
      </ModalHeader>

      <ModalContent className="max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-600">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadTemplates} className="mt-2">
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No templates available</p>
            <p className="text-sm mt-1">
              Save a campaign as template to use it here
            </p>
          </div>
        ) : (
          <>
            {renderTemplateList(myTemplates, 'My Templates')}
            {renderTemplateList(systemTemplates, 'System Templates')}
          </>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedTemplateId}
        >
          Create Campaign
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default TemplatePickerModal;
