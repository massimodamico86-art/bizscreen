import { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Power,
  Globe,
  Shield,
  Info
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Alert,
  EmptyState,
} from '../design-system';
import {
  fetchTokens,
  createToken,
  revokeToken,
  deleteToken,
  getTokenStatus,
  formatLastUsed,
  AVAILABLE_SCOPES
} from '../services/apiTokenService';
import {
  fetchWebhookEndpoints,
  createWebhookEndpoint,
  updateWebhookEndpoint,
  toggleWebhookEndpoint,
  deleteWebhookEndpoint,
  fetchWebhookDeliveries,
  validateWebhookUrl,
  getDeliveryStatus,
  formatEventType,
  AVAILABLE_WEBHOOK_EVENTS
} from '../services/webhookService';

const DeveloperSettingsPage = ({ showToast }) => {
  const logger = useLogger('DeveloperSettingsPage');
