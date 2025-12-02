/**
 * FeatureFlagsPage - Admin UI for Feature Flags, Experiments, and Feedback
 *
 * Allows super_admin users to:
 * - Manage feature flags (create, edit, enable/disable)
 * - Create and manage A/B experiments
 * - View and respond to user feedback
 * - Create and manage in-app announcements
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  PageLayout,
  PageHeader,
  PageContent,
} from '../design-system/components/PageLayout';
import { Card, CardHeader, CardContent } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Alert } from '../design-system/components/Alert';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
} from '../design-system/components/Modal';
import {
  Flag,
  FlaskConical,
  MessageSquare,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Users,
  Building2,
  Percent,
  Globe,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Loader2,
} from 'lucide-react';
import {
  getAllFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  FeatureFlags,
} from '../services/featureFlagService';
import {
  getAllExperiments,
  createExperiment,
  updateExperimentStatus,
  deleteExperiment,
} from '../services/experimentService';
import {
  getAllFeedback,
  updateFeedbackStatus,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../services/feedbackService';

const tabs = [
  { id: 'flags', label: 'Feature Flags', icon: Flag },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
];

export default function FeatureFlagsPage() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('flags');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [flags, setFlags] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal states
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showExperimentModal, setShowExperimentModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Load data on tab change
  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab) => {
    setLoading(true);
    setError('');

    try {
      switch (tab) {
        case 'flags':
          const flagsData = await getAllFeatureFlags();
          setFlags(flagsData);
          break;
        case 'experiments':
          const experimentsData = await getAllExperiments();
          setExperiments(experimentsData);
          break;
        case 'feedback':
          const feedbackData = await getAllFeedback({ limit: 100 });
          setFeedback(feedbackData);
          break;
        case 'announcements':
          const announcementsData = await getAllAnnouncements();
          setAnnouncements(announcementsData);
          break;
      }
    } catch (err) {
      console.error(`Error loading ${tab} data:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => loadTabData(activeTab);

  // Check if user is super_admin
  if (userProfile?.role !== 'super_admin') {
    return (
      <PageLayout>
        <PageHeader title="Feature Flags" />
        <PageContent>
          <Alert variant="error" title="Access Denied">
            You do not have permission to access this page.
          </Alert>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout maxWidth="wide">
      <PageHeader
        title="Feature Flags & Experiments"
        description="Control feature rollouts, A/B tests, and in-app communications"
      />
      <PageContent>
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
                  transition-all duration-100
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError('')} className="mb-4">
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'flags' && (
              <FeatureFlagsTab
                flags={flags}
                onRefresh={handleRefresh}
                onEdit={(flag) => {
                  setEditingItem(flag);
                  setShowFlagModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowFlagModal(true);
                }}
              />
            )}
            {activeTab === 'experiments' && (
              <ExperimentsTab
                experiments={experiments}
                onRefresh={handleRefresh}
                onEdit={(exp) => {
                  setEditingItem(exp);
                  setShowExperimentModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowExperimentModal(true);
                }}
              />
            )}
            {activeTab === 'feedback' && (
              <FeedbackTab
                feedback={feedback}
                onRefresh={handleRefresh}
              />
            )}
            {activeTab === 'announcements' && (
              <AnnouncementsTab
                announcements={announcements}
                onRefresh={handleRefresh}
                onEdit={(ann) => {
                  setEditingItem(ann);
                  setShowAnnouncementModal(true);
                }}
                onAdd={() => {
                  setEditingItem(null);
                  setShowAnnouncementModal(true);
                }}
              />
            )}
          </>
        )}

        {/* Feature Flag Modal */}
        <FlagModal
          open={showFlagModal}
          onClose={() => setShowFlagModal(false)}
          flag={editingItem}
          onSave={handleRefresh}
        />

        {/* Experiment Modal */}
        <ExperimentModal
          open={showExperimentModal}
          onClose={() => setShowExperimentModal(false)}
          experiment={editingItem}
          onSave={handleRefresh}
        />

        {/* Announcement Modal */}
        <AnnouncementModal
          open={showAnnouncementModal}
          onClose={() => setShowAnnouncementModal(false)}
          announcement={editingItem}
          onSave={handleRefresh}
        />
      </PageContent>
    </PageLayout>
  );
}

// ============================================
// Feature Flags Tab
// ============================================

function FeatureFlagsTab({ flags, onRefresh, onEdit, onAdd }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const categories = [...new Set(flags.map(f => f.category))];

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          flag.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || flag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggle = async (flag) => {
    try {
      await updateFeatureFlag(flag.id, { defaultEnabled: !flag.default_enabled });
      onRefresh();
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const handleDelete = async (flag) => {
    if (!confirm(`Delete feature flag "${flag.name}"?`)) return;
    try {
      await deleteFeatureFlag(flag.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting flag:', error);
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case 'global': return Globe;
      case 'by_plan': return Users;
      case 'by_tenant': return Building2;
      case 'percentage': return Percent;
      default: return Globe;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flags..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Flag
        </Button>
      </div>

      {/* Flags list */}
      <div className="grid gap-3">
        {filteredFlags.map((flag) => {
          const StrategyIcon = getStrategyIcon(flag.rollout_strategy);
          return (
            <Card key={flag.id}>
              <div className="p-4 flex items-center gap-4">
                {/* Toggle */}
                <button
                  onClick={() => handleToggle(flag)}
                  className={`
                    p-1 rounded transition-colors
                    ${flag.default_enabled ? 'text-green-600' : 'text-gray-400'}
                  `}
                >
                  {flag.default_enabled ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{flag.name}</h3>
                    <code className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {flag.key}
                    </code>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{flag.description}</p>
                </div>

                {/* Strategy badge */}
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  <StrategyIcon className="w-3 h-3" />
                  {flag.rollout_strategy}
                  {flag.rollout_strategy === 'percentage' && ` (${flag.rollout_percentage}%)`}
                </div>

                {/* Plans */}
                {flag.allowed_plans?.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {flag.allowed_plans.join(', ')}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(flag)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(flag)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredFlags.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No feature flags found
        </div>
      )}
    </div>
  );
}

// ============================================
// Experiments Tab
// ============================================

function ExperimentsTab({ experiments, onRefresh, onEdit, onAdd }) {
  const handleStatusChange = async (exp, newStatus) => {
    try {
      await updateExperimentStatus(exp.id, newStatus);
      onRefresh();
    } catch (error) {
      console.error('Error updating experiment:', error);
    }
  };

  const handleDelete = async (exp) => {
    if (!confirm(`Delete experiment "${exp.name}"?`)) return;
    try {
      await deleteExperiment(exp.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting experiment:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          New Experiment
        </Button>
      </div>

      <div className="grid gap-4">
        {experiments.map((exp) => (
          <Card key={exp.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{exp.name}</h3>
                  <code className="text-xs text-gray-500">{exp.key}</code>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(exp.status)}`}>
                  {exp.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{exp.description}</p>

              {/* Variants */}
              {exp.experiment_variants?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Variants</h4>
                  <div className="flex gap-2 flex-wrap">
                    {exp.experiment_variants.map((v) => (
                      <div
                        key={v.id}
                        className="text-xs px-3 py-1 bg-gray-100 rounded-full"
                      >
                        {v.name} ({v.weight}%)
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                {exp.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange(exp, 'running')}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </Button>
                )}
                {exp.status === 'running' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(exp, 'paused')}
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(exp, 'completed')}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      End
                    </Button>
                  </>
                )}
                {exp.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleStatusChange(exp, 'running')}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Resume
                  </Button>
                )}
                <div className="flex-1" />
                <button
                  onClick={() => onEdit(exp)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(exp)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {experiments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No experiments created yet
        </div>
      )}
    </div>
  );
}

// ============================================
// Feedback Tab
// ============================================

function FeedbackTab({ feedback, onRefresh }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredFeedback = feedback.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const handleStatusChange = async (item, newStatus) => {
    try {
      await updateFeedbackStatus(item.id, newStatus);
      onRefresh();
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-700';
      case 'feature_request': return 'bg-purple-100 text-purple-700';
      case 'praise': return 'bg-green-100 text-green-700';
      case 'complaint': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'new': return Clock;
      case 'reviewed': return CheckCircle;
      case 'in_progress': return Play;
      case 'resolved': return CheckCircle;
      case 'wont_fix': return AlertCircle;
      default: return Clock;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All Types</option>
          <option value="bug">Bugs</option>
          <option value="feature_request">Feature Requests</option>
          <option value="general">General</option>
          <option value="praise">Praise</option>
          <option value="complaint">Complaints</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="wont_fix">Won't Fix</option>
        </select>
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {filteredFeedback.map((item) => {
          const StatusIcon = getStatusIcon(item.status);
          return (
            <Card key={item.id}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(item.type)}`}>
                      {item.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon className="w-4 h-4 text-gray-400" />
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't Fix</option>
                    </select>
                  </div>
                </div>

                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.message}</p>

                {item.profiles && (
                  <div className="mt-3 text-xs text-gray-500">
                    From: {item.profiles.email || item.profiles.full_name || 'Anonymous'}
                  </div>
                )}

                {item.context && Object.keys(item.context).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-gray-400 cursor-pointer">
                      Context details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(item.context, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filteredFeedback.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No feedback found
        </div>
      )}
    </div>
  );
}

// ============================================
// Announcements Tab
// ============================================

function AnnouncementsTab({ announcements, onRefresh, onEdit, onAdd }) {
  const handleToggleActive = async (ann) => {
    try {
      await updateAnnouncement(ann.id, { active: !ann.active });
      onRefresh();
    } catch (error) {
      console.error('Error toggling announcement:', error);
    }
  };

  const handleDelete = async (ann) => {
    if (!confirm(`Delete announcement "${ann.title}"?`)) return;
    try {
      await deleteAnnouncement(ann.id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-700';
      case 'success': return 'bg-green-100 text-green-700';
      case 'warning': return 'bg-amber-100 text-amber-700';
      case 'feature': return 'bg-purple-100 text-purple-700';
      case 'maintenance': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      <div className="grid gap-3">
        {announcements.map((ann) => (
          <Card key={ann.id}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{ann.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded ${getTypeColor(ann.type)}`}>
                      {ann.type}
                    </span>
                    {ann.priority && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        Priority
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{ann.message}</p>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>Audience: {ann.target_audience}</span>
                    {ann.start_date && <span>Starts: {new Date(ann.start_date).toLocaleDateString()}</span>}
                    {ann.end_date && <span>Ends: {new Date(ann.end_date).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(ann)}
                    className={`p-1 rounded ${ann.active ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    {ann.active ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(ann)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ann)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No announcements created yet
        </div>
      )}
    </div>
  );
}

// ============================================
// Modals
// ============================================

function FlagModal({ open, onClose, flag, onSave }) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    defaultEnabled: false,
    rolloutStrategy: 'global',
    rolloutPercentage: 100,
    allowedPlans: [],
    category: 'feature',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (flag) {
      setFormData({
        key: flag.key,
        name: flag.name,
        description: flag.description || '',
        defaultEnabled: flag.default_enabled,
        rolloutStrategy: flag.rollout_strategy,
        rolloutPercentage: flag.rollout_percentage || 100,
        allowedPlans: flag.allowed_plans || [],
        category: flag.category || 'feature',
      });
    } else {
      setFormData({
        key: '',
        name: '',
        description: '',
        defaultEnabled: false,
        rolloutStrategy: 'global',
        rolloutPercentage: 100,
        allowedPlans: [],
        category: 'feature',
      });
    }
  }, [flag, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (flag) {
        await updateFeatureFlag(flag.id, formData);
      } else {
        await createFeatureFlag(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving flag:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>{flag ? 'Edit Feature Flag' : 'Create Feature Flag'}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="feature.my_feature"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
                disabled={!!flag}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Feature"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rollout Strategy</label>
              <select
                value={formData.rolloutStrategy}
                onChange={(e) => setFormData({ ...formData, rolloutStrategy: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="global">Global</option>
                <option value="by_plan">By Plan</option>
                <option value="by_tenant">By Tenant</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>
            {formData.rolloutStrategy === 'percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rollout Percentage ({formData.rolloutPercentage}%)
                </label>
                <input
                  type="range"
                  value={formData.rolloutPercentage}
                  onChange={(e) => setFormData({ ...formData, rolloutPercentage: Number(e.target.value) })}
                  min={0}
                  max={100}
                  className="w-full"
                />
              </div>
            )}
            {formData.rolloutStrategy === 'by_plan' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Plans</label>
                <div className="flex gap-2">
                  {['free', 'starter', 'pro', 'enterprise'].map((plan) => (
                    <label key={plan} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={formData.allowedPlans.includes(plan)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, allowedPlans: [...formData.allowedPlans, plan] });
                          } else {
                            setFormData({ ...formData, allowedPlans: formData.allowedPlans.filter(p => p !== plan) });
                          }
                        }}
                      />
                      <span className="text-sm">{plan}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="defaultEnabled"
                checked={formData.defaultEnabled}
                onChange={(e) => setFormData({ ...formData, defaultEnabled: e.target.checked })}
              />
              <label htmlFor="defaultEnabled" className="text-sm font-medium text-gray-700">
                Enabled by default
              </label>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>
            {flag ? 'Save Changes' : 'Create Flag'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ExperimentModal({ open, onClose, experiment, onSave }) {
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    status: 'draft',
    variants: [
      { key: 'control', name: 'Control', weight: 50 },
      { key: 'variant_a', name: 'Variant A', weight: 50 },
    ],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (experiment) {
      setFormData({
        key: experiment.key,
        name: experiment.name,
        description: experiment.description || '',
        status: experiment.status,
        variants: experiment.experiment_variants || [
          { key: 'control', name: 'Control', weight: 50 },
          { key: 'variant_a', name: 'Variant A', weight: 50 },
        ],
      });
    } else {
      setFormData({
        key: '',
        name: '',
        description: '',
        status: 'draft',
        variants: [
          { key: 'control', name: 'Control', weight: 50 },
          { key: 'variant_a', name: 'Variant A', weight: 50 },
        ],
      });
    }
  }, [experiment, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (experiment) {
        // Update not fully implemented - would need additional service function
        console.log('Update experiment:', formData);
      } else {
        await createExperiment(formData, formData.variants);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving experiment:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>{experiment ? 'Edit Experiment' : 'Create Experiment'}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="my_experiment"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
                disabled={!!experiment}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Experiment"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Variants</label>
              <div className="space-y-2">
                {formData.variants.map((variant, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...formData.variants];
                        newVariants[idx].name = e.target.value;
                        setFormData({ ...formData, variants: newVariants });
                      }}
                      placeholder="Variant name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={variant.weight}
                      onChange={(e) => {
                        const newVariants = [...formData.variants];
                        newVariants[idx].weight = Number(e.target.value);
                        setFormData({ ...formData, variants: newVariants });
                      }}
                      min={0}
                      max={100}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>
            {experiment ? 'Save Changes' : 'Create Experiment'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function AnnouncementModal({ open, onClose, announcement, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    ctaText: '',
    ctaUrl: '',
    targetAudience: 'all',
    targetPlans: [],
    priority: false,
    dismissible: true,
    active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title,
        message: announcement.message,
        type: announcement.type,
        ctaText: announcement.cta_text || '',
        ctaUrl: announcement.cta_url || '',
        targetAudience: announcement.target_audience,
        targetPlans: announcement.target_plans || [],
        priority: announcement.priority,
        dismissible: announcement.dismissible,
        active: announcement.active,
      });
    } else {
      setFormData({
        title: '',
        message: '',
        type: 'info',
        ctaText: '',
        ctaUrl: '',
        targetAudience: 'all',
        targetPlans: [],
        priority: false,
        dismissible: true,
        active: true,
      });
    }
  }, [announcement, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (announcement) {
        await updateAnnouncement(announcement.id, formData);
      } else {
        await createAnnouncement(formData);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving announcement:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>{announcement ? 'Edit Announcement' : 'Create Announcement'}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Announcement title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="feature">New Feature</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Everyone</option>
                  <option value="by_plan">By Plan</option>
                  <option value="specific_tenants">Specific Tenants</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Text</label>
                <input
                  type="text"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="Learn more"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA URL</label>
                <input
                  type="text"
                  value={formData.ctaUrl}
                  onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                  placeholder="/features or https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.checked })}
                />
                <span className="text-sm">Priority (show as banner)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.dismissible}
                  onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                />
                <span className="text-sm">Dismissible</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>
            {announcement ? 'Save Changes' : 'Create Announcement'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
