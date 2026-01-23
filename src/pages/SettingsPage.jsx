import { useState, useEffect } from 'react';
import { Bell, Eye, Globe, Shield, Activity, RotateCcw, AlertCircle, RefreshCw, Palette, Plus, Trash2, Loader2, Lock } from 'lucide-react';
import { Card, Button } from '../design-system';
import { getUserSettings, updateUserSettings, resetUserSettings } from '../services/userSettingsService';
import { getActivityLog, formatActivity } from '../services/activityLogService';
import { getAllBrandThemes, deleteBrandTheme, setActiveTheme } from '../services/brandThemeService';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useTranslation } from '../i18n';
import { BrandImporterModal, ThemePreviewCard } from '../components/brand';
import { TwoFactorSetup, SessionManagement, LoginHistory } from '../components/security';
import { DataPrivacySettings } from '../components/compliance';
import { useLogger } from '../hooks/useLogger.js';

const SettingsPage = ({ showToast }) => {
  const logger = useLogger('SettingsPage');
