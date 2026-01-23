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
import { useLogger } from '../hooks/useLogger.js';

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
  const logger = useLogger('SceneDetailPage');
