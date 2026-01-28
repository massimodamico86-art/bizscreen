/**
 * Admin Edit Template Page
 *
 * Create or edit a marketplace template.
 * Handles template metadata, slides, and enterprise access.
 */

import { useState, useEffect } from 'react';
import {
  fetchTemplateDetail,
  fetchCategories,
  createTemplate,
  updateTemplate,
  addTemplateSlide,
  updateTemplateSlide,
  deleteTemplateSlide,
  fetchEnterpriseAccess,
  grantEnterpriseAccess,
  revokeEnterpriseAccess,
  uploadTemplateThumbnail,
  LICENSE_LABELS,
} from '../../services/marketplaceService';
import { autoTagSvg, autoTagSvgFromUrl } from '../../services/autoTaggingService';
import { useLogger } from '../../hooks/useLogger.js';

// Industry options
const INDUSTRIES = [
  { value: 'retail', label: 'Retail' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'events', label: 'Events' },
];

export default function AdminEditTemplatePage({ templateId, onNavigate }) {
  const isNew = templateId === 'new';
  const logger = useLogger('AdminEditTemplatePage');

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    templateType: 'scene',
    license: 'free',
    industry: '',
    tags: '',
    isActive: true,
    isFeatured: false,
    thumbnailUrl: null,
  });

  // Related data
  const [categories, setCategories] = useState([]);
  const [slides, setSlides] = useState([]);
  const [enterpriseAccess, setEnterpriseAccess] = useState([]);

  // UI state
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');

  // Slide editing
  const [editingSlide, setEditingSlide] = useState(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    kind: 'default',
    designJson: '{}',
    durationSeconds: 10,
  });

  // Enterprise access
  const [newTenantId, setNewTenantId] = useState('');

  // Thumbnail upload
  const [uploading, setUploading] = useState(false);

  // Auto-tagging
  const [autoTagging, setAutoTagging] = useState(false);
  const [svgContent, setSvgContent] = useState(null);
  const [svgUrl, setSvgUrl] = useState(null);
  const [svgPreviewUrl, setSvgPreviewUrl] = useState(null);
  const [uploadedSvgFile, setUploadedSvgFile] = useState(null);

  // Load categories
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => logger.error('Failed to load categories', { error: err }));
  }, []);

  // Load template if editing
  useEffect(() => {
    if (isNew) return;

    setLoading(true);
    fetchTemplateDetail(templateId)
      .then(data => {
        setForm({
          name: data.name || '',
          description: data.description || '',
          categoryId: data.category_id || '',
          templateType: data.template_type || 'scene',
          license: data.license || 'free',
          industry: data.industry || '',
          tags: (data.tags || []).join(', '),
          isActive: data.is_active !== false,
          isFeatured: data.is_featured || false,
          thumbnailUrl: data.thumbnail_url || null,
        });
        setSlides(data.slides || []);
      })
      .catch(err => {
        logger.error('Failed to load template', { templateId, error: err });
        setError('Failed to load template');
      })
      .finally(() => setLoading(false));
  }, [templateId, isNew]);

  // Load enterprise access for enterprise templates
  useEffect(() => {
    if (isNew || form.license !== 'enterprise') return;

    fetchEnterpriseAccess(templateId)
      .then(setEnterpriseAccess)
      .catch(err => logger.error('Failed to load enterprise access', { templateId, error: err }));
  }, [templateId, isNew, form.license]);

  // Handle form change
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Template name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Build metadata with SVG info
      const metadata = {};
      if (svgContent) {
        metadata.svgContent = svgContent;
      }
      if (svgUrl) {
        metadata.svgUrl = svgUrl;
      }

      const templateData = {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        templateType: form.templateType,
        license: form.license,
        industry: form.industry || null,
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      let savedTemplateId = templateId;

      if (isNew) {
        const created = await createTemplate(templateData);
        savedTemplateId = created.id;
      } else {
        await updateTemplate(templateId, templateData);
      }

      // If there's an uploaded SVG file, automatically save it as thumbnail
      if (uploadedSvgFile && savedTemplateId) {
        try {
          await uploadTemplateThumbnail(savedTemplateId, uploadedSvgFile);
          logger.info('Thumbnail auto-uploaded successfully', { templateId: result.id });
        } catch (thumbErr) {
          logger.error('Failed to upload thumbnail', { templateId: result.id, error: thumbErr });
          // Don't fail the whole save, just log the error
        }
      }

      if (isNew) {
        onNavigate?.(`admin-template-${savedTemplateId}`);
      }
    } catch (err) {
      logger.error('Failed to save template', { templateId, templateName: form.name, error: err });
      setError(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Handle thumbnail upload
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || isNew) return;

    setUploading(true);
    try {
      await uploadTemplateThumbnail(templateId, file);
      // Reload to get new URL
      const data = await fetchTemplateDetail(templateId);
      setForm(prev => ({ ...prev, thumbnailUrl: data.thumbnail_url }));
    } catch (err) {
      logger.error('Failed to upload thumbnail', { templateId, error: err });
      setError('Failed to upload thumbnail');
    } finally {
      setUploading(false);
    }
  };

  // Handle SVG file upload for auto-tagging
  const handleSvgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setSvgContent(content);
      setSvgUrl(null);
      setUploadedSvgFile(file);

      // Create preview URL from SVG content
      const blob = new Blob([content], { type: 'image/svg+xml' });
      const previewUrl = URL.createObjectURL(blob);
      setSvgPreviewUrl(previewUrl);
    } catch (err) {
      logger.error('Failed to read SVG file', { fileName: file.name, error: err });
      setError('Failed to read SVG file');
    }
  };

  // Handle auto-tagging
  const handleAutoTag = async () => {
    if (!svgContent && !svgUrl) {
      setError('Please upload an SVG file or provide a URL first');
      return;
    }

    setAutoTagging(true);
    setError(null);

    try {
      let result;
      if (svgContent) {
        result = await autoTagSvg(svgContent, { useAI: true, fallbackToRules: true });
      } else if (svgUrl) {
        result = await autoTagSvgFromUrl(svgUrl, { useAI: true, fallbackToRules: true });
      }

      if (result) {
        // Find category ID from name
        const matchedCategory = categories.find(
          cat => cat.name.toLowerCase().replace(/\s+/g, '-') === result.category ||
                 cat.name.toLowerCase() === result.category
        );

        // Update form with auto-generated values
        setForm(prev => ({
          ...prev,
          industry: result.category || prev.industry,
          tags: result.tags.join(', '),
          description: result.description || prev.description,
          categoryId: matchedCategory?.id || prev.categoryId,
        }));

        // Show success message
        setError(null);
      }
    } catch (err) {
      logger.error('Auto-tagging failed', { svgUrl, error: err });
      setError('Auto-tagging failed: ' + (err.message || 'Unknown error'));
    } finally {
      setAutoTagging(false);
    }
  };

  // Slide CRUD
  const handleAddSlide = async () => {
    if (isNew) {
      setError('Save the template first before adding slides');
      return;
    }

    try {
      const slide = await addTemplateSlide(templateId, {
        title: `Slide ${slides.length + 1}`,
        kind: 'default',
        designJson: {},
        durationSeconds: 10,
      });
      setSlides(prev => [...prev, slide]);
    } catch (err) {
      logger.error('Failed to add slide', { templateId, slideTitle: slideForm.title, error: err });
      setError('Failed to add slide');
    }
  };

  const handleEditSlide = (slide) => {
    setEditingSlide(slide);
    setSlideForm({
      title: slide.title || '',
      kind: slide.kind || 'default',
      designJson: JSON.stringify(slide.design_json || {}, null, 2),
      durationSeconds: slide.duration_seconds || 10,
    });
  };

  const handleSaveSlide = async () => {
    if (!editingSlide) return;

    try {
      let designJson;
      try {
        designJson = JSON.parse(slideForm.designJson);
      } catch {
        setError('Invalid JSON in design');
        return;
      }

      await updateTemplateSlide(editingSlide.id, {
        title: slideForm.title,
        kind: slideForm.kind,
        designJson,
        durationSeconds: parseInt(slideForm.durationSeconds, 10) || 10,
      });

      setSlides(prev =>
        prev.map(s =>
          s.id === editingSlide.id
            ? {
                ...s,
                title: slideForm.title,
                kind: slideForm.kind,
                design_json: designJson,
                duration_seconds: parseInt(slideForm.durationSeconds, 10) || 10,
              }
            : s
        )
      );
      setEditingSlide(null);
    } catch (err) {
      logger.error('Failed to update slide', { slideId: editingSlide.id, slideTitle: slideForm.title, error: err });
      setError('Failed to update slide');
    }
  };

  const handleDeleteSlide = async (slideId) => {
    if (!confirm('Delete this slide?')) return;

    try {
      await deleteTemplateSlide(slideId);
      setSlides(prev => prev.filter(s => s.id !== slideId));
    } catch (err) {
      logger.error('Failed to delete slide', { slideId, error: err });
      setError('Failed to delete slide');
    }
  };

  // Enterprise access
  const handleGrantAccess = async () => {
    if (!newTenantId.trim()) return;

    try {
      await grantEnterpriseAccess(templateId, newTenantId.trim());
      setNewTenantId('');
      const access = await fetchEnterpriseAccess(templateId);
      setEnterpriseAccess(access);
    } catch (err) {
      logger.error('Failed to grant enterprise access', { templateId, tenantId: newTenantId, error: err });
      setError('Failed to grant access');
    }
  };

  const handleRevokeAccess = async (tenantId) => {
    try {
      await revokeEnterpriseAccess(templateId, tenantId);
      setEnterpriseAccess(prev => prev.filter(a => a.tenant_id !== tenantId));
    } catch (err) {
      logger.error('Failed to revoke enterprise access', { accessId, error: err });
      setError('Failed to revoke access');
    }
  };

  if (loading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={isNew ? 'New Template' : 'Edit Template'}
      backLink="/admin/templates"
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      }
    >
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          {['details', 'slides', 'access'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-1 py-3 text-sm font-medium border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Template name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Template description"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* License */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License
              </label>
              <select
                value={form.license}
                onChange={(e) => handleChange('license', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {Object.entries(LICENSE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <select
                value={form.industry}
                onChange={(e) => handleChange('industry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">Select industry</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind.value} value={ind.value}>
                    {ind.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={form.templateType}
                onChange={(e) => handleChange('templateType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="scene">Scene</option>
                <option value="slide">Slide</option>
                <option value="block">Block</option>
              </select>
            </div>
          </div>

          {/* AI Auto-Tagging */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="font-medium text-purple-900">AI Auto-Tagging</h4>
            </div>
            <p className="text-sm text-purple-700 mb-3">
              Upload an SVG file to automatically generate tags, category, and description using AI.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="file"
                  accept=".svg"
                  onChange={handleSvgUpload}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                />
              </div>
              <span className="text-sm text-gray-500">or</span>
              <input
                type="text"
                placeholder="SVG URL"
                value={svgUrl || ''}
                onChange={(e) => { setSvgUrl(e.target.value); setSvgContent(null); }}
                className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAutoTag}
                disabled={autoTagging || (!svgContent && !svgUrl)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {autoTagging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Auto-Tag
                  </>
                )}
              </button>
            </div>
            {svgContent && (
              <p className="mt-2 text-xs text-green-600">SVG file loaded and ready for analysis</p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="tag1, tag2, tag3"
            />
            <p className="mt-1 text-xs text-gray-500">Separate with commas</p>
          </div>

          {/* Thumbnail Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thumbnail Preview
            </label>
            {svgPreviewUrl ? (
              <div className="space-y-3">
                <div className="relative w-64 h-40 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={svgPreviewUrl}
                    alt="SVG Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-green-600">
                  ✓ This SVG will be automatically saved as the thumbnail when you click "Save"
                </p>
              </div>
            ) : form.thumbnailUrl ? (
              <div className="w-64 h-40 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <img
                  src={form.thumbnailUrl}
                  alt="Current Thumbnail"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-64 h-40 border border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <p className="text-sm text-gray-400">
                  Upload an SVG above to see preview
                </p>
              </div>
            )}

            {/* Manual thumbnail upload fallback */}
            {!isNew && !svgPreviewUrl && (
              <div className="mt-3">
                <label className="text-xs text-gray-500">Or upload a different image:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={uploading}
                  className="text-sm mt-1"
                />
                {uploading && (
                  <p className="text-xs text-blue-600 mt-1">Uploading...</p>
                )}
              </div>
            )}
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange('isActive', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => handleChange('isFeatured', e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Featured</span>
            </label>
          </div>
        </div>
      )}

      {/* Slides Tab */}
      {activeTab === 'slides' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Slides ({slides.length})</h3>
            <button
              onClick={handleAddSlide}
              disabled={isNew}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
            >
              + Add Slide
            </button>
          </div>

          {isNew ? (
            <div className="p-8 text-center text-gray-500">
              Save the template first to add slides
            </div>
          ) : slides.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No slides yet. Click "Add Slide" to create one.
            </div>
          ) : (
            <div className="divide-y">
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="p-4 flex items-center gap-4 hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-400 w-8">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {slide.title || `Slide ${index + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {slide.kind} · {slide.duration_seconds}s
                    </p>
                  </div>
                  <button
                    onClick={() => handleEditSlide(slide)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteSlide(slide.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Access Tab */}
      {activeTab === 'access' && (
        <div className="bg-white rounded-lg shadow p-6">
          {form.license !== 'enterprise' ? (
            <div className="text-center py-8 text-gray-500">
              <p>Enterprise access control is only available for enterprise-licensed templates.</p>
              <p className="mt-2 text-sm">
                Change the license to "Enterprise" to manage tenant access.
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-medium mb-4">Enterprise Access</h3>
              <p className="text-sm text-gray-600 mb-4">
                Grant specific tenants access to this enterprise template.
              </p>

              {/* Add tenant */}
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newTenantId}
                  onChange={(e) => setNewTenantId(e.target.value)}
                  placeholder="Tenant UUID"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleGrantAccess}
                  disabled={!newTenantId.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Grant Access
                </button>
              </div>

              {/* Access list */}
              {enterpriseAccess.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No tenants have access to this template yet.
                </p>
              ) : (
                <div className="divide-y border rounded-lg">
                  {enterpriseAccess.map((access) => (
                    <div
                      key={access.tenant_id}
                      className="p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {access.tenant?.business_name || access.tenant?.email || access.tenant_id}
                        </p>
                        <p className="text-xs text-gray-500">
                          Granted {new Date(access.granted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeAccess(access.tenant_id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Slide Edit Modal */}
      {editingSlide && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setEditingSlide(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
              <div className="px-6 py-4 border-b">
                <h3 className="font-semibold">Edit Slide</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={slideForm.title}
                    onChange={(e) =>
                      setSlideForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kind
                    </label>
                    <input
                      type="text"
                      value={slideForm.kind}
                      onChange={(e) =>
                        setSlideForm((p) => ({ ...p, kind: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={slideForm.durationSeconds}
                      onChange={(e) =>
                        setSlideForm((p) => ({
                          ...p,
                          durationSeconds: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Design JSON
                  </label>
                  <textarea
                    value={slideForm.designJson}
                    onChange={(e) =>
                      setSlideForm((p) => ({
                        ...p,
                        designJson: e.target.value,
                      }))
                    }
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setEditingSlide(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSlide}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Save Slide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
