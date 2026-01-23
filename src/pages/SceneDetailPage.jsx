/**
 * SceneDetailPage
 *
 * Detail view for a single scene showing:
 * - Scene name and business type
 * - Preview/info about layout and playlists
 * - Quick actions to publish or edit components
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Tv,
  Layout,
  ListVideo,
  Edit,
  ExternalLink,
  Loader2,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Stethoscope,
  Home,
  Building,
  Car,
  Coffee,
  Building2,
  Check,
  Pencil,
  X,
  Palette,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchScene, updateScene, getDeviceCountByScene } from '../services/sceneService';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Inline,
  Stack,
} from '../design-system';
import { Button } from '../design-system';
import { Card, CardContent } from '../design-system';
import { Badge } from '../design-system';

import PublishSceneModal from '../components/scenes/PublishSceneModal';

// Business type config (same as ScenesPage)
const BUSINESS_TYPE_CONFIG = {
  restaurant: { label: 'Restaurant', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  salon: { label: 'Salon / Spa', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  gym: { label: 'Gym / Fitness', icon: Dumbbell, color: 'bg-blue-100 text-blue-600' },
  retail: { label: 'Retail Store', icon: ShoppingBag, color: 'bg-purple-100 text-purple-600' },
  medical: { label: 'Medical Office', icon: Stethoscope, color: 'bg-green-100 text-green-600' },
  realestate: { label: 'Real Estate', icon: Home, color: 'bg-indigo-100 text-indigo-600' },
  hotel: { label: 'Hotel / Lobby', icon: Building, color: 'bg-amber-100 text-amber-600' },
  auto: { label: 'Auto Dealer', icon: Car, color: 'bg-slate-100 text-slate-600' },
  coffee: { label: 'Coffee Shop', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  other: { label: 'Business', icon: Building2, color: 'bg-gray-100 text-gray-600' },
};

function getBusinessTypeConfig(type) {
  return BUSINESS_TYPE_CONFIG[type] || BUSINESS_TYPE_CONFIG.other;
}

// Info Card Component
function InfoCard({ title, subtitle, icon: Icon, iconBg, onEdit }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{title}</p>
        <p className="font-medium text-gray-900 truncate">{subtitle || 'Not assigned'}</p>
      </div>
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <ExternalLink className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default function SceneDetailPage({ sceneId, onNavigate, onShowToast }) {
  const { userProfile } = useAuth();
  const [scene, setScene] = useState(null);
  const [deviceCount, setDeviceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Load scene data
  useEffect(() => {
    if (sceneId) {
      loadScene();
    }
  }, [sceneId]);

  async function loadScene() {
    setLoading(true);
    setError(null);
    try {
      const [sceneData, count] = await Promise.all([
        fetchScene(sceneId),
        getDeviceCountByScene(sceneId),
      ]);
      setScene(sceneData);
      setDeviceCount(count);
      setEditedName(sceneData.name);
    } catch (err) {
      console.error('Error loading scene:', err);
      setError('Failed to load scene. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName() {
    if (!editedName.trim() || editedName === scene.name) {
      setIsEditingName(false);
      setEditedName(scene.name);
      return;
    }

    setSavingName(true);
    try {
      await updateScene(sceneId, { name: editedName.trim() });
      setScene((prev) => ({ ...prev, name: editedName.trim() }));
      setIsEditingName(false);
      onShowToast?.('Scene renamed successfully', 'success');
    } catch (err) {
      console.error('Error renaming scene:', err);
      onShowToast?.('Failed to rename scene', 'error');
    } finally {
      setSavingName(false);
    }
  }

  function handleCancelEdit() {
    setIsEditingName(false);
    setEditedName(scene.name);
  }

  function handleEditLayout() {
    if (scene?.layout_id) {
      onNavigate?.(`layout-editor-${scene.layout_id}`);
    }
  }

  function handleEditPlaylist() {
    if (scene?.primary_playlist_id) {
      onNavigate?.(`playlist-editor-${scene.primary_playlist_id}`);
    }
  }

  function handleBack() {
    onNavigate?.('scenes');
  }

  function handlePublishSuccess(count) {
    onShowToast?.(`Scene published to ${count} screen${count !== 1 ? 's' : ''}!`, 'success');
    // Refresh device count
    getDeviceCountByScene(sceneId).then(setDeviceCount);
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PageLayout>
    );
  }

  if (error || !scene) {
    return (
      <PageLayout>
        <div className="text-center py-32">
          <p className="text-red-600 mb-4">{error || 'Scene not found'}</p>
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Scenes
          </Button>
        </div>
      </PageLayout>
    );
  }

  const config = getBusinessTypeConfig(scene.business_type);
  const TypeIcon = config.icon;

  return (
    <PageLayout>
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Scenes
        </Button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Business type icon */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${config.color}`}>
              <TypeIcon className="w-7 h-7" />
            </div>

            {/* Name and type */}
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xl font-semibold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveName}
                    disabled={savingName}
                  >
                    {savingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={savingName}
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {scene.name}
                  </h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Badge variant="default">{config.label}</Badge>
                <Badge variant={deviceCount > 0 ? 'success' : 'default'}>
                  {deviceCount > 0
                    ? `${deviceCount} screen${deviceCount !== 1 ? 's' : ''}`
                    : 'Not published'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Primary actions */}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => onNavigate?.(`scene-editor-${sceneId}`)}>
              <Palette className="w-4 h-4 mr-2" />
              Edit Design
            </Button>
            <Button onClick={() => setShowPublishModal(true)}>
              <Tv className="w-4 h-4 mr-2" />
              Publish to Screen
            </Button>
          </div>
        </div>
      </div>

      {/* Preview section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main preview area */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Preview</h2>

              {/* Placeholder preview */}
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="text-center text-white">
                  <Tv className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm opacity-75">
                    This is what will be shown on your TV
                  </p>
                  {scene.layout && (
                    <p className="text-xs opacity-50 mt-2">
                      Layout: {scene.layout.name}
                      {scene.layout.width && scene.layout.height && (
                        <span className="ml-2">
                          ({scene.layout.width}x{scene.layout.height})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Publish this scene to your TV screens to see it in action.
                The scene uses the layout and playlist configurations shown on the right.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with linked content */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Scene Content</h3>

              <div className="space-y-3">
                {/* Layout */}
                <InfoCard
                  title="Layout"
                  subtitle={scene.layout?.name}
                  icon={Layout}
                  iconBg="bg-blue-100 text-blue-600"
                  onEdit={scene.layout_id ? handleEditLayout : undefined}
                />

                {/* Primary Playlist */}
                <InfoCard
                  title="Primary Playlist"
                  subtitle={scene.primary_playlist?.name}
                  icon={ListVideo}
                  iconBg="bg-orange-100 text-orange-600"
                  onEdit={scene.primary_playlist_id ? handleEditPlaylist : undefined}
                />

                {/* Secondary Playlist (if exists) */}
                {scene.secondary_playlist && (
                  <InfoCard
                    title="Secondary Playlist"
                    subtitle={scene.secondary_playlist.name}
                    icon={ListVideo}
                    iconBg="bg-purple-100 text-purple-600"
                    onEdit={scene.secondary_playlist_id ? () => onNavigate?.(`playlist-editor-${scene.secondary_playlist_id}`) : undefined}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-gray-900 mb-4">Quick Actions</h3>

              <div className="space-y-2">
                {scene.layout_id && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={handleEditLayout}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Layout
                  </Button>
                )}

                {scene.primary_playlist_id && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={handleEditPlaylist}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Playlist
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => onNavigate?.('screens')}
                >
                  <Tv className="w-4 h-4 mr-2" />
                  Manage Screens
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Publish Modal */}
      <PublishSceneModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        scene={scene}
        tenantId={userProfile?.id}
        onSuccess={handlePublishSuccess}
      />
    </PageLayout>
  );
}
