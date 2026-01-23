/**
 * Template Marketplace Page
 *
 * Browse and install scene templates from the marketplace.
 * Supports filtering by category, license tier, and search.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageLayout from '../design-system/components/PageLayout';
import {
  fetchMarketplaceTemplates,
  fetchCategories,
  LICENSE_LABELS,
} from '../services/marketplaceService';
import TemplatePreviewModal from '../components/TemplatePreviewModal';
import { useLogger } from '../hooks/useLogger.js';

// License badge colors
const LICENSE_COLORS = {
  free: 'bg-green-100 text-green-800',
  pro: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

export default function TemplateMarketplacePage() {
  const logger = useLogger('TemplateMarketplacePage');
