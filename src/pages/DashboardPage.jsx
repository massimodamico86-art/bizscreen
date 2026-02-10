/**
 * DashboardPage.jsx
 * Main client dashboard displaying stats, screens overview, and quick actions.
 *
 * This is the primary view for authenticated client users after login.
 * It orchestrates data fetching, unified onboarding flow, and navigation.
 *
 * Sub-components are extracted to:
 * - ./dashboard/DashboardSections.jsx - Core display components
 * - ./dashboard/OnboardingCards.jsx - First-run cards
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ArrowRight,
  Monitor,
  Plus,
  ListVideo,
  Image,
  Grid3X3,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';

import {
  getDashboardStats,
  getTopScreens,
  getRecentActivity,
  getAlertSummary,
} from '../services/dashboardService';

// Design system components
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Stack,
  Button,
  EmptyState,
} from '../design-system';

// Extracted sub-components
import { DashboardErrorState, StatsGrid, ScreenRow, QuickActionButton, AlertsWidget } from './dashboard/DashboardSections';
import { GettingStartedTips } from './dashboard/OnboardingCards';
import { QuickActionsBar, HealthBanner, ActiveContentGrid, TimelineActivity, PendingApprovalsWidget, ScreenPairingReminderCard } from '../components/dashboard';

import ErrorBoundary from '../components/ErrorBoundary';

// Unified onboarding controller (Phase 31)
import { UnifiedOnboardingController } from '../components/onboarding/UnifiedOnboardingController';
import { useBreakpoints } from '../hooks/useMediaQuery';

/**
 * Main client dashboard page component.
 *
 * Displays stats overview, screens list, quick actions, and handles
 * onboarding flows for new users.
 *
 * @param {Object} props
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler from App.jsx
 * @param {(message: string, type?: 'success'|'error'|'info') => void} [props.showToast] - Toast notification handler
 */
const DashboardPage = ({ setCurrentPage, showToast }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const logger = useLogger('DashboardPage');
  const { isMobile } = useBreakpoints();

  // Core dashboard state
  const [stats, setStats] = useState(null);
  const [screens, setScreens] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unified onboarding state (Phase 31)
  const [showUnifiedOnboarding, setShowUnifiedOnboarding] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null); // Clear any previous error

      // Fetch core data in parallel
      const [statsData, screensData] = await Promise.all([
        getDashboardStats(),
        getTopScreens(5),
      ]);
      setStats(statsData);
      setScreens(screensData);

      // Fetch secondary data (recent activity, alerts) - don't block main load
      setActivityLoading(true);
      setAlertsLoading(true);

      getRecentActivity(5)
        .then(data => setRecentActivity(data))
        .catch(err => logger.warn('Failed to fetch recent activity:', err))
        .finally(() => setActivityLoading(false));

      getAlertSummary()
        .then(data => setAlertSummary(data))
        .catch(err => logger.warn('Failed to fetch alert summary:', err))
        .finally(() => setAlertsLoading(false));

    } catch (err) {
      logger.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      showToast?.('Error loading dashboard: ' + err.message, 'error');
    }
  }, [user, showToast, logger]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };

    loadData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Check for unified onboarding state
  useEffect(() => {
    if (!loading) {
      import('../services/onboardingService').then(({ getUnifiedOnboardingState }) => {
        getUnifiedOnboardingState().then(state => {
          // Show unified onboarding if not complete (covers both first-run and resume cases)
          if (!state.isComplete && !state.skippedAt) {
            setShowUnifiedOnboarding(true);
          }
        });
      });
    }
  }, [loading]);

  /**
   * Handle unified onboarding completion
   */
  const handleUnifiedOnboardingComplete = useCallback(() => {
    setShowUnifiedOnboarding(false);
    // Refresh dashboard data
    fetchData?.();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  // Show inline error UI when data fetch fails
  if (error && !stats) {
    return (
      <ErrorBoundary>
        <PageLayout maxWidth="wide">
          <PageHeader
            title={t('dashboard.title', 'Dashboard')}
            description={t('dashboard.welcomeSubtitle', "Welcome back! Here's your digital signage overview")}
          />
          <PageContent>
            <DashboardErrorState
              error={error}
              onRetry={fetchData}
              t={t}
            />
          </PageContent>
        </PageLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {/* Unified Onboarding Controller (Phase 31) */}
      {showUnifiedOnboarding && (
        <UnifiedOnboardingController onComplete={handleUnifiedOnboardingComplete} />
      )}

      <PageLayout maxWidth="wide">
        <PageHeader
          title={t('dashboard.title', 'Dashboard')}
          description={t('dashboard.welcomeSubtitle', "Welcome back! Here's your digital signage overview")}
          actions={
            !isMobile && (
              <QuickActionsBar onNavigate={setCurrentPage} />
            )
          }
        />

        <PageContent>
          <Stack gap="lg">
            {/* Health Banner - critical alerts at top */}
            <HealthBanner alertSummary={alertSummary} onNavigate={setCurrentPage} />

            {/* Screen Pairing Reminder - for users who skipped pairing during onboarding (Phase 32) */}
            <ScreenPairingReminderCard onNavigate={setCurrentPage} />

            {/* Stats Grid */}
            <StatsGrid
              stats={stats}
              setCurrentPage={setCurrentPage}
              t={t}
            />

            {/* Pending Approvals Widget - only shows for approvers with pending items */}
            <PendingApprovalsWidget onNavigate={setCurrentPage} className="mb-0" />

            {/* Active Content Grid - shows what's playing */}
            <ActiveContentGrid
              screens={screens}
              onNavigate={setCurrentPage}
              loading={loading}
            />

            {/* Mobile Quick Actions Card */}
            {isMobile && (
              <Card padding="default" className="lg:hidden">
                <CardHeader>
                  <CardTitle>{t('dashboard.quickActions', 'Quick Actions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <QuickActionsBar onNavigate={setCurrentPage} />
                </CardContent>
              </Card>
            )}

            {/* Two Column Layout - Responsive */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Screens Overview */}
              <Card padding="default">
                <CardHeader
                  actions={
                    <button
                      onClick={() => setCurrentPage('screens')}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {t('common.viewAll', 'View all')} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  }
                >
                  <CardTitle>{t('dashboard.screensOverview', 'Screens Overview')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {screens.length === 0 ? (
                    <EmptyState
                      icon={<Monitor className="w-10 h-10" />}
                      title={t('dashboard.noScreensYet', 'No screens added yet')}
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Plus className="w-4 h-4" />}
                          onClick={() => setCurrentPage('screens')}
                        >
                          {t('dashboard.addScreen', 'Add Screen')}
                        </Button>
                      }
                      size="sm"
                    />
                  ) : (
                    <Stack gap="sm">
                      {screens.map(screen => (
                        <ScreenRow key={screen.id} screen={screen} t={t} />
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card padding="default">
                <CardHeader>
                  <CardTitle>{t('dashboard.quickActions', 'Quick Actions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Stack gap="sm">
                    <QuickActionButton
                      icon={<Monitor className="w-5 h-5 text-blue-600" />}
                      iconBg="bg-blue-100"
                      title={t('dashboard.addScreen', 'Add Screen')}
                      description={t('dashboard.connectNewTv', 'Connect a new TV display')}
                      onClick={() => setCurrentPage('screens')}
                    />
                    <QuickActionButton
                      icon={<ListVideo className="w-5 h-5 text-purple-600" />}
                      iconBg="bg-purple-100"
                      title={t('dashboard.createPlaylist', 'Create Playlist')}
                      description={t('dashboard.buildPlaylist', 'Build a new content playlist')}
                      onClick={() => setCurrentPage('playlists')}
                    />
                    <QuickActionButton
                      icon={<Image className="w-5 h-5 text-orange-600" />}
                      iconBg="bg-orange-100"
                      title={t('dashboard.uploadMedia', 'Upload Media')}
                      description={t('dashboard.addMediaDesc', 'Add images, videos, or documents')}
                      onClick={() => setCurrentPage('media-all')}
                    />
                    <QuickActionButton
                      icon={<Grid3X3 className="w-5 h-5 text-green-600" />}
                      iconBg="bg-green-100"
                      title={t('dashboard.createApp', 'Create App')}
                      description={t('dashboard.addWidgetDesc', 'Add a clock, web page, or widget')}
                      onClick={() => setCurrentPage('apps')}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </div>

            {/* Second Row - Timeline Activity & Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TimelineActivity
                activities={recentActivity}
                onNavigate={setCurrentPage}
                loading={activityLoading}
              />
              <AlertsWidget
                alertSummary={alertSummary}
                setCurrentPage={setCurrentPage}
                t={t}
                loading={alertsLoading}
              />
            </div>

            {/* Getting Started Tips */}
            {stats?.screens?.total === 0 && stats?.playlists?.total === 0 && (
              <GettingStartedTips />
            )}
          </Stack>
        </PageContent>
      </PageLayout>
    </ErrorBoundary>
  );
};

export default DashboardPage;

// Named exports for testing - re-export from extracted modules
export { DashboardErrorState, ScreenRow, StatsGrid } from './dashboard/DashboardSections';
