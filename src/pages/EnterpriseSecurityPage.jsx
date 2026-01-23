/**
 * EnterpriseSecurityPage Component
 *
 * Enterprise-grade security settings including:
 * - SSO configuration (OIDC/SAML)
 * - SCIM provisioning endpoints
 * - Data export and compliance
 * - Security policies
 *
 * @module pages/EnterpriseSecurityPage
 */
import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Users,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  FileText,
  Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Alert,
} from '../design-system';
import { getSSOProvider, saveSSOProvider, toggleSSOEnabled, toggleSSOEnforcement, SSO_TYPES, SSO_DEFAULT_ROLES, validateOIDCIssuer } from '../services/ssoService';
import { downloadExport, getDataSummary, exportAsCSV, hasEnterpriseFeatures } from '../services/complianceService';
import { supabase } from '../supabase';

export default function EnterpriseSecurityPage({ showToast }) {
  const logger = useLogger('EnterpriseSecurityPage');
