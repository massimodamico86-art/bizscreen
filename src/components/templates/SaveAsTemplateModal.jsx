/**
 * Save As Template Modal
 *
 * Modal for capturing template metadata when saving a layout as a template.
 * Uses design-system Modal and FormElements for consistent styling.
 *
 * @module components/templates/SaveAsTemplateModal
 */

import { useState, useEffect } from 'react';



// Template categories matching SIDEBAR_CATEGORIES in LayoutsPage
const TEMPLATE_CATEGORIES = [
  { value: 'General', label: 'General' },
  { value: 'Holidays', label: 'Holidays' },
  { value: 'Restaurant', label: 'Restaurant' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Corporate', label: 'Corporate' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'Fashion', label: 'Fashion' },
  { value: 'Fitness', label: 'Fitness' },
];

/**
 * SaveAsTemplateModal component
 *
 * @param {Object} props
 * @param {boolean} props.open - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save handler, receives { name, category, description }
 * @param {Object} props.layout - The layout being saved (for default name)
 * @param {boolean} props.loading - Saving state
 */
export function SaveAsTemplateModal({ open, onClose, onSave, layout, loading = false }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');

  // Reset form when modal opens with layout data
  useEffect(() => {
    if (open && layout) {
      setName(layout.name ? `${layout.name} Template` : '');
      setDescription(layout.description || '');
      setCategory('General');
    }
  }, [open, layout]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      category,
      description: description.trim(),
    });
  };

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>Save as Template</ModalTitle>
          <ModalDescription>
            Save this layout as a reusable template for your organization.
          </ModalDescription>
        </ModalHeader>

        <ModalContent>
          <div className="space-y-4">
            <FormField label="Template Name" required>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
                autoFocus
              />
            </FormField>

            <FormField label="Category">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={TEMPLATE_CATEGORIES}
                placeholder=""
              />
            </FormField>

            <FormField label="Description" hint="Optional description for this template">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
              />
            </FormField>
          </div>
        </ModalContent>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !isValid}
          >
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default SaveAsTemplateModal;
