import { useState, useEffect } from 'react';
export const BackgroundImageSelector = ({ isOpen, onClose, currentImage, onSelect }) => {
  const [selectedImage, setSelectedImage] = useState(currentImage || '');

  // Update selected image when currentImage prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedImage(currentImage || '');
    }
  }, [isOpen, currentImage]);

  const stockImages = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=3840',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=3840',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=3840',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=3840',
    'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=3840',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=3840',
    'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=3840',
    'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=3840',
  ];

  const handleImageUploaded = (imageUrl) => {
    setSelectedImage(imageUrl);
  };
  
  const handleSave = () => {
    onSelect(selectedImage);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={true} onClose={onClose} title="Select background image" size="large">
      <div className="space-y-4">
        {/* Upload Your Own */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Upload your own image</label>
          <ImageUploadButton
            onImageUploaded={handleImageUploaded}
            buttonText="Upload from Computer"
            folder="bizscreen/backgrounds"
            transformation={{
              width: 1920,
              height: 1080,
              crop: 'fill',
              quality: 'auto'
            }}
          />
        </div>

        {/* Stock Images Thumbnails */}
        <div>
          <label className="block text-sm font-medium mb-2">Or choose from stock images</label>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stockImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === img ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ height: '96px' }}
              >
                <img
                  src={img}
                  alt={`Option ${idx + 1}`}
                  className="h-full object-cover"
                  style={{ width: 'auto', maxWidth: '200px' }}
                />
              </button>
            ))}
          </div>
        </div>
        
        {/* Current Background Preview */}
        <div>
          <label className="block text-sm font-medium mb-2">Current background</label>
          <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {selectedImage ? (
              <img src={selectedImage} alt="Selected background" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No image selected
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};
