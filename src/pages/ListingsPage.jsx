import { useState } from 'react';
import { Search, Plus, Download, Filter, MapPin, Tv, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card, Badge } from '../design-system';
import { useTranslation } from '../i18n';
import { PropertyDetailsModal } from '../components/listings/PropertyDetailsModal';
import { TVPreviewModal } from '../components/listings/TVPreviewModal';
import { AddListingModal } from '../components/listings/AddListingModal';
import { downloadListingsCSV } from '../services/exportService';
import ErrorBoundary from '../components/ErrorBoundary';
import { getSupabaseErrorMessage, logError } from '../utils/errorMessages';
import { convertToLegacyFormat } from '../utils/mediaMigration';
import { useLogger } from '../hooks/useLogger.js';

const ListingsPage = ({ showToast, listings, setListings }) => {
  const logger = useLogger('ListingsPage');
