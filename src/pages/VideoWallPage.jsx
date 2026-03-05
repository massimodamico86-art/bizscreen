/**
 * VideoWallPage - Admin page for video wall CRUD and configuration
 *
 * Displays a grid of video wall cards with create, edit, delete, and
 * toggle active/inactive. Opens VideoWallConfigurator for screen assignment.
 *
 * @param {Object} props
 * @param {Function} props.showToast - Toast notification callback
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Grid3X3,
  Plus,
  Pencil,
  Trash2,
  Monitor,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Settings2,
} from 'lucide-react';
import { PageLayout, Button } from '../design-system';
import { supabase } from '../supabase';
import VideoWallConfigurator from '../components/video-wall/VideoWallConfigurator';
import { useLogger } from '../hooks/useLogger.js';

export default function VideoWallPage({ showToast }) {
  const logger = useLogger('VideoWallPage');

  const [walls, setWalls] = useState([]);
  const [screens, setScreens] = useState([]); // available tv_devices
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWall, setSelectedWall] = useState(null); // wall being configured
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingWall, setEditingWall] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    rows: 2,
    cols: 2,
    bezel_gap_x: 0,
    bezel_gap_y: 0,
    playlist_id: null,
  });

  const loadWalls = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('video_walls')
        .select('*, video_wall_screens(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWalls(data || []);
    } catch (err) {
      logger.error('Failed to load video walls', { error: err });
      showToast?.('Failed to load video walls: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [logger, showToast]);

  const loadScreens = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tv_devices')
        .select('id, device_name')
        .order('device_name');

      if (error) throw error;
      setScreens(data || []);
    } catch (err) {
      logger.error('Failed to load screens', { error: err });
    }
  }, [logger]);

  const loadPlaylists = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setPlaylists(data || []);
    } catch (err) {
      logger.error('Failed to load playlists', { error: err });
    }
  }, [logger]);

  useEffect(() => {
    loadWalls();
    loadScreens();
    loadPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditingWall(null);
    setFormData({ name: '', rows: 2, cols: 2, bezel_gap_x: 0, bezel_gap_y: 0, playlist_id: null });
    setShowForm(true);
  };

  const handleEdit = (wall) => {
    setEditingWall(wall);
    setFormData({
      name: wall.name,
      rows: wall.rows,
      cols: wall.cols,
      bezel_gap_x: wall.bezel_gap_x || 0,
      bezel_gap_y: wall.bezel_gap_y || 0,
      playlist_id: wall.playlist_id || null,
    });
    setShowForm(true);
  };

  const handleSaveForm = async () => {
    if (!formData.name.trim()) {
      showToast?.('Wall name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        rows: Number(formData.rows),
        cols: Number(formData.cols),
        bezel_gap_x: Number(formData.bezel_gap_x),
        bezel_gap_y: Number(formData.bezel_gap_y),
        playlist_id: formData.playlist_id || null,
      };

      if (editingWall) {
        const { error } = await supabase
          .from('video_walls')
          .update(payload)
          .eq('id', editingWall.id);
        if (error) throw error;
        showToast?.('Video wall updated', 'success');
      } else {
        const { data, error } = await supabase
          .from('video_walls')
          .insert(payload)
          .select('*, video_wall_screens(*)')
          .single();
        if (error) throw error;
        showToast?.('Video wall created', 'success');
        // Open configurator for new wall
        setSelectedWall(data);
        setShowConfigurator(true);
      }

      setShowForm(false);
      setEditingWall(null);
      await loadWalls();
    } catch (err) {
      logger.error('Failed to save video wall', { error: err });
      showToast?.('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase.from('video_walls').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast?.('Video wall deleted', 'success');
      setDeleteTarget(null);
      await loadWalls();
    } catch (err) {
      logger.error('Failed to delete video wall', { error: err });
      showToast?.('Failed to delete: ' + err.message, 'error');
    }
  };

  const handleToggleActive = async (wall) => {
    try {
      const { error } = await supabase
        .from('video_walls')
        .update({ is_active: !wall.is_active })
        .eq('id', wall.id);
      if (error) throw error;
      showToast?.(wall.is_active ? 'Wall deactivated' : 'Wall activated', 'success');
      await loadWalls();
    } catch (err) {
      logger.error('Failed to toggle wall', { error: err });
      showToast?.('Failed to update: ' + err.message, 'error');
    }
  };

  const handleConfigureSave = async (wallScreensData) => {
    try {
      // Delete existing assignments for this wall
      const { error: delError } = await supabase
        .from('video_wall_screens')
        .delete()
        .eq('wall_id', selectedWall.id);
      if (delError) throw delError;

      // Insert new assignments
      if (wallScreensData.length > 0) {
        const { error: insError } = await supabase
          .from('video_wall_screens')
          .insert(wallScreensData);
        if (insError) throw insError;
      }

      showToast?.('Wall layout saved', 'success');
      setShowConfigurator(false);
      setSelectedWall(null);
      await loadWalls();
    } catch (err) {
      logger.error('Failed to save wall layout', { error: err });
      showToast?.('Failed to save layout: ' + err.message, 'error');
    }
  };

  const getPlaylistName = (playlistId) => {
    if (!playlistId) return null;
    return playlists.find((p) => p.id === playlistId)?.name || 'Unknown';
  };

  // Loading state
  if (loading) {
    return (
      <PageLayout title="Video Walls" icon={Grid3X3}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Video Walls"
      icon={Grid3X3}
      action={
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Create Wall
        </Button>
      }
    >
      {/* Wall cards grid */}
      {walls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Grid3X3 className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No video walls configured</h3>
          <p className="text-gray-400 mb-6 max-w-md">
            Create your first video wall to span content across multiple screens with synchronized
            playback.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Create Wall
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {walls.map((wall) => (
            <div
              key={wall.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{wall.name}</h3>
                  <p className="text-sm text-gray-500">
                    {wall.rows} x {wall.cols} grid
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    wall.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {wall.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Monitor className="w-4 h-4" />
                  {wall.video_wall_screens?.length || 0} screens
                </span>
                {getPlaylistName(wall.playlist_id) && (
                  <span className="truncate text-blue-600">
                    {getPlaylistName(wall.playlist_id)}
                  </span>
                )}
              </div>

              {/* Bezel gap info */}
              {(wall.bezel_gap_x > 0 || wall.bezel_gap_y > 0) && (
                <p className="text-xs text-gray-400 mb-3">
                  Bezel: {wall.bezel_gap_x}mm x {wall.bezel_gap_y}mm
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 pt-2 border-t">
                <button
                  onClick={() => {
                    setSelectedWall(wall);
                    setShowConfigurator(true);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Configure layout"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(wall)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(wall)}
                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                  title={wall.is_active ? 'Deactivate' : 'Activate'}
                >
                  {wall.is_active ? (
                    <ToggleRight className="w-4 h-4 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(wall)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-auto"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingWall ? 'Edit Video Wall' : 'Create Video Wall'}
              </h2>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wall Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Lobby Display Wall"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Grid dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.rows}
                    onChange={(e) => setFormData((p) => ({ ...p, rows: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Columns</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.cols}
                    onChange={(e) => setFormData((p) => ({ ...p, cols: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bezel gaps */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bezel Gap X (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bezel_gap_x}
                    onChange={(e) => setFormData((p) => ({ ...p, bezel_gap_x: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bezel Gap Y (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bezel_gap_y}
                    onChange={(e) => setFormData((p) => ({ ...p, bezel_gap_y: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Playlist picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Playlist (optional)
                </label>
                <select
                  value={formData.playlist_id || ''}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, playlist_id: e.target.value || null }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No playlist</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingWall(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveForm} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : editingWall ? (
                  'Save Changes'
                ) : (
                  'Create Wall'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Video Wall?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? All screen
              assignments will also be removed. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Configurator */}
      {showConfigurator && selectedWall && (
        <VideoWallConfigurator
          wall={selectedWall}
          screens={screens}
          wallScreens={selectedWall.video_wall_screens || []}
          onSave={handleConfigureSave}
          onClose={() => {
            setShowConfigurator(false);
            setSelectedWall(null);
          }}
        />
      )}
    </PageLayout>
  );
}
