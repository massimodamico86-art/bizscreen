/**
 * HelpCenterPage - In-App Help Center
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Monitor,
  ListVideo,
  Layout,
  Zap,
  LayoutTemplate,
  CreditCard,
  BookOpen,
  ExternalLink,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  EmptyState
} from '../design-system';
import { SafeHTML } from '../security';
import {
  HELP_CATEGORIES,
  searchHelpTopics,
  getHelpTopic,
  getTopicsByCategory,
} from '../services/helpService';

const CATEGORY_ICONS = {
  getting_started: Rocket,
  screens: Monitor,
  playlists: ListVideo,
  layouts: Layout,
  campaigns: Zap,
  templates: LayoutTemplate,
  billing: CreditCard
};

export default function HelpCenterPage({ onNavigate }) {
  const logger = useLogger('HelpCenterPage');
