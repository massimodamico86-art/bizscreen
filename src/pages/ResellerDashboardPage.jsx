/**
 * ResellerDashboardPage Component
 *
 * Main dashboard for reseller partners showing:
 * - Portfolio overview (tenants, screens, licenses)
 * - Revenue and commission stats
 * - Tenant management
 * - License generation
 *
 * @module pages/ResellerDashboardPage
 */
import { useState, useEffect } from 'react';
import {
  Building2,
  Monitor,
  Key,
  DollarSign,
  Users,
  Plus,
  RefreshCw,
  Eye,
  Copy,
  Check,
  Download,
  Settings,
  TrendingUp,
  Clock,
  AlertTriangle,
  X,
  ChevronRight,
  ExternalLink,
  UserPlus,
  CreditCard,
  Palette
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  EmptyState
} from '../design-system';
import {
  getMyResellerAccount,
  getPortfolioStats,
  listResellerTenants,
  getBrandVariants,
  impersonateTenant,
  RESELLER_STATUS
} from '../services/resellerService';
import {
  generateLicenses,
  listResellerLicenses,
  getLicenseStats,
  formatLicenseCode,
  LICENSE_TYPES,
  PLAN_LEVELS,
  exportLicensesCSV
} from '../services/licenseService';

export default function ResellerDashboardPage({ showToast, onNavigate }) {
  const logger = useLogger('ResellerDashboardPage');
