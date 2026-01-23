/**
 * LayoutsPage - OptiSigns-style Template Gallery
 *
 * Features:
 * - Left sidebar with collapsible filter categories
 * - Hero section with search and quick tags
 * - Template sections: Featured, Popular, by Category
 * - Direct template opening in Polotno editor
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Sparkles,
  Clock,
  Star,
  TrendingUp,
  Folder,
  Gift,
  Percent,
  Calendar,
  Utensils,
  ShoppingBag,
  Dumbbell,
  Building2,
  Music,
  Shirt,
  LayoutGrid,
  Plus,
  Loader2,
  Wand2,
  ChevronLeft,
} from 'lucide-react';
import { getLayoutTemplates } from '../services/templateService';
import { fetchLayouts } from '../services/layoutService';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Sidebar categories matching OptiSigns
 */
const SIDEBAR_CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'featured', label: 'Featured', icon: Star, special: true },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
  { id: 'your-templates', label: 'Your Templates', icon: Folder },
  { id: 'recent', label: 'Recent Designs', icon: Clock },
  { id: 'divider-1', type: 'divider' },
  { id: 'holidays', label: 'Holidays and Observances', icon: Gift },
  { id: 'sales', label: 'Seasonal Promotions', icon: Percent },
  { id: 'general', label: 'Occasions', icon: Calendar },
  { id: 'restaurant', label: 'Menu', icon: Utensils },
  { id: 'restaurant-2', label: 'Restaurants', icon: Utensils },
  { id: 'retail', label: 'Retail', icon: ShoppingBag },
  { id: 'gym', label: 'Fitness', icon: Dumbbell },
  { id: 'welcome', label: 'Corporate', icon: Building2 },
  { id: 'music', label: 'Entertainment', icon: Music },
  { id: 'fashion', label: 'Fashion', icon: Shirt },
];

/**
 * Quick search tags for hero section
 */
const QUICK_TAGS = [
  'Holiday Sale Promotion',
  'Winter Safety Announcement',
  'Year-End Employee Recognition',
  'Upcoming New Year Event',
  'Winter Menu Specials',
];

/**
 * Industries filter
 */
const INDUSTRIES = [
  { id: 'retail', label: 'Retail' },
  { id: 'hospitality', label: 'Hospitality' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'corporate', label: 'Corporate' },
];

const PAGE_SIZE = 20;

const LayoutsPage = ({ showToast, onNavigate }) => {
  const logger = useLogger('LayoutsPage');
