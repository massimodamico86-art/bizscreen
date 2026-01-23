/**
 * SceneEditorPage
 *
 * Full-screen Canva-style editor for scene slides.
 * Features:
 * - Top bar with scene info and actions
 * - Left slide strip for navigation
 * - Center 16:9 canvas with drag-drop blocks
 * - Right properties panel + AI suggestions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Plus,
  Tv,
  Type,
  Image,
  Square,
  Clock,
  Sparkles,
  Check,
  Loader2,
  Undo2,
  Redo2,
  Trash2,
  Wand2,
  Eye,
  Edit3,
  MonitorPlay,
  X,
  Database,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchScene } from '../services/sceneService';
import {
  fetchSlidesForScene,
  createSlide,
  updateSlide,
  deleteSlide,
  getDefaultDesign,
  createTextBlock,
  createImageBlock,
  createShapeBlock,
  createWidgetBlock,
  addBlockToDesign,
  updateBlockInDesign,
  removeBlockFromDesign,
  normalizeSlide,
} from '../services/sceneDesignService';
import {
  getPresetsForBusinessType,
  getAiQuickActions,
} from '../services/sceneAiService';
import { getBrandTheme, getThemedBlockDefaults } from '../services/brandThemeService';

// Components
import EditorCanvas from '../components/scene-editor/EditorCanvas';
import SlideStrip from '../components/scene-editor/SlideStrip';
import PropertiesPanel from '../components/scene-editor/PropertiesPanel';
import AiSuggestionsPanel from '../components/scene-editor/AiSuggestionsPanel';
import IndustryWizardModal from '../components/scene-editor/IndustryWizardModal';
import DataBoundWizardModal from '../components/scene-editor/DataBoundWizardModal';
import LivePreviewWindow, { InlinePreview } from '../components/scene-editor/LivePreviewWindow';
import { emitDesignChange } from '../services/deviceSyncService';

import { Button } from '../design-system';
import { Badge } from '../design-system';
import { useLogger } from '../hooks/useLogger.js';

// Business type config
const BUSINESS_TYPE_LABELS = {
  restaurant: 'Restaurant',
  salon: 'Salon / Spa',
  gym: 'Gym / Fitness',
  retail: 'Retail Store',
  medical: 'Medical Office',
  realestate: 'Real Estate',
  hotel: 'Hotel / Lobby',
  auto: 'Auto Dealer',
  coffee: 'Coffee Shop',
  other: 'Business',
};

export default function SceneEditorPage({ sceneId, onNavigate, onShowToast }) {
  const logger = useLogger('SceneEditorPage');
