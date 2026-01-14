import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Calendar,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
  Clock,
  Play,
  Pause,
  X,
  AlertTriangle,
  AlertCircle,
  Zap,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import {
  fetchSchedules,
  createSchedule,
  deleteSchedule,
  duplicateSchedule
} from '../services/scheduleService';
import { supabase } from '../supabase';
import { formatDate } from '../utils/formatters';
import { getEffectiveLimits, hasReachedLimit, formatLimitDisplay } from '../services/limitsService';
import { Button, Card, Badge, EmptyState, Alert } from '../design-system';
import { useTranslation } from '../i18n';
import YodeckEmptyState from '../components/YodeckEmptyState';

const SchedulesPage = ({ showToast, onNavigate }) => {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    description: ''
  });

  // Plan limits state
  const [limits, setLimits] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    loadSchedules();
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

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSchedules();
      setSchedules(data);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const filteredSchedules = schedules.filter(schedule =>
    schedule.name.toLowerCase().includes(search.toLowerCase())
  );

  // Check if limit is reached
  const limitReached = limits ? hasReachedLimit(limits.maxSchedules, schedules.length) : false;

  // Handle add schedule with limit check
  const handleAddSchedule = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newSchedule.name.trim()) {
      showToast?.('Please enter a schedule name', 'error');
      return;
    }

    try {
      setCreating(true);
      const data = await createSchedule({
        name: newSchedule.name.trim(),
        description: newSchedule.description.trim() || null
      });

      setSchedules(prev => [{ ...data, entry_count: 0 }, ...prev]);
      setShowCreateModal(false);
      setNewSchedule({ name: '', description: '' });
      showToast?.('Schedule created successfully');

      // Navigate to the editor
      if (onNavigate) {
        onNavigate(`schedule-editor-${data.id}`);
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      showToast?.('Error creating schedule: ' + error.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      showToast?.('Schedule deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showToast?.('Error deleting schedule: ' + error.message, 'error');
    }
  };

  const handleDuplicate = async (schedule) => {
    try {
      const newData = await duplicateSchedule(schedule.id);
      setSchedules(prev => [{ ...newData, entry_count: newData.schedule_entries?.length || 0 }, ...prev]);
      showToast?.('Schedule duplicated successfully');
    } catch (error) {
      console.error('Error duplicating schedule:', error);
      showToast?.('Error duplicating schedule: ' + error.message, 'error');
    }
  };

  const toggleActive = async (schedule) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ is_active: !schedule.is_active })
        .eq('id', schedule.id);

      if (error) throw error;

      setSchedules(prev =>
        prev.map(s => s.id === schedule.id ? { ...s, is_active: !s.is_active } : s)
      );
      showToast?.(schedule.is_active ? 'Schedule paused' : 'Schedule activated');
    } catch (error) {
      console.error('Error updating schedule:', error);
      showToast?.('Error updating schedule: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-500 mt-1">
            {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleAddSchedule}>
          <Plus size={18} />
          Add Schedule
        </Button>
      </div>

      {/* Limit Warning Banner */}
      {limitReached && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-yellow-800 font-medium">Schedule limit reached</p>
            <p className="text-yellow-700 text-sm mt-1">
              You've reached the maximum of {limits?.maxSchedules} schedule{limits?.maxSchedules !== 1 ? 's' : ''} for your {limits?.planName} plan.
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
            placeholder="Search schedules..."
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
      ) : error ? (
        <Card className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load schedules</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadSchedules} variant="outline">
              <RefreshCw size={16} />
              Try Again
            </Button>
          </div>
        </Card>
      ) : schedules.length === 0 ? (
        /* Empty State */
        <Card className="p-6">
          <YodeckEmptyState
            type="schedules"
            title="No Schedules Yet"
            description="Schedules let you automate when different content plays on your screens. Set up time-based rules to show the right content at the right time."
            actionLabel="Create Schedule"
            onAction={handleAddSchedule}
            showTourLink={true}
            tourLinkText="Learn about scheduling →"
            onTourClick={() => window.open('https://docs.bizscreen.io/schedules', '_blank')}
          />
        </Card>
      ) : (
        /* Schedules List */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                  <th className="p-4 w-8">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="p-4 font-medium">NAME</th>
                  <th className="p-4 font-medium">STATUS</th>
                  <th className="p-4 font-medium">ENTRIES</th>
                  <th className="p-4 font-medium">MODIFIED</th>
                  <th className="p-4 font-medium w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(schedule => (
                  <tr
                    key={schedule.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => onNavigate?.(`schedule-editor-${schedule.id}`)}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          schedule.is_active ? 'bg-teal-100' : 'bg-gray-100'
                        }`}>
                          <Calendar size={20} className={
                            schedule.is_active ? 'text-teal-600' : 'text-gray-400'
                          } />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{schedule.name}</span>
                          {schedule.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {schedule.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleActive(schedule)}
                        className="inline-block"
                      >
                        <Badge variant={schedule.is_active ? 'success' : 'default'}>
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Clock size={14} />
                        <span>{schedule.entry_count || 0} entries</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 text-sm">
                      {formatDate(schedule.updated_at)}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuId(actionMenuId === schedule.id ? null : schedule.id)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical size={18} className="text-gray-400" />
                        </button>
                        {actionMenuId === schedule.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                onNavigate?.(`schedule-editor-${schedule.id}`);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit size={14} />
                              Edit schedule
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                toggleActive(schedule);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              {schedule.is_active ? (
                                <>
                                  <Pause size={14} />
                                  Pause schedule
                                </>
                              ) : (
                                <>
                                  <Play size={14} />
                                  Activate schedule
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                handleDuplicate(schedule);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy size={14} />
                              Duplicate
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => {
                                setActionMenuId(null);
                                handleDelete(schedule.id);
                              }}
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
        <Button onClick={handleAddSchedule}>
          <Plus size={18} />
          Add Schedule
        </Button>
        <Button variant="outline">
          Actions
        </Button>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Schedule</h2>
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
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter schedule name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSchedule.description}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, description: e.target.value }))}
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
                  {creating ? 'Creating...' : 'Create Schedule'}
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">Schedule Limit Reached</h3>
              <p className="text-gray-600 mb-6">
                You've used {formatLimitDisplay(limits?.maxSchedules, schedules.length)} schedules on your {limits?.planName} plan.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-gray-900 mb-2">Upgrade to get:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-500" />
                    More schedules for automation
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
    </div>
  );
};

export default SchedulesPage;
