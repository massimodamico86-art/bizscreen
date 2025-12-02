import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Calendar,
  Clock,
  ListVideo,
  Grid3X3,
  Image,
  Search,
  ChevronDown
} from 'lucide-react';
import {
  fetchScheduleWithEntriesResolved,
  updateSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  DAYS_OF_WEEK,
  TARGET_TYPES,
  formatDaysOfWeek,
  formatTimeRange
} from '../services/scheduleService';
import { supabase } from '../supabase';
import { Button, Card, Badge } from '../design-system';
import { useTranslation } from '../i18n';

const ScheduleEditorPage = ({ scheduleId, showToast, onNavigate }) => {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // For entry modal
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [entryForm, setEntryForm] = useState({
    target_type: TARGET_TYPES.PLAYLIST,
    target_id: '',
    days_of_week: [1, 2, 3, 4, 5],
    start_time: '09:00',
    end_time: '17:00',
    priority: 0,
    is_active: true
  });

  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
    }
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await fetchScheduleWithEntriesResolved(scheduleId);
      setSchedule(data);
      setEntries(data.schedule_entries || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
      showToast?.('Error loading schedule: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTargetOptions = async () => {
    const [playlistsResult, layoutsResult, mediaResult] = await Promise.all([
      supabase.from('playlists').select('id, name').order('name'),
      supabase.from('layouts').select('id, name').order('name'),
      supabase.from('media_assets').select('id, name, type, thumbnail_url').order('name')
    ]);

    setPlaylists(playlistsResult.data || []);
    setLayouts(layoutsResult.data || []);
    setMediaAssets(mediaResult.data || []);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSchedule(scheduleId, {
        name: schedule.name,
        description: schedule.description
      });
      setIsDirty(false);
      showToast?.('Schedule saved successfully');
    } catch (error) {
      console.error('Error saving schedule:', error);
      showToast?.('Error saving schedule: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEntryModal = async (entry = null) => {
    await loadTargetOptions();

    if (entry) {
      setEditingEntry(entry);
      setEntryForm({
        target_type: entry.target_type,
        target_id: entry.target_id || '',
        days_of_week: entry.days_of_week || [1, 2, 3, 4, 5],
        start_time: entry.start_time || '09:00',
        end_time: entry.end_time || '17:00',
        priority: entry.priority || 0,
        is_active: entry.is_active ?? true
      });
    } else {
      setEditingEntry(null);
      setEntryForm({
        target_type: TARGET_TYPES.PLAYLIST,
        target_id: '',
        days_of_week: [1, 2, 3, 4, 5],
        start_time: '09:00',
        end_time: '17:00',
        priority: 0,
        is_active: true
      });
    }
    setShowEntryModal(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.target_id) {
      showToast?.('Please select content to display', 'error');
      return;
    }

    try {
      if (editingEntry) {
        await updateScheduleEntry(editingEntry.id, entryForm);
        // Reload to get resolved target info
        await loadSchedule();
        showToast?.('Entry updated');
      } else {
        await createScheduleEntry(scheduleId, entryForm);
        await loadSchedule();
        showToast?.('Entry added');
      }
      setShowEntryModal(false);
    } catch (error) {
      console.error('Error saving entry:', error);
      showToast?.('Error saving entry: ' + error.message, 'error');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteScheduleEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      showToast?.('Entry deleted');
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast?.('Error deleting entry: ' + error.message, 'error');
    }
  };

  const toggleDay = (day) => {
    setEntryForm(prev => {
      const days = prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b);
      return { ...prev, days_of_week: days };
    });
  };

  const setWeekdays = () => {
    setEntryForm(prev => ({ ...prev, days_of_week: [1, 2, 3, 4, 5] }));
  };

  const setWeekends = () => {
    setEntryForm(prev => ({ ...prev, days_of_week: [0, 6] }));
  };

  const setEveryDay = () => {
    setEntryForm(prev => ({ ...prev, days_of_week: [0, 1, 2, 3, 4, 5, 6] }));
  };

  const getTargetIcon = (targetType) => {
    switch (targetType) {
      case TARGET_TYPES.PLAYLIST:
        return <ListVideo size={16} className="text-orange-600" />;
      case TARGET_TYPES.LAYOUT:
        return <Grid3X3 size={16} className="text-purple-600" />;
      case TARGET_TYPES.MEDIA:
        return <Image size={16} className="text-blue-600" />;
      default:
        return null;
    }
  };

  const getTargetOptions = () => {
    switch (entryForm.target_type) {
      case TARGET_TYPES.PLAYLIST:
        return playlists;
      case TARGET_TYPES.LAYOUT:
        return layouts;
      case TARGET_TYPES.MEDIA:
        return mediaAssets;
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Schedule not found</p>
        <Button onClick={() => onNavigate?.('schedules')} className="mt-4">
          Back to Schedules
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate?.('schedules')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <input
              type="text"
              value={schedule.name}
              onChange={(e) => {
                setSchedule(prev => ({ ...prev, name: e.target.value }));
                setIsDirty(true);
              }}
              className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 -ml-2"
            />
            <p className="text-gray-500 text-sm">{entries.length} schedule entr{entries.length !== 1 ? 'ies' : 'y'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => onNavigate?.('schedules')}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Schedule Info */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            schedule.is_active ? 'bg-teal-100' : 'bg-gray-100'
          }`}>
            <Calendar size={24} className={schedule.is_active ? 'text-teal-600' : 'text-gray-400'} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={schedule.is_active ? 'success' : 'default'}>
                {schedule.is_active ? 'Active' : 'Paused'}
              </Badge>
            </div>
            <textarea
              value={schedule.description || ''}
              onChange={(e) => {
                setSchedule(prev => ({ ...prev, description: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Add a description..."
              rows={2}
              className="w-full text-sm text-gray-600 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-orange-500 rounded resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Schedule Entries */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Schedule Entries</h3>
          <Button size="sm" onClick={() => openEntryModal()}>
            <Plus size={16} />
            Add Entry
          </Button>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-8">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No schedule entries yet</p>
            <Button onClick={() => openEntryModal()}>
              <Plus size={18} />
              Add Your First Entry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mt-1">
                      {getTargetIcon(entry.target_type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {entry.target?.name || 'No content assigned'}
                        {!entry.is_active && (
                          <Badge variant="default" className="text-xs">Disabled</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span className="capitalize">{entry.target_type}</span>
                        {' • '}
                        {formatDaysOfWeek(entry.days_of_week)}
                        {' • '}
                        {formatTimeRange(entry.start_time, entry.end_time)}
                      </div>
                      {entry.priority > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Priority: {entry.priority}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEntryModal(entry)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingEntry ? 'Edit Entry' : 'Add Schedule Entry'}
              </h2>
              <button
                onClick={() => setShowEntryModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Content Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type
                </label>
                <div className="flex gap-2">
                  {[
                    { type: TARGET_TYPES.PLAYLIST, label: 'Playlist', icon: ListVideo },
                    { type: TARGET_TYPES.LAYOUT, label: 'Layout', icon: Grid3X3 },
                    { type: TARGET_TYPES.MEDIA, label: 'Media', icon: Image }
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => setEntryForm(prev => ({ ...prev, target_type: type, target_id: '' }))}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        entryForm.target_type === type
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={20} className="mx-auto mb-1" />
                      <span className="text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select {entryForm.target_type}
                </label>
                <select
                  value={entryForm.target_id}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, target_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select...</option>
                  {getTargetOptions().map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days
                </label>
                <div className="flex gap-1 mb-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        entryForm.days_of_week.includes(day.value)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day.short.charAt(0)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={setWeekdays}
                    className="text-orange-600 hover:underline"
                  >
                    Weekdays
                  </button>
                  <button
                    onClick={setWeekends}
                    className="text-orange-600 hover:underline"
                  >
                    Weekends
                  </button>
                  <button
                    onClick={setEveryDay}
                    className="text-orange-600 hover:underline"
                  >
                    Every day
                  </button>
                </div>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={entryForm.start_time}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={entryForm.end_time}
                    onChange={(e) => setEntryForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={entryForm.priority}
                  onChange={(e) => setEntryForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min={0}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority entries take precedence when schedules overlap
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Active</span>
                <button
                  onClick={() => setEntryForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    entryForm.is_active ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      entryForm.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEntryModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEntry}>
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ScheduleEditorPage;
