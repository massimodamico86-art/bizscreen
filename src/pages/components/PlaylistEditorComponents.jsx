import {
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  X,
  Wand2,
  Sparkles,
  Loader2,
  Check,
  Send,
  Link2,
  Copy,
  ExternalLink,
  Plus,
  Minus,
  GripVertical,
  BookmarkPlus,
  Trash2,
  Palette,
} from 'lucide-react';
import { Button, Card } from '../../design-system';
import {
  formatPreviewLink,
  EXPIRY_PRESETS,
  getExpiryLabel,
} from '../../services/previewService';

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
  app: Grid3X3,
  design: Palette
};

// Timeline item component - duration-based width with drag support
export const PlaylistStripItem = ({ item, index, onRemove, onUpdateDuration, getEffectiveDuration, onDragStart, onDragEnd, onDragOver, onDrop, isDragOver, isDragging, minDuration = 5, maxDuration = 30 }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[item.media?.type] || Image;
  const duration = getEffectiveDuration(item);

  // Calculate width based on duration (min 120px, max 200px)
  const durationRange = Math.max(1, maxDuration - minDuration);
  const normalizedDuration = Math.min(1, Math.max(0, (duration - minDuration) / durationRange));
  const width = Math.round(120 + normalizedDuration * 80);

  const adjustDuration = (delta) => {
    const newDuration = Math.max(1, Math.min(3600, duration + delta));
    onUpdateDuration(item.id, newDuration);
  };

  const handleDragStart = (e) => {
    const rect = e.target.getBoundingClientRect();
    e.dataTransfer.setDragImage(e.target, rect.width / 2, rect.height / 2);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'reorder', index, itemId: item.id }));
    requestAnimationFrame(() => {
      onDragStart?.(index);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    onDragOver?.(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(index);
  };

  return (
    <div className="flex items-center">
      {/* Drop indicator line - shows before this item */}
      <div
        className={`h-[92px] rounded-full ${
          isDragOver ? 'w-1 bg-orange-500 mx-1' : 'w-0'
        }`}
        style={{
          transition: 'width 100ms ease-out, margin 100ms ease-out',
          willChange: isDragOver ? 'width, margin' : 'auto'
        }}
      />
      <div
        className={`flex-shrink-0 group ${
          isDragging ? 'opacity-30' : 'opacity-100'
        }`}
        style={{
          width: `${width}px`,
          transition: 'opacity 100ms ease-out',
          willChange: isDragging ? 'opacity' : 'auto'
        }}
        title={item.media?.name || 'Unknown'}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Thumbnail */}
        <div className="relative h-[70px] bg-gray-100 rounded-t overflow-hidden border border-gray-200">
          {item.media?.thumbnail_url || item.media?.url ? (
            <img
              src={item.media.thumbnail_url || item.media.url}
              alt={item.media.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <TypeIcon size={24} className="text-gray-400" />
            </div>
          )}
          {/* Drag handle - top left */}
          <div className="absolute top-1 left-1 p-0.5 bg-black/40 rounded cursor-grab active:cursor-grabbing">
            <GripVertical size={10} className="text-white" />
          </div>
          {/* Remove button - top right */}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="absolute top-1 right-1 w-4 h-4 bg-black/40 hover:bg-red-500 rounded-full flex items-center justify-center text-white hover:text-white transition-colors"
          >
            <X size={10} />
          </button>
        </div>
        {/* Duration - compact */}
        <div className="flex items-center justify-between px-1 py-1 bg-gray-100 border border-t-0 border-gray-200 rounded-b text-[10px]">
          <button
            onClick={(e) => { e.stopPropagation(); adjustDuration(-1); }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            <Minus size={12} />
          </button>
          <span className="text-gray-700 font-medium">{duration}s</span>
          <button
            onClick={(e) => { e.stopPropagation(); adjustDuration(1); }}
            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Library media item - allows adding same media multiple times, supports drag to timeline
export const LibraryMediaItem = ({ media, countInPlaylist = 0, onAdd }) => {
  const TypeIcon = MEDIA_TYPE_ICONS[media.type] || Image;

  const handleDragStart = (e) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'add', media }));
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  return (
    <div
      className="relative rounded overflow-hidden group cursor-grab hover:ring-2 hover:ring-orange-500 active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="aspect-video bg-gray-800 relative pointer-events-none">
        {media.thumbnail_url || media.url ? (
          <img src={media.thumbnail_url || media.url} alt={media.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon size={24} className="text-gray-500" />
          </div>
        )}
        {/* Name overlay - single location */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
          <p className="text-xs text-white truncate font-medium">{media.name}</p>
        </div>
        {/* Count badge - shows how many times this item is in the playlist */}
        {countInPlaylist > 0 && (
          <div className="absolute top-1 right-1 min-w-5 h-5 px-1.5 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-white font-bold">{countInPlaylist}</span>
          </div>
        )}
        {/* Drag hint */}
        <div className="absolute top-1 left-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={12} className="text-white" />
        </div>
      </div>
      {/* Add button on click - positioned below for click access */}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(media); }}
        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
      >
        <div className="bg-orange-500 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium shadow-lg">
          <Plus size={14} />
          {countInPlaylist > 0 ? 'Add Again' : 'Add'}
        </div>
      </button>
    </div>
  );
};

// AI Suggest Modal - AI slide generation modal
export const AiSuggestModal = ({
  showAiModal,
  setShowAiModal,
  aiGenerating,
  aiSlideCount,
  setAiSlideCount,
  aiSuggestion,
  setAiSuggestion,
  aiApplying,
  handleGenerateAiSlides,
  handleApplyAiSlides,
}) => {
  if (!showAiModal) return null;

  return (
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
          <button onClick={() => setShowAiModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!aiSuggestion ? (
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
                  <span className="text-2xl font-bold text-gray-900 w-8 text-center">{aiSlideCount}</span>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={20} className="text-purple-500 mt-0.5" />
                  <p className="text-sm text-purple-700">
                    AI will generate slide content based on your business profile and playlist name.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 mb-4">
                <Check size={20} />
                <span className="font-medium">Generated {aiSuggestion.payload?.slides?.length || 0} slides</span>
              </div>
              {aiSuggestion.payload?.slides?.map((slide, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{slide.headline}</h4>
                      <p className="text-sm text-gray-600 mt-1">{slide.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          {!aiSuggestion ? (
            <>
              <Button variant="outline" onClick={() => setShowAiModal(false)}>Cancel</Button>
              <Button onClick={handleGenerateAiSlides} disabled={aiGenerating}>
                {aiGenerating ? <><Loader2 size={18} className="animate-spin mr-2" />Generating...</> : <><Sparkles size={18} className="mr-2" />Generate Slides</>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setAiSuggestion(null)} disabled={aiApplying}>Generate Different</Button>
              <Button onClick={handleApplyAiSlides} disabled={aiApplying}>
                {aiApplying ? <><Loader2 size={18} className="animate-spin mr-2" />Adding...</> : <><Check size={18} className="mr-2" />Add {aiSuggestion.payload?.slides?.length || 0} Slides</>}
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

// Approval Modal - Request approval modal
export const ApprovalModal = ({
  showApprovalModal,
  setShowApprovalModal,
  approvalMessage,
  setApprovalMessage,
  submittingApproval,
  handleRequestApproval,
}) => {
  if (!showApprovalModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Request Approval</h2>
          <button onClick={() => setShowApprovalModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
            <textarea
              value={approvalMessage}
              onChange={(e) => setApprovalMessage(e.target.value)}
              placeholder="Add any notes for the reviewer..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowApprovalModal(false)}>Cancel</Button>
          <Button onClick={handleRequestApproval} disabled={submittingApproval}>
            {submittingApproval ? <><Loader2 size={18} className="animate-spin mr-2" />Submitting...</> : <><Send size={18} className="mr-2" />Request Approval</>}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Preview Links Modal - Preview links management modal
export const PreviewLinksModal = ({
  showPreviewModal,
  setShowPreviewModal,
  previewLinks,
  loadingPreviewLinks,
  creatingPreviewLink,
  selectedExpiry,
  setSelectedExpiry,
  allowComments,
  setAllowComments,
  copiedLinkId,
  handleCreatePreviewLink,
  handleRevokePreviewLink,
  handleCopyLink,
}) => {
  if (!showPreviewModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold">Preview Links</h2>
          <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900">Create New Link</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires in</label>
                <select
                  value={selectedExpiry}
                  onChange={(e) => setSelectedExpiry(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {Object.entries(EXPIRY_PRESETS).map(([key]) => (
                    <option key={key} value={key}>{getExpiryLabel(key)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowComments}
                    onChange={(e) => setAllowComments(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Allow comments</span>
                </label>
              </div>
            </div>
            <Button onClick={handleCreatePreviewLink} disabled={creatingPreviewLink} className="w-full">
              {creatingPreviewLink ? <><Loader2 size={18} className="animate-spin mr-2" />Creating...</> : <><Plus size={18} className="mr-2" />Create Preview Link</>}
            </Button>
          </div>

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
                  <div key={link.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm bg-gray-100 px-2 py-0.5 rounded truncate block max-w-[200px]">{link.token}</code>
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(link.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleCopyLink(link)} className="p-2 hover:bg-gray-100 rounded-lg">
                        {copiedLinkId === link.id ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-gray-500" />}
                      </button>
                      <a href={formatPreviewLink(link.token)} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-100 rounded-lg">
                        <ExternalLink size={16} className="text-gray-500" />
                      </a>
                      <button onClick={() => handleRevokePreviewLink(link.id)} className="p-2 hover:bg-red-50 rounded-lg">
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
          <Button variant="outline" onClick={() => setShowPreviewModal(false)}>Close</Button>
        </div>
      </Card>
    </div>
  );
};

// Save as Template Modal - Save playlist as template modal
export const SaveAsTemplateModal = ({
  showTemplateModal,
  setShowTemplateModal,
  templateName,
  setTemplateName,
  templateDescription,
  setTemplateDescription,
  savingTemplate,
  handleSaveAsTemplate,
  items,
  formatDuration,
  getTotalDuration,
}) => {
  if (!showTemplateModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookmarkPlus size={20} className="text-orange-500" />
            Save as Template
          </h2>
          <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Create a reusable template from this playlist. The template can be applied to quickly create new playlists with the same structure.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Restaurant Menu Template"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <p><strong>Items included:</strong> {items.length} items</p>
            <p><strong>Total duration:</strong> {formatDuration(getTotalDuration())}</p>
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowTemplateModal(false)} disabled={savingTemplate}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || !templateName.trim()}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {savingTemplate ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <BookmarkPlus size={16} className="mr-2" />
                Save Template
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};
