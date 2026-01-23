import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Database, CreditCard, Mail, Cloud, Cpu, Monitor,
  Wifi, WifiOff, Clock, Server, Activity, Gauge,
  BarChart2, TrendingUp, Zap, HardDrive
} from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert
} from '../design-system';
import { supabase } from '../supabase';
import { getDataCacheStats } from '../hooks/useDataCache';
import { useLogger } from '../hooks/useLogger.js';

export default function StatusPage() {
  const logger = useLogger('StatusPage');
