import { useRef, useState } from 'react';
import { Plus, X, Volume2, VolumeX } from 'lucide-react';
import ImageUploadButton from '../media/ImageUploadButton';
import { useCloudinaryUpload } from '../../hooks/useCloudinaryUpload';

export const CarouselMediaManager = ({ formData, setFormData, showToast }) => {
  const videoInputRef = useRef(null);
  const [videoUploading, setVideoUploading] = useState(false);

  const carouselVideos = formData.carouselVideos || [];

  // Cloudinary upload for video
  const openVideoUploadWidget = useCloudinaryUpload({
    folder: 'bizscreen/carousel-videos',
    allowedFormats: ['mp4', 'webm'],
    resourceType: 'video',
    multiple: false,
    onSuccess: (uploadedFile) => {
      setVideoUploading(false);

      // Validate duration (max 2 minutes = 120 seconds)
      if (uploadedFile.duration && uploadedFile.duration > 120) {
        showToast('Video must be 2 minutes or shorter');
        return;
      }

      const newVideo = {
        url: uploadedFile.optimizedUrl,
        muted: true
      };
      setFormData({
        ...formData,
        carouselVideos: [...(formData.carouselVideos || []), newVideo]
      });
      showToast('Video uploaded successfully!');
    },
    onError: (error) => {
      setVideoUploading(false);
      showToast(error?.message || 'Failed to upload video');
    }
  });

  // Validate video file locally before uploading via Cloudinary widget
  const handleVideoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected
    e.target.value = '';

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      showToast('Only MP4 and WebM formats are accepted');
      return;
    }

    // Validate duration using a temporary video element
    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > 120) {
        showToast('Video must be 2 minutes or shorter');
        return;
      }

      // Duration is valid -- use Cloudinary widget for actual upload
      setVideoUploading(true);
      openVideoUploadWidget();
    };
    videoEl.onerror = () => {
      URL.revokeObjectURL(videoEl.src);
      showToast('Could not read video file');
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const deleteVideo = (idx) => {
    const newVideos = carouselVideos.filter((_, i) => i !== idx);
    setFormData({ ...formData, carouselVideos: newVideos });
  };

  const toggleMute = (idx) => {
    const newVideos = carouselVideos.map((v, i) =>
      i === idx ? { ...v, muted: !v.muted } : v
    );
    setFormData({ ...formData, carouselVideos: newVideos });
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Carousel Media</h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Images</label>
            <span className="text-xs text-gray-500">
              {(formData.carouselImages || []).length}/6
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            (Aspect ratio should be either 3:2 or 2:3:1)
          </p>

          {/* Image Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Existing Images */}
            {(formData.carouselImages || []).map((img, idx) => (
              <div
                key={idx}
                className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-gray-300 transition-colors group"
              >
                <img
                  src={img}
                  alt={`Carousel ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newImages = (formData.carouselImages || []).filter((_, i) => i !== idx);
                    setFormData({ ...formData, carouselImages: newImages });
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ))}

            {/* Add New Image Button */}
            {(!formData.carouselImages || formData.carouselImages.length < 6) && (
              <div className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 p-2">
                <ImageUploadButton
                  onImageUploaded={(imageUrl) => {
                    const currentImages = formData.carouselImages || [];
                    setFormData({
                      ...formData,
                      carouselImages: [...currentImages, imageUrl]
                    });
                  }}
                  buttonText="Add Image"
                  buttonVariant="ghost"
                  folder="bizscreen/carousel"
                  transformation={{
                    width: 1200,
                    height: 800,
                    crop: 'fill',
                    quality: 'auto'
                  }}
                  className="w-full h-full flex flex-col items-center justify-center"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Video</label>
            <span className="text-xs text-gray-500">{carouselVideos.length}/1</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            MP4 or WebM format, max 2 minutes
          </p>

          {/* Video Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Existing Videos */}
            {carouselVideos.map((video, idx) => (
              <div
                key={idx}
                className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-200 group"
              >
                <video
                  src={video.url}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                {/* Delete Button */}
                <button
                  onClick={() => deleteVideo(idx)}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
                {/* Mute/Unmute Toggle */}
                <button
                  onClick={() => toggleMute(idx)}
                  className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center shadow-lg hover:bg-black/80 transition-colors"
                  title={video.muted ? 'Unmute' : 'Mute'}
                >
                  {video.muted ? (
                    <VolumeX size={14} className="text-white" />
                  ) : (
                    <Volume2 size={14} className="text-white" />
                  )}
                </button>
              </div>
            ))}

            {/* Upload Video Button */}
            {carouselVideos.length < 1 && (
              <div className="aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 hover:border-gray-400 transition-colors">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={handleVideoFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => {
                    if (videoUploading) return;
                    // Open Cloudinary widget directly for simplicity
                    setVideoUploading(true);
                    openVideoUploadWidget();
                  }}
                  disabled={videoUploading}
                  className="w-full h-full flex flex-col items-center justify-center"
                >
                  {videoUploading ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-gray-400 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs text-gray-500">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={24} className="text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Upload Video</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
