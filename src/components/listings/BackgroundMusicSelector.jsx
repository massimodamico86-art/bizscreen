import { useState } from 'react';
export const BackgroundMusicSelector = ({ isOpen, onClose, currentMusic, onSelect }) => {
  const [selectedMusic, setSelectedMusic] = useState(currentMusic || '');
  
  const musicOptions = [
    {
      id: 'none',
      name: 'No Music',
      url: '',
      description: 'Silent/No background music',
      icon: '🔇'
    },
    {
      id: 'calm-piano',
      name: 'Calm Piano',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      description: 'Relaxing piano melody',
      icon: '🎹'
    },
    {
      id: 'ambient-lounge',
      name: 'Ambient Lounge',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      description: 'Smooth ambient background',
      icon: '🎵'
    },
    {
      id: 'spa-relaxation',
      name: 'Spa & Relaxation',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      description: 'Tranquil spa music',
      icon: '🧘'
    },
    {
      id: 'upbeat-jazz',
      name: 'Upbeat Jazz',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      description: 'Light jazz background',
      icon: '🎺'
    },
    {
      id: 'nature-sounds',
      name: 'Nature Sounds',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      description: 'Ocean waves and birds',
      icon: '🌊'
    },
    {
      id: 'classical',
      name: 'Classical',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
      description: 'Elegant classical music',
      icon: '🎻'
    }
  ];
  
  const handleSave = () => {
    onSelect(selectedMusic);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={true} onClose={onClose} title="Select background music" size="medium">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose background music for your TV display
        </p>
        
        {/* Music Options Grid */}
        <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
          {musicOptions.map((music) => (
            <button
              key={music.id}
              onClick={() => setSelectedMusic(music.url)}
              className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                selectedMusic === music.url
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{music.icon}</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{music.name}</div>
                  <div className="text-sm text-gray-600 mt-1">{music.description}</div>
                </div>
                {selectedMusic === music.url && (
                  <div className="flex-shrink-0">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* Custom URL Option */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Or enter custom music URL</label>
          <input
            type="text"
            value={selectedMusic && !musicOptions.find(m => m.url === selectedMusic) ? selectedMusic : ''}
            onChange={(e) => setSelectedMusic(e.target.value)}
            placeholder="https://example.com/music.mp3"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Supported formats: MP3, WAV, OGG
          </p>
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
