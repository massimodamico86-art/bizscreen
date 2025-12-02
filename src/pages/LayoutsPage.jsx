import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Grid3X3,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  X,
  Layers,
  AlertTriangle,
  Zap,
  CheckCircle,
  LayoutTemplate,
  Sparkles,
  FileText,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { fetchLayouts, createLayout, deleteLayout, duplicateLayout, getLayoutUsage, deleteLayoutSafely } from '../services/layoutService';
import { formatDate } from '../utils/formatters';
import { getEffectiveLimits, hasReachedLimit, formatLimitDisplay } from '../services/limitsService';
import { getLayoutTemplates, applyTemplate } from '../services/templateService';
import { Button, Card, Badge, EmptyState, Alert } from '../design-system';
import { useTranslation } from '../i18n';

const LayoutsPage = ({ showToast, onNavigate }) => {
  const { t } = useTranslation();
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newLayout, setNewLayout] = useState({
    name: '',
    description: ''
  });

  // Plan limits state
  const [limits, setLimits] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Template picker state
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name, usage, loading }
  const [deletingForce, setDeletingForce] = useState(false);

  useEffect(() => {
    loadLayouts();
    loadLimits();
  }, []);

  const loadLimits = async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const data = await fetchLayouts();
      setLayouts(data);
    } catch (error) {
      console.error('Error fetching layouts:', error);
      showToast?.('Error loading layouts: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLayouts = layouts.filter(layout =>
    layout.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if limit is reached
  const limitReached = limits ? hasReachedLimit(limits.maxLayouts, layouts.length) : false;

  // Handle add layout with limit check
  const handleAddLayout = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowChoiceModal(true);
    }
  };

  // Load layout templates
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const data = await getLayoutTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      showToast?.('Error loading templates', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Show template picker
  const handleShowTemplatePicker = () => {
    setShowChoiceModal(false);
    setShowTemplatePicker(true);
    loadTemplates();
  };

  // Create blank layout
  const handleCreateBlank = () => {
    setShowChoiceModal(false);
    setShowCreateModal(true);
  };

  // Apply template
  const handleApplyTemplate = async (template) => {
    try {
      setApplyingTemplate(template.slug);
      const result = await applyTemplate(template.slug);

      if (result.layouts && result.layouts.length > 0) {
        showToast?.('Layout created from template!', 'success');
        setShowTemplatePicker(false);
        loadLayouts();
        // Navigate to the created layout
        if (onNavigate && result.layouts[0]?.id) {
          onNavigate(`layout-editor-${result.layouts[0].id}`);
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      showToast?.(error.message || 'Error applying template', 'error');
    } finally {
      setApplyingTemplate(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newLayout.name.trim()) {
      showToast?.('Please enter a layout name', 'error');
      return;
    }

    try {
      setCreating(true);
      const data = await createLayout({
        name: newLayout.name.trim(),
        description: newLayout.description.trim() || null
      });

      setLayouts(prev => [{ ...data, zone_count: 0 }, ...prev]);
      setShowCreateModal(false);
      setNewLayout({ name: '', description: '' });
      showToast?.('Layout created successfully');

      // Navigate to the editor
      if (onNavigate) {
        onNavigate(`layout-editor-${data.id}`);
      }
    } catch (error) {
      console.error('Error creating layout:', error);
      showToast?.('Error creating layout: ' + error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (layout) => {
    try {
      const newData = await duplicateLayout(layout.id);
      setLayouts(prev => [{ ...newData, zone_count: newData.layout_zones?.length || 0 }, ...prev]);
      showToast?.('Layout duplicated successfully');
    } catch (error) {
      console.error('Error duplicating layout:', error);
      showToast?.('Error duplicating layout: ' + error.message, 'error');
    }
  };

  // Initiate delete - checks for usage first
  const handleDelete = async (layout) => {
    setDeleteConfirm({ id: layout.id, name: layout.name, usage: null, loading: true });
    setActionMenuId(null);

    try {
      const usage = await getLayoutUsage(layout.id);
      setDeleteConfirm({ id: layout.id, name: layout.name, usage, loading: false });
    } catch (error) {
      console.error('Error checking usage:', error);
      setDeleteConfirm({ id: layout.id, name: layout.name, usage: null, loading: false });
    }
  };

  // Confirm delete (optionally with force)
  const confirmDelete = async (force = false) => {
    if (!deleteConfirm) return;

    setDeletingForce(true);
    try {
      const result = await deleteLayoutSafely(deleteConfirm.id, { force });

      if (result.success) {
        setLayouts(prev => prev.filter(l => l.id !== deleteConfirm.id));
        showToast?.('Layout deleted successfully');
        setDeleteConfirm(null);
      } else if (result.code === 'IN_USE' && !force) {
        setDeleteConfirm(prev => ({ ...prev, usage: result.usage }));
      } else {
        showToast?.(result.error || 'Error deleting layout', 'error');
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      showToast?.('Error deleting layout: ' + error.message, 'error');
    } finally {
      setDeletingForce(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Layouts</h1>
          <p className="text-gray-500 mt-1">
            {layouts.length} layout{layouts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleAddLayout}>
          <Plus size={18} />
          Add Layout
        </Button>
      </div>

      {/* Limit Warning Banner */}
      {limitReached && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-800 font-medium">Layout limit reached</p>
            <p className="text-yellow-700 text-sm mt-1">
              You've reached the maximum of {limits?.maxLayouts} layout{limits?.maxLayouts !== 1 ? 's' : ''} for your {limits?.planName} plan.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowLimitModal(true)} className="shrink-0">
            <Zap size={16} />
            Upgrade
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search layouts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : layouts.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-lg flex items-center justify-center">
            <Grid3X3 size={32} className="text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Layouts Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Layouts let you divide your screen into multiple zones, each displaying different content simultaneously. Perfect for dashboards, info boards, and more.
          </p>
          <Button onClick={handleAddLayout}>
            <Plus size={18} />
            Add Layout
          </Button>
        </Card>
      ) : (
        /* Layouts List */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="p-4 w-8">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="p-4 font-medium">NAME</th>
                  <th className="p-4 font-medium">ZONES</th>
                  <th className="p-4 font-medium">DESCRIPTION</th>
                  <th className="p-4 font-medium">MODIFIED</th>
                  <th className="p-4 font-medium w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredLayouts.map(layout => (
                  <tr
                    key={layout.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onNavigate?.(`layout-editor-${layout.id}`)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Grid3X3 size={20} className="text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900">{layout.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Layers size={14} />
                        {layout.zone_count || 0} zone{layout.zone_count !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      <span className="truncate max-w-xs block">
                        {layout.description || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {formatDate(layout.updated_at)}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === layout.id ? null : layout.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        {actionMenuId === layout.id && (
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                onNavigate?.(`layout-editor-${layout.id}`);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                handleDuplicate(layout);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleDelete(layout)}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Footer Actions */}
      <div className="flex items-center gap-4 pt-4">
        <Button onClick={handleAddLayout}>
          <Plus size={18} />
          Add Layout
        </Button>
        <Button variant="outline">
          Actions
        </Button>
      </div>

      {/* Create Layout Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Layout</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newLayout.name}
                    onChange={(e) => setNewLayout(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter layout name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newLayout.description}
                    onChange={(e) => setNewLayout(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Layout'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Layout Limit Reached</h3>
              <p className="text-gray-600 mb-6">
                You've used {formatLimitDisplay(limits?.maxLayouts, layouts.length)} layouts on your {limits?.planName} plan.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Upgrade to get:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4 text-purple-500" />
                    More layouts for your screens
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Higher limits for all resources
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowLimitModal(false)} className="flex-1">
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    setShowLimitModal(false);
                    window.location.hash = '#account-plan';
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Zap size={16} />
                  View Plans
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Choice Modal - Blank or Template */}
      {showChoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">New Layout</h2>
                <button
                  onClick={() => setShowChoiceModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                How would you like to create your layout?
              </p>

              <div className="space-y-3">
                {/* Blank Layout Option */}
                <button
                  onClick={handleCreateBlank}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                    <FileText size={24} className="text-gray-400 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Blank Layout</h3>
                    <p className="text-sm text-gray-500">Start fresh and add zones manually</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600" />
                </button>

                {/* Template Option */}
                <button
                  onClick={handleShowTemplatePicker}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <LayoutTemplate size={24} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      Start from Template
                      <Badge variant="purple">Recommended</Badge>
                    </h3>
                    <p className="text-sm text-gray-500">Use a pre-configured zone layout</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 group-hover:text-purple-600" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-6">
              {deleteConfirm.loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Checking where this layout is used...</p>
                </div>
              ) : deleteConfirm.usage?.is_in_use ? (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Layout In Use</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        <strong>"{deleteConfirm.name}"</strong> is currently being used:
                      </p>
                    </div>
                  </div>

                  {/* Usage Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                    {deleteConfirm.usage?.screens?.count > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Screens</span>
                        <span className="font-medium text-gray-900">
                          {deleteConfirm.usage.screens.count} screen{deleteConfirm.usage.screens.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {deleteConfirm.usage?.schedules?.count > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Schedules</span>
                        <span className="font-medium text-gray-900">
                          {deleteConfirm.usage.schedules.count} schedule{deleteConfirm.usage.schedules.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {deleteConfirm.usage?.campaigns?.count > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Campaigns</span>
                        <span className="font-medium text-gray-900">
                          {deleteConfirm.usage.campaigns.count} campaign{deleteConfirm.usage.campaigns.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg mb-4">
                    Deleting this layout will remove it from all screens, schedules, and campaigns where it's used.
                  </p>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1"
                      disabled={deletingForce}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmDelete(true)}
                      className="flex-1"
                      disabled={deletingForce}
                    >
                      {deletingForce ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Delete Anyway
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-full">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Delete Layout?</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>?
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1"
                      disabled={deletingForce}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirmDelete(false)}
                      className="flex-1"
                      disabled={deletingForce}
                    >
                      {deletingForce ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={16} />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <LayoutTemplate size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Choose a Layout Template</h2>
                  <p className="text-sm text-gray-500">Select a multi-zone layout to get started</p>
                </div>
              </div>
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {templatesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <LayoutTemplate size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No layout templates available</p>
                  <Button
                    variant="outline"
                    onClick={handleCreateBlank}
                    className="mt-4"
                  >
                    Create Blank Layout
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Template thumbnail */}
                      <div className="h-32 bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Grid3X3 size={40} className="text-purple-300" />
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{template.title}</h3>
                            <p className="text-xs text-gray-500">{template.category}</p>
                          </div>
                          {template.meta?.zones && (
                            <Badge variant="gray">{template.meta.zones} zones</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {template.description}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleApplyTemplate(template)}
                          disabled={applyingTemplate === template.slug}
                          className="w-full"
                        >
                          {applyingTemplate === template.slug ? (
                            <>
                              <Loader2 size={14} className="animate-spin mr-1" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} className="mr-1" />
                              Use Template
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
              <div className="flex justify-between items-center">
                <button
                  onClick={handleCreateBlank}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  or create a blank layout
                </button>
                <Button variant="outline" onClick={() => setShowTemplatePicker(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LayoutsPage;
