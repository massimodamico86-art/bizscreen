import { useState, useEffect } from 'react';
import {
  Building2, Users, Monitor, Key, AlertTriangle, Globe,
  RefreshCw, ExternalLink, Search, ChevronRight, Clock,
  CheckCircle2, XCircle, Wifi, WifiOff, Activity
} from 'lucide-react';
import { Button, Card, Badge, Alert, EmptyState } from '../design-system';
import { useTranslation } from '../i18n';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Operations Console Page
 * Provides super_admin tools for managing tenants and monitoring system health.
 */
export default function OpsConsolePage() {
  const logger = useLogger('OpsConsolePage');
