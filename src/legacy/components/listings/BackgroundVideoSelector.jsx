import { useState, useRef } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../Modal';
import Button from '../Button';
export const BackgroundVideoSelector = ({ isOpen, onClose, currentVideo, onSelect }) => {
  const [selectedVideo, setSelectedVideo] = useState(currentVideo || '');
  const fileInputRef = useRef(null);
  
  const stockVideos = [
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  ];
  
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      // Check file size (40MB limit)
      const maxSize = 40 * 1024 * 1024; // 40MB in bytes
      if (file.size > maxSize) {
        alert('Video file size must be less than 40MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedVideo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSave = () => {
    onSelect(selectedVideo);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={true} onClose={onClose} title="Select background video" size="large">
      <div className="space-y-4">
        {/* Stock Videos Thumbnails */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors bg-gray-50"
          >
            <Plus size={32} className="text-gray-400" />
          </button>
          {stockVideos.map((video, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedVideo(video)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selectedVideo === video ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
              }`}
              style={{ width: '168px', height: '96px' }}
            >
              <video 
                src={video} 
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
              />
            </button>
          ))}
        </div>
        
        {/* Current Background Preview */}
        <div>
          <label className="block text-sm font-medium mb-2">Current background</label>
          <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
            {selectedVideo ? (
              <video 
                src={selectedVideo} 
                className="w-full h-full object-cover" 
                muted 
                loop 
                autoPlay
                controls
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No video selected
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
