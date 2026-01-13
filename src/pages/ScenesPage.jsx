/**
 * ScenesPage
 *
 * Lists all scenes for the current tenant with options to:
 * - Open scene detail
 * - Publish scene to screens
 * - Create new scene
 */

import { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Tv,
  ArrowRight,
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
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/formatters';
import { fetchScenesWithDeviceCounts } from '../services/sceneService';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Grid,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { EmptyState } from '../design-system';

import PublishSceneModal from '../components/scenes/PublishSceneModal';

// Business type labels and icons
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

// Scene Card Component
function SceneCard({ scene, onOpenScene, onPublish }) {
  const config = getBusinessTypeConfig(scene.business_type);
  const Icon = config.icon;
  const deviceCount = scene.deviceCount || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header with icon and badge */}
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color}`}>
            <Icon className="w-6 h-6" />
          </div>
          <Badge variant={deviceCount > 0 ? 'success' : 'default'}>
            {deviceCount > 0 ? `${deviceCount} screen${deviceCount !== 1 ? 's' : ''}` : 'Not published'}
          </Badge>
        </div>

        {/* Scene info */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {scene.name}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {config.label}
        </p>

        {/* Layout & Playlist info */}
        <div className="text-xs text-gray-400 mb-4 space-y-1">
          {scene.layout && (
            <p className="truncate">Layout: {scene.layout.name}</p>
          )}
          {scene.primary_playlist && (
            <p className="truncate">Playlist: {scene.primary_playlist.name}</p>
          )}
          {!scene.layout && !scene.primary_playlist && (
            <p>No content assigned</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onPublish(scene)}
          >
            <Tv className="w-4 h-4 mr-1.5" />
            Publish
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onOpenScene(scene)}
          >
            Open
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScenesPage({ onNavigate, onShowToast, onShowAutoBuild }) {
  const { userProfile } = useAuth();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishModalScene, setPublishModalScene] = useState(null);

  // Fetch scenes on mount
  useEffect(() => {
    if (userProfile?.id) {
      loadScenes();
    }
  }, [userProfile?.id]);

  async function loadScenes() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScenesWithDeviceCounts(userProfile.id);
      setScenes(data);
    } catch (err) {
      console.error('Error loading scenes:', err);
      setError('Failed to load scenes. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenScene(scene) {
    onNavigate?.(`scene-detail-${scene.id}`);
  }

  function handlePublish(scene) {
    setPublishModalScene(scene);
  }

  function handlePublishSuccess(count) {
    onShowToast?.(`Scene published to ${count} screen${count !== 1 ? 's' : ''}!`, 'success');
    loadScenes(); // Refresh to update device counts
  }

  function handleCreateScene() {
    // Trigger the autobuild onboarding modal
    if (onShowAutoBuild) {
      onShowAutoBuild();
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title="Scenes"
        description="Manage your TV scenes - complete configurations ready to publish to screens"
        actions={
          <Button onClick={handleCreateScene}>
            <Sparkles className="w-4 h-4 mr-2" />
            Create Scene
          </Button>
        }
      />

      <PageContent>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <Button variant="secondary" onClick={loadScenes}>
              Try Again
            </Button>
          </div>
        ) : scenes.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-12 h-12" />}
            title="No scenes yet"
            description="Create your first scene to get started. Our AI will help you set up a complete TV configuration in seconds."
            action={
              <Button onClick={handleCreateScene}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate My First Scene
              </Button>
            }
          />
        ) : (
          <Grid cols={{ default: 1, sm: 2, lg: 3 }} gap="lg">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                scene={scene}
                onOpenScene={handleOpenScene}
                onPublish={handlePublish}
              />
            ))}
          </Grid>
        )}
      </PageContent>

      {/* Publish Modal */}
      <PublishSceneModal
        isOpen={!!publishModalScene}
        onClose={() => setPublishModalScene(null)}
        scene={publishModalScene}
        tenantId={userProfile?.id}
        onSuccess={handlePublishSuccess}
      />
    </PageLayout>
  );
}
