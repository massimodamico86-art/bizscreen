import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ListVideo,
  Layout,
  Zap,
  Filter,
  ChevronRight,
  Send,
  RefreshCw,
  Calendar,
  User,
  X,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  fetchReviews,
  fetchReview,
  approveReview,
  rejectReview,
  addReviewComment,
  getApprovalStatusConfig,
  REVIEW_STATUS
} from '../services/approvalService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Badge,
  EmptyState,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter
} from '../design-system';

// Status configuration
const STATUS_CONFIG = {
  open: { label: 'Open', color: 'yellow', icon: Clock },
  approved: { label: 'Approved', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'gray', icon: XCircle }
};

// Resource type icons
const RESOURCE_ICONS = {
  playlist: ListVideo,
  layout: Layout,
  campaign: Zap
};

const ReviewInboxPage = ({ showToast, onNavigate }) => {
  const logger = useLogger('ReviewInboxPage');
