import {
  generateMediaId,
  validateRotationInterval,
  MEDIA_CONSTRAINTS
} from '../../types/media';

/**
 * Unified Media Section Component
 * Replaces both CarouselMediaManager and BackgroundMediaManager
 *
 * Manages images and videos with:
 * - Predefined library selection (multi-select)
 * - Uploaded media management
 * - Image rotation interval control
 * - Video playlist support
 */
export const MediaSection = ({ unifiedMediaState, onChange, showToast }) => {
  const { activeType, imageItems, videoItems, imageRotationIntervalSeconds } = unifiedMediaState;

  // Predefined media libraries
  const predefinedImages = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=3840',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3840',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=3840',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=3840',
    'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=3840',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=3840',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=3840',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=3840',
  ];

  const predefinedVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  ];

  // Get currently selected predefined items
  const selectedPredefinedImages = imageItems.filter(item => item.source === 'predefined');
  const selectedPredefinedVideos = videoItems.filter(item => item.source === 'predefined');
  const uploadedImages = imageItems.filter(item => item.source === 'uploaded');
  const uploadedVideos = videoItems.filter(item => item.source === 'uploaded');

  // Check if an image/video is selected
  const isPredefinedImageSelected = (url) =>
    selectedPredefinedImages.some(item => item.url === url);

  const isPredefinedVideoSelected = (url) =>
    selectedPredefinedVideos.some(item => item.url === url);

  // Toggle predefined image selection
  const togglePredefinedImage = (url) => {
    const isSelected = isPredefinedImageSelected(url);
    let newImageItems;

    if (isSelected) {
      // Remove it
      newImageItems = imageItems.filter(item => !(item.source === 'predefined' && item.url === url));
    } else {
      // Add it
      newImageItems = [...imageItems, { id: generateMediaId(), url, source: 'predefined' }];
    }

    onChange({
      ...unifiedMediaState,
      activeType: 'image',
      imageItems: newImageItems
    });
  };

  // Toggle predefined video selection
  const togglePredefinedVideo = (url) => {
    const isSelected = isPredefinedVideoSelected(url);
    let newVideoItems;

    if (isSelected) {
      // Remove it
      newVideoItems = videoItems.filter(item => !(item.source === 'predefined' && item.url === url));
    } else {
      // Add it
      newVideoItems = [...videoItems, { id: generateMediaId(), url, source: 'predefined' }];
    }

    onChange({
      ...unifiedMediaState,
      activeType: 'video',
      videoItems: newVideoItems
    });
  };

  // Handle image upload
  const handleImageUpload = (imageUrl) => {
    if (uploadedImages.length >= MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES) {
      showToast(`Maximum of ${MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES} uploaded images reached`, 'error');
      return;
    }

    const newImageItems = [...imageItems, {
      id: generateMediaId(),
      url: imageUrl,
      source: 'uploaded'
    }];

    onChange({
      ...unifiedMediaState,
      activeType: 'image',
      imageItems: newImageItems
    });

    showToast('Image uploaded successfully!');
  };

  // Handle video upload
  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!MEDIA_CONSTRAINTS.ALLOWED_VIDEO_FORMATS.includes(fileExt)) {
      showToast(`Video must be in ${MEDIA_CONSTRAINTS.ALLOWED_VIDEO_FORMATS.join(', ')} format`, 'error');
      return;
    }

    // Validate file size
    const maxSizeBytes = MEDIA_CONSTRAINTS.MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showToast(`Video file size must be less than ${MEDIA_CONSTRAINTS.MAX_VIDEO_SIZE_MB}MB`, 'error');
      return;
    }

    // Convert to data URL
    const reader = new FileReader();
    reader.onloadend = () => {
      const newVideoItems = [...videoItems, {
        id: generateMediaId(),
        url: reader.result,
        source: 'uploaded'
      }];

      onChange({
        ...unifiedMediaState,
        activeType: 'video',
        videoItems: newVideoItems
      });

      showToast('Video uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

  // Delete uploaded image
  const deleteImage = (id) => {
    const newImageItems = imageItems.filter(item => item.id !== id);
    onChange({
      ...unifiedMediaState,
      imageItems: newImageItems
    });
  };

  // Delete uploaded video
  const deleteVideo = (id) => {
    const newVideoItems = videoItems.filter(item => item.id !== id);
    onChange({
      ...unifiedMediaState,
      videoItems: newVideoItems
    });
  };

  // Handle rotation interval change
  const handleIntervalChange = (e) => {
    const value = e.target.value;
    const validatedValue = validateRotationInterval(value);

    onChange({
      ...unifiedMediaState,
      imageRotationIntervalSeconds: validatedValue
    });
  };

  // Switch tab (activeType)
  const switchTab = (type) => {
    onChange({
      ...unifiedMediaState,
      activeType: type
    });
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-4">Media Management</h3>

      {/* Tab Selector */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => switchTab('image')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeType === 'image'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon size={16} />
            <span>Photo</span>
          </div>
        </button>
        <button
          onClick={() => switchTab('video')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeType === 'video'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <VideoIcon size={16} />
            <span>Video</span>
          </div>
        </button>
      </div>

      {/* PHOTO TAB */}
      {activeType === 'image' && (
        <div className="space-y-4">
          {/* Predefined Image Library */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Choose from library (click to select multiple)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {predefinedImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => togglePredefinedImage(img)}
                  className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    isPredefinedImageSelected(img)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img src={img} alt={`Stock ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedPredefinedImages.length} selected from library
            </p>
          </div>

          {/* Uploaded Images */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Uploaded images ({uploadedImages.length}/{MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200">
                  <img src={img.url} alt="Uploaded" className="w-full h-full object-cover" />
                  <button
                    onClick={() => deleteImage(img.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              {uploadedImages.length < MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES && (
                <div className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                  <ImageUploadButton
                    onImageUploaded={handleImageUpload}
                    buttonText="Upload"
                    buttonVariant="ghost"
                    folder="bizscreen/media"
                    transformation={{
                      width: 1920,
                      height: 1080,
                      crop: 'fill',
                      quality: 'auto'
                    }}
                    className="w-full h-full flex flex-col items-center justify-center"
                  />
                </div>
              )}
            </div>
            {uploadedImages.length >= MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES && (
              <p className="text-xs text-orange-600 mt-1">
                Maximum of {MEDIA_CONSTRAINTS.MAX_UPLOADED_IMAGES} uploaded images reached
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Recommended aspect ratio: 3:2 or 2.3:1
            </p>
          </div>

          {/* Image Rotation Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Image rotation
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Change image every</span>
              <input
                type="number"
                min={MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MIN}
                max={MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MAX}
                value={imageRotationIntervalSeconds}
                onChange={handleIntervalChange}
                className="w-20 px-2 py-1 border rounded text-center"
              />
              <span className="text-sm text-gray-600">seconds</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Range: {MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MIN}-{MEDIA_CONSTRAINTS.IMAGE_ROTATION_INTERVAL_MAX} seconds
            </p>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-900 mb-1">Total: {imageItems.length} images</div>
            <div className="text-blue-700">
              {imageItems.length === 0 && 'No background (neutral placeholder)'}
              {imageItems.length === 1 && 'Static background (single image)'}
              {imageItems.length > 1 && `Carousel rotating every ${imageRotationIntervalSeconds} seconds`}
            </div>
          </div>
        </div>
      )}

      {/* VIDEO TAB */}
      {activeType === 'video' && (
        <div className="space-y-4">
          {/* Predefined Video Library */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Choose from library (click to select multiple)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {predefinedVideos.map((video, idx) => (
                <button
                  key={idx}
                  onClick={() => togglePredefinedVideo(video)}
                  className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    isPredefinedVideoSelected(video)
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <video src={video} className="w-full h-full object-cover" muted loop autoPlay />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {selectedPredefinedVideos.length} selected from library
            </p>
          </div>

          {/* Uploaded Videos */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Uploaded videos ({uploadedVideos.length})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {uploadedVideos.map((video) => (
                <div key={video.id} className="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200">
                  <video src={video.url} className="w-full h-full object-cover" muted loop autoPlay />
                  <button
                    onClick={() => deleteVideo(video.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}

              {/* Upload Button */}
              <label className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:border-gray-400 transition-colors">
                <Plus size={24} className="text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Upload Video</span>
                <input
                  type="file"
                  accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/x-matroska,video/webm"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Max {MEDIA_CONSTRAINTS.MAX_VIDEO_SIZE_MB}MB, formats: {MEDIA_CONSTRAINTS.ALLOWED_VIDEO_FORMATS.join(', ')}
            </p>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="font-medium text-blue-900 mb-1">Total: {videoItems.length} videos</div>
            <div className="text-blue-700">
              {videoItems.length === 0 && 'No background (neutral placeholder)'}
              {videoItems.length === 1 && 'Single video (loops automatically)'}
              {videoItems.length > 1 && `Playlist (${videoItems.length} videos, advances on video end)`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
