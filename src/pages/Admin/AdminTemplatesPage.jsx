/**
 * Admin Templates Page
 *
 * Super admin page for managing marketplace templates.
 * Allows creating, editing, and managing template visibility.
 */

import { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../design-system/components/PageLayout';
import {
  fetchAdminTemplates,
  fetchCategories,
  deleteTemplate,
  updateTemplate,
  LICENSE_LABELS,
} from '../../services/marketplaceService';
import BulkTemplateUpload from '../../components/Admin/BulkTemplateUpload';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function AdminTemplatesPage({ onNavigate }) {

  // State
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [licenseFilter, setLicenseFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk upload modal
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Load categories
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(err => console.error('Failed to load categories:', err));
  }, []);

  // Load templates
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminTemplates({
        categoryId: categoryFilter || undefined,
        license: licenseFilter || undefined,
        isActive: activeFilter === '' ? undefined : activeFilter === 'true',
      });
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, licenseFilter, activeFilter]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Toggle template active status
  const handleToggleActive = async (template) => {
    try {
      await updateTemplate(template.id, { isActive: !template.is_active });
      loadTemplates();
    } catch (err) {
      console.error('Failed to update template:', err);
      setError('Failed to update template');
    }
  };

  // Toggle featured status
  const handleToggleFeatured = async (template) => {
    try {
      await updateTemplate(template.id, { isFeatured: !template.is_featured });
      loadTemplates();
    } catch (err) {
      console.error('Failed to update template:', err);
      setError('Failed to update template');
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!deleteId) return;

    setDeleting(true);
    try {
      await deleteTemplate(deleteId);
      setDeleteId(null);
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      setError('Failed to delete template');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout
      title="Template Management"
      description="Manage marketplace templates"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-lg hover:bg-purple-200 flex items-center gap-2"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Bulk Upload
          </button>
          <button
            onClick={() => onNavigate?.('admin-template-new')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Template
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Category Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* License Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              License
            </label>
            <select
              value={licenseFilter}
              onChange={(e) => setLicenseFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Licenses</option>
              {Object.entries(LICENSE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Status
            </label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end ml-auto">
            <span className="text-sm text-gray-500">
              {templates.length} template{templates.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No templates found</p>
            <button
              onClick={() => onNavigate?.('admin-template-new')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Create your first template
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Template
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  License
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Slides
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Installs
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  {/* Template */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                        {template.thumbnail_url ? (
                          <img
                            src={template.thumbnail_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {template.name}
                        </p>
                        {template.is_featured && (
                          <span className="text-xs text-yellow-600">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {template.category?.name || '-'}
                  </td>

                  {/* License */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        LICENSE_COLORS[template.license] || LICENSE_COLORS.free
                      }`}
                    >
                      {LICENSE_LABELS[template.license] || 'Free'}
                    </span>
                  </td>

                  {/* Slides */}
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {template.slideCount || 0}
                  </td>

                  {/* Installs */}
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {template.install_count || 0}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(template)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        template.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          template.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {template.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle Featured */}
                      <button
                        onClick={() => handleToggleFeatured(template)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${
                          template.is_featured
                            ? 'text-yellow-500'
                            : 'text-gray-400'
                        }`}
                        title={
                          template.is_featured
                            ? 'Remove from featured'
                            : 'Mark as featured'
                        }
                      >
                        <svg
                          className="w-4 h-4"
                          fill={template.is_featured ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() =>
                          onNavigate?.(`admin-template-${template.id}`)
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="Edit template"
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

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteId(template.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        title="Delete template"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Template?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                This action cannot be undone. The template will be permanently
                removed from the marketplace.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowBulkUpload(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-4xl">
              <BulkTemplateUpload
                onComplete={() => {
                  setShowBulkUpload(false);
                  loadTemplates();
                }}
                onCancel={() => setShowBulkUpload(false)}
              />
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
