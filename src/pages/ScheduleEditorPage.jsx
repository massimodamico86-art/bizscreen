import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Power,
  Monitor,
  Info
} from 'lucide-react';
import {
  fetchScheduleWithEntriesResolved,
  updateSchedule,
  createScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  TARGET_TYPES
} from '../services/scheduleService';
import { supabase } from '../supabase';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';

// Yodeck-style repeat options
const REPEAT_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily (Mon-Sun)' },
  { value: 'weekday', label: 'Every weekday (Mon-Fri)' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Annually' },
  { value: 'custom', label: 'Custom' }
];

const REPEAT_UNITS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' }
];

const REPEAT_UNTIL_OPTIONS = [
  { value: 'forever', label: 'Forever' },
  { value: 'date', label: 'On date' },
  { value: 'count', label: 'After occurrences' }
];

// Helper to format time to 12-hour format
const formatTime12 = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

// Helper to get week dates
const getWeekDates = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  start.setDate(diff);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
};

// Format date for display
const formatDateShort = (date) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${date.getMonth() + 1}/${date.getDate()}`;
};

const formatDateInput = (date) => {
  return date.toISOString().split('T')[0];
};

const formatDateDisplay = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Time slots for calendar
const TIME_SLOTS = [];
for (let h = 8; h <= 19; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

const ScheduleEditorPage = ({ scheduleId, showToast, onNavigate }) => {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'day'

  // Content options
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [scenes, setScenes] = useState([]);

  // New Event form - Yodeck style
  const [eventForm, setEventForm] = useState({
    eventType: 'content', // 'content' or 'screenOff'
    contentType: '',
    contentId: '',
    startDate: formatDateInput(new Date()),
    startTime: '08:00',
    endDate: formatDateInput(new Date()),
    endTime: '08:30',
    repeat: 'none',
    repeatEvery: 1,
    repeatUnit: 'day',
    repeatUntil: 'forever',
    repeatUntilDate: '',
    repeatUntilCount: 10
  });

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
      loadContentOptions();
    }
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScheduleWithEntriesResolved(scheduleId);
      setSchedule(data);
      setEntries(data.schedule_entries || []);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setError(err.message || 'Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const loadContentOptions = async () => {
    const [playlistsResult, layoutsResult, scenesResult] = await Promise.all([
      supabase.from('playlists').select('id, name').order('name'),
      supabase.from('layouts').select('id, name').order('name'),
      supabase.from('scenes').select('id, name').eq('is_active', true).order('name')
    ]);
    setPlaylists(playlistsResult.data || []);
    setLayouts(layoutsResult.data || []);
    setScenes(scenesResult.data || []);
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

  const openNewEventModal = (date, time) => {
    const startDate = date ? formatDateInput(date) : formatDateInput(new Date());
    const startTime = time || '08:00';
    const endTime = time ?
      `${(parseInt(time.split(':')[0]) + 1).toString().padStart(2, '0')}:00` :
      '09:00';

    setEditingEntry(null);
    setEventForm({
      eventType: 'content',
      contentType: '',
      contentId: '',
      startDate,
      startTime,
      endDate: startDate,
      endTime,
      repeat: 'none',
      repeatEvery: 1,
      repeatUnit: 'day',
      repeatUntil: 'forever',
      repeatUntilDate: '',
      repeatUntilCount: 10
    });
    setShowEventModal(true);
  };

  const openEditEventModal = (entry) => {
    setEditingEntry(entry);
    // Parse repeat_config JSONB
    const repeatConfig = entry.repeat_config || {};
    setEventForm({
      eventType: entry.event_type === 'screen_off' ? 'screenOff' : 'content',
      contentType: entry.content_type || entry.target_type || '',
      contentId: entry.content_id || entry.target_id || '',
      startDate: entry.start_date || formatDateInput(new Date()),
      startTime: entry.start_time || '08:00',
      endDate: entry.end_date || entry.start_date || formatDateInput(new Date()),
      endTime: entry.end_time || '09:00',
      repeat: entry.repeat_type || 'none',
      repeatEvery: repeatConfig.repeat_every || 1,
      repeatUnit: repeatConfig.repeat_unit || 'day',
      repeatUntil: repeatConfig.repeat_until || 'forever',
      repeatUntilDate: repeatConfig.repeat_until_date || '',
      repeatUntilCount: repeatConfig.repeat_until_count || 10
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (eventForm.eventType === 'content' && !eventForm.contentId) {
      showToast?.('Please select content to display', 'error');
      return;
    }

    try {
      const entryData = {
        // Content info
        content_type: eventForm.eventType === 'screenOff' ? null : eventForm.contentType,
        content_id: eventForm.eventType === 'screenOff' ? null : eventForm.contentId,
        // Also set target_type/target_id for backwards compatibility
        target_type: eventForm.eventType === 'screenOff' ? 'all' : eventForm.contentType,
        target_id: eventForm.eventType === 'screenOff' ? null : eventForm.contentId,
        // Timing
        start_date: eventForm.startDate,
        start_time: eventForm.startTime,
        end_date: eventForm.endDate,
        end_time: eventForm.endTime,
        // Event type
        event_type: eventForm.eventType === 'screenOff' ? 'screen_off' : 'content',
        // Repeat settings
        repeat_type: eventForm.repeat,
        repeat_every: eventForm.repeatEvery,
        repeat_unit: eventForm.repeatUnit,
        repeat_until: eventForm.repeatUntil,
        repeat_until_date: eventForm.repeatUntilDate || null,
        repeat_until_count: eventForm.repeatUntilCount,
        is_active: true,
        // Convert to days_of_week for backwards compatibility
        days_of_week: eventForm.repeat === 'weekday' ? [1,2,3,4,5] : [0,1,2,3,4,5,6]
      };

      if (editingEntry) {
        await updateScheduleEntry(editingEntry.id, entryData);
        showToast?.('Event updated');
      } else {
        await createScheduleEntry(scheduleId, entryData);
        showToast?.('Event added');
      }

      await loadSchedule();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      showToast?.('Error saving event: ' + error.message, 'error');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteScheduleEntry(entryId);
      setEntries(prev => prev.filter(e => e.id !== entryId));
      showToast?.('Event deleted');
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast?.('Error deleting event: ' + error.message, 'error');
    }
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getContentOptions = () => {
    switch (eventForm.contentType) {
      case 'playlist': return playlists;
      case 'layout': return layouts;
      case 'scene': return scenes;
      default: return [];
    }
  };

  // Format week range for header
  const weekRangeText = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (start.getMonth() === end.getMonth()) {
      return `${months[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  }, [weekDates]);

  // Get events for a specific day and time slot
  const getEventsForSlot = (date, timeSlot) => {
    const slotHour = parseInt(timeSlot.split(':')[0]);
    const dateStr = formatDateInput(date);

    return entries.filter(entry => {
      const entryDate = entry.start_date || dateStr;
      const entryStartHour = parseInt((entry.start_time || '00:00').split(':')[0]);
      const entryEndHour = parseInt((entry.end_time || '23:59').split(':')[0]);

      // Check if entry falls on this date and time
      return entryDate === dateStr && slotHour >= entryStartHour && slotHour < entryEndHour;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 max-w-md mx-auto mt-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load schedule</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" onClick={() => onNavigate?.('schedules')}>
              <ArrowLeft size={16} />
              Back to Schedules
            </Button>
            <Button onClick={loadSchedule}>
              <RefreshCw size={16} />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col -m-6">
      {/* Top Header - Yodeck style */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Back link */}
          <button
            onClick={() => onNavigate?.('schedules')}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            All Schedules
          </button>

          {/* Schedule name */}
          <input
            type="text"
            value={schedule?.name || ''}
            onChange={(e) => {
              setSchedule(prev => ({ ...prev, name: e.target.value }));
              setIsDirty(true);
            }}
            className="text-base font-medium text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-48"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => onNavigate?.('schedules')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar section */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Calendar toolbar */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Add event button */}
              <button
                onClick={() => openNewEventModal()}
                className="w-8 h-8 bg-[#f26f21] text-white rounded-lg flex items-center justify-center hover:bg-[#e05a10] transition-colors"
              >
                <Plus size={18} />
              </button>

              {/* Today button */}
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Today
              </button>

              {/* Navigation */}
              <button
                onClick={() => navigateWeek(-1)}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Week range */}
            <div className="text-base font-medium text-gray-900">
              {weekRangeText}
            </div>

            {/* View mode */}
            <div className="relative">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="week">Week</option>
                <option value="day">Day</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-[800px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <div className="p-2"></div>
                {weekDates.map((date, i) => {
                  const isToday = formatDateInput(date) === formatDateInput(new Date());
                  return (
                    <div
                      key={i}
                      className={`p-2 text-center text-sm border-l border-gray-200 ${isToday ? 'bg-orange-50' : ''}`}
                    >
                      <div className={`font-medium ${isToday ? 'text-[#f26f21]' : 'text-gray-900'}`}>
                        {formatDateShort(date)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              {TIME_SLOTS.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-100">
                  {/* Time label */}
                  <div className="p-2 text-xs text-gray-500 text-right pr-3">
                    {formatTime12(timeSlot)}
                  </div>

                  {/* Day cells */}
                  {weekDates.map((date, dayIndex) => {
                    const events = getEventsForSlot(date, timeSlot);
                    const isToday = formatDateInput(date) === formatDateInput(new Date());

                    return (
                      <div
                        key={dayIndex}
                        className={`min-h-[50px] border-l border-gray-200 relative cursor-pointer hover:bg-gray-50 ${isToday ? 'bg-orange-50/30' : ''}`}
                        onClick={() => openNewEventModal(date, timeSlot)}
                      >
                        {events.map((event, eventIndex) => (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEventModal(event);
                            }}
                            className={`absolute inset-x-1 top-1 p-1 rounded text-xs font-medium cursor-pointer ${
                              event.event_type === 'screen_off'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-[#f26f21] text-white'
                            }`}
                            style={{
                              zIndex: eventIndex + 1,
                              maxHeight: 'calc(100% - 8px)'
                            }}
                          >
                            {formatTime12(event.start_time)} - {formatTime12(event.end_time)}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right sidebar - Events List */}
        <div className="w-72 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Events List</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <Info size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              View all past and future events in this schedule. The order shows priority for display during overlaps.
            </p>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="text-xs text-gray-500 mb-2">Events Style</div>
            <div className="flex gap-2">
              <div className="w-4 h-4 rounded-full bg-white border border-gray-300"></div>
              <div className="w-4 h-4 rounded-full bg-[#f26f21]"></div>
            </div>
          </div>

          {/* Scheduled Events */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Scheduled Events</h4>
                <ChevronDown size={16} className="text-gray-400" />
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No events scheduled</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer"
                      onClick={() => openEditEventModal(entry)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {entry.event_type === 'screen_off' ? 'Screen Off' : (entry.target?.name || 'No content')}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTime12(entry.start_time)} - {formatTime12(entry.end_time)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntry(entry.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filler Content */}
            <div className="p-4 border-t border-gray-200">
              <div className="p-3 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#f26f21]"></div>
                  <span className="font-medium text-sm text-gray-900">Filler Content</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Shown on the screens when no events are scheduled
                </p>
              </div>
            </div>
          </div>

          {/* View assigned screens */}
          <div className="p-4 border-t border-gray-200">
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <Monitor size={14} />
              View assigned screens
            </button>
          </div>
        </div>
      </div>

      {/* New Event Modal - Yodeck style */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEntry ? 'Edit Event' : 'New Event'}
              </h2>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* SETTINGS section */}
              <div className="mb-6">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Settings</h3>

                {/* Event Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="eventType"
                        checked={eventForm.eventType === 'content'}
                        onChange={() => setEventForm(prev => ({ ...prev, eventType: 'content' }))}
                        className="w-4 h-4 text-[#f26f21] focus:ring-[#f26f21]"
                      />
                      <span className="text-sm text-gray-700">Schedule Content</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="eventType"
                        checked={eventForm.eventType === 'screenOff'}
                        onChange={() => setEventForm(prev => ({ ...prev, eventType: 'screenOff' }))}
                        className="w-4 h-4 text-[#f26f21] focus:ring-[#f26f21]"
                      />
                      <span className="text-sm text-gray-700">Turn screen Off</span>
                    </label>
                  </div>
                </div>

                {/* Content selection - only show for content type */}
                {eventForm.eventType === 'content' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                    <div className="flex gap-2">
                      <select
                        value={eventForm.contentType}
                        onChange={(e) => setEventForm(prev => ({ ...prev, contentType: e.target.value, contentId: '' }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        <option value="">Select Type</option>
                        <option value="playlist">Playlist</option>
                        <option value="layout">Layout</option>
                        <option value="scene">Scene</option>
                      </select>
                      {eventForm.contentType && (
                        <select
                          value={eventForm.contentId}
                          onChange={(e) => setEventForm(prev => ({ ...prev, contentId: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                        >
                          <option value="">Select {eventForm.contentType}</option>
                          {getContentOptions().map(item => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {!eventForm.contentId && eventForm.contentType && (
                      <p className="text-xs text-gray-400 mt-1">No Content Assigned</p>
                    )}
                  </div>
                )}

                {/* Event Starts */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Starts</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={eventForm.startDate}
                        onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                    <div className="w-32 relative">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={eventForm.startTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                  </div>
                </div>

                {/* Event Ends */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Ends</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={eventForm.endDate}
                        onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                    <div className="w-32 relative">
                      <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        value={eventForm.endTime}
                        onChange={(e) => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REPEAT OPTIONS section */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Repeat Options</h3>

                {/* Repeat dropdown */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Repeat</label>
                  <select
                    value={eventForm.repeat}
                    onChange={(e) => setEventForm(prev => ({ ...prev, repeat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                  >
                    {REPEAT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Custom repeat options */}
                {eventForm.repeat === 'custom' && (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Repeat Every</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={eventForm.repeatEvery}
                          onChange={(e) => setEventForm(prev => ({ ...prev, repeatEvery: parseInt(e.target.value) || 1 }))}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                        />
                        <select
                          value={eventForm.repeatUnit}
                          onChange={(e) => setEventForm(prev => ({ ...prev, repeatUnit: e.target.value }))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                        >
                          {REPEAT_UNITS.map(unit => (
                            <option key={unit.value} value={unit.value}>{unit.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Repeat Until</label>
                      <select
                        value={eventForm.repeatUntil}
                        onChange={(e) => setEventForm(prev => ({ ...prev, repeatUntil: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                      >
                        {REPEAT_UNTIL_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Timezone note */}
                <p className="text-xs text-gray-500">
                  The schedule runs on the screens' local time zone.
                </p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowEventModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEvent}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleEditorPage;
