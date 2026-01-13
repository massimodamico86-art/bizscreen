/**
 * MediaDetailModal
 *
 * Modern modal for viewing and editing media asset details.
 * Features:
 * - Large preview (image/video)
 * - Clean form layout with organized sections
 * - Edit in Pixie (for images)
 * - Replace file
 * - Delete confirmation
 *
 * @module components/media/MediaDetailModal
 */

import { useState, useEffect } from 'react';
import {
  X,
  Edit,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Download,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Info,
  Folder,
  Calendar,
  HardDrive,
  Maximize2,
} from 'lucide-react';
import { Button } from '../../design-system';
import { Modal, ModalContent } from '../../design-system';
import { Badge } from '../../design-system';

const MEDIA_TYPE_ICONS = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  web_page: Globe,
};

const MEDIA_TYPE_LABELS = {
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  document: 'Document',
  web_page: 'Web Page',
};

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Collapsible Section Component - Clean accordion style
 */
function CollapsibleSection({ title, defaultOpen = true, children, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50/50 transition-colors -mx-1 px-1 rounded"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-gray-400" />}
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[1000px] opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Form Input Component - Consistent styling
 */
function FormInput({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

/**
 * MediaDetailModal component
 */
export default function MediaDetailModal({
  open,
  onClose,
  asset,
  onUpdate,
  onDelete,
  onReplace,
  onEditInPixie,
  isGlobal = false,
  showToast,
}) {
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [editDuration, setEditDuration] = useState(10);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // Initialize form when asset changes
  useEffect(() => {
    if (asset) {
      setEditName(asset.name || '');
      setEditDescription(asset.description || '');
      setEditTags(asset.tags || []);
      setEditDuration(asset.duration || 10);
    }
  }, [asset]);

  if (!asset) return null;

  const TypeIcon = MEDIA_TYPE_ICONS[asset.type] || Image;

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate?.(asset.id, {
        name: editName,
        description: editDescription,
        tags: editTags,
        duration: editDuration,
      });
      showToast?.('Media updated successfully', 'success');
      onClose();
    } catch (err) {
      showToast?.('Failed to update media', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !editTags.includes(newTag.trim())) {
      setEditTags([...editTags, newTag.trim()]);
      setNewTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tag) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(asset.url);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  // Delete confirmation
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete?.(asset.id);
      onClose();
      showToast?.('Media deleted successfully', 'success');
    } catch (err) {
      showToast?.('Failed to delete media', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="xl" showCloseButton={false}>
      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-8 rounded-2xl">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete Media?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{asset.name}</strong>"?
              <span className="block text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                loading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 size={16} className="mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f26f21]/10 flex items-center justify-center">
            <TypeIcon size={18} className="text-[#f26f21]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit {MEDIA_TYPE_LABELS[asset.type]}</h2>
          </div>
          {isGlobal && (
            <Badge variant="info" size="sm" className="ml-2">GLOBAL</Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      <ModalContent className="p-0">
        <div className="flex flex-col lg:flex-row min-h-[500px]">
          {/* Preview Section - Left */}
          <div className="lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
            {/* Preview content */}
            <div className="p-6 w-full h-full flex items-center justify-center">
              {asset.type === 'image' ? (
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="max-w-full max-h-[400px] object-contain rounded-lg shadow-2xl"
                />
              ) : asset.type === 'video' ? (
                <video
                  src={asset.url}
                  controls
                  className="max-w-full max-h-[400px] rounded-lg shadow-2xl"
                />
              ) : asset.type === 'audio' ? (
                <div className="text-center p-8 bg-white/10 rounded-2xl backdrop-blur">
                  <Music className="w-20 h-20 text-white/60 mx-auto mb-6" />
                  <audio src={asset.url} controls className="w-full max-w-xs" />
                </div>
              ) : (
                <div className="text-center p-8 bg-white/10 rounded-2xl backdrop-blur">
                  <TypeIcon className="w-20 h-20 text-white/60 mx-auto mb-4" />
                  <p className="text-white/60">Preview not available</p>
                </div>
              )}
            </div>

            {/* Overlay action buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
              <a
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-colors backdrop-blur-sm"
                title="Open in new tab"
              >
                <ExternalLink size={16} />
              </a>
              {(asset.type === 'image' || asset.type === 'video') && (
                <a
                  href={asset.url}
                  download={asset.name}
                  className="p-2.5 bg-black/40 hover:bg-black/60 rounded-lg text-white transition-colors backdrop-blur-sm"
                  title="Download"
                >
                  <Download size={16} />
                </a>
              )}
            </div>

            {/* File info badge - bottom */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex gap-2">
                {asset.width && asset.height && (
                  <span className="text-xs bg-black/50 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg font-medium">
                    {asset.width} × {asset.height}
                  </span>
                )}
                {asset.file_size && (
                  <span className="text-xs bg-black/50 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-lg font-medium">
                    {formatFileSize(asset.file_size)}
                  </span>
                )}
              </div>
              {asset.type === 'image' && onEditInPixie && (
                <Button
                  size="sm"
                  onClick={() => onEditInPixie(asset)}
                  className="bg-white hover:bg-gray-100 text-gray-900 shadow-lg"
                >
                  <Edit size={14} className="mr-1.5" />
                  Edit in Pixie
                </Button>
              )}
            </div>
          </div>

          {/* Details Section - Right */}
          <div className="lg:w-1/2 p-6 overflow-y-auto bg-white">
            {/* DETAILS Section */}
            <CollapsibleSection title="Details" icon={Info} defaultOpen={true}>
              <div className="space-y-4">
                {/* Name */}
                <FormInput label="Name">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter media name"
                    disabled={isGlobal}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] focus:bg-white disabled:bg-gray-100 disabled:text-gray-500 transition-all"
                  />
                </FormInput>

                {/* Description */}
                <FormInput label="Description">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Add a description..."
                    disabled={isGlobal}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] focus:bg-white disabled:bg-gray-100 disabled:text-gray-500 transition-all"
                  />
                </FormInput>

                {/* Tags */}
                <FormInput label="Tags">
                  <div className="space-y-2">
                    {editTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {editTags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-sm rounded-full ${
                              !isGlobal ? 'cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors' : ''
                            }`}
                            onClick={() => !isGlobal && handleRemoveTag(tag)}
                          >
                            {tag}
                            {!isGlobal && <X size={12} />}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No tags added</p>
                    )}
                    {!isGlobal && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add tag..."
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] focus:bg-white transition-all"
                        />
                        <button
                          onClick={handleAddTag}
                          disabled={!newTag.trim()}
                          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </FormInput>

                {/* Duration for images */}
                {asset.type === 'image' && (
                  <FormInput
                    label="Duration"
                    hint="How long this image displays in a playlist"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editDuration}
                        onChange={(e) => setEditDuration(parseInt(e.target.value) || 10)}
                        min={1}
                        max={300}
                        disabled={isGlobal}
                        className="w-20 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] focus:bg-white disabled:bg-gray-100 disabled:text-gray-500 transition-all"
                      />
                      <span className="text-sm text-gray-500">seconds</span>
                    </div>
                  </FormInput>
                )}
              </div>
            </CollapsibleSection>

            {/* SETTINGS Section */}
            <CollapsibleSection title="Settings" icon={HardDrive} defaultOpen={false}>
              <div className="space-y-4">
                {/* URL */}
                <FormInput label="File URL">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 px-3 py-2.5 rounded-lg truncate block text-gray-600 font-mono">
                      {asset.url}
                    </code>
                    <button
                      onClick={handleCopyUrl}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0"
                    >
                      {urlCopied ? (
                        <Check size={16} className="text-green-600" />
                      ) : (
                        <Copy size={16} className="text-gray-500" />
                      )}
                    </button>
                  </div>
                </FormInput>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                  {asset.width && asset.height && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dimensions</p>
                      <p className="text-sm font-medium text-gray-900">{asset.width} × {asset.height} px</p>
                    </div>
                  )}
                  {asset.file_size && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">File Size</p>
                      <p className="text-sm font-medium text-gray-900">{formatFileSize(asset.file_size)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(asset.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Modified</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(asset.updated_at)}</p>
                  </div>
                  {asset.mime_type && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                      <p className="text-sm font-medium text-gray-900">{asset.mime_type}</p>
                    </div>
                  )}
                  {asset.orientation && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Orientation</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">{asset.orientation}</p>
                    </div>
                  )}
                </div>

                {/* Replace file button */}
                {!isGlobal && onReplace && (
                  <Button
                    variant="secondary"
                    onClick={() => onReplace(asset)}
                    className="w-full justify-center"
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Replace File
                  </Button>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </ModalContent>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50/50">
        <div>
          {!isGlobal && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!isGlobal && (
            <Button
              onClick={handleSave}
              loading={isSaving}
              className="bg-[#f26f21] hover:bg-[#e05e10] text-white px-6"
            >
              Save Changes
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
