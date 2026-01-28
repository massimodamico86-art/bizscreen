/**
 * TimelineActivity Component
 * Shows recent activity in timeline format with connecting line.
 */
import { Activity, ListVideo, Image, Video, Upload, Edit, PlusCircle, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../design-system';
import { formatLastSeen } from '../../services/dashboardService';

export function TimelineActivity({ activities = [], onNavigate, loading = false }) {
  const getActivityIcon = (activity) => {
    if (activity.type === 'playlist') return <ListVideo className="w-4 h-4 text-purple-600" />;
    if (activity.mediaType === 'video') return <Video className="w-4 h-4 text-blue-600" />;
    return <Image className="w-4 h-4 text-orange-600" />;
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'created': return <PlusCircle className="w-3 h-3" />;
      case 'updated': return <Edit className="w-3 h-3" />;
      case 'uploaded': return <Upload className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-400" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-4">
            {activities.map((activity) => (
              <button
                key={`${activity.type}-${activity.id}`}
                onClick={() => onNavigate?.(activity.type === 'playlist' ? 'playlists' : 'media-all')}
                className="relative flex items-start gap-4 w-full text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0 w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={activity.name}>
                    {activity.name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    {getActionIcon(activity.action)}
                    <span className="capitalize">{activity.action}</span>
                    <span className="text-gray-300 mx-1">·</span>
                    {formatLastSeen(activity.timestamp)}
                  </p>
                </div>

                {/* Thumbnail if available */}
                {activity.thumbnail && (
                  <img
                    src={activity.thumbnail}
                    alt=""
                    className="w-10 h-10 object-cover rounded flex-shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TimelineActivity;
