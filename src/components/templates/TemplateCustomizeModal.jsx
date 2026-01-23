/**
 * Template Customize Modal (US-126)
 *
 * Allows users to customize template settings before applying.
 * - Shows template preview
 * - Allows renaming the created content
 * - For packs: allows renaming each item
 */

import { useState, useEffect } from 'react';
import { Package, List, Layout, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
} from '../../design-system';
import { TemplateLivePreview } from './TemplateLivePreview';

const getTypeIcon = (type) => {
  switch (type) {
    case 'pack':
      return Package;
    case 'layout':
      return Layout;
    default:
      return List;
  }
};

const getTypeLabel = (type) => {
  switch (type) {
    case 'pack':
      return 'Starter Pack';
    case 'layout':
      return 'Layout Template';
    default:
      return 'Playlist Template';
  }
};

export function TemplateCustomizeModal({
  isOpen,
  onClose,
  template,
  onApply,
  isApplying = false,
  error = null,
  t = (key, fallback) => fallback, // Translation function
}) {
  const [customName, setCustomName] = useState('');
  const [packItems, setPackItems] = useState([]);

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      // Default name is template name + " Copy"
      setCustomName(`${template.title || template.name} Copy`);

      // For packs, initialize item names
      if (template.type === 'pack' && template.meta?.includes) {
        setPackItems(
          template.meta.includes.map((item, idx) => ({
            type: item,
            name: `${template.title || template.name} - ${item}`,
            key: idx,
          }))
        );
      } else {
        setPackItems([]);
      }
    }
  }, [template]);

  const handleApply = () => {
    if (!template) return;

    const customization = {
      name: customName.trim() || `${template.title || template.name} Copy`,
      packItems: template.type === 'pack' ? packItems : undefined,
    };

    onApply(template, customization);
  };

  const updatePackItemName = (index, name) => {
    setPackItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name } : item))
    );
  };

  if (!template) return null;

  const TypeIcon = getTypeIcon(template.type);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <TypeIcon size={20} className="text-white" />
          </div>
          <div>
            <ModalTitle>
              {t('templates.customizeTemplate', 'Customize Template')}
            </ModalTitle>
            <p className="text-sm text-gray-500">{getTypeLabel(template.type)}</p>
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        {/* Preview */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('templates.preview', 'Preview')}
          </label>
          <div className="h-40 rounded-lg overflow-hidden border border-gray-200">
            <TemplateLivePreview template={template} />
          </div>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label
            htmlFor="template-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {template.type === 'pack'
              ? t('templates.packName', 'Pack Name')
              : t('templates.contentName', 'Content Name')}
          </label>
          <input
            id="template-name"
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('templates.enterName', 'Enter a name...')}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t(
              'templates.nameHint',
              'This will be the name of your new content.'
            )}
          </p>
        </div>

        {/* Pack Items (for pack templates) */}
        {template.type === 'pack' && packItems.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('templates.itemsToCreate', 'Items to Create')}
            </label>
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
              {packItems.map((item, idx) => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className="w-20 text-xs text-gray-500 flex items-center gap-1">
                    {item.type.toLowerCase().includes('playlist') && (
                      <List size={12} />
                    )}
                    {item.type.toLowerCase().includes('layout') && (
                      <Layout size={12} />
                    )}
                    {item.type}
                  </div>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updatePackItemName(idx, e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            {template.type === 'pack'
              ? t(
                  'templates.packInfo',
                  'This will create playlists, layouts, and schedules based on this starter pack. You can customize the content after creation.'
                )
              : t(
                  'templates.templateInfo',
                  'A copy of this template will be created in your account. You can edit and customize it after creation.'
                )}
          </p>
        </div>
      </ModalContent>

      <ModalFooter>
        <Button variant="secondary" onClick={onClose} disabled={isApplying}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handleApply}
          disabled={isApplying || !customName.trim()}
          icon={
            isApplying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )
          }
        >
          {isApplying
            ? t('templates.applying', 'Applying...')
            : t('templates.applyTemplate', 'Apply Template')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default TemplateCustomizeModal;
