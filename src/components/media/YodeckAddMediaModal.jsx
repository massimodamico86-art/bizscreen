/**
 * Yodeck-style Add Media Modal
 *
 * Tabs: Upload, Images, Videos, Audio, Documents, Web Pages
 * Each tab has specific upload options matching Yodeck's interface.
 */
import { useState } from 'react';
import {
  X,
  Upload,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Laptop,
  Youtube,
  Radio,
  Grid3X3,
  FileSpreadsheet,
  Presentation,
  File,
  Layers,
  Tv,
  CloudUpload,
  Loader2,
  Search,
  ExternalLink,
} from 'lucide-react';
import { Button, Input } from '../../design-system';
import {
  createYouTubeAsset,
  createVimeoAsset,
  createStreamAsset,
  createWebPageAsset,
  createMediaAsset,
  parseYouTubeUrl,
  parseVimeoUrl,
  MEDIA_TYPES,
} from '../../services/mediaService';

// Cloud provider icons (simplified)
const OneDriveIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M12 14l-2-2-4 4h16l-4-4-2 2-4-4z" />
  </svg>
);

const DropboxIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M6 2l6 4-6 4 6 4-6 4-6-4 6-4-6-4 6-4zm12 0l6 4-6 4 6 4-6 4-6-4 6-4-6-4 6-4z" />
  </svg>
);

const GoogleDriveIcon = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor">
    <path d="M8 16l-4-7h8l4 7H8zm8-7l4 7-4 7-4-7 4-7zM8 2l4 7H4l4-7z" />
  </svg>
);

const TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'webpages', label: 'Web Pages', icon: Globe },
];

// Stock images wave icon
const StockWaveIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    <path d="M2 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
    <path d="M2 6c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
  </svg>
);

// Audio waveform icon
const AudioWaveIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <rect x="2" y="9" width="2" height="6" rx="1" />
    <rect x="6" y="6" width="2" height="12" rx="1" />
    <rect x="10" y="4" width="2" height="16" rx="1" />
    <rect x="14" y="7" width="2" height="10" rx="1" />
    <rect x="18" y="5" width="2" height="14" rx="1" />
    <rect x="22" y="8" width="2" height="8" rx="1" />
  </svg>
);

// Type buttons for each media type
const IMAGE_TYPES = [
  { id: 'file', label: 'Image file', icon: Image },
  { id: 'stock', label: 'Stock Images', icon: StockWaveIcon },
];

const VIDEO_TYPES = [
  { id: 'file', label: 'Video File', icon: Video },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'vimeo', label: 'Vimeo', icon: () => <span className="text-lg font-bold">V</span> },
  { id: 'ppt', label: 'PPT File', icon: Presentation },
  { id: 'stream', label: 'Stream', icon: Radio },
  { id: 'videowall', label: 'Video Wall', icon: Grid3X3 },
  { id: 'videoinput', label: 'Video Input', icon: Tv },
  { id: 'stockvideos', label: 'Stock Videos', icon: Layers },
];

const AUDIO_TYPES = [
  { id: 'file', label: 'Audio File', icon: AudioWaveIcon },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'vimeo', label: 'Vimeo', icon: () => <span className="text-lg font-bold">V</span> },
  { id: 'stream', label: 'Stream', icon: Radio },
];

const DOCUMENT_TYPES = [
  { id: 'pdf', label: 'PDF File', icon: FileText },
  { id: 'word', label: 'Word File', icon: File },
  { id: 'ppt', label: 'PPT File', icon: Presentation },
  { id: 'excel', label: 'Excel File', icon: FileSpreadsheet },
];

const CLOUD_PROVIDERS = [
  { id: 'device', label: 'My Device', icon: Laptop },
  { id: 'onedrive', label: 'OneDrive', icon: CloudUpload },
  { id: 'sharepoint', label: 'SharePoint', icon: CloudUpload },
  { id: 'dropbox', label: 'Dropbox', icon: CloudUpload },
  { id: 'gdrive', label: 'Google Drive', icon: CloudUpload },
  { id: 'gphotos', label: 'Google Photos', icon: Image },
];

// Type button component - uses CSS for sizing to avoid prop issues with different icon types
// Note: All icons (lucide forwardRef, custom SVG components, arrow functions) are valid React components
const TypeButton = ({ type, selected, onClick }) => {
  const Icon = type.icon;

  return (
    <button
      onClick={() => onClick(type.id)}
      className={`flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all min-w-[100px] ${
        selected
          ? 'border-[#f26f21] bg-orange-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="w-6 h-6 flex items-center justify-center text-gray-600 [&>svg]:w-6 [&>svg]:h-6">
        <Icon />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center">{type.label}</span>
    </button>
  );
};

// Drop zone component
const DropZone = ({ onDrop, onBrowse, instructions, maxResolution }) => {
  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-[#f26f21]', 'bg-orange-50');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-[#f26f21]', 'bg-orange-50');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-[#f26f21]', 'bg-orange-50');
    const files = Array.from(e.dataTransfer.files);
    onDrop?.(files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onBrowse}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
    >
      <div className="mx-auto w-8 h-8 text-gray-400 mb-3 [&>svg]:w-8 [&>svg]:h-8">
        <Upload />
      </div>
      <p className="text-gray-500 text-sm">Drop files here or click to choose</p>
    </div>
  );
};

// Upload tab content (general drag & drop with cloud providers)
const UploadTabContent = ({ onBrowse, showToast }) => {
  const handleCloudProvider = (providerId) => {
    const providerNames = {
      onedrive: 'OneDrive',
      sharepoint: 'SharePoint',
      dropbox: 'Dropbox',
      gdrive: 'Google Drive',
      gphotos: 'Google Photos',
    };
    showToast?.(`${providerNames[providerId] || providerId} integration coming soon!`, 'info');
  };

  return (
    <div className="space-y-6 py-4">
      <div className="text-center">
        <p className="text-gray-700 mb-4">
          Drag and drop, <button onClick={onBrowse} className="text-[#f26f21] font-medium hover:underline">browse</button> or import from:
        </p>

        {/* Cloud provider icons */}
        <div className="flex justify-center gap-6 mb-6">
          {CLOUD_PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            return (
              <button
                key={provider.id}
                onClick={() => provider.id === 'device' ? onBrowse() : handleCloudProvider(provider.id)}
                className="flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 flex items-center justify-center text-blue-600 [&>svg]:w-7 [&>svg]:h-7">
                  <Icon />
                </div>
                <span className="text-xs text-gray-600">{provider.label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500">
          Supported files include JPG, PNG, MP3, WAV, MP4, PDF, PPT, DOC and XLSX{' '}
          <button className="text-[#f26f21] hover:underline">and more</button>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Using another service? <button className="text-[#f26f21] hover:underline">Suggest yours here</button>
        </p>
      </div>
    </div>
  );
};

// Image URL input form with preview
const ImageUrlInputForm = ({ url, setUrl, name, setName, onAdd, loading }) => {
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Validate URL and check if it's an image
  const isValidImageUrl = (urlStr) => {
    try {
      new URL(urlStr);
      // Check for common image extensions or allow any URL (server will validate)
      return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(urlStr) || urlStr.length > 0;
    } catch {
      return false;
    }
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setPreviewError(false);
    if (isValidImageUrl(newUrl)) {
      setPreviewLoading(true);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter an image URL to import it into your media library.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom name for this image"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
      </div>

      {/* Preview */}
      {url && isValidImageUrl(url) && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          {!previewError ? (
            <div className="relative w-32 h-20 bg-gray-200 rounded overflow-hidden">
              {previewLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-gray-400" />
                </div>
              )}
              <img
                src={url}
                alt="Preview"
                className="w-full h-full object-cover"
                onLoad={() => setPreviewLoading(false)}
                onError={() => {
                  setPreviewError(true);
                  setPreviewLoading(false);
                }}
              />
            </div>
          ) : (
            <div className="w-32 h-20 bg-red-50 rounded flex items-center justify-center">
              <span className="text-xs text-red-500">Preview unavailable</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {name || 'External Image'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">{url}</p>
          </div>
        </div>
      )}

      <Button
        onClick={onAdd}
        disabled={!url || !isValidImageUrl(url) || loading}
        className="w-full bg-[#f26f21] hover:bg-[#e05e10] text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        ) : (
          'Add Image from URL'
        )}
      </Button>
    </div>
  );
};

// Images tab content
const ImagesTabContent = ({
  selectedType,
  onSelectType,
  onBrowse,
  imageUrl,
  setImageUrl,
  imageName,
  setImageName,
  onAddImageUrl,
  loading,
  showToast,
}) => {
  const [uploadMode, setUploadMode] = useState('files'); // 'files' or 'url'

  // Render content based on selected type
  const renderTypeContent = () => {
    if (selectedType === 'stock') {
      return <StockMediaBrowser type="image" showToast={showToast} />;
    }

    // Default: file upload
    return (
      <>
        {/* Upload mode tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setUploadMode('files')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              uploadMode === 'files'
                ? 'border-[#f26f21] text-[#f26f21]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Files
          </button>
          <button
            onClick={() => setUploadMode('url')}
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              uploadMode === 'url'
                ? 'border-[#f26f21] text-[#f26f21]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Import from URL
          </button>
        </div>

        {/* Content based on upload mode */}
        {uploadMode === 'files' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Upload images from your device. Hold [Ctrl] or [Shift] to select multiple files.
            </p>
            <p className="text-xs text-gray-400">
              Supported formats: JPG, PNG, GIF, WebP, SVG. Maximum resolution: 50MP.
            </p>
            <DropZone onBrowse={onBrowse} />
          </div>
        ) : (
          <ImageUrlInputForm
            url={imageUrl}
            setUrl={setImageUrl}
            name={imageName}
            setName={setImageName}
            onAdd={onAddImageUrl}
            loading={loading}
          />
        )}
      </>
    );
  };

  return (
    <div className="space-y-4 py-4">
      {/* Type selector */}
      <div className="flex gap-3 justify-center">
        {IMAGE_TYPES.map((type) => (
          <TypeButton
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onClick={onSelectType}
          />
        ))}
      </div>

      {/* Content based on selected type */}
      <div className="pt-2">
        {renderTypeContent()}
      </div>
    </div>
  );
};

// YouTube input form
const YouTubeInputForm = ({ url, setUrl, name, setName, onAdd, loading, showToast }) => {
  const videoId = url ? parseYouTubeUrl(url) : null;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter a YouTube video URL to add it to your media library.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            YouTube URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom name for this video"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
      </div>

      {/* Preview */}
      {videoId && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          <img
            src={thumbnailUrl}
            alt="Video preview"
            className="w-32 h-20 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {name || `YouTube Video ${videoId}`}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <Youtube size={12} className="text-red-600" />
              YouTube Video
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={onAdd}
        disabled={!videoId || loading}
        className="w-full bg-[#f26f21] hover:bg-[#e05e10] text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        ) : (
          'Add YouTube Video'
        )}
      </Button>
    </div>
  );
};

// Vimeo input form
const VimeoInputForm = ({ url, setUrl, name, setName, onAdd, loading }) => {
  const videoId = url ? parseVimeoUrl(url) : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Enter a Vimeo video URL to add it to your media library.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vimeo URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vimeo.com/123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom name for this video"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
      </div>

      {/* Preview */}
      {videoId && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          <div className="w-32 h-20 bg-blue-100 rounded flex items-center justify-center">
            <span className="text-3xl font-bold text-blue-600">V</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {name || `Vimeo Video ${videoId}`}
            </p>
            <p className="text-xs text-gray-500 mt-1">Vimeo Video</p>
          </div>
        </div>
      )}

      <Button
        onClick={onAdd}
        disabled={!videoId || loading}
        className="w-full bg-[#f26f21] hover:bg-[#e05e10] text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        ) : (
          'Add Vimeo Video'
        )}
      </Button>
    </div>
  );
};

// Stream input form
const StreamInputForm = ({ url, setUrl, name, setName, streamType, setStreamType, onAdd, loading }) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Add a live stream or video stream URL (HLS, DASH, RTSP).
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stream URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/stream.m3u8"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stream Type
          </label>
          <select
            value={streamType}
            onChange={(e) => setStreamType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          >
            <option value="auto">Auto-detect</option>
            <option value="hls">HLS (.m3u8)</option>
            <option value="dash">DASH (.mpd)</option>
            <option value="rtsp">RTSP</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Custom name for this stream"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
        </div>
      </div>

      {/* Preview */}
      {url && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          <div className="w-32 h-20 bg-purple-100 rounded flex items-center justify-center">
            <Radio size={32} className="text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {name || 'Live Stream'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {streamType === 'auto' ? 'Auto-detected stream' : `${streamType.toUpperCase()} Stream`}
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={onAdd}
        disabled={!url || loading}
        className="w-full bg-[#f26f21] hover:bg-[#e05e10] text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        ) : (
          'Add Stream'
        )}
      </Button>
    </div>
  );
};

// Stock media browser (placeholder - would integrate with Pexels/Unsplash API)
const StockMediaBrowser = ({ type, onSelect, showToast }) => {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Search free stock {type === 'video' ? 'videos' : 'images'} from Pexels, Unsplash, and more.
      </p>

      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${type === 'video' ? 'videos' : 'images'}...`}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
        />
      </div>

      {/* Coming soon placeholder */}
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <Layers size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">Stock {type === 'video' ? 'Videos' : 'Images'} Coming Soon</h3>
        <p className="text-sm text-gray-500">
          We're integrating with Pexels and Unsplash to provide free stock {type === 'video' ? 'videos' : 'images'}.
        </p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => window.open('https://www.pexels.com', '_blank')}
        >
          <ExternalLink size={14} className="mr-2" />
          Browse Pexels for now
        </Button>
      </div>
    </div>
  );
};

// Videos tab content
const VideosTabContent = ({
  selectedType,
  onSelectType,
  onBrowse,
  youtubeUrl,
  setYoutubeUrl,
  youtubeName,
  setYoutubeName,
  vimeoUrl,
  setVimeoUrl,
  vimeoName,
  setVimeoName,
  streamUrl,
  setStreamUrl,
  streamName,
  setStreamName,
  streamType,
  setStreamType,
  onAddYouTube,
  onAddVimeo,
  onAddStream,
  loading,
  showToast,
}) => {
  const [uploadMode, setUploadMode] = useState('files');
  const [skipEncoding, setSkipEncoding] = useState(false);

  // Render content based on selected type
  const renderTypeContent = () => {
    switch (selectedType) {
      case 'youtube':
        return (
          <YouTubeInputForm
            url={youtubeUrl}
            setUrl={setYoutubeUrl}
            name={youtubeName}
            setName={setYoutubeName}
            onAdd={onAddYouTube}
            loading={loading}
            showToast={showToast}
          />
        );
      case 'vimeo':
        return (
          <VimeoInputForm
            url={vimeoUrl}
            setUrl={setVimeoUrl}
            name={vimeoName}
            setName={setVimeoName}
            onAdd={onAddVimeo}
            loading={loading}
          />
        );
      case 'stream':
        return (
          <StreamInputForm
            url={streamUrl}
            setUrl={setStreamUrl}
            name={streamName}
            setName={setStreamName}
            streamType={streamType}
            setStreamType={setStreamType}
            onAdd={onAddStream}
            loading={loading}
          />
        );
      case 'stockvideos':
        return <StockMediaBrowser type="video" showToast={showToast} />;
      case 'videowall':
      case 'videoinput':
        return (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              {selectedType === 'videowall' ? <Grid3X3 size={32} className="text-gray-400" /> : <Tv size={32} className="text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {selectedType === 'videowall' ? 'Video Wall' : 'Video Input'} Coming Soon
            </h3>
            <p className="text-sm text-gray-500">
              {selectedType === 'videowall'
                ? 'Create synchronized multi-screen video walls.'
                : 'Capture and display video from connected devices.'}
            </p>
          </div>
        );
      case 'ppt':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Upload PowerPoint files to display as slideshows.
            </p>
            <DropZone onBrowse={onBrowse} />
            <p className="text-xs text-gray-400">
              Supported formats: .ppt, .pptx
            </p>
          </div>
        );
      default: // 'file'
        return (
          <>
            {/* Upload mode tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setUploadMode('files')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                  uploadMode === 'files'
                    ? 'border-[#f26f21] text-[#f26f21]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload Files
              </button>
              <button
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                  uploadMode === 'url'
                    ? 'border-[#f26f21] text-[#f26f21]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Import from URL
              </button>
            </div>

            {uploadMode === 'files' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Upload videos from your device. Use [Ctrl] or [Shift] to select multiple files.
                </p>
                <DropZone onBrowse={onBrowse} />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={skipEncoding}
                    onChange={(e) => setSkipEncoding(e.target.checked)}
                    className="rounded border-gray-300 text-[#f26f21] focus:ring-[#f26f21]"
                  />
                  Skip video encoding
                  <span className="text-gray-400 cursor-help" title="Skip encoding for pre-optimized videos">&#9432;</span>
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Enter a direct video URL.</p>
                <input
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="space-y-4 py-4">
      {/* Type selector */}
      <div className="flex flex-wrap gap-3 justify-center">
        {VIDEO_TYPES.map((type) => (
          <TypeButton
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onClick={onSelectType}
          />
        ))}
      </div>

      {/* Content based on selected type */}
      <div className="pt-2">
        {renderTypeContent()}
      </div>
    </div>
  );
};

// Audio tab content
const AudioTabContent = ({
  selectedType,
  onSelectType,
  onBrowse,
  youtubeUrl,
  setYoutubeUrl,
  youtubeName,
  setYoutubeName,
  vimeoUrl,
  setVimeoUrl,
  vimeoName,
  setVimeoName,
  streamUrl,
  setStreamUrl,
  streamName,
  setStreamName,
  streamType,
  setStreamType,
  onAddYouTube,
  onAddVimeo,
  onAddStream,
  loading,
  showToast,
}) => {
  const [uploadMode, setUploadMode] = useState('files');

  // Render content based on selected type
  const renderTypeContent = () => {
    switch (selectedType) {
      case 'youtube':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add YouTube audio content (audio-only playback for music, podcasts, etc.)
            </p>
            <YouTubeInputForm
              url={youtubeUrl}
              setUrl={setYoutubeUrl}
              name={youtubeName}
              setName={setYoutubeName}
              onAdd={onAddYouTube}
              loading={loading}
              showToast={showToast}
            />
          </div>
        );
      case 'vimeo':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add Vimeo audio content (audio-only playback)
            </p>
            <VimeoInputForm
              url={vimeoUrl}
              setUrl={setVimeoUrl}
              name={vimeoName}
              setName={setVimeoName}
              onAdd={onAddVimeo}
              loading={loading}
            />
          </div>
        );
      case 'stream':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Add an audio stream URL (internet radio, podcasts, etc.)
            </p>
            <StreamInputForm
              url={streamUrl}
              setUrl={setStreamUrl}
              name={streamName}
              setName={setStreamName}
              streamType={streamType}
              setStreamType={setStreamType}
              onAdd={onAddStream}
              loading={loading}
            />
          </div>
        );
      default: // 'file'
        return (
          <>
            {/* Upload mode tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setUploadMode('files')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                  uploadMode === 'files'
                    ? 'border-[#f26f21] text-[#f26f21]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload Files
              </button>
              <button
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 ${
                  uploadMode === 'url'
                    ? 'border-[#f26f21] text-[#f26f21]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Import from URL
              </button>
            </div>

            {uploadMode === 'files' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Upload audio files from your device. Use [Ctrl] or [Shift] to select multiple files
                </p>
                <p className="text-xs text-gray-400">Supported formats: MP3, WAV, OGG, FLAC, AAC</p>
                <DropZone onBrowse={onBrowse} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Enter an audio stream URL.</p>
                <input
                  type="url"
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="space-y-4 py-4">
      {/* Type selector */}
      <div className="flex gap-3 justify-center">
        {AUDIO_TYPES.map((type) => (
          <TypeButton
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onClick={onSelectType}
          />
        ))}
      </div>

      {/* Content based on selected type */}
      <div className="pt-2">
        {renderTypeContent()}
      </div>
    </div>
  );
};

// Documents tab content
const DocumentsTabContent = ({ selectedType, onSelectType, onBrowse }) => {
  const [uploadMode, setUploadMode] = useState('files');

  // Get type-specific info
  const getDocTypeInfo = () => {
    switch (selectedType) {
      case 'pdf':
        return {
          description: 'Upload PDF documents. Perfect for menus, brochures, and information displays.',
          formats: 'Supported format: .pdf',
          placeholder: 'https://example.com/document.pdf',
        };
      case 'word':
        return {
          description: 'Upload Word documents. They will be converted for display.',
          formats: 'Supported formats: .doc, .docx',
          placeholder: 'https://example.com/document.docx',
        };
      case 'ppt':
        return {
          description: 'Upload PowerPoint presentations to display as slideshows.',
          formats: 'Supported formats: .ppt, .pptx',
          placeholder: 'https://example.com/presentation.pptx',
        };
      case 'excel':
        return {
          description: 'Upload Excel spreadsheets for data displays and dashboards.',
          formats: 'Supported formats: .xls, .xlsx',
          placeholder: 'https://example.com/spreadsheet.xlsx',
        };
      default:
        return {
          description: 'Upload documents from your device.',
          formats: 'Supported formats: PDF, Word, PowerPoint, Excel',
          placeholder: 'https://example.com/document.pdf',
        };
    }
  };

  const docInfo = getDocTypeInfo();

  return (
    <div className="space-y-4 py-4">
      {/* Type selector */}
      <div className="flex gap-3 justify-center flex-wrap">
        {DOCUMENT_TYPES.map((type) => (
          <TypeButton
            key={type.id}
            type={type}
            selected={selectedType === type.id}
            onClick={onSelectType}
          />
        ))}
      </div>

      {/* Upload mode tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setUploadMode('files')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${
            uploadMode === 'files'
              ? 'border-[#f26f21] text-[#f26f21]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Upload Files
        </button>
        <button
          onClick={() => setUploadMode('url')}
          className={`flex-1 py-2 text-sm font-medium border-b-2 ${
            uploadMode === 'url'
              ? 'border-[#f26f21] text-[#f26f21]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Import from URL
        </button>
      </div>

      {/* Content */}
      {uploadMode === 'files' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{docInfo.description}</p>
          <p className="text-xs text-gray-400">{docInfo.formats}</p>
          <DropZone onBrowse={onBrowse} />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Enter a document URL to import.</p>
          <input
            type="url"
            placeholder={docInfo.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
          />
          <p className="text-xs text-gray-400">{docInfo.formats}</p>
        </div>
      )}
    </div>
  );
};

// Web Pages tab content
const WebPagesTabContent = ({ url, setUrl, name, setName, onAdd, loading }) => {
  const isValidUrl = (urlStr) => {
    try {
      new URL(urlStr);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4 py-6">
      <p className="text-sm text-gray-600">
        Add a web page to display on your screens. The page will be shown in full screen.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Web Page URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Name (optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Custom name for this web page"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
        />
      </div>

      {/* Preview */}
      {url && isValidUrl(url) && (
        <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Globe size={24} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {name || 'Web Page'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-1">{url}</p>
          </div>
        </div>
      )}

      <Button
        onClick={onAdd}
        disabled={!url || !isValidUrl(url) || loading}
        className="w-full bg-[#f26f21] hover:bg-[#e05e10] text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Adding...
          </span>
        ) : (
          'Add Web Page'
        )}
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Note: Some websites may block embedding. Test your web page after adding.
      </p>
    </div>
  );
};

// Main Modal Component
const YodeckAddMediaModal = ({
  open,
  onClose,
  onUpload,
  onAddWebPage,
  onMediaAdded,
  openFilePicker,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedImageType, setSelectedImageType] = useState('file');
  const [selectedVideoType, setSelectedVideoType] = useState('file');
  const [selectedAudioType, setSelectedAudioType] = useState('file');
  const [selectedDocType, setSelectedDocType] = useState('pdf');
  const [webPageUrl, setWebPageUrl] = useState('');
  const [webPageName, setWebPageName] = useState('');
  const [loading, setLoading] = useState(false);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeName, setYoutubeName] = useState('');

  // Vimeo state
  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoName, setVimeoName] = useState('');

  // Stream state
  const [streamUrl, setStreamUrl] = useState('');
  const [streamName, setStreamName] = useState('');
  const [streamType, setStreamType] = useState('auto');

  // Image URL state
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');

  if (!open) return null;

  const handleBrowse = () => {
    openFilePicker?.();
  };

  // Handle adding YouTube video
  const handleAddYouTube = async () => {
    if (!youtubeUrl) {
      showToast?.('Please enter a YouTube URL', 'error');
      return;
    }
    setLoading(true);
    try {
      await createYouTubeAsset({
        url: youtubeUrl,
        name: youtubeName || null,
      });
      showToast?.('YouTube video added successfully!', 'success');
      setYoutubeUrl('');
      setYoutubeName('');
      onMediaAdded?.();
      onClose?.();
    } catch (error) {
      showToast?.(error.message || 'Failed to add YouTube video', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding Vimeo video
  const handleAddVimeo = async () => {
    if (!vimeoUrl) {
      showToast?.('Please enter a Vimeo URL', 'error');
      return;
    }
    setLoading(true);
    try {
      await createVimeoAsset({
        url: vimeoUrl,
        name: vimeoName || null,
      });
      showToast?.('Vimeo video added successfully!', 'success');
      setVimeoUrl('');
      setVimeoName('');
      onMediaAdded?.();
      onClose?.();
    } catch (error) {
      showToast?.(error.message || 'Failed to add Vimeo video', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding Stream
  const handleAddStream = async () => {
    if (!streamUrl) {
      showToast?.('Please enter a stream URL', 'error');
      return;
    }
    setLoading(true);
    try {
      await createStreamAsset({
        url: streamUrl,
        name: streamName || null,
        streamType,
      });
      showToast?.('Stream added successfully!', 'success');
      setStreamUrl('');
      setStreamName('');
      setStreamType('auto');
      onMediaAdded?.();
      onClose?.();
    } catch (error) {
      showToast?.(error.message || 'Failed to add stream', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding image from URL
  const handleAddImageUrl = async () => {
    if (!imageUrl) {
      showToast?.('Please enter an image URL', 'error');
      return;
    }
    setLoading(true);
    try {
      await createMediaAsset({
        name: imageName || imageUrl,
        type: MEDIA_TYPES.IMAGE,
        url: imageUrl,
        thumbnailUrl: imageUrl,
      });
      showToast?.('Image added successfully!', 'success');
      setImageUrl('');
      setImageName('');
      onMediaAdded?.();
      onClose?.();
    } catch (error) {
      showToast?.(error.message || 'Failed to add image', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding web page
  const handleAddWebPage = async () => {
    if (!webPageUrl) {
      showToast?.('Please enter a web page URL', 'error');
      return;
    }
    setLoading(true);
    try {
      await createWebPageAsset({
        name: webPageName || webPageUrl,
        url: webPageUrl,
      });
      showToast?.('Web page added successfully!', 'success');
      setWebPageUrl('');
      setWebPageName('');
      onMediaAdded?.();
      onClose?.();
    } catch (error) {
      showToast?.(error.message || 'Failed to add web page', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    // For file tabs, open the file picker
    handleBrowse();
  };

  // Check if we should show the footer Upload button
  // Hide for tabs that have their own add buttons (webpages, images with URL, videos with external sources)
  const shouldShowFooterButton = () => {
    if (activeTab === 'webpages') return false;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div role="dialog" aria-modal="true" className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Media</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="w-5 h-5 text-gray-400 [&>svg]:w-5 [&>svg]:h-5">
              <X />
            </div>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#f26f21] border-b-2 border-[#f26f21]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'upload' && (
            <UploadTabContent onBrowse={handleBrowse} showToast={showToast} />
          )}
          {activeTab === 'images' && (
            <ImagesTabContent
              selectedType={selectedImageType}
              onSelectType={setSelectedImageType}
              onBrowse={handleBrowse}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              imageName={imageName}
              setImageName={setImageName}
              onAddImageUrl={handleAddImageUrl}
              loading={loading}
              showToast={showToast}
            />
          )}
          {activeTab === 'videos' && (
            <VideosTabContent
              selectedType={selectedVideoType}
              onSelectType={setSelectedVideoType}
              onBrowse={handleBrowse}
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              youtubeName={youtubeName}
              setYoutubeName={setYoutubeName}
              vimeoUrl={vimeoUrl}
              setVimeoUrl={setVimeoUrl}
              vimeoName={vimeoName}
              setVimeoName={setVimeoName}
              streamUrl={streamUrl}
              setStreamUrl={setStreamUrl}
              streamName={streamName}
              setStreamName={setStreamName}
              streamType={streamType}
              setStreamType={setStreamType}
              onAddYouTube={handleAddYouTube}
              onAddVimeo={handleAddVimeo}
              onAddStream={handleAddStream}
              loading={loading}
              showToast={showToast}
            />
          )}
          {activeTab === 'audio' && (
            <AudioTabContent
              selectedType={selectedAudioType}
              onSelectType={setSelectedAudioType}
              onBrowse={handleBrowse}
              youtubeUrl={youtubeUrl}
              setYoutubeUrl={setYoutubeUrl}
              youtubeName={youtubeName}
              setYoutubeName={setYoutubeName}
              vimeoUrl={vimeoUrl}
              setVimeoUrl={setVimeoUrl}
              vimeoName={vimeoName}
              setVimeoName={setVimeoName}
              streamUrl={streamUrl}
              setStreamUrl={setStreamUrl}
              streamName={streamName}
              setStreamName={setStreamName}
              streamType={streamType}
              setStreamType={setStreamType}
              onAddYouTube={handleAddYouTube}
              onAddVimeo={handleAddVimeo}
              onAddStream={handleAddStream}
              loading={loading}
              showToast={showToast}
            />
          )}
          {activeTab === 'documents' && (
            <DocumentsTabContent
              selectedType={selectedDocType}
              onSelectType={setSelectedDocType}
              onBrowse={handleBrowse}
            />
          )}
          {activeTab === 'webpages' && (
            <WebPagesTabContent
              url={webPageUrl}
              setUrl={setWebPageUrl}
              name={webPageName}
              setName={setWebPageName}
              onAdd={handleAddWebPage}
              loading={loading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {shouldShowFooterButton() && (
            <Button
              onClick={handleUpload}
              className="bg-[#f26f21] hover:bg-[#e05e10] text-white"
            >
              Upload
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default YodeckAddMediaModal;
