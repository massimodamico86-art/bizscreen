import { useState, useEffect } from 'react';
import {
  Globe,
  Palette,
  Plus,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  ExternalLink,
  Star,
  Info,
  Shield,
  Mail,
  Image,
  Link2,
  FileText
} from 'lucide-react';
import { Button, Card, Badge, Alert } from '../design-system';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  listDomains,
  addDomain,
  removeDomain,
  verifyDomain,
  setPrimaryDomain,
  getWhiteLabelSettings,
  updateWhiteLabelSettings,
  getDomainStatus,
  formatDomainUrl
} from '../services/domainService';

const WhiteLabelSettingsPage = ({ showToast }) => {
  const logger = useLogger('WhiteLabelSettingsPage');
