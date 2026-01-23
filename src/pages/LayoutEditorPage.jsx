import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Grid3X3,
  Move,
  ListVideo,
  Image,
  Settings,
  Search,
  Send,
  Link2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileEdit,
  Clock,
  Calendar,
  MessageSquare,
  Check,
  Loader2,
} from 'lucide-react';
import {
  fetchLayoutWithZones,
  updateLayout,
  createLayoutZone,
  updateLayoutZone,
  deleteLayoutZone
} from '../services/layoutService';
import { supabase } from '../supabase';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft,
  getApprovalStatusConfig,
} from '../services/approvalService';
import {
  createPreviewLinkWithPreset,
  fetchPreviewLinksForResource,
  revokePreviewLink,
  formatPreviewLink,
  EXPIRY_PRESETS,
  getExpiryLabel,
} from '../services/previewService';

const PRESET_LAYOUTS = [
  {
    name: 'Full Screen',
    zones: [
      { zone_name: 'Main', x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 100 }
    ]
  },
  {
    name: 'Two Columns',
    zones: [
      { zone_name: 'Left', x_percent: 0, y_percent: 0, width_percent: 50, height_percent: 100 },
      { zone_name: 'Right', x_percent: 50, y_percent: 0, width_percent: 50, height_percent: 100 }
    ]
  },
  {
    name: 'Three Columns',
    zones: [
      { zone_name: 'Left', x_percent: 0, y_percent: 0, width_percent: 33.33, height_percent: 100 },
      { zone_name: 'Center', x_percent: 33.33, y_percent: 0, width_percent: 33.33, height_percent: 100 },
      { zone_name: 'Right', x_percent: 66.66, y_percent: 0, width_percent: 33.34, height_percent: 100 }
    ]
  },
  {
    name: 'Main + Sidebar',
    zones: [
      { zone_name: 'Main', x_percent: 0, y_percent: 0, width_percent: 75, height_percent: 100 },
      { zone_name: 'Sidebar', x_percent: 75, y_percent: 0, width_percent: 25, height_percent: 100 }
    ]
  },
  {
    name: 'Header + Content',
    zones: [
      { zone_name: 'Header', x_percent: 0, y_percent: 0, width_percent: 100, height_percent: 20 },
      { zone_name: 'Content', x_percent: 0, y_percent: 20, width_percent: 100, height_percent: 80 }
    ]
  },
  {
    name: 'L-Shape',
    zones: [
      { zone_name: 'Main', x_percent: 0, y_percent: 0, width_percent: 75, height_percent: 75 },
      { zone_name: 'Right', x_percent: 75, y_percent: 0, width_percent: 25, height_percent: 100 },
      { zone_name: 'Bottom', x_percent: 0, y_percent: 75, width_percent: 75, height_percent: 25 }
    ]
  },
  {
    name: 'Quadrant',
    zones: [
      { zone_name: 'Top Left', x_percent: 0, y_percent: 0, width_percent: 50, height_percent: 50 },
      { zone_name: 'Top Right', x_percent: 50, y_percent: 0, width_percent: 50, height_percent: 50 },
      { zone_name: 'Bottom Left', x_percent: 0, y_percent: 50, width_percent: 50, height_percent: 50 },
      { zone_name: 'Bottom Right', x_percent: 50, y_percent: 50, width_percent: 50, height_percent: 50 }
    ]
  }
];

const ZONE_COLORS = [
  'bg-blue-500/30 border-blue-500',
  'bg-green-500/30 border-green-500',
  'bg-purple-500/30 border-purple-500',
  'bg-orange-500/30 border-orange-500',
  'bg-pink-500/30 border-pink-500',
  'bg-cyan-500/30 border-cyan-500',
  'bg-yellow-500/30 border-yellow-500',
  'bg-red-500/30 border-red-500'
];

const LayoutEditorPage = ({ layoutId, showToast, onNavigate }) => {
  const { t } = useTranslation();
  const logger = useLogger('LayoutEditorPage');
  const [layout, setLayout] = useState(null);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignTab, setAssignTab] = useState('playlists');
  const [isDirty, setIsDirty] = useState(false);

  // Approval & Preview state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [currentReview, setCurrentReview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLinks, setPreviewLinks] = useState([]);
  const [loadingPreviewLinks, setLoadingPreviewLinks] = useState(false);
  const [creatingPreviewLink, setCreatingPreviewLink] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState('7_days');
  const [allowComments, setAllowComments] = useState(true);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  useEffect(() => {
    if (layoutId) {
      loadLayout();
    }
  }, [layoutId]);

  const loadLayout = async () => {
    try {
      setLoading(true);
      const data = await fetchLayoutWithZones(layoutId);
      setLayout(data);
      setZones(data.layout_zones || []);
    } catch (error) {
      logger.error('Failed to load layout', { layoutId, error });
      showToast?.('Error loading layout: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update layout name if changed
      if (layout.name) {
        await updateLayout(layoutId, { name: layout.name, description: layout.description });
      }

      // Save all zones
      for (const zone of zones) {
        if (zone.id) {
          await updateLayoutZone(zone.id, {
            zone_name: zone.zone_name,
            x_percent: zone.x_percent,
            y_percent: zone.y_percent,
            width_percent: zone.width_percent,
            height_percent: zone.height_percent,
            z_index: zone.z_index,
            assigned_playlist_id: zone.assigned_playlist_id,
            assigned_media_id: zone.assigned_media_id
          });
        }
      }

      setIsDirty(false);
      showToast?.('Layout saved successfully');
    } catch (error) {
      logger.error('Failed to save layout', { layoutId, layoutName: layout.name, error });
      showToast?.('Error saving layout: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddZone = async () => {
    try {
      const newZone = await createLayoutZone(layoutId, {
        zone_name: `Zone ${zones.length + 1}`,
        x_percent: 0,
        y_percent: 0,
        width_percent: 25,
        height_percent: 25,
        z_index: zones.length
      });
      setZones(prev => [...prev, newZone]);
      setSelectedZone(newZone.id);
      setIsDirty(true);
    } catch (error) {
      logger.error('Failed to add zone', { layoutId, error });
      showToast?.('Error adding zone: ' + error.message, 'error');
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      await deleteLayoutZone(zoneId);
      setZones(prev => prev.filter(z => z.id !== zoneId));
      if (selectedZone === zoneId) setSelectedZone(null);
      setIsDirty(true);
      showToast?.('Zone deleted');
    } catch (error) {
      logger.error('Failed to delete zone', { zoneId, error });
      showToast?.('Error deleting zone: ' + error.message, 'error');
    }
  };

  const handleZoneUpdate = (zoneId, updates) => {
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, ...updates } : z
    ));
    setIsDirty(true);
  };

  const applyPreset = async (preset) => {
    if (zones.length > 0) {
      if (!window.confirm('This will replace all existing zones. Continue?')) return;
      // Delete existing zones
      for (const zone of zones) {
        await deleteLayoutZone(zone.id);
      }
    }

    // Create new zones from preset
    const newZones = [];
    for (let i = 0; i < preset.zones.length; i++) {
      const presetZone = preset.zones[i];
      const newZone = await createLayoutZone(layoutId, {
        ...presetZone,
        z_index: i
      });
      newZones.push(newZone);
    }
    setZones(newZones);
    setSelectedZone(null);
    setIsDirty(true);
    showToast?.(`Applied "${preset.name}" layout`);
  };

  const openAssignModal = async (zoneId) => {
    setSelectedZone(zoneId);
    setShowAssignModal(true);
    setAssignSearch('');

    // Fetch playlists and media
    const [playlistsResult, mediaResult] = await Promise.all([
      supabase.from('playlists').select('id, name').order('name'),
      supabase.from('media_assets').select('id, name, type, thumbnail_url').order('name')
    ]);

    setPlaylists(playlistsResult.data || []);
    setMediaAssets(mediaResult.data || []);
  };

  const handleAssign = async (type, id) => {
    const updates = type === 'playlist'
      ? { assigned_playlist_id: id, assigned_media_id: null }
      : { assigned_media_id: id, assigned_playlist_id: null };

    try {
      await updateLayoutZone(selectedZone, updates);
      setZones(prev => prev.map(z =>
        z.id === selectedZone
          ? {
              ...z,
              ...updates,
              playlists: type === 'playlist' ? playlists.find(p => p.id === id) : null,
              media: type === 'media' ? mediaAssets.find(m => m.id === id) : null
            }
          : z
      ));
      setShowAssignModal(false);
      setIsDirty(true);
      showToast?.('Content assigned to zone');
    } catch (error) {
      logger.error('Failed to assign content', { zoneId: selectedZone.id, playlistId, error });
      showToast?.('Error assigning content: ' + error.message, 'error');
    }
  };

  const handleClearAssignment = async (zoneId) => {
    try {
      await updateLayoutZone(zoneId, { assigned_playlist_id: null, assigned_media_id: null });
      setZones(prev => prev.map(z =>
        z.id === zoneId
          ? { ...z, assigned_playlist_id: null, assigned_media_id: null, playlists: null, media: null }
          : z
      ));
      setIsDirty(true);
    } catch (error) {
      logger.error('Failed to clear assignment', { zoneId, error });
    }
  };

  const filteredPlaylists = playlists.filter(p =>
    p.name.toLowerCase().includes(assignSearch.toLowerCase())
  );

  const filteredMedia = mediaAssets.filter(m =>
    m.name.toLowerCase().includes(assignSearch.toLowerCase())
  );

  // Fetch current review request for this layout
  const fetchCurrentReview = async () => {
    try {
      const review = await getOpenReviewForResource('layout', layoutId);
      setCurrentReview(review);
    } catch (error) {
      logger.error('Failed to fetch review', { layoutId, error });
    }
  };

  // Fetch on layout load
  useEffect(() => {
    if (layout) {
      fetchCurrentReview();
    }
  }, [layout?.id]);

  // Request approval handler
  const handleRequestApproval = async () => {
    try {
      setSubmittingApproval(true);
      await requestApproval({
        resourceType: 'layout',
        resourceId: layoutId,
        title: `Review request for layout: ${layout.name}`,
        message: approvalMessage || undefined,
      });
      showToast?.('Approval requested successfully');
      setShowApprovalModal(false);
      setApprovalMessage('');
      await loadLayout();
      await fetchCurrentReview();
    } catch (error) {
      logger.error('Failed to request approval', { layoutId, layoutName: layout.name, error });
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Revert to draft handler
  const handleRevertToDraft = async () => {
    if (!window.confirm('Revert this layout to draft status? This will cancel any pending reviews.')) return;
    try {
      await revertToDraft('layout', layoutId);
      showToast?.('Reverted to draft');
      await loadLayout();
      setCurrentReview(null);
    } catch (error) {
      logger.error('Failed to revert to draft', { layoutId, error });
      showToast?.(error.message || 'Error reverting to draft', 'error');
    }
  };

  // Fetch preview links
  const fetchPreviewLinks = async () => {
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('layout', layoutId);
      setPreviewLinks(links);
    } catch (error) {
      logger.error('Failed to fetch preview links', { layoutId, error });
    } finally {
      setLoadingPreviewLinks(false);
    }
  };

  // Open preview modal
  const handleOpenPreviewModal = () => {
    setShowPreviewModal(true);
    fetchPreviewLinks();
  };

  // Create preview link
  const handleCreatePreviewLink = async () => {
    try {
      setCreatingPreviewLink(true);
      await createPreviewLinkWithPreset({
        resourceType: 'layout',
        resourceId: layoutId,
        expiryPreset: selectedExpiry,
        allowComments,
      });
      showToast?.('Preview link created');
      await fetchPreviewLinks();
    } catch (error) {
      logger.error('Failed to create preview link', { layoutId, expiryPreset: selectedExpiry, error });
      showToast?.(error.message || 'Error creating preview link', 'error');
    } finally {
      setCreatingPreviewLink(false);
    }
  };

  // Revoke preview link
  const handleRevokePreviewLink = async (linkId) => {
    if (!window.confirm('Revoke this preview link? It will no longer work.')) return;
    try {
      await revokePreviewLink(linkId);
      showToast?.('Preview link revoked');
      await fetchPreviewLinks();
    } catch (error) {
      logger.error('Failed to revoke preview link', { linkId, error });
      showToast?.(error.message || 'Error revoking link', 'error');
    }
  };

  // Copy preview link
  const handleCopyLink = async (link) => {
    try {
      const url = formatPreviewLink(link.token);
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(link.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
      showToast?.('Link copied to clipboard');
    } catch (error) {
      showToast?.('Failed to copy link', 'error');
    }
  };

  // Get approval status config
  const approvalConfig = layout?.approval_status
    ? getApprovalStatusConfig(layout.approval_status)
    : null;

  const getZoneContent = (zone) => {
    if (zone.playlists) return { type: 'playlist', name: zone.playlists.name };
    if (zone.media) return { type: 'media', name: zone.media.name };
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Layout not found</p>
        <Button onClick={() => onNavigate?.('layouts')} className="mt-4">
          Back to Layouts
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
            onClick={() => onNavigate?.('layouts')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={layout.name}
                onChange={(e) => {
                  setLayout(prev => ({ ...prev, name: e.target.value }));
                  setIsDirty(true);
                }}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 -ml-2"
              />
              {/* Approval Status Badge */}
              {approvalConfig && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${approvalConfig.bgColor} ${approvalConfig.textColor}`}
                >
                  {approvalConfig.icon === 'FileEdit' && <FileEdit size={12} />}
                  {approvalConfig.icon === 'Clock' && <Clock size={12} />}
                  {approvalConfig.icon === 'CheckCircle' && <CheckCircle size={12} />}
                  {approvalConfig.icon === 'XCircle' && <XCircle size={12} />}
                  {approvalConfig.label}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">{zones.length} zone{zones.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleOpenPreviewModal}>
            <Link2 size={18} />
            Preview Link
          </Button>
          {/* Show Request Approval only for draft or rejected */}
          {(!layout.approval_status || layout.approval_status === 'draft' || layout.approval_status === 'rejected') && (
            <Button variant="outline" onClick={() => setShowApprovalModal(true)}>
              <Send size={18} />
              Request Approval
            </Button>
          )}
          {/* Show Revert to Draft for in_review or approved */}
          {(layout.approval_status === 'in_review' || layout.approval_status === 'approved') && (
            <Button variant="outline" onClick={handleRevertToDraft}>
              <FileEdit size={18} />
              Edit Draft
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onNavigate?.('layouts')}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !isDirty}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas Preview */}
        <div className="lg:col-span-2">
          <Card className="p-4">
            <h3 className="font-medium text-gray-900 mb-4">Layout Preview</h3>
            <div
              className="relative bg-gray-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: '16/9' }}
            >
              {zones.map((zone, index) => {
                const content = getZoneContent(zone);
                const colorClass = ZONE_COLORS[index % ZONE_COLORS.length];

                return (
                  <div
                    key={zone.id}
                    className={`absolute border-2 ${colorClass} ${
                      selectedZone === zone.id ? 'ring-2 ring-white' : ''
                    } cursor-pointer transition-all hover:opacity-90`}
                    style={{
                      left: `${zone.x_percent}%`,
                      top: `${zone.y_percent}%`,
                      width: `${zone.width_percent}%`,
                      height: `${zone.height_percent}%`
                    }}
                    onClick={() => setSelectedZone(zone.id)}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm p-2">
                      <span className="font-medium truncate max-w-full">{zone.zone_name}</span>
                      {content && (
                        <span className="text-xs opacity-75 flex items-center gap-1 mt-1">
                          {content.type === 'playlist' ? <ListVideo size={12} /> : <Image size={12} />}
                          <span className="truncate max-w-full">{content.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {zones.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Grid3X3 size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No zones defined</p>
                    <p className="text-sm">Add zones or apply a preset</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Preset Layouts */}
          <Card className="p-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-4">Quick Presets</h3>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_LAYOUTS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
                >
                  <div
                    className="bg-gray-100 rounded mb-2 mx-auto"
                    style={{ width: 60, height: 34, position: 'relative' }}
                  >
                    {preset.zones.map((z, i) => (
                      <div
                        key={i}
                        className="absolute bg-orange-400"
                        style={{
                          left: `${z.x_percent}%`,
                          top: `${z.y_percent}%`,
                          width: `${z.width_percent}%`,
                          height: `${z.height_percent}%`,
                          border: '1px solid white'
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">{preset.name}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Zone List & Editor */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Zones</h3>
              <Button size="sm" onClick={handleAddZone}>
                <Plus size={16} />
                Add Zone
              </Button>
            </div>

            {zones.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No zones yet. Add a zone or select a preset.
              </p>
            ) : (
              <div className="space-y-2">
                {zones.map((zone, index) => {
                  const content = getZoneContent(zone);
                  return (
                    <div
                      key={zone.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedZone === zone.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedZone(zone.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${ZONE_COLORS[index % ZONE_COLORS.length].split(' ')[0]}`}
                          />
                          <span className="font-medium text-sm">{zone.zone_name}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteZone(zone.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {content && (
                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                          {content.type === 'playlist' ? <ListVideo size={12} /> : <Image size={12} />}
                          {content.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Zone Properties */}
          {selectedZone && (
            <Card className="p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Settings size={16} />
                Zone Properties
              </h3>
              {(() => {
                const zone = zones.find(z => z.id === selectedZone);
                if (!zone) return null;
                const content = getZoneContent(zone);

                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={zone.zone_name}
                        onChange={(e) => handleZoneUpdate(zone.id, { zone_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">X (%)</label>
                        <input
                          type="number"
                          value={zone.x_percent}
                          onChange={(e) => handleZoneUpdate(zone.id, { x_percent: parseFloat(e.target.value) || 0 })}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Y (%)</label>
                        <input
                          type="number"
                          value={zone.y_percent}
                          onChange={(e) => handleZoneUpdate(zone.id, { y_percent: parseFloat(e.target.value) || 0 })}
                          min={0}
                          max={100}
                          step={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width (%)</label>
                        <input
                          type="number"
                          value={zone.width_percent}
                          onChange={(e) => handleZoneUpdate(zone.id, { width_percent: parseFloat(e.target.value) || 0 })}
                          min={1}
                          max={100}
                          step={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height (%)</label>
                        <input
                          type="number"
                          value={zone.height_percent}
                          onChange={(e) => handleZoneUpdate(zone.id, { height_percent: parseFloat(e.target.value) || 0 })}
                          min={1}
                          max={100}
                          step={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                      {content ? (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {content.type === 'playlist' ? <ListVideo size={16} /> : <Image size={16} />}
                            <span className="text-sm">{content.name}</span>
                          </div>
                          <button
                            onClick={() => handleClearAssignment(zone.id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => openAssignModal(zone.id)}
                        >
                          <Plus size={16} />
                          Assign Content
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </Card>
          )}
        </div>
      </div>

      {/* Assign Content Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Assign Content to Zone</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setAssignTab('playlists')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    assignTab === 'playlists'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ListVideo size={16} className="inline mr-1" />
                  Playlists
                </button>
                <button
                  onClick={() => setAssignTab('media')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    assignTab === 'media'
                      ? 'bg-orange-100 text-orange-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Image size={16} className="inline mr-1" />
                  Media
                </button>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {assignTab === 'playlists' ? (
                filteredPlaylists.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No playlists found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredPlaylists.map(playlist => (
                      <button
                        key={playlist.id}
                        onClick={() => handleAssign('playlist', playlist.id)}
                        className="w-full p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <ListVideo size={20} className="text-orange-600" />
                        </div>
                        <span className="font-medium">{playlist.name}</span>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                filteredMedia.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No media found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredMedia.map(media => (
                      <button
                        key={media.id}
                        onClick={() => handleAssign('media', media.id)}
                        className="w-full p-3 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left flex items-center gap-3"
                      >
                        {media.thumbnail_url ? (
                          <img
                            src={media.thumbnail_url}
                            alt={media.name}
                            className="w-10 h-10 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Image size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium block">{media.name}</span>
                          <span className="text-xs text-gray-500 capitalize">{media.type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Request Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Send size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Request Approval</h2>
                  <p className="text-sm text-gray-500">Submit for review</p>
                </div>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  value={approvalMessage}
                  onChange={(e) => setApprovalMessage(e.target.value)}
                  placeholder="Add any notes for the reviewer..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    This will change the layout status to "In Review" and notify reviewers.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestApproval} disabled={submittingApproval}>
                {submittingApproval ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} className="mr-2" />
                    Request Approval
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Preview Links Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Link2 size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Preview Links</h2>
                  <p className="text-sm text-gray-500">Share this layout for review</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Create new link */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">Create New Link</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires in
                    </label>
                    <select
                      value={selectedExpiry}
                      onChange={(e) => setSelectedExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {Object.entries(EXPIRY_PRESETS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {getExpiryLabel(key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowComments}
                        onChange={(e) => setAllowComments(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Allow comments</span>
                    </label>
                  </div>
                </div>
                <Button
                  onClick={handleCreatePreviewLink}
                  disabled={creatingPreviewLink}
                  className="w-full"
                >
                  {creatingPreviewLink ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      Create Preview Link
                    </>
                  )}
                </Button>
              </div>

              {/* Existing links */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Active Links</h3>
                {loadingPreviewLinks ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading links...</p>
                  </div>
                ) : previewLinks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No preview links yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previewLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-gray-100 px-2 py-0.5 rounded truncate max-w-[200px]">
                              {link.token}
                            </code>
                            {link.allow_comments && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <MessageSquare size={10} />
                                Comments
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Calendar size={12} />
                            Expires: {new Date(link.expires_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopyLink(link)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy link"
                          >
                            {copiedLinkId === link.id ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} className="text-gray-500" />
                            )}
                          </button>
                          <a
                            href={formatPreviewLink(link.token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Open preview"
                          >
                            <ExternalLink size={16} className="text-gray-500" />
                          </a>
                          <button
                            onClick={() => handleRevokePreviewLink(link.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke link"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LayoutEditorPage;
