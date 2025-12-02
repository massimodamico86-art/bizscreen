import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  ListVideo,
  Image,
  Video,
  Globe,
  Grid3X3,
  Plus,
  ArrowRight,
  Wifi,
  WifiOff,
  Clock,
  Layout,
  Rocket,
  CheckCircle,
  Copy,
  Loader2,
  Sparkles,
  Play,
  X,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Building2,
  ChevronRight,
  Package,
  LayoutTemplate,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
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
  StatCard,
  Button,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  Badge,
  EmptyState,
} from '../design-system';
import {
  getDashboardStats,
  getTopScreens,
  formatLastSeen
} from '../services/dashboardService';
import { checkIsFirstRun, needsOnboarding } from '../services/onboardingService';
import { createDemoWorkspace } from '../services/demoContentService';
import OnboardingWizard from '../components/OnboardingWizard';
import { applyPack, getDefaultPackSlug } from '../services/templateService';

// Business type options for onboarding
const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'salon', label: 'Salon / Spa', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  { id: 'gym', label: 'Gym / Fitness', icon: Dumbbell, color: 'bg-purple-100 text-purple-600' },
  { id: 'retail', label: 'Retail / Store', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: 'generic', label: 'Other Business', icon: Building2, color: 'bg-gray-100 text-gray-600' },
];

const WELCOME_MODAL_KEY = 'bizscreen_welcome_modal_shown';

const DashboardPage = ({ setCurrentPage, showToast }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
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
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      showToast?.('Error loading dashboard: ' + error.message, 'error');
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
      console.error('Error creating demo workspace:', error);
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

    try {
      const packSlug = getDefaultPackSlug(businessType);
      const result = await applyPack(packSlug);
      setPackResult(result);

      showToast?.(`${businessType.charAt(0).toUpperCase() + businessType.slice(1)} starter pack applied!`, 'success');

      await fetchData();
      setIsFirstRun(false);
    } catch (error) {
      console.error('Error applying pack:', error);
      showToast?.('Failed to apply starter pack: ' + error.message, 'error');
      setWelcomeStep('businessType');
    } finally {
      setApplyingPack(false);
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
        />

        <PageContent>
          <Stack gap="lg">
            {/* Getting Started - First Run */}
            {isFirstRun && !demoResult && (
              <GettingStartedCard
                onCreateDemo={handleCreateDemoWorkspace}
                creating={creatingDemo}
              />
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
            <Grid cols={4} gap="default">
              <StatCard
                title={t('dashboard.totalScreens', 'Total Screens')}
                value={stats?.screens?.total || 0}
                icon={<Monitor className="w-5 h-5" />}
                description={
                  <span className="flex items-center gap-3">
                    <span className="text-green-600 flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> {stats?.screens?.online || 0}
                    </span>
                    <span className="text-gray-400 flex items-center gap-1">
                      <WifiOff className="w-3 h-3" /> {stats?.screens?.offline || 0}
                    </span>
                  </span>
                }
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentPage('screens')}
              />

              <StatCard
                title={t('dashboard.playlists', 'Playlists')}
                value={stats?.playlists?.total || 0}
                icon={<ListVideo className="w-5 h-5" />}
                description={t('dashboard.contentPlaylists', 'Content playlists')}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentPage('playlists')}
              />

              <StatCard
                title={t('dashboard.mediaAssets', 'Media Assets')}
                value={stats?.media?.total || 0}
                icon={<Image className="w-5 h-5" />}
                description={
                  <span className="flex items-center gap-2 flex-wrap">
                    {stats?.media?.images > 0 && (
                      <span className="flex items-center gap-1">
                        <Image className="w-3 h-3" /> {stats.media.images}
                      </span>
                    )}
                    {stats?.media?.videos > 0 && (
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" /> {stats.media.videos}
                      </span>
                    )}
                  </span>
                }
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentPage('media-all')}
              />

              <StatCard
                title={t('dashboard.apps', 'Apps')}
                value={stats?.media?.apps || 0}
                icon={<Grid3X3 className="w-5 h-5" />}
                description={t('dashboard.widgetsAndContent', 'Widgets & dynamic content')}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setCurrentPage('apps')}
              />
            </Grid>

            {/* Two Column Layout */}
            <Grid cols={2} gap="default">
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
            </Grid>

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

// Sub-components

function GettingStartedCard({ onCreateDemo, creating }) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md flex-shrink-0">
          <Rocket className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome to BizScreen!</h2>
          <p className="text-gray-600 mb-4">
            Get started in under 30 seconds. We'll create sample content, a playlist, and a demo screen for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StepCard number={1} title="Create Demo Content" subtitle="Sample media, playlist & layout" color="blue" />
            <StepCard number={2} title="Pair Your TV" subtitle="Open /player and enter the code" color="purple" />
            <StepCard number={3} title="Watch It Play" subtitle="Your content displays instantly" color="green" />
          </div>

          <Button
            onClick={onCreateDemo}
            disabled={creating}
            icon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {creating ? 'Creating Demo Workspace...' : 'Create Demo Workspace'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StepCard({ number, title, subtitle, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
      <div className={`w-8 h-8 ${colors[color]} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
        {number}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function DemoResultCard({ result, onCopyCode, setCurrentPage }) {
  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {result.alreadyExisted ? 'Demo Workspace Ready!' : 'Demo Workspace Created!'}
          </h2>
          <p className="text-gray-600 mb-4">
            Your demo screen is ready. Open <code className="bg-green-100 px-2 py-0.5 rounded text-green-800">/player</code> on your TV browser and enter the pairing code.
          </p>

          <div className="bg-white rounded-lg p-4 border border-green-200 mb-4 inline-block">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pairing Code</p>
            <div className="flex items-center gap-3">
              <code className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                {result.otpCode}
              </code>
              <button
                onClick={() => onCopyCode(result.otpCode)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy code"
              >
                <Copy className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {result.playlistId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ListVideo className="w-4 h-4 text-orange-500" />}
                onClick={() => setCurrentPage(`playlist-editor-${result.playlistId}`)}
              >
                {result.playlistName}
              </Button>
            )}
            {result.layoutId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Layout className="w-4 h-4 text-purple-500" />}
                onClick={() => setCurrentPage(`layout-editor-${result.layoutId}`)}
              >
                {result.layoutName}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Monitor className="w-4 h-4 text-blue-500" />}
              onClick={() => setCurrentPage('screens')}
            >
              {result.screenName}
            </Button>
            <a
              href="/player"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Open Player
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScreenRow({ screen, t }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${screen.isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{screen.device_name}</p>
          <p className="text-xs text-gray-500 truncate">
            {screen.assigned_playlist?.name || screen.assigned_layout?.name || t('screens.noContentAssigned', 'No content assigned')}
          </p>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-3">
        <Badge variant={screen.isOnline ? 'success' : 'default'} size="sm">
          {screen.isOnline ? t('screens.online', 'Online') : t('screens.offline', 'Offline')}
        </Badge>
        <p className="text-xs text-gray-400 mt-1 flex items-center justify-end gap-1">
          <Clock className="w-2.5 h-2.5" />
          {formatLastSeen(screen.last_seen)}
        </p>
      </div>
    </div>
  );
}

function QuickActionButton({ icon, iconBg, title, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all text-left group"
    >
      <div className={`p-2 ${iconBg} rounded-lg flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
    </button>
  );
}

function GettingStartedTips() {
  const steps = [
    { title: 'Upload your media', desc: 'Add images, videos, or web pages to your media library' },
    { title: 'Create a playlist', desc: 'Arrange your content in the order you want it displayed' },
    { title: 'Connect a screen', desc: 'Add a TV and pair it using the OTP code' },
    { title: 'Assign and play', desc: 'Assign your playlist to the screen and watch it play!' },
  ];

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h2>
        <p className="text-gray-600 mb-4">
          Welcome to BizScreen! Follow these steps to set up your digital signage:
        </p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

function WelcomeModal({
  open,
  step,
  onClose,
  onDemo,
  onSelectType,
  onBrowseTemplates,
  onStepChange,
  applyingPack,
  packResult,
  setCurrentPage,
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" showCloseButton={false}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-xl">
            <Rocket className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to BizScreen!</h2>
        </div>
        <p className="text-blue-100">
          {step === 'choice' && 'Your digital signage journey starts here'}
          {step === 'businessType' && 'What type of business do you run?'}
          {step === 'creating' && 'Setting up your workspace...'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 'choice' && (
          <ChoiceStep onDemo={onDemo} onNext={() => onStepChange('businessType')} onSkip={onClose} />
        )}
        {step === 'businessType' && (
          <BusinessTypeStep
            onSelect={onSelectType}
            onBack={() => onStepChange('choice')}
            onBrowse={onBrowseTemplates}
          />
        )}
        {step === 'creating' && (
          <CreatingStep
            loading={applyingPack}
            result={packResult}
            onClose={onClose}
            setCurrentPage={setCurrentPage}
          />
        )}
      </div>
    </Modal>
  );
}

function ChoiceStep({ onDemo, onNext, onSkip }) {
  return (
    <>
      <p className="text-gray-600 mb-6">Choose how you'd like to get started:</p>
      <Stack gap="sm" className="mb-6">
        <button
          onClick={onDemo}
          className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Quick Demo</h3>
            <p className="text-sm text-gray-500">Get sample content + a demo screen to test immediately</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
        </button>

        <button
          onClick={onNext}
          className="w-full p-4 border-2 border-purple-200 rounded-lg hover:border-purple-400 bg-purple-50 transition-colors text-left flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              Business Starter Pack
              <Badge variant="purple" size="sm">Recommended</Badge>
            </h3>
            <p className="text-sm text-gray-500">Templates tailored for your business type</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
        </button>
      </Stack>

      <button
        onClick={onSkip}
        className="w-full px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
      >
        Skip, I'll start from scratch
      </button>
    </>
  );
}

function BusinessTypeStep({ onSelect, onBack, onBrowse }) {
  return (
    <>
      <p className="text-gray-600 mb-4">
        We'll set up playlists, layouts, and content placeholders tailored for your business.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-center"
            >
              <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2 ${type.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900 text-sm">{type.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={onBrowse}
          className="flex-1 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <LayoutTemplate className="w-4 h-4" />
          Browse All Templates
        </button>
      </div>
    </>
  );
}

function CreatingStep({ loading, result, onClose, setCurrentPage }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-purple-600 mb-4" />
        <p className="text-gray-600">Creating your starter pack...</p>
        <p className="text-sm text-gray-400 mt-1">This only takes a moment</p>
      </div>
    );
  }

  if (result) {
    return (
      <>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Your workspace is ready!</h3>
          <p className="text-gray-500 text-sm">
            We created {result.playlists?.length || 0} playlists and {result.layouts?.length || 0} layouts for you.
          </p>
        </div>

        <Stack gap="xs" className="mb-6">
          {result.playlists?.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <ListVideo className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
              <button
                onClick={() => {
                  onClose();
                  setCurrentPage(`playlist-editor-${p.id}`);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          ))}
          {result.layouts?.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <Grid3X3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{l.name}</span>
              <button
                onClick={() => {
                  onClose();
                  setCurrentPage(`layout-editor-${l.id}`);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
              >
                Edit
              </button>
            </div>
          ))}
        </Stack>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Go to Dashboard
          </Button>
          <Button
            onClick={() => {
              onClose();
              if (result.playlists?.[0]?.id) {
                setCurrentPage(`playlist-editor-${result.playlists[0].id}`);
              }
            }}
            fullWidth
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            Customize Content
          </Button>
        </div>
      </>
    );
  }

  return null;
}

export default DashboardPage;
