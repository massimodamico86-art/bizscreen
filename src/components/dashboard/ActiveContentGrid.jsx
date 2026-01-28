/**
 * ActiveContentGrid Component
 * Shows thumbnail previews of content currently playing on screens.
 */
import { Monitor, Wifi, WifiOff, Image } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system';

export function ActiveContentGrid({ screens = [], onNavigate, loading = false }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-gray-400" />
            Active Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-video bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!screens || screens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-gray-400" />
            Active Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Monitor className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No screens connected yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        actions={
          <button
            onClick={() => onNavigate?.('screens')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            View all
          </button>
        }
      >
        <CardTitle className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-gray-400" />
          Active Content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {screens.slice(0, 8).map((screen) => (
            <button
              key={screen.id}
              onClick={() => onNavigate?.('screens')}
              className="group relative aspect-video bg-gray-100 rounded-lg overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
            >
              {/* Placeholder or thumbnail */}
              {screen.thumbnail_url ? (
                <img
                  src={screen.thumbnail_url}
                  alt={screen.device_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
              )}
              {/* Overlay with screen name */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <p className="text-white text-xs font-medium truncate w-full">
                  {screen.device_name || 'Unnamed'}
                </p>
              </div>
              {/* Online indicator */}
              <div className="absolute top-2 right-2">
                {screen.isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-green-400 drop-shadow" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-gray-400 drop-shadow" />
                )}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ActiveContentGrid;
