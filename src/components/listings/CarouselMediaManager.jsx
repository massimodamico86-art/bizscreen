import { Plus, X, Edit } from 'lucide-react';
import ImageUploadButton from '../ImageUploadButton';

export const CarouselMediaManager = ({ formData, setFormData, showToast }) => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Carousel Media</h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">📷 Images</label>
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
            <label className="text-sm font-medium">🎥 Video</label>
            <span className="text-xs text-gray-500">0/1</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            (Video must be in .mp4, .mov, .mks or .webm format; maximum size 40MB)
          </p>
          <button
            onClick={() => showToast('Video upload coming soon!')}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-8 flex items-center justify-center hover:border-gray-400 transition-colors"
          >
            <Plus size={24} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
