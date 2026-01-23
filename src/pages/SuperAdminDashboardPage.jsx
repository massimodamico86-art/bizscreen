import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import {
  getAllUsers,
  getAllAdmins,
  getAllClients,
  getUnassignedClients,
  assignClientToAdmin,
  unassignClient,
  createAdminUser,
  createClientUser
} from '../services/adminService';
import ErrorBoundary from '../components/ErrorBoundary';
import { useLogger } from '../hooks/useLogger.js';
import {
  Shield,
  FileText,
  Activity,
  Server,
  Wrench,
  Building2,
  Flag,
  Play,
  UserCheck,
  ChevronRight,
  LayoutTemplate,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function SuperAdminDashboardPage({ onNavigate }) {
  const logger = useLogger('SuperAdminDashboardPage');
