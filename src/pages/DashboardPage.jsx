/**
 * DashboardPage.jsx
 * Main client dashboard displaying stats, screens overview, and quick actions.
 *
 * This is the primary view for authenticated client users after login.
 * It orchestrates data fetching, onboarding flows, and navigation.
 *
 * Sub-components are extracted to:
 * - ./dashboard/DashboardSections.jsx - Core display components
 * - ./dashboard/OnboardingCards.jsx - First-run cards
 * - ./dashboard/WelcomeModal.jsx - Welcome modal flow
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  ListVideo,
  Image,
  Grid3X3,
  Plus,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Grid,
  Stack,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  EmptyState,
} from '../design-system';
import {
  getDashboardStats,
  getTopScreens,
  getRecentActivity,
  getAlertSummary,
} from '../services/dashboardService';
import { checkIsFirstRun, needsOnboarding } from '../services/onboardingService';
import { createDemoWorkspace } from '../services/demoContentService';
import OnboardingWizard from '../components/OnboardingWizard';
import { applyPack, getDefaultPackSlug } from '../services/templateService';

// Extracted sub-components
import {
  DashboardErrorState,
  StatsGrid,
  ScreenRow,
  QuickActionButton,
  AlertsWidget,
} from './dashboard/DashboardSections';
import {
  GettingStartedCard,
  DemoResultCard,
  GettingStartedTips,
} from './dashboard/OnboardingCards';
import { WelcomeModal } from './dashboard/WelcomeModal';

// Yodeck-style welcome components
import { WelcomeHero, WelcomeFeatureCards } from '../components/welcome';

// Dashboard components
import {
  HealthBanner,
  QuickActionsBar,
  ActiveContentGrid,
  TimelineActivity,
  PendingApprovalsWidget,
} from '../components/dashboard';
import { useBreakpoints } from '../hooks/useMediaQuery';

/** localStorage key for tracking welcome modal dismissal */
const WELCOME_MODAL_KEY = 'bizscreen_welcome_modal_shown';

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
  const [stats, setStats] = useState(null);
  const [screens, setScreens] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [alertSummary, setAlertSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [demoResult, setDemoResult] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState('choice');
  const [selectedBusinessType, setSelectedBusinessType] = useState(null);
  const [applyingPack, setApplyingPack] = useState(false);
  const [packResult, setPackResult] = useState(null);
  const [packError, setPackError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null); // Clear any previous error

      // Fetch core data in parallel
      const [statsData, screensData, firstRunData, onboardingStatus] = await Promise.all([
        getDashboardStats(),
        getTopScreens(5),
        checkIsFirstRun(),
        needsOnboarding()
      ]);
      setStats(statsData);
      setScreens(screensData);
      setIsFirstRun(firstRunData.isFirstRun);
      setOnboardingNeeded(onboardingStatus);

      if (firstRunData.isFirstRun && !localStorage.getItem(WELCOME_MODAL_KEY)) {
        setShowWelcomeModal(true);
      }

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
  }, [user, showToast]);

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

  const handleCreateDemoWorkspace = async () => {
    try {
      setCreatingDemo(true);
      const result = await createDemoWorkspace();
      setDemoResult(result);

      if (result.alreadyExisted) {
        showToast?.('Demo workspace already exists. Showing your existing demo screen.');
      } else {
        showToast?.(`Demo workspace created! Pair your TV using code: ${result.otpCode}`);
      }

      await fetchData();
      setIsFirstRun(false);
    } catch (error) {
      logger.error('Error creating demo workspace:', error);
      showToast?.('Failed to create demo workspace: ' + error.message, 'error');
    } finally {
      setCreatingDemo(false);
    }
  };

  const copyOtpCode = (code) => {
    navigator.clipboard.writeText(code);
    showToast?.('OTP code copied to clipboard');
  };

  const dismissWelcomeModal = () => {
    localStorage.setItem(WELCOME_MODAL_KEY, 'true');
    setShowWelcomeModal(false);
  };

  const handleDemoFromModal = async () => {
    dismissWelcomeModal();
    await handleCreateDemoWorkspace();
  };

  const handleSelectBusinessType = async (businessType) => {
    setSelectedBusinessType(businessType);
    setWelcomeStep('creating');
    setApplyingPack(true);
    setPackError(null);
    setPackResult(null);

    try {
      const packSlug = getDefaultPackSlug(businessType);
      const result = await applyPack(packSlug);
      setPackResult(result);

      showToast?.(`${businessType.charAt(0).toUpperCase() + businessType.slice(1)} starter pack applied!`, 'success');

      await fetchData();
      setIsFirstRun(false);
    } catch (error) {
      logger.error('Error applying pack:', error);
      setPackError(error.message || 'Failed to apply starter pack');
    } finally {
      setApplyingPack(false);
    }
  };

  const handleRetryPack = () => {
    if (selectedBusinessType) {
      handleSelectBusinessType(selectedBusinessType);
    }
  };

  const handleBrowseTemplates = () => {
    dismissWelcomeModal();
    setCurrentPage('templates');
  };

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
      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        step={welcomeStep}
        onClose={dismissWelcomeModal}
        onDemo={handleDemoFromModal}
        onSelectType={handleSelectBusinessType}
        onBrowseTemplates={handleBrowseTemplates}
        onStepChange={setWelcomeStep}
        applyingPack={applyingPack}
        packResult={packResult}
        packError={packError}
        onRetryPack={handleRetryPack}
        setCurrentPage={setCurrentPage}
      />

      {/* Step-by-step Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
        onComplete={() => {
          setShowOnboardingWizard(false);
          setOnboardingNeeded(false);
          fetchData();
        }}
      />

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

            {/* Yodeck-style Welcome Section - First Run */}
            {isFirstRun && !demoResult && (
              <>
                <WelcomeHero
                  userName={user?.user_metadata?.full_name?.split(' ')[0] || 'there'}
                  onAddMedia={() => setCurrentPage('media-all')}
                />
                <WelcomeFeatureCards
                  onCreatePlaylist={() => setCurrentPage('playlists')}
                  onBrowseTemplates={() => setCurrentPage('templates')}
                  onWatchTutorial={() => window.open('https://bizscreen.io/tutorials', '_blank')}
                />
              </>
            )}

            {/* Continue Setup - Show when onboarding incomplete but not first run */}
            {onboardingNeeded && !isFirstRun && !demoResult && (
              <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                <div className="p-4 flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-100 rounded-xl flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">Continue Your Setup</h3>
                    <p className="text-sm text-gray-600">Complete the guided setup to get the most out of BizScreen.</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowOnboardingWizard(true)}
                  >
                    Continue Setup
                  </Button>
                </div>
              </Card>
            )}

            {/* Demo Result Card */}
            {demoResult && (
              <DemoResultCard
                result={demoResult}
                onCopyCode={copyOtpCode}
                setCurrentPage={setCurrentPage}
              />
            )}

            {/* Stats Grid */}
            <StatsGrid
              stats={stats}
              setCurrentPage={setCurrentPage}
              t={t}
              isFirstRun={isFirstRun}
              demoResult={demoResult}
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
            {!isFirstRun && !demoResult && stats?.screens?.total === 0 && stats?.playlists?.total === 0 && (
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
