import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  Clock,
  GripVertical,
  X,
  Search,
  Save,
  Wand2,
  Sparkles,
  Loader2,
  Check,
  Send,
  Link2,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileEdit,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../design-system';
import { useTranslation } from '../i18n';
import {
  generateSlides,
  materializePlaylist,
  getBusinessContextFromProfile,
} from '../services/assistantService';
import {
  requestApproval,
  getOpenReviewForResource,
  revertToDraft,
  APPROVAL_STATUS,
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

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
  app: Grid3X3
};

const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
  app: 'App'
};

const PlaylistEditorPage = ({ playlistId, showToast, onNavigate }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);

  // AI Assistant state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSlideCount, setAiSlideCount] = useState(4);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiApplying, setAiApplying] = useState(false);

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
    if (playlistId) {
      fetchPlaylist();
    }
  }, [playlistId]);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);

      // Fetch playlist
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select('*')
        .eq('id', playlistId)
        .single();

      if (playlistError) throw playlistError;
      setPlaylist(playlistData);

      // Fetch playlist items with media details
      const { data: itemsData, error: itemsError } = await supabase
        .from('playlist_items')
        .select(`
          *,
          media:media_assets(id, name, type, url, thumbnail_url, duration)
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching playlist:', error);
      showToast?.('Error loading playlist: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaAssets = async () => {
    try {
      let query = supabase
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (mediaFilter) {
        query = query.eq('type', mediaFilter);
      }

      if (mediaSearch) {
        query = query.ilike('name', `%${mediaSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMediaAssets(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      showToast?.('Error loading media: ' + error.message, 'error');
    }
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setSelectedMedia([]);
    fetchMediaAssets();
  };

  const handleAddItems = async () => {
    if (selectedMedia.length === 0) {
      showToast?.('Please select at least one media item', 'error');
      return;
    }

    try {
      setSaving(true);

      // Get the highest position
      const maxPosition = items.length > 0
        ? Math.max(...items.map(i => i.position))
        : -1;

      // Create new items
      const newItems = selectedMedia.map((mediaId, index) => {
        const media = mediaAssets.find(m => m.id === mediaId);
        return {
          playlist_id: playlistId,
          item_type: 'media',
          item_id: mediaId,
          position: maxPosition + 1 + index,
          duration: media?.duration || null
        };
      });

      const { data, error } = await supabase
        .from('playlist_items')
        .insert(newItems)
        .select(`
          *,
          media:media_assets(id, name, type, url, thumbnail_url, duration)
        `);

      if (error) throw error;

      setItems(prev => [...prev, ...data]);
      setShowAddModal(false);
      setSelectedMedia([]);
      showToast?.(`Added ${data.length} item(s) to playlist`);
    } catch (error) {
      console.error('Error adding items:', error);
      showToast?.('Error adding items: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('Remove this item from the playlist?')) return;

    try {
      const { error } = await supabase
        .from('playlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Remove from state and re-order
      const newItems = items
        .filter(i => i.id !== itemId)
        .map((item, index) => ({ ...item, position: index }));

      setItems(newItems);

      // Update positions in database
      await Promise.all(
        newItems.map(item =>
          supabase
            .from('playlist_items')
            .update({ position: item.position })
            .eq('id', item.id)
        )
      );

      showToast?.('Item removed from playlist');
    } catch (error) {
      console.error('Error removing item:', error);
      showToast?.('Error removing item: ' + error.message, 'error');
    }
  };

  const handleMoveItem = async (itemId, direction) => {
    const currentIndex = items.findIndex(i => i.id === itemId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    try {
      // Swap positions
      const newItems = [...items];
      [newItems[currentIndex], newItems[newIndex]] = [newItems[newIndex], newItems[currentIndex]];

      // Update positions
      const updatedItems = newItems.map((item, index) => ({
        ...item,
        position: index
      }));

      setItems(updatedItems);

      // Update in database
      await Promise.all([
        supabase
          .from('playlist_items')
          .update({ position: updatedItems[currentIndex].position })
          .eq('id', updatedItems[currentIndex].id),
        supabase
          .from('playlist_items')
          .update({ position: updatedItems[newIndex].position })
          .eq('id', updatedItems[newIndex].id)
      ]);
    } catch (error) {
      console.error('Error reordering items:', error);
      showToast?.('Error reordering items: ' + error.message, 'error');
      fetchPlaylist(); // Refresh on error
    }
  };

  const handleUpdateDuration = async (itemId, duration) => {
    try {
      const { error } = await supabase
        .from('playlist_items')
        .update({ duration: duration || null })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, duration } : item
        )
      );
    } catch (error) {
      console.error('Error updating duration:', error);
      showToast?.('Error updating duration: ' + error.message, 'error');
    }
  };

  const toggleMediaSelection = (mediaId) => {
    setSelectedMedia(prev =>
      prev.includes(mediaId)
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  // AI Assistant handlers
  const handleOpenAiModal = () => {
    setShowAiModal(true);
    setAiSuggestion(null);
    setAiSlideCount(4);
  };

  const handleGenerateAiSlides = async () => {
    try {
      setAiGenerating(true);

      // Get business context from profile
      const businessContext = await getBusinessContextFromProfile();

      // Generate slides for this playlist
      const suggestion = await generateSlides(
        {
          playlistName: playlist.name,
          playlistDescription: playlist.description || '',
          slideCount: aiSlideCount,
          theme: 'general',
        },
        businessContext
      );

      setAiSuggestion(suggestion);
      showToast?.('Slides generated! Review and apply them.', 'success');
    } catch (error) {
      console.error('Error generating AI slides:', error);
      showToast?.(error.message || 'Error generating slides', 'error');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleApplyAiSlides = async () => {
    if (!aiSuggestion) return;

    try {
      setAiApplying(true);

      // Create media items for each slide in the suggestion
      const slides = aiSuggestion.payload?.slides || [];
      const maxPosition = items.length > 0
        ? Math.max(...items.map(i => i.position))
        : -1;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];

        // Create a text media asset
        const { data: media, error: mediaError } = await supabase
          .from('media_assets')
          .insert({
            name: slide.headline || `AI Slide ${i + 1}`,
            type: 'text',
            meta: {
              headline: slide.headline,
              body: slide.body,
              style: slide.style || {},
              imagePrompt: slide.imagePrompt,
              generatedBy: 'assistant',
            },
          })
          .select()
          .single();

        if (mediaError) throw mediaError;

        // Add to playlist
        const { error: linkError } = await supabase
          .from('playlist_items')
          .insert({
            playlist_id: playlistId,
            item_type: 'media',
            item_id: media.id,
            position: maxPosition + 1 + i,
            duration: slide.duration || playlist.default_duration || 10,
          });

        if (linkError) throw linkError;
      }

      // Refresh playlist items
      await fetchPlaylist();
      setShowAiModal(false);
      setAiSuggestion(null);

      showToast?.(`Added ${slides.length} AI-generated slides!`, 'success');
    } catch (error) {
      console.error('Error applying AI slides:', error);
      showToast?.(error.message || 'Error applying slides', 'error');
    } finally {
      setAiApplying(false);
    }
  };

  // Fetch current review request for this playlist
  const fetchCurrentReview = async () => {
    try {
      const review = await getOpenReviewForResource('playlist', playlistId);
      setCurrentReview(review);
    } catch (error) {
      console.error('Error fetching review:', error);
    }
  };

  // Fetch on playlist load
  useEffect(() => {
    if (playlist) {
      fetchCurrentReview();
    }
  }, [playlist?.id]);

  // Request approval handler
  const handleRequestApproval = async () => {
    try {
      setSubmittingApproval(true);
      await requestApproval({
        resourceType: 'playlist',
        resourceId: playlistId,
        title: `Review request for playlist: ${playlist.name}`,
        message: approvalMessage || undefined,
      });
      showToast?.('Approval requested successfully');
      setShowApprovalModal(false);
      setApprovalMessage('');
      // Refresh playlist and review
      await fetchPlaylist();
      await fetchCurrentReview();
    } catch (error) {
      console.error('Error requesting approval:', error);
      showToast?.(error.message || 'Error requesting approval', 'error');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Revert to draft handler
  const handleRevertToDraft = async () => {
    if (!window.confirm('Revert this playlist to draft status? This will cancel any pending reviews.')) return;
    try {
      await revertToDraft('playlist', playlistId);
      showToast?.('Reverted to draft');
      await fetchPlaylist();
      setCurrentReview(null);
    } catch (error) {
      console.error('Error reverting to draft:', error);
      showToast?.(error.message || 'Error reverting to draft', 'error');
    }
  };

  // Fetch preview links
  const fetchPreviewLinks = async () => {
    try {
      setLoadingPreviewLinks(true);
      const links = await fetchPreviewLinksForResource('playlist', playlistId);
      setPreviewLinks(links);
    } catch (error) {
      console.error('Error fetching preview links:', error);
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
        resourceType: 'playlist',
        resourceId: playlistId,
        expiryPreset: selectedExpiry,
        allowComments,
      });
      showToast?.('Preview link created');
      await fetchPreviewLinks();
    } catch (error) {
      console.error('Error creating preview link:', error);
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
      console.error('Error revoking preview link:', error);
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
  const approvalConfig = playlist?.approval_status
    ? getApprovalStatusConfig(playlist.approval_status)
    : null;

  const getEffectiveDuration = (item) => {
    return item.duration || item.media?.duration || playlist?.default_duration || 10;
  };

  const getTotalDuration = () => {
    return items.reduce((total, item) => total + getEffectiveDuration(item), 0);
  };

  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Playlist not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => onNavigate?.('playlists')}
        >
          Back to Playlists
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate?.('playlists')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{playlist.name}</h1>
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
          {playlist.description && (
            <p className="text-gray-500 text-sm">{playlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>Total: {formatDuration(getTotalDuration())}</span>
        </div>
        <Button variant="outline" onClick={handleOpenPreviewModal}>
          <Link2 size={18} />
          Preview Link
        </Button>
        {/* Show Request Approval only for draft or rejected */}
        {(!playlist.approval_status || playlist.approval_status === 'draft' || playlist.approval_status === 'rejected') && (
          <Button variant="outline" onClick={() => setShowApprovalModal(true)}>
            <Send size={18} />
            Request Approval
          </Button>
        )}
        {/* Show Revert to Draft for in_review or approved */}
        {(playlist.approval_status === 'in_review' || playlist.approval_status === 'approved') && (
          <Button variant="outline" onClick={handleRevertToDraft}>
            <FileEdit size={18} />
            Edit Draft
          </Button>
        )}
        <Button variant="outline" onClick={handleOpenAiModal}>
          <Wand2 size={18} />
          AI Suggest
        </Button>
        <Button onClick={openAddModal}>
          <Plus size={18} />
          Add Media
        </Button>
      </div>

      {/* Playlist Info Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">Items:</span>{' '}
            <span className="font-medium">{items.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Default Duration:</span>{' '}
            <span className="font-medium">{playlist.default_duration}s</span>
          </div>
          <div>
            <span className="text-gray-500">Transition:</span>{' '}
            <span className="font-medium capitalize">{playlist.transition_effect || 'fade'}</span>
          </div>
          <div>
            <span className="text-gray-500">Shuffle:</span>{' '}
            <span className="font-medium">{playlist.shuffle ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </Card>

      {/* Items List */}
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-lg flex items-center justify-center">
            <Plus size={32} className="text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Items Yet</h2>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Add media, apps, or layouts to your playlist. Items will play in sequence on your screens.
          </p>
          <Button onClick={openAddModal}>
            <Plus size={18} />
            Add Media
          </Button>
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm text-gray-500">
                <th className="p-4 w-12">#</th>
                <th className="p-4 font-medium">ITEM</th>
                <th className="p-4 font-medium">TYPE</th>
                <th className="p-4 font-medium w-32">DURATION</th>
                <th className="p-4 font-medium w-24">ORDER</th>
                <th className="p-4 font-medium w-16">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const TypeIcon = MEDIA_TYPE_ICONS[item.media?.type] || Image;
                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4 text-gray-400">
                      <GripVertical size={16} className="cursor-grab" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {item.media?.thumbnail_url || item.media?.url ? (
                          <img
                            src={item.media.thumbnail_url || item.media.url}
                            alt={item.media.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <TypeIcon size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">
                            {item.media?.name || 'Unknown'}
                          </span>
                          <p className="text-xs text-gray-500">Position {index + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon size={16} className="text-gray-400" />
                        <span className="text-gray-600">
                          {MEDIA_TYPE_LABELS[item.media?.type] || item.item_type}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={item.duration || ''}
                          onChange={(e) => handleUpdateDuration(item.id, parseInt(e.target.value) || null)}
                          placeholder={`${playlist.default_duration}`}
                          min={1}
                          max={3600}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <span className="text-xs text-gray-500">
                          {item.duration ? '' : '(default)'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveItem(item.id, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ChevronUp size={18} />
                        </button>
                        <button
                          onClick={() => handleMoveItem(item.id, 'down')}
                          disabled={index === items.length - 1}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ChevronDown size={18} />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Media Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Add Media to Playlist</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 flex gap-4">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={mediaSearch}
                  onChange={(e) => {
                    setMediaSearch(e.target.value);
                    fetchMediaAssets();
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <select
                value={mediaFilter}
                onChange={(e) => {
                  setMediaFilter(e.target.value);
                  fetchMediaAssets();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
                <option value="web_page">Web Pages</option>
              </select>
            </div>

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {mediaAssets.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No media found. Upload some media first.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {mediaAssets.map(media => {
                    const TypeIcon = MEDIA_TYPE_ICONS[media.type] || Image;
                    const isSelected = selectedMedia.includes(media.id);
                    const isAlreadyInPlaylist = items.some(i => i.item_id === media.id);

                    return (
                      <div
                        key={media.id}
                        onClick={() => !isAlreadyInPlaylist && toggleMediaSelection(media.id)}
                        className={`
                          relative rounded-lg border-2 cursor-pointer transition-all
                          ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}
                          ${isAlreadyInPlaylist ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                          {media.thumbnail_url || media.url ? (
                            <img
                              src={media.thumbnail_url || media.url}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <TypeIcon size={32} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium truncate">{media.name}</p>
                          <p className="text-xs text-gray-500">{MEDIA_TYPE_LABELS[media.type]}</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {selectedMedia.indexOf(media.id) + 1}
                            </span>
                          </div>
                        )}
                        {isAlreadyInPlaylist && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-gray-800 text-white text-xs rounded">
                            Already added
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {selectedMedia.length} item{selectedMedia.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddItems} disabled={saving || selectedMedia.length === 0}>
                  {saving ? 'Adding...' : `Add ${selectedMedia.length} Item${selectedMedia.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* AI Suggest Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Wand2 size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">AI Slide Suggestions</h2>
                  <p className="text-sm text-gray-500">Generate content slides for your playlist</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!aiSuggestion ? (
                /* Generation Form */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of slides to generate
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={aiSlideCount}
                        onChange={(e) => setAiSlideCount(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-2xl font-bold text-gray-900 w-8 text-center">
                        {aiSlideCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles size={20} className="text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-purple-700">
                          AI will generate slide content based on your business profile and playlist name.
                          You can review the suggestions before adding them.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Suggestion Preview */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <Check size={20} />
                    <span className="font-medium">Generated {aiSuggestion.payload?.slides?.length || 0} slides</span>
                  </div>

                  {aiSuggestion.payload?.slides?.map((slide, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg"
                      style={{
                        backgroundColor: slide.style?.backgroundColor
                          ? `${slide.style.backgroundColor}10`
                          : undefined,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{slide.headline}</h4>
                          <p className="text-sm text-gray-600 mt-1">{slide.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>Duration: {slide.duration}s</span>
                            {slide.imagePrompt && (
                              <span className="truncate max-w-xs" title={slide.imagePrompt}>
                                Image: {slide.imagePrompt}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              {!aiSuggestion ? (
                <>
                  <Button variant="outline" onClick={() => setShowAiModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateAiSlides} disabled={aiGenerating}>
                    {aiGenerating ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="mr-2" />
                        Generate Slides
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setAiSuggestion(null)}
                    disabled={aiApplying}
                  >
                    Generate Different
                  </Button>
                  <Button onClick={handleApplyAiSlides} disabled={aiApplying}>
                    {aiApplying ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Check size={18} className="mr-2" />
                        Add {aiSuggestion.payload?.slides?.length || 0} Slides
                      </>
                    )}
                  </Button>
                </>
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
                    This will change the playlist status to "In Review" and notify reviewers.
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
                  <p className="text-sm text-gray-500">Share this playlist for review</p>
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

export default PlaylistEditorPage;
