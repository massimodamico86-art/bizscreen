import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Home,
  LayoutDashboard,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Grid3X3,
  ListVideo,
  Layout,
  Calendar,
  Monitor,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  CreditCard,
  Users,
  Palette,
  X,
  UserCheck,
  Activity,
  MapPin,
  UsersRound,
  BarChart3,
  LayoutTemplate,
  Wand2,
  Zap,
  Inbox,
  Code,
  Server,
  Wrench,
  HelpCircle,
  Play,
  Shield,
  Briefcase,
  Flag,
  Gauge,
  Layers,
  Database,
  Store,
  Share2,
  Bell,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { BrandingProvider, useBranding } from './contexts/BrandingContext';
import { stopImpersonation, isImpersonating as checkIsImpersonating } from './services/tenantService';
import { supabase } from './supabase';
import Toast from './components/Toast';
import { useLogger } from './hooks/useLogger.js';
import { LoginPage } from './pages';
import AnnouncementBanner from './components/AnnouncementBanner';
import AnnouncementCenter from './components/AnnouncementCenter';
import FeedbackWidget from './components/FeedbackWidget';
import { NotificationBell } from './components/notifications';
import AutoBuildOnboardingModal from './components/onboarding/AutoBuildOnboardingModal';
import { fetchScenesForTenant } from './services/sceneService';
import { EmergencyProvider, useEmergency } from './contexts/EmergencyContext';
import { EmergencyBanner } from './components/campaigns';
import { Header } from './components/layout';
import { useTranslation } from './i18n';
import { useFeatureFlags } from './hooks/useFeatureFlag';
import { Feature } from './config/plans';
import { FeatureGate, FeatureUpgradePrompt } from './components/FeatureGate';

// Lazy load pages for better code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ListingsPage = lazy(() => import('./pages/ListingsPage'));
const MediaLibraryPage = lazy(() => import('./pages/MediaLibraryPage'));
const AppsPage = lazy(() => import('./pages/AppsPage'));
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'));
const LayoutsPage = lazy(() => import('./pages/LayoutsPage'));
const SchedulesPage = lazy(() => import('./pages/SchedulesPage'));
const ScreensPage = lazy(() => import('./pages/ScreensPage'));
const PlaylistEditorPage = lazy(() => import('./pages/PlaylistEditorPage'));
const LayoutEditorPage = lazy(() => import('./pages/LayoutEditorPage'));
const ScheduleEditorPage = lazy(() => import('./pages/ScheduleEditorPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AccountPlanPage = lazy(() => import('./pages/AccountPlanPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const AdminTestPage = lazy(() => import('./pages/AdminTestPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/SuperAdminDashboardPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const BrandingSettingsPage = lazy(() => import('./pages/BrandingSettingsPage'));
const ActivityLogPage = lazy(() => import('./pages/ActivityLogPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const ContentAssistantPage = lazy(() => import('./pages/ContentAssistantPage'));
const ScreenGroupsPage = lazy(() => import('./pages/ScreenGroupsPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const CampaignEditorPage = lazy(() => import('./pages/CampaignEditorPage'));
const ReviewInboxPage = lazy(() => import('./pages/ReviewInboxPage'));
const DeveloperSettingsPage = lazy(() => import('./pages/DeveloperSettingsPage'));
const WhiteLabelSettingsPage = lazy(() => import('./pages/WhiteLabelSettingsPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const OpsConsolePage = lazy(() => import('./pages/OpsConsolePage'));
const TenantAdminPage = lazy(() => import('./pages/TenantAdminPage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const DemoToolsPage = lazy(() => import('./pages/DemoToolsPage'));
const EnterpriseSecurityPage = lazy(() => import('./pages/EnterpriseSecurityPage'));
const ResellerDashboardPage = lazy(() => import('./pages/ResellerDashboardPage'));
const ResellerBillingPage = lazy(() => import('./pages/ResellerBillingPage'));
const ServiceQualityPage = lazy(() => import('./pages/ServiceQualityPage'));
const FeatureFlagsPage = lazy(() => import('./pages/FeatureFlagsPage'));
const UsageDashboardPage = lazy(() => import('./pages/UsageDashboardPage'));
const AdminTenantsListPage = lazy(() => import('./pages/Admin/AdminTenantsListPage'));
const AdminTenantDetailPage = lazy(() => import('./pages/Admin/AdminTenantDetailPage'));
const AdminAuditLogsPage = lazy(() => import('./pages/Admin/AdminAuditLogsPage'));
const AdminSystemEventsPage = lazy(() => import('./pages/Admin/AdminSystemEventsPage'));
const ScenesPage = lazy(() => import('./pages/ScenesPage'));
const SceneDetailPage = lazy(() => import('./pages/SceneDetailPage'));
const SceneEditorPage = lazy(() => import('./pages/SceneEditorPage'));
const DeviceDiagnosticsPage = lazy(() => import('./pages/DeviceDiagnosticsPage'));
const DataSourcesPage = lazy(() => import('./pages/DataSourcesPage'));
const ContentPerformancePage = lazy(() => import('./pages/ContentPerformancePage'));
const AnalyticsDashboardPage = lazy(() => import('./pages/AnalyticsDashboardPage'));
const TemplateMarketplacePage = lazy(() => import('./pages/TemplateMarketplacePage'));
const AdminTemplatesPage = lazy(() => import('./pages/Admin/AdminTemplatesPage'));
const AdminEditTemplatePage = lazy(() => import('./pages/Admin/AdminEditTemplatePage'));
const SocialAccountsPage = lazy(() => import('./pages/SocialAccountsPage'));
const AlertsCenterPage = lazy(() => import('./pages/AlertsCenterPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const YodeckLayoutEditorPage = lazy(() => import('./pages/LayoutEditor/YodeckLayoutEditorPage'));
const LayoutPreviewPage = lazy(() => import('./pages/LayoutEditor/LayoutPreviewPage'));
const CanvaCallbackPage = lazy(() => import('./pages/CanvaCallbackPage'));
const DesignEditorPage = lazy(() => import('./pages/DesignEditorPage'));
const SvgTemplateGalleryPage = lazy(() => import('./pages/SvgTemplateGalleryPage'));
const SvgEditorPage = lazy(() => import('./pages/SvgEditorPage'));
const SecurityDashboardPage = lazy(() => import('./pages/SecurityDashboardPage'));

// Main app wrapper with BrandingProvider (I18nProvider is in main.jsx)
export default function BizScreenApp() {
  return (
    <BrandingProvider>
      <BizScreenAppInner />
    </BrandingProvider>
  );
}

function BizScreenAppInner() {
  const { user, loading: authLoading, signOut, userProfile: authUserProfile } = useAuth();
  const { branding, isImpersonating, impersonatedClient, refreshBranding } = useBranding();
  const { t } = useTranslation();
  const logger = useLogger('App');

  // Feature flags for gating premium features
  const featureFlags = useFeatureFlags([
    Feature.AI_ASSISTANT,
    Feature.CAMPAIGNS,
    Feature.ADVANCED_ANALYTICS,
    Feature.SCREEN_GROUPS,
    Feature.ADVANCED_SCHEDULING,
    Feature.ENTERPRISE_SSO,
    Feature.RESELLER_PORTAL,
    Feature.API_ACCESS,
    Feature.WEBHOOKS,
    Feature.WHITE_LABEL,
    Feature.AUDIT_LOGS,
    Feature.USAGE_DASHBOARD,
  ]);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  // Track announcement banner height for layout offset - must be before early returns
  const [announcementHeight, setAnnouncementHeight] = useState(0);
  // Track emergency banner height (40px when active, 0 when not)
  const [emergencyHeight, setEmergencyHeight] = useState(0);
  // AI Autobuild onboarding modal
  const [showAutoBuildModal, setShowAutoBuildModal] = useState(false);

  // Refs to hold current values for real-time handlers (avoids stale closures)
  const listingsRef = useRef(listings);
  const userProfileRef = useRef(userProfile);

  // Keep refs in sync with state
  useEffect(() => {
    listingsRef.current = listings;
  }, [listings]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  // Check if this is the Canva OAuth callback
  const isCanvaCallback = window.location.pathname === '/auth/canva/callback';

  // Check if URL has password reset hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsPasswordReset(true);
    }
  }, []);

  // Handle hash-based navigation (for plan page from limit modals)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#account-plan') {
        setCurrentPage('account-plan');
        // Clear the hash to avoid issues with browser back button
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    // Check initial hash on mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Check if user should see AI autobuild onboarding
  useEffect(() => {
    const checkAutoBuildOnboarding = async () => {
      // Only check for client role users who haven't completed onboarding
      if (!authUserProfile?.id) return;
      if (authUserProfile.role !== 'client') return;
      if (authUserProfile.has_completed_onboarding) return;

      try {
        // Check if user has any scenes
        const { totalCount } = await fetchScenesForTenant(authUserProfile.id, { page: 1, pageSize: 1 });
        if (totalCount === 0) {
          setShowAutoBuildModal(true);
        }
      } catch (err) {
        logger.error('Error checking autobuild onboarding', { error: err });
      }
    };

    checkAutoBuildOnboarding();
  }, [authUserProfile?.id, authUserProfile?.role, authUserProfile?.has_completed_onboarding]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /**
   * Fetch user data and set up real-time subscriptions
   *
   * This effect handles:
   * 1. Fetching user profile from profiles table
   * 2. Fetching listings based on user role (super_admin, admin, or client)
   * 3. Setting up real-time subscriptions for listing changes
   * 4. Auto-updating offline TV devices every 2 minutes
   *
   * Role-based data access:
   * - super_admin: See all listings from all users
   * - admin: See listings from assigned clients (managed_by relationship)
   * - client: See only their own listings
   *
   * Real-time updates:
   * - INSERT: New listings appear immediately
   * - UPDATE: Listing changes reflect in real-time
   * - DELETE: Deleted listings are removed from the list
   *
   * Cleanup:
   * - Unsubscribes from real-time channel on unmount
   * - Clears TV device status update interval
   */
  useEffect(() => {
    if (!user) {
      setLoadingData(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setUserProfile(profile);

        // Fetch listings based on user role
        let listingsData = [];

        if (profile.role === 'super_admin') {
          // Super admins see all listings
          const { data, error } = await supabase
            .from('listings')
            .select('*, owner:profiles(id, full_name, email)')
            .order('created_at', { ascending: false });

          if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
          listingsData = data || [];
        } else if (profile.role === 'admin') {
          // Admins see listings of their assigned clients
          const { data, error } = await supabase
            .from('listings')
            .select('*, owner:profiles!listings_owner_id_fkey(id, full_name, email, managed_by)')
            .order('created_at', { ascending: false });

          if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
          // Filter to only show listings where owner is managed by this admin
          listingsData = (data || []).filter(listing =>
            listing.owner?.managed_by === user.id
          );
        } else {
          // Clients see only their own listings
          const { data, error } = await supabase
            .from('listings')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });

          if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
          listingsData = data || [];
        }

        setListings(listingsData);
      } catch (error) {
        logger.error('Error fetching data', { error, code: error.code });
        // Don't show error toast for "no rows" errors
        if (error.code !== 'PGRST116') {
          showToast('Error loading data: ' + error.message, 'error');
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();

    // Subscribe to real-time changes for listings
    // RLS policies will control which listings the user can see
    const channel = supabase
      .channel(`listings-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings'
          // No filter - RLS handles access control
        },
        (payload) => {
          logger.debug('Listing change received', { eventType: payload.eventType, id: payload.new?.id || payload.old?.id });

          // Use refs to get current values (avoids stale closure issue)
          const currentListings = listingsRef.current;
          const currentUserProfile = userProfileRef.current;

          // Client-side check: only process listings we're managing
          const currentListingIds = currentListings.map(l => l.id);
          const isRelevantListing =
            currentUserProfile?.role === 'super_admin' || // Super admins see all
            payload.new?.owner_id === user.id || // Own listings
            (currentUserProfile?.role === 'admin' && currentListingIds.includes(payload.new?.id)); // Managed client listings

          // For DELETE events, check if we had this listing
          const isRelevantDelete =
            currentUserProfile?.role === 'super_admin' ||
            currentListingIds.includes(payload.old?.id);

          if (payload.eventType === 'INSERT' && isRelevantListing) {
            setListings(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE' && isRelevantListing) {
            setListings(prev =>
              prev.map(listing =>
                listing.id === payload.new.id ? payload.new : listing
              )
            );
          } else if (payload.eventType === 'DELETE' && isRelevantDelete) {
            setListings(prev =>
              prev.filter(listing => listing.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Real-time subscription error', { error: err });
          // Optionally show toast notification to user
          showToast?.('Real-time updates temporarily unavailable', 'error');
        } else if (status === 'TIMED_OUT') {
          logger.error('Real-time subscription timed out');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            logger.info('Attempting to reconnect real-time subscription');
            supabase.removeChannel(channel);
            // The next render will recreate the subscription
          }, 5000);
        } else if (status === 'CLOSED') {
          logger.warn('Real-time subscription closed');
        }
      });

    // Update offline TV devices every 2 minutes
    const updateOfflineDevicesInterval = setInterval(async () => {
      try {
        const { error } = await supabase.rpc('update_tv_device_status');
        // Silently ignore if RPC function doesn't exist yet
        if (error && error.code !== '42883') {
          logger.error('Error updating TV device status', { error, code: error.code });
        }
      } catch (error) {
        // Silently ignore errors for missing RPC function
        if (error.code !== '42883' && error.message !== 'Function not found') {
          logger.error('Error updating TV device status', { error, code: error.code });
        }
      }
    }, 2 * 60 * 1000); // 2 minutes

    // Cleanup subscription and interval on unmount
    return () => {
      supabase.removeChannel(channel);
      clearInterval(updateOfflineDevicesInterval);
    };
  }, [user]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out successfully');
    } catch (error) {
      showToast('Error signing out: ' + error.message, 'error');
    }
  };

  // Media submenu state
  const [mediaExpanded, setMediaExpanded] = useState(false);

  // Auto-expand media menu when navigating to a media subpage
  useEffect(() => {
    if (currentPage?.startsWith('media-')) {
      setMediaExpanded(true);
    }
  }, [currentPage]);

  // Yodeck-exact navigation (main menu only - matches Yodeck sidebar exactly)
  const navigation = [
    { id: 'welcome', label: t('nav.welcome', 'Welcome'), icon: Home },
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: LayoutDashboard },
    {
      id: 'media',
      label: t('nav.media', 'Media'),
      icon: Image,
      expandable: true,
      subItems: [
        { id: 'media-all', label: t('nav.allMedia', 'All Media'), icon: Grid3X3 },
        { id: 'media-images', label: t('nav.images', 'Images'), icon: Image },
        { id: 'media-videos', label: t('nav.videos', 'Videos'), icon: Video },
        { id: 'media-audio', label: t('nav.audio', 'Audio'), icon: Music },
        { id: 'media-documents', label: t('nav.documents', 'Documents'), icon: FileText },
        { id: 'media-webpages', label: t('nav.webPages', 'Web Pages'), icon: Globe },
      ]
    },
    { id: 'apps', label: t('nav.apps', 'Apps'), icon: Grid3X3 },
    { id: 'playlists', label: t('nav.playlists', 'Playlists'), icon: ListVideo },
    { id: 'templates', label: t('nav.templates', 'Templates'), icon: LayoutTemplate },
    { id: 'schedules', label: t('nav.schedules', 'Schedules'), icon: Calendar },
    { id: 'screens', label: t('nav.screens', 'Screens'), icon: Monitor },
  ];

  // Loading fallback component
  const PageLoader = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );

  // Get media filter from page ID
  const getMediaFilter = (pageId) => {
    const filterMap = {
      'media-all': null,
      'media-images': 'image',
      'media-videos': 'video',
      'media-audio': 'audio',
      'media-documents': 'document',
      'media-webpages': 'web_page',
    };
    return filterMap[pageId] || null;
  };

  const pages = {
    // Yodeck-exact pages
    welcome: <Suspense fallback={<PageLoader />}><DashboardPage setCurrentPage={setCurrentPage} showToast={showToast} listings={listings} setListings={setListings} /></Suspense>,
    dashboard: <Suspense fallback={<PageLoader />}><DashboardPage setCurrentPage={setCurrentPage} showToast={showToast} listings={listings} setListings={setListings} /></Suspense>,
    // Yodeck-style pages
    'media-all': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter={null} /></Suspense>,
    'media-images': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter="image" /></Suspense>,
    'media-videos': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter="video" /></Suspense>,
    'media-audio': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter="audio" /></Suspense>,
    'media-documents': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter="document" /></Suspense>,
    'media-webpages': <Suspense fallback={<PageLoader />}><MediaLibraryPage showToast={showToast} filter="web_page" /></Suspense>,
    apps: <Suspense fallback={<PageLoader />}><AppsPage showToast={showToast} /></Suspense>,
    playlists: <Suspense fallback={<PageLoader />}><PlaylistsPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    layouts: <Suspense fallback={<PageLoader />}><LayoutsPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    schedules: <Suspense fallback={<PageLoader />}><SchedulesPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    screens: <Suspense fallback={<PageLoader />}><ScreensPage showToast={showToast} /></Suspense>,
    // Legacy pages (still accessible)
    listings: <Suspense fallback={<PageLoader />}><ListingsPage showToast={showToast} listings={listings} setListings={setListings} /></Suspense>,
    settings: <Suspense fallback={<PageLoader />}><SettingsPage showToast={showToast} /></Suspense>,
    'account-plan': <Suspense fallback={<PageLoader />}><AccountPlanPage showToast={showToast} /></Suspense>,
    'admin-test': <Suspense fallback={<PageLoader />}><AdminTestPage /></Suspense>,
    'clients': <Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>,
    'branding': <Suspense fallback={<PageLoader />}><BrandingSettingsPage /></Suspense>,
    'activity': <Suspense fallback={<PageLoader />}><ActivityLogPage /></Suspense>,
    'locations': <Suspense fallback={<PageLoader />}><LocationsPage showToast={showToast} /></Suspense>,
    'team': <Suspense fallback={<PageLoader />}><TeamPage showToast={showToast} /></Suspense>,
    'analytics': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.ADVANCED_ANALYTICS} fallback={<FeatureUpgradePrompt feature={Feature.ADVANCED_ANALYTICS} onNavigate={() => setCurrentPage('account-plan')} />}><AnalyticsPage showToast={showToast} /></FeatureGate></Suspense>,
    'templates': <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'scenes': <Suspense fallback={<PageLoader />}><ScenesPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'assistant': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.AI_ASSISTANT} fallback={<FeatureUpgradePrompt feature={Feature.AI_ASSISTANT} onNavigate={() => setCurrentPage('account-plan')} />}><ContentAssistantPage showToast={showToast} /></FeatureGate></Suspense>,
    'screen-groups': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.SCREEN_GROUPS} fallback={<FeatureUpgradePrompt feature={Feature.SCREEN_GROUPS} onNavigate={() => setCurrentPage('account-plan')} />}><ScreenGroupsPage showToast={showToast} /></FeatureGate></Suspense>,
    'campaigns': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.CAMPAIGNS} fallback={<FeatureUpgradePrompt feature={Feature.CAMPAIGNS} onNavigate={() => setCurrentPage('account-plan')} />}><CampaignsPage showToast={showToast} onNavigate={setCurrentPage} /></FeatureGate></Suspense>,
    'review-inbox': <Suspense fallback={<PageLoader />}><ReviewInboxPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'developer': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.API_ACCESS} fallback={<FeatureUpgradePrompt feature={Feature.API_ACCESS} onNavigate={() => setCurrentPage('account-plan')} />}><DeveloperSettingsPage showToast={showToast} /></FeatureGate></Suspense>,
    'white-label': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.WHITE_LABEL} fallback={<FeatureUpgradePrompt feature={Feature.WHITE_LABEL} onNavigate={() => setCurrentPage('account-plan')} />}><WhiteLabelSettingsPage showToast={showToast} /></FeatureGate></Suspense>,
    'status': <Suspense fallback={<PageLoader />}><StatusPage /></Suspense>,
    'ops-console': <Suspense fallback={<PageLoader />}><OpsConsolePage /></Suspense>,
    'tenant-admin': <Suspense fallback={<PageLoader />}><TenantAdminPage showToast={showToast} /></Suspense>,
    'help': <Suspense fallback={<PageLoader />}><HelpCenterPage onNavigate={setCurrentPage} /></Suspense>,
    'demo-tools': <Suspense fallback={<PageLoader />}><DemoToolsPage showToast={showToast} /></Suspense>,
    'enterprise-security': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.ENTERPRISE_SSO} fallback={<FeatureUpgradePrompt feature={Feature.ENTERPRISE_SSO} onNavigate={() => setCurrentPage('account-plan')} />}><EnterpriseSecurityPage showToast={showToast} /></FeatureGate></Suspense>,
    'reseller-dashboard': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.RESELLER_PORTAL} fallback={<FeatureUpgradePrompt feature={Feature.RESELLER_PORTAL} onNavigate={() => setCurrentPage('account-plan')} />}><ResellerDashboardPage showToast={showToast} onNavigate={setCurrentPage} /></FeatureGate></Suspense>,
    'reseller-billing': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.RESELLER_PORTAL} fallback={<FeatureUpgradePrompt feature={Feature.RESELLER_PORTAL} onNavigate={() => setCurrentPage('account-plan')} />}><ResellerBillingPage showToast={showToast} /></FeatureGate></Suspense>,
    'service-quality': <Suspense fallback={<PageLoader />}><ServiceQualityPage /></Suspense>,
    'feature-flags': <Suspense fallback={<PageLoader />}><FeatureFlagsPage /></Suspense>,
    'usage': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.USAGE_DASHBOARD} fallback={<FeatureUpgradePrompt feature={Feature.USAGE_DASHBOARD} onNavigate={() => setCurrentPage('account-plan')} />}><UsageDashboardPage showToast={showToast} /></FeatureGate></Suspense>,
    'admin-tenants': <Suspense fallback={<PageLoader />}><AdminTenantsListPage onNavigate={setCurrentPage} showToast={showToast} /></Suspense>,
    'admin-audit-logs': <Suspense fallback={<PageLoader />}><AdminAuditLogsPage onBack={() => setCurrentPage('admin-tenants')} showToast={showToast} /></Suspense>,
    'admin-system-events': <Suspense fallback={<PageLoader />}><AdminSystemEventsPage onBack={() => setCurrentPage('admin-tenants')} showToast={showToast} /></Suspense>,
    'device-diagnostics': <Suspense fallback={<PageLoader />}><DeviceDiagnosticsPage /></Suspense>,
    'data-sources': <Suspense fallback={<PageLoader />}><DataSourcesPage showToast={showToast} /></Suspense>,
    'content-performance': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.ADVANCED_ANALYTICS} fallback={<FeatureUpgradePrompt feature={Feature.ADVANCED_ANALYTICS} onNavigate={() => setCurrentPage('account-plan')} />}><ContentPerformancePage showToast={showToast} /></FeatureGate></Suspense>,
    'analytics-dashboard': <Suspense fallback={<PageLoader />}><FeatureGate feature={Feature.ADVANCED_ANALYTICS} fallback={<FeatureUpgradePrompt feature={Feature.ADVANCED_ANALYTICS} onNavigate={() => setCurrentPage('account-plan')} />}><AnalyticsDashboardPage showToast={showToast} /></FeatureGate></Suspense>,
    'template-marketplace': <Suspense fallback={<PageLoader />}><TemplateMarketplacePage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'admin-templates': <Suspense fallback={<PageLoader />}><AdminTemplatesPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'social-accounts': <Suspense fallback={<PageLoader />}><SocialAccountsPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'alerts': <Suspense fallback={<PageLoader />}><AlertsCenterPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'notification-settings': <Suspense fallback={<PageLoader />}><NotificationSettingsPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'svg-templates': <Suspense fallback={<PageLoader />}><SvgTemplateGalleryPage showToast={showToast} onNavigate={setCurrentPage} /></Suspense>,
    'security': <Suspense fallback={<PageLoader />}><SecurityDashboardPage /></Suspense>,
  };

  // Show Canva OAuth callback page
  if (isCanvaCallback) {
    return (
      <Suspense fallback={<PageLoader />}>
        <CanvaCallbackPage
          onNavigate={(page) => {
            // Clear the callback URL and navigate
            window.history.replaceState(null, '', '/');
            setCurrentPage(page);
          }}
          showToast={showToast}
        />
      </Suspense>
    );
  }

  // Show password reset page if user clicked reset link
  if (isPasswordReset && user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <ResetPasswordPage
          onSuccess={() => {
            setIsPasswordReset(false);
            setCurrentPage('dashboard');
            showToast('Password updated successfully!');
          }}
        />
      </Suspense>
    );
  }

  // Show login page if not authenticated
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Show error state if profile fetch failed
  if (authUserProfile?.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Load Failed</h2>
          <p className="text-gray-600 mb-4">{authUserProfile.errorMessage}</p>
          <div className="bg-gray-100 rounded p-4 mb-4 text-left">
            <p className="text-sm text-gray-700 font-mono mb-2">Debug Info:</p>
            <p className="text-xs text-gray-600 font-mono">User ID: {user?.id}</p>
            <p className="text-xs text-gray-600 font-mono">Email: {user?.email}</p>
            {authUserProfile.errorCode && (
              <p className="text-xs text-gray-600 font-mono">Error Code: {authUserProfile.errorCode}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching data OR userProfile
  if (loadingData || !authUserProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mx-auto mb-4 animate-pulse"></div>
          <p className="text-gray-600">Loading your data...</p>
          <p className="text-gray-400 text-sm mt-2">If this takes more than 10 seconds, check the console for errors</p>
        </div>
      </div>
    );
  }

  // Route to role-specific dashboards
  // When impersonating a client, super_admin/admin sees the client UI
  // Admin tool pages that should show sidebar even for super_admin
  const adminToolPages = [
    'admin-tenants', 'admin-audit-logs', 'admin-system-events',
    'status', 'ops-console', 'tenant-admin', 'feature-flags', 'demo-tools', 'clients', 'admin-templates', 'security'
  ];
  const isAdminToolPage = adminToolPages.includes(currentPage) || currentPage.startsWith('admin-tenant-') || currentPage.startsWith('admin-template-');

  const shouldShowClientUI =
    authUserProfile?.role === 'client' ||
    isImpersonating ||
    isAdminToolPage; // Super admin navigating to admin tools should see sidebar

  if (!shouldShowClientUI) {
    // Show admin dashboards only when NOT impersonating and NOT on admin tool page
    if (authUserProfile?.role === 'super_admin') {
      return (
        <Suspense fallback={<PageLoader />}>
          <SuperAdminDashboardPage onNavigate={setCurrentPage} />
        </Suspense>
      );
    }

    if (authUserProfile?.role === 'admin') {
      return (
        <Suspense fallback={<PageLoader />}>
          <AdminDashboardPage />
        </Suspense>
      );
    }
  }

  // Handle stop impersonation
  const handleStopImpersonation = () => {
    stopImpersonation();
    refreshBranding();
    window.location.reload();
  };

  // Client UI (shown for clients, or admins/super_admins when impersonating)
  const topOffset = (isImpersonating ? 40 : 0) + announcementHeight + emergencyHeight;

  return (
    <EmergencyProvider>
      <ClientUILayout
        topOffset={topOffset}
        announcementHeight={announcementHeight}
        emergencyHeight={emergencyHeight}
        setAnnouncementHeight={setAnnouncementHeight}
        setEmergencyHeight={setEmergencyHeight}
        isImpersonating={isImpersonating}
        impersonatedClient={impersonatedClient}
        handleStopImpersonation={handleStopImpersonation}
        branding={branding}
        navigation={navigation}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        mediaExpanded={mediaExpanded}
        setMediaExpanded={setMediaExpanded}
        featureFlags={featureFlags}
        authUserProfile={authUserProfile}
        pages={pages}
        user={user}
        userProfile={userProfile}
        toast={toast}
        setToast={setToast}
        showToast={showToast}
        t={t}
        handleSignOut={handleSignOut}
        showAutoBuildModal={showAutoBuildModal}
        setShowAutoBuildModal={setShowAutoBuildModal}
        PageLoader={PageLoader}
      />
    </EmergencyProvider>
  );
}

// Inner component to access EmergencyContext inside the provider
function ClientUILayout({
  topOffset,
  announcementHeight,
  setAnnouncementHeight,
  setEmergencyHeight,
  isImpersonating,
  impersonatedClient,
  handleStopImpersonation,
  branding,
  navigation,
  currentPage,
  setCurrentPage,
  mediaExpanded,
  setMediaExpanded,
  featureFlags,
  authUserProfile,
  pages,
  user,
  userProfile,
  toast,
  setToast,
  showToast,
  t,
  handleSignOut,
  showAutoBuildModal,
  setShowAutoBuildModal,
  PageLoader,
}) {
  const { isActive: isEmergencyActive } = useEmergency();

  // Update emergency height based on active state
  useEffect(() => {
    setEmergencyHeight(isEmergencyActive ? 40 : 0);
  }, [isEmergencyActive, setEmergencyHeight]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Skip to content link - accessibility */}
      <a href="#main-content" className="skip-link">
        {t('accessibility.skipToContent')}
      </a>

      {/* Emergency Banner - Shows when emergency content is active */}
      {isEmergencyActive && (
        <div style={{ top: announcementHeight }}>
          <EmergencyBanner />
        </div>
      )}

      {/* Announcement Banner - Top priority announcements */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <AnnouncementBanner onHeightChange={setAnnouncementHeight} />
      </div>

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div
          className="fixed left-0 right-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-3 z-50 shadow-md"
          style={{ top: announcementHeight }}
        >
          <UserCheck className="w-4 h-4" />
          <span className="text-sm font-medium">
            Acting as: {impersonatedClient?.businessName || 'Client'}
          </span>
          <button
            onClick={handleStopImpersonation}
            className="ml-4 flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm transition-colors"
          >
            <X className="w-3 h-3" />
            Stop
          </button>
        </div>
      )}

      <aside
        className="bg-white border-r border-gray-200 flex flex-col"
        style={{ marginTop: topOffset, width: '211px' }}
      >
        {/* Logo - Yodeck style */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.businessName}
                className="h-8 object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: '#f26f21' }}
                >
                  {(branding.businessName || 'B')[0].toUpperCase()}
                </div>
                <span className="text-lg font-semibold text-gray-900">{branding.businessName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage));
            const isExpanded = item.expandable && mediaExpanded;

            // Check if feature is enabled (if item has a feature requirement)
            const isFeatureEnabled = !item.feature || featureFlags[item.feature];
            const isSuperAdmin = authUserProfile?.role === 'super_admin';
            const canAccess = isFeatureEnabled || isSuperAdmin;

            if (item.expandable) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMediaExpanded(!mediaExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-none transition-all duration-150 text-left ${
                      isActive
                        ? 'text-[#f26f21] font-medium border-l-[3px] border-[#f26f21] bg-[#fff5f0] -ml-px'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className={isActive ? '' : 'text-gray-400'} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                      {item.subItems.map(subItem => {
                        const SubIcon = subItem.icon;
                        const isSubActive = currentPage === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => setCurrentPage(subItem.id)}
                            className={`w-full flex items-center justify-start gap-2.5 px-2.5 py-1.5 rounded-none transition-all duration-150 text-sm text-left ${
                              isSubActive
                                ? 'text-[#f26f21] font-medium bg-[#fff5f0]'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <SubIcon size={14} className={isSubActive ? '' : 'text-gray-400'} />
                            <span>{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => canAccess ? setCurrentPage(item.id) : null}
                className={`w-full flex items-center justify-start gap-3 px-3 py-2 rounded-none transition-all duration-150 text-left ${
                  isActive
                    ? 'text-[#f26f21] font-medium border-l-[3px] border-[#f26f21] bg-[#fff5f0] -ml-px'
                    : canAccess
                      ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-[3px] border-transparent'
                      : 'text-gray-400 cursor-not-allowed opacity-60 border-l-[3px] border-transparent'
                }`}
                title={!canAccess ? `Upgrade to ${item.tier} plan to access this feature` : ''}
              >
                <Icon size={18} className={isActive ? 'text-[#f26f21]' : canAccess ? 'text-gray-400' : 'text-gray-300'} />
                <span className="text-sm flex-1">{item.label}</span>
                {item.tier && !canAccess && (
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                    {item.tier}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Knowledge Hub - Yodeck style */}
        <div className="px-3 py-3 border-t border-gray-100">
          <button
            onClick={() => setCurrentPage('help')}
            className="w-full flex items-center justify-start gap-3 px-3 py-2 rounded-lg bg-[#fff5f0] hover:bg-[#ffebe0] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-[#f26f21] flex items-center justify-center">
              <HelpCircle size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">{t('nav.knowledgeHub', 'Knowledge Hub')}</span>
          </button>
        </div>
      </aside>

      <main id="main-content" className="flex-1 flex flex-col overflow-hidden bg-[#f6f8fb]" style={{ marginTop: topOffset }}>
        {/* Top Header Bar with Emergency Push */}
        <Header
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          branding={branding}
          user={user}
          userProfile={userProfile}
          handleSignOut={handleSignOut}
          showToast={showToast}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {pages[currentPage] || (
            // Handle dynamic editor routes
            currentPage.startsWith('playlist-editor-') ? (
              <Suspense fallback={<PageLoader />}>
                <PlaylistEditorPage
                  playlistId={currentPage.replace('playlist-editor-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('layout-editor-') ? (
              <Suspense fallback={<PageLoader />}>
                <LayoutEditorPage
                  layoutId={currentPage.replace('layout-editor-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('schedule-editor-') ? (
              <Suspense fallback={<PageLoader />}>
                <ScheduleEditorPage
                  scheduleId={currentPage.replace('schedule-editor-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('campaign-editor-') ? (
              <Suspense fallback={<PageLoader />}>
                <CampaignEditorPage
                  campaignId={currentPage.replace('campaign-editor-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('admin-tenant-') ? (
              <Suspense fallback={<PageLoader />}>
                <AdminTenantDetailPage
                  tenantId={currentPage.replace('admin-tenant-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('scene-detail-') ? (
              <Suspense fallback={<PageLoader />}>
                <SceneDetailPage
                  sceneId={currentPage.replace('scene-detail-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('scene-editor-') ? (
              <Suspense fallback={<PageLoader />}>
                <SceneEditorPage
                  sceneId={currentPage.replace('scene-editor-', '')}
                  onShowToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('admin-template-') ? (
              <Suspense fallback={<PageLoader />}>
                <AdminEditTemplatePage
                  templateId={currentPage.replace('admin-template-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('yodeck-layout-preview-') ? (
              <Suspense fallback={<PageLoader />}>
                <LayoutPreviewPage
                  layoutId={currentPage.replace('yodeck-layout-preview-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('yodeck-layout-') ? (
              <Suspense fallback={<PageLoader />}>
                <YodeckLayoutEditorPage
                  layoutId={currentPage.replace('yodeck-layout-', '')}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('design-editor') ? (
              <Suspense fallback={<PageLoader />}>
                <DesignEditorPage
                  designId={currentPage.includes('?') ? 'new' : currentPage.replace('design-editor-', '')}
                  routeString={currentPage}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : currentPage.startsWith('svg-editor') ? (
              <Suspense fallback={<PageLoader />}>
                <SvgEditorPage
                  routeString={currentPage}
                  showToast={showToast}
                  onNavigate={setCurrentPage}
                />
              </Suspense>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Page not found: {currentPage}</p>
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="mt-4 text-orange-600 hover:underline"
                >
                  Go to Dashboard
                </button>
              </div>
            )
          )}
        </div>
      </main>

      {/* Feedback Widget */}
      <FeedbackWidget position="bottom-right" />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* AI Autobuild Onboarding Modal */}
      <AutoBuildOnboardingModal
        isOpen={showAutoBuildModal}
        onClose={() => setShowAutoBuildModal(false)}
        onComplete={() => {
          setShowAutoBuildModal(false);
          showToast('Your TV scene has been created!');
        }}
        user={user}
        userProfile={authUserProfile}
      />
    </div>
  );
}
