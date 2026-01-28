/**
 * Filler Content Picker (US-140)
 *
 * Allows users to select what content plays when no schedule entries are active.
 * - Dropdown to select content type (Playlist, Layout, Scene)
 * - Second dropdown to select specific content item
 * - Shows current selection with icon
 * - "Clear" button to remove filler content
 */

import { useState, useEffect, useCallback } from 'react';
import { useLogger } from '../../hooks/useLogger.js';
import { List, Layout, Sparkles, Film } from 'lucide-react';
import { supabase } from '../../supabase';

const CONTENT_TYPES = [
  { value: 'playlist', label: 'Playlist', icon: List },
  { value: 'layout', label: 'Layout', icon: Layout },
  { value: 'scene', label: 'Scene', icon: Sparkles }
];

export function FillerContentPicker({
  scheduleId,
  currentType = null,
  currentId = null,
  currentName = null,
  onChange,
  disabled = false
}) {
  const logger = useLogger('FillerContentPicker');
  const [contentType, setContentType] = useState(currentType);
  const [contentId, setContentId] = useState(currentId);
  const [contentName, setContentName] = useState(currentName);
  const [contentOptions, setContentOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load content options when type changes
  const loadContentOptions = useCallback(async (type) => {
    if (!type) {
      setContentOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      let query;
      switch (type) {
        case 'playlist':
          query = supabase.from('playlists').select('id, name').order('name');
          break;
        case 'layout':
          query = supabase.from('layouts').select('id, name').order('name');
          break;
        case 'scene':
          query = supabase.from('scenes').select('id, name').eq('is_active', true).order('name');
          break;
        default:
          setContentOptions([]);
          return;
      }

      const { data, error } = await query;
      if (error) throw error;
      setContentOptions(data || []);
    } catch (err) {
      logger.error('Failed to load content options', { err });
      setContentOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load options when type changes
  useEffect(() => {
    loadContentOptions(contentType);
  }, [contentType, loadContentOptions]);

  // Sync with props when they change
  useEffect(() => {
    setContentType(currentType);
    setContentId(currentId);
    setContentName(currentName);
  }, [currentType, currentId, currentName]);

  const handleTypeChange = (e) => {
    const newType = e.target.value || null;
    setContentType(newType);
    setContentId(null);
    setContentName(null);
  };

  const handleContentChange = async (e) => {
    const newId = e.target.value || null;
    setContentId(newId);

    if (newId) {
      const selected = contentOptions.find(opt => opt.id === newId);
      setContentName(selected?.name || null);

      // Save immediately
      setIsSaving(true);
      try {
        await onChange?.(contentType, newId, selected?.name);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onChange?.(null, null, null);
      setContentType(null);
      setContentId(null);
      setContentName(null);
    } finally {
      setIsSaving(false);
    }
  };

  const TypeIcon = CONTENT_TYPES.find(t => t.value === contentType)?.icon || Film;

  return (
    <div className="space-y-3">
      {/* Current Selection Display */}
      {contentType && contentId && contentName && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <TypeIcon size={16} className="text-gray-500 shrink-0" />
          <span className="flex-1 text-sm truncate">{contentName}</span>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || isSaving}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
            title="Clear filler content"
          >
            {isSaving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <X size={14} />
            )}
          </button>
        </div>
      )}

      {/* Content Type Selector */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Content Type
        </label>
        <select
          value={contentType || ''}
          onChange={handleTypeChange}
          disabled={disabled || isSaving}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select type...</option>
          {CONTENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content Item Selector */}
      {contentType && (
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Select Content
          </label>
          <div className="relative">
            <select
              value={contentId || ''}
              onChange={handleContentChange}
              disabled={disabled || isLoading || isSaving}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {isLoading ? 'Loading...' : 'Select content...'}
              </option>
              {contentOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            {(isLoading || isSaving) && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 size={14} className="animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help Text */}
      {!contentType && !contentId && (
        <p className="text-xs text-gray-400">
          Filler content plays when no scheduled entries are active.
        </p>
      )}
    </div>
  );
}

export default FillerContentPicker;
