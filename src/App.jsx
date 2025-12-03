import { useState, useEffect, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { BrandingProvider, useBranding } from './contexts/BrandingContext';
import { stopImpersonation, isImpersonating as checkIsImpersonating } from './services/tenantService';
import { supabase } from './supabase';
import Toast from './components/Toast';
import { LoginPage } from './pages';
import AnnouncementBanner from './components/AnnouncementBanner';
import AnnouncementCenter from './components/AnnouncementCenter';
import FeedbackWidget from './components/FeedbackWidget';
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
  ]);

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [listings, setListings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  // Track announcement banner height for layout offset - must be before early returns
  const [announcementHeight, setAnnouncementHeight] = useState(0);

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
        console.error('Error fetching data:', error);
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
          console.log('Listing change received:', payload);

          // Client-side check: only process listings we're managing
          const currentListingIds = listings.map(l => l.id);
          const isRelevantListing =
            userProfile?.role === 'super_admin' || // Super admins see all
            payload.new?.owner_id === user.id || // Own listings
            (userProfile?.role === 'admin' && currentListingIds.includes(payload.new?.id)); // Managed client listings

          // For DELETE events, check if we had this listing
          const isRelevantDelete =
            userProfile?.role === 'super_admin' ||
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
          console.log('✅ Real-time subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error:', err);
          // Optionally show toast notification to user
          showToast?.('Real-time updates temporarily unavailable', 'error');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Real-time subscription timed out');
          // Attempt to reconnect after a delay
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect real-time subscription...');
            supabase.removeChannel(channel);
            // The next render will recreate the subscription
          }, 5000);
        } else if (status === 'CLOSED') {
          console.warn('⚠️  Real-time subscription closed');
        }
      });

    // Update offline TV devices every 2 minutes
    const updateOfflineDevicesInterval = setInterval(async () => {
      try {
        const { error } = await supabase.rpc('update_tv_device_status');
        // Silently ignore if RPC function doesn't exist yet
        if (error && error.code !== '42883') {
          console.error('Error updating TV device status:', error);
        }
      } catch (error) {
        // Silently ignore errors for missing RPC function
        if (error.code !== '42883' && error.message !== 'Function not found') {
          console.error('Error updating TV device status:', error);
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

  // Yodeck-style navigation with i18n and feature gating
  const navigation = [
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
    { id: 'layouts', label: t('nav.layouts', 'Layouts'), icon: Layout },
    { id: 'schedules', label: t('nav.schedules', 'Schedules'), icon: Calendar },
    { id: 'templates', label: t('nav.templates', 'Templates'), icon: LayoutTemplate },
    { id: 'assistant', label: t('nav.aiAssistant', 'AI Assistant'), icon: Wand2, feature: Feature.AI_ASSISTANT, tier: 'Pro' },
    { id: 'screens', label: t('nav.screens', 'Screens'), icon: Monitor },
    { id: 'screen-groups', label: t('nav.screenGroups', 'Screen Groups'), icon: Users, feature: Feature.SCREEN_GROUPS, tier: 'Starter' },
    { id: 'locations', label: t('nav.locations', 'Locations'), icon: MapPin },
    { id: 'campaigns', label: t('nav.campaigns', 'Campaigns'), icon: Zap, feature: Feature.CAMPAIGNS, tier: 'Pro' },
    { id: 'review-inbox', label: t('nav.reviewInbox', 'Review Inbox'), icon: Inbox },
    { id: 'analytics', label: t('nav.analytics', 'Analytics'), icon: BarChart3, feature: Feature.ADVANCED_ANALYTICS, tier: 'Pro' },
    { id: 'activity', label: t('nav.activityLog', 'Activity Log'), icon: Activity, feature: Feature.AUDIT_LOGS, tier: 'Enterprise' },
    // Legacy pages (hidden but accessible)
    // { id: 'listings', label: 'Locations', icon: Building2 },
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
    'templates': <Suspense fallback={<PageLoader />}><TemplatesPage showToast={showToast} /></Suspense>,
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
    'feature-flags': <Suspense fallback={<PageLoader />}><FeatureFlagsPage /></Suspense>
  };

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
  const shouldShowClientUI =
    authUserProfile?.role === 'client' ||
    isImpersonating;

  if (!shouldShowClientUI) {
    // Show admin dashboards only when NOT impersonating
    if (authUserProfile?.role === 'super_admin') {
      return (
        <Suspense fallback={<PageLoader />}>
          <SuperAdminDashboardPage />
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
  const topOffset = (isImpersonating ? 40 : 0) + announcementHeight;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Skip to content link - accessibility */}
      <a href="#main-content" className="skip-link">
        {t('accessibility.skipToContent')}
      </a>

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
        className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm"
        style={{ marginTop: topOffset }}
      >
        {/* Logo & Brand */}
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.businessName}
                  className="w-9 h-9 rounded-xl object-contain shadow-sm"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {(branding.businessName || 'B')[0].toUpperCase()}
                </div>
              )}
              <h1
                className="text-lg font-semibold tracking-tight"
                style={{ color: branding.primaryColor }}
              >
                {branding.businessName}
              </h1>
            </div>
            {/* Announcement Center */}
            <AnnouncementCenter />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || (item.subItems && item.subItems.some(sub => sub.id === currentPage));
            const isExpanded = item.expandable && (mediaExpanded || item.subItems?.some(sub => sub.id === currentPage));

            // Check if feature is enabled (if item has a feature requirement)
            const isFeatureEnabled = !item.feature || featureFlags[item.feature];
            const isSuperAdmin = authUserProfile?.role === 'super_admin';
            const canAccess = isFeatureEnabled || isSuperAdmin;

            if (item.expandable) {
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMediaExpanded(!mediaExpanded)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'text-white font-medium shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={isActive ? { backgroundColor: branding.primaryColor } : {}}
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
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all duration-150 text-sm ${
                              isSubActive
                                ? 'text-white font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                            style={isSubActive ? { backgroundColor: branding.primaryColor } : {}}
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'text-white font-medium shadow-sm'
                    : canAccess
                      ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      : 'text-gray-400 cursor-not-allowed opacity-60'
                }`}
                style={isActive ? { backgroundColor: branding.primaryColor } : {}}
                title={!canAccess ? `Upgrade to ${item.tier} plan to access this feature` : ''}
              >
                <Icon size={18} className={isActive ? '' : canAccess ? 'text-gray-400' : 'text-gray-300'} />
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

        {/* Settings Section */}
        <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
          {/* Super Admin Tools Section */}
          {authUserProfile?.role === 'super_admin' && !isImpersonating && (
            <>
              <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">{t('nav.admin', 'Admin')}</p>
              {[
                { id: 'clients', label: t('nav.clients', 'Clients'), icon: Users },
                { id: 'status', label: t('nav.systemStatus', 'System Status'), icon: Server },
                { id: 'ops-console', label: t('nav.opsConsole', 'Ops Console'), icon: Wrench },
                { id: 'tenant-admin', label: t('nav.tenants', 'Tenants'), icon: Building2 },
                { id: 'feature-flags', label: t('nav.featureFlags', 'Feature Flags'), icon: Flag },
                { id: 'demo-tools', label: t('nav.demoTools', 'Demo Tools'), icon: Play },
              ].map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                      isActive ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={isActive ? { backgroundColor: branding.primaryColor } : {}}
                  >
                    <Icon size={18} className={isActive ? '' : 'text-gray-400'} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Settings Items */}
          <p className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider mt-2">{t('nav.settings', 'Settings')}</p>
          {[
            { id: 'account-plan', label: t('nav.planAndLimits', 'Plan & Limits'), icon: CreditCard },
            { id: 'team', label: t('nav.team', 'Team'), icon: UsersRound },
            { id: 'branding', label: t('nav.branding', 'Branding'), icon: Palette },
            { id: 'settings', label: t('nav.settings', 'Settings'), icon: Settings },
          ].map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                  isActive ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={isActive ? { backgroundColor: branding.primaryColor } : {}}
              >
                <Icon size={18} className={isActive ? '' : 'text-gray-400'} />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}

          {/* Developer & Advanced */}
          {(userProfile?.role === 'client' || userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
            <>
              {[
                { id: 'developer', label: t('nav.developer', 'Developer'), icon: Code },
                { id: 'white-label', label: t('nav.whiteLabel', 'White-Label'), icon: Globe },
              ].map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                      isActive ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    style={isActive ? { backgroundColor: branding.primaryColor } : {}}
                  >
                    <Icon size={18} className={isActive ? '' : 'text-gray-400'} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Enterprise Security - gated by feature flag */}
          {(featureFlags[Feature.ENTERPRISE_SSO] || authUserProfile?.role === 'super_admin') && (
            <button
              onClick={() => setCurrentPage('enterprise-security')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                currentPage === 'enterprise-security' ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={currentPage === 'enterprise-security' ? { backgroundColor: branding.primaryColor } : {}}
            >
              <Shield size={18} className={currentPage === 'enterprise-security' ? '' : 'text-gray-400'} />
              <span className="text-sm">{t('nav.enterprise', 'Enterprise')}</span>
            </button>
          )}

          {/* Service Quality - gated by admin role or enterprise plan */}
          {(userProfile?.role === 'admin' || authUserProfile?.role === 'super_admin' || featureFlags[Feature.ENTERPRISE_SSO]) && (
            <button
              onClick={() => setCurrentPage('service-quality')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                currentPage === 'service-quality' ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={currentPage === 'service-quality' ? { backgroundColor: branding.primaryColor } : {}}
            >
              <Activity size={18} className={currentPage === 'service-quality' ? '' : 'text-gray-400'} />
              <span className="text-sm">{t('nav.serviceQuality', 'Service Quality')}</span>
            </button>
          )}

          {/* Help Center */}
          <button
            onClick={() => setCurrentPage('help')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
              currentPage === 'help' ? 'text-white font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={currentPage === 'help' ? { backgroundColor: branding.primaryColor } : {}}
          >
            <HelpCircle size={18} className={currentPage === 'help' ? '' : 'text-gray-400'} />
            <span className="text-sm">{t('nav.helpCenter', 'Help Center')}</span>
          </button>

          {/* Reseller Portal - gated by feature flag */}
          {(featureFlags[Feature.RESELLER_PORTAL] || authUserProfile?.role === 'super_admin') && (
            <button
              onClick={() => setCurrentPage('reseller-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 ${
                currentPage === 'reseller-dashboard' || currentPage === 'reseller-billing'
                  ? 'text-white font-medium shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              style={currentPage === 'reseller-dashboard' || currentPage === 'reseller-billing' ? { backgroundColor: branding.primaryColor } : {}}
            >
              <Briefcase size={18} className={currentPage === 'reseller-dashboard' || currentPage === 'reseller-billing' ? '' : 'text-gray-400'} />
              <span className="text-sm">{t('nav.resellerPortal', 'Reseller Portal')}</span>
            </button>
          )}
        </div>

        {/* User Profile */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {(userProfile?.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{userProfile?.full_name || 'User'}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      <main id="main-content" className="flex-1 overflow-auto bg-gray-50" style={{ marginTop: topOffset }}>
        <div className="p-6">
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
    </div>
  );
}
