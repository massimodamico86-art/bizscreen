import { X } from 'lucide-react';
import Button from '../Button';

export const BackgroundMediaManager = ({
  formData,
  setFormData,
  backgroundMode,
  setBackgroundMode,
  setShowBackgroundSelector,
  setShowBackgroundVideoSelector,
  setShowMusicSelector
}) => {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Background media</h3>
          {/* Toggle Switch */}
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${backgroundMode === 'image' ? 'text-blue-600' : 'text-gray-500'}`}>
              Image
            </span>
            <button
              onClick={() => {
                // Toggle between modes
                if (backgroundMode === 'image') {
                  setBackgroundMode('video');
                  setFormData({ ...formData, backgroundImage: '', backgroundVideo: '' });
                } else {
                  setBackgroundMode('image');
                  setFormData({ ...formData, backgroundVideo: '', backgroundImage: '' });
                }
              }}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-blue-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  backgroundMode === 'video' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${backgroundMode === 'video' ? 'text-blue-600' : 'text-gray-500'}`}>
              Video
            </span>
          </div>
        </div>

        {/* Image Section - shown in image mode */}
        {backgroundMode === 'image' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Background image</label>
            {formData.backgroundImage && (
              <div className="rounded-lg overflow-hidden border border-gray-200 relative">
                <img
                  src={formData.backgroundImage}
                  alt="Background preview"
                  className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowBackgroundSelector(true)}
                />
                <button
                  onClick={() => setFormData({ ...formData, backgroundImage: '' })}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg hover:bg-red-50"
                >
                  <X size={16} className="text-red-500" />
                </button>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBackgroundSelector(true)}
              className="w-full"
            >
              Browse
            </Button>
          </div>
        )}

        {/* Video Section - shown in video mode */}
        {backgroundMode === 'video' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Background video</label>
            {formData.backgroundVideo && (
              <div className="rounded-lg overflow-hidden border border-gray-200 relative">
                <video
                  src={formData.backgroundVideo}
                  className="w-full h-32 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowBackgroundVideoSelector(true)}
                  muted
                  loop
                  autoPlay
                />
                <button
                  onClick={() => setFormData({ ...formData, backgroundVideo: '' })}
                  className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-lg hover:bg-red-50"
                >
                  <X size={16} className="text-red-500" />
                </button>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowBackgroundVideoSelector(true)}
              className="w-full"
            >
              Browse
            </Button>
            <p className="text-xs text-gray-500">
              Max 40MB (.mp4, .mov, .mks, .webm)
            </p>
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Background music</h3>
        <div className="space-y-3">
          <div>
            {formData.backgroundMusic ? (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-2xl">🎵</div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Music Selected</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        {formData.backgroundMusic.substring(0, 40)}...
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setFormData({ ...formData, backgroundMusic: '' })}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center text-gray-500 text-sm">
                No music selected
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => setShowMusicSelector(true)}
          >
            Browse Music Library
          </Button>
        </div>
      </div>
    </div>
  );
};
