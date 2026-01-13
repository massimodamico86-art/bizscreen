import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  CreditCard,
  Monitor,
  Image,
  ListVideo,
  Layout,
  Calendar,
  Check,
  ArrowRight,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  Crown,
  Zap,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  X
} from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter
} from '../design-system';
import {
  fetchPlans,
  getCurrentSubscription,
  formatPrice,
  getStatusInfo,
  getTrialDaysRemaining,
  canUpgradeTo,
  isDowngrade,
  formatLimitValue
} from '../services/accountPlanService';
import {
  getUsageCounts,
  getUsagePercent,
  formatLimitDisplay,
  isApproachingLimit,
  hasReachedLimit
} from '../services/limitsService';
import {
  startCheckout,
  openBillingPortal,
  mapSubscriptionToUiState,
  checkCheckoutResult,
  clearCheckoutResult
} from '../services/billingService';

const AccountPlanPage = ({ showToast }) => {
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    loadData();
    handleCheckoutResult();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subData, plansData, usageData] = await Promise.all([
        getCurrentSubscription(),
        fetchPlans(),
        getUsageCounts()
      ]);
      setSubscription(subData);
      setPlans(plansData);
      setUsage(usageData);
    } catch (err) {
      console.error('Error loading plan data:', err);
      setError(err.message || 'Failed to load plan data');
      showToast?.(t('accountPlan.errorLoading', 'Error loading plan data: {{message}}', { message: err.message }), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutResult = () => {
    const result = checkCheckoutResult();
    if (result.success) {
      setCheckoutSuccess(true);
      showToast?.(t('accountPlan.subscriptionUpdated', 'Subscription updated successfully!'));
      clearCheckoutResult();
      setTimeout(loadData, 1000);
    } else if (result.canceled) {
      showToast?.(t('accountPlan.checkoutCanceled', 'Checkout was canceled'), 'error');
      clearCheckoutResult();
    }
  };

  const handleUpgrade = async (planSlug) => {
    try {
      setUpgrading(planSlug);
      await startCheckout(planSlug);
    } catch (error) {
      console.error('Error starting checkout:', error);
      showToast?.(t('accountPlan.errorCheckout', 'Error starting checkout: {{message}}', { message: error.message }), 'error');
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setOpeningPortal(true);
      await openBillingPortal();
    } catch (error) {
      console.error('Error opening billing portal:', error);
      showToast?.(t('accountPlan.errorPortal', 'Error opening billing portal: {{message}}', { message: error.message }), 'error');
      setOpeningPortal(false);
    }
  };

  const openUpgradeModal = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <PageHeader
          title={t('accountPlan.title', 'Plan & Billing')}
          description={t('accountPlan.description', 'Manage your subscription and view usage limits')}
        />
        <PageContent>
          <Card className="p-8 max-w-md mx-auto">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('accountPlan.errorTitle', 'Unable to load plan data')}
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw size={16} />
                {t('common.tryAgain', 'Try Again')}
              </Button>
            </div>
          </Card>
        </PageContent>
      </PageLayout>
    );
  }

  const statusInfo = subscription ? getStatusInfo(subscription.status) : null;
  const uiState = mapSubscriptionToUiState(subscription);

  const usageItems = [
    { label: t('common.screens', 'Screens'), icon: Monitor, current: usage?.screensCount || 0, max: subscription?.maxScreens, color: 'blue' },
    { label: t('accountPlan.mediaAssets', 'Media Assets'), icon: Image, current: usage?.mediaCount || 0, max: subscription?.maxMediaAssets, color: 'green' },
    { label: t('common.playlists', 'Playlists'), icon: ListVideo, current: usage?.playlistsCount || 0, max: subscription?.maxPlaylists, color: 'orange' },
    { label: t('common.layouts', 'Layouts'), icon: Layout, current: usage?.layoutsCount || 0, max: subscription?.maxLayouts, color: 'purple' },
    { label: t('common.schedules', 'Schedules'), icon: Calendar, current: usage?.schedulesCount || 0, max: subscription?.maxSchedules, color: 'teal' }
  ];

  const getPlanIcon = (slug) => {
    switch (slug) {
      case 'pro': return Crown;
      case 'starter': return Zap;
      default: return Sparkles;
    }
  };

  const getPlanColor = (slug) => {
    switch (slug) {
      case 'pro': return 'purple';
      case 'starter': return 'blue';
      default: return 'gray';
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('accountPlan.title', 'Plan & Billing')}
        description={t('accountPlan.description', 'Manage your subscription and view usage limits')}
        actions={
          <Button variant="secondary" onClick={loadData} disabled={loading} icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}>
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      <PageContent className="space-y-6 max-w-5xl">
        {/* Success Banner */}
        {checkoutSuccess && (
          <Alert variant="success" dismissible onDismiss={() => setCheckoutSuccess(false)}>
            <div>
              <p className="font-medium">{t('accountPlan.subscriptionUpdatedTitle', 'Subscription updated!')}</p>
              <p className="text-sm">{t('accountPlan.subscriptionUpdatedDesc', 'Your plan has been successfully updated. Thank you!')}</p>
            </div>
          </Alert>
        )}

        {/* Current Plan Card */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-${getPlanColor(subscription?.planSlug)}-100`}>
                  {(() => {
                    const Icon = getPlanIcon(subscription?.planSlug);
                    return <Icon className={`w-6 h-6 text-${getPlanColor(subscription?.planSlug)}-600`} aria-hidden="true" />;
                  })()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('accountPlan.planName', '{{name}} Plan', { name: subscription?.planName })}
                    </h2>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${statusInfo?.color}-100 text-${statusInfo?.color}-700`}>
                      {statusInfo?.label}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{uiState.message}</p>
                  {uiState.trialDaysLeft > 0 && (
                    <p className="text-blue-600 text-sm mt-1 font-medium">
                      {t('accountPlan.trialDaysLeft', '{{days}} day(s) left in trial', { days: uiState.trialDaysLeft })}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  {formatPrice(subscription?.priceMonthly || 0)}
                </div>
                {subscription?.priceMonthly > 0 && (
                  <div className="text-sm text-gray-500">{t('accountPlan.perMonth', 'per month')}</div>
                )}
              </div>
            </div>
          </div>

          {uiState.showWarning && uiState.warningMessage && (
            <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" aria-hidden="true" />
              <span className="text-sm text-yellow-800">{uiState.warningMessage}</span>
            </div>
          )}
        </Card>

        {/* Usage & Limits */}
        <Card padding="none">
          <CardHeader className="p-6 border-b border-gray-100">
            <CardTitle>{t('accountPlan.usageLimits', 'Usage & Limits')}</CardTitle>
            <CardDescription>{t('accountPlan.usageDescription', 'Your current resource usage compared to plan limits')}</CardDescription>
          </CardHeader>
          <div className="p-6 space-y-6">
            {usageItems.map(item => {
              const Icon = item.icon;
              const percent = getUsagePercent(item.max, item.current);
              const approaching = isApproachingLimit(item.max, item.current);
              const reached = hasReachedLimit(item.max, item.current);

              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 text-${item.color}-500`} aria-hidden="true" />
                      <span className="font-medium text-gray-700">{item.label}</span>
                    </div>
                    <span className={`text-sm font-medium ${reached ? 'text-red-600' : approaching ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {formatLimitDisplay(item.max, item.current)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${reached ? 'bg-red-500' : approaching ? 'bg-yellow-500' : `bg-${item.color}-500`}`}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  {reached && (
                    <p className="text-xs text-red-600">
                      {t('accountPlan.limitReached', 'Limit reached. Upgrade your plan to add more.')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Available Plans */}
        <section aria-labelledby="plans-heading">
          <h3 id="plans-heading" className="text-lg font-semibold text-gray-900 mb-4">
            {t('accountPlan.availablePlans', 'Available Plans')}
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const Icon = getPlanIcon(plan.slug);
              const isCurrent = plan.slug === subscription?.planSlug;
              const canUpgrade = canUpgradeTo(subscription?.planSlug, plan.slug);
              const isPaidPlan = plan.slug !== 'free';

              return (
                <Card key={plan.id} padding="none" className={`relative overflow-hidden ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg">
                      {t('accountPlan.current', 'Current')}
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 text-${getPlanColor(plan.slug)}-500`} aria-hidden="true" />
                      <h4 className="font-bold text-gray-900">{plan.name}</h4>
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold text-gray-900">{formatPrice(plan.priceMonthly)}</span>
                      {plan.priceMonthly > 0 && <span className="text-gray-500 text-sm">/{t('common.month', 'month')}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                    <ul className="space-y-2 mb-6" aria-label={t('accountPlan.planFeatures', 'Plan features')}>
                      {(plan.features || []).slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-500 shrink-0" aria-hidden="true" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <Button variant="secondary" disabled fullWidth>{t('accountPlan.currentPlan', 'Current Plan')}</Button>
                    ) : canUpgrade && isPaidPlan ? (
                      <Button onClick={() => openUpgradeModal(plan)} disabled={upgrading !== null} fullWidth loading={upgrading === plan.slug} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                        {t('accountPlan.upgrade', 'Upgrade')}
                      </Button>
                    ) : !isPaidPlan && subscription?.planSlug !== 'free' ? (
                      <Button variant="secondary" onClick={handleManageBilling} disabled={openingPortal} fullWidth loading={openingPortal} icon={<ExternalLink className="w-4 h-4" />} iconPosition="right">
                        {t('accountPlan.manageInPortal', 'Manage in Portal')}
                      </Button>
                    ) : (
                      <Button variant="secondary" disabled fullWidth>{t('accountPlan.contactSupport', 'Contact Support')}</Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Billing Portal Card */}
        <Card padding="none">
          <CardHeader className="p-6 border-b border-gray-100">
            <CardTitle>{t('accountPlan.billingInfo', 'Billing Information')}</CardTitle>
          </CardHeader>
          <div className="p-6">
            {uiState.canManageBilling ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CreditCard className="w-8 h-8 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="font-medium text-gray-700">{t('accountPlan.manageSubscription', 'Manage your subscription')}</p>
                    <p className="text-sm text-gray-500">{t('accountPlan.manageDescription', 'Update payment method, view invoices, or cancel your subscription.')}</p>
                  </div>
                </div>
                <Button variant="secondary" onClick={handleManageBilling} disabled={openingPortal} loading={openingPortal} icon={<ExternalLink size={16} />}>
                  {t('accountPlan.manageBilling', 'Manage Billing')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-gray-500">
                <CreditCard className="w-8 h-8" aria-hidden="true" />
                <div>
                  <p className="font-medium text-gray-700">{t('accountPlan.noSubscription', 'No active subscription')}</p>
                  <p className="text-sm">{t('accountPlan.upgradeToAccess', 'Upgrade to a paid plan to access billing management.')}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Upgrade Modal */}
        <Modal open={showUpgradeModal && !!selectedPlan} onClose={() => { setShowUpgradeModal(false); setSelectedPlan(null); }} size="sm">
          <ModalHeader>
            <ModalTitle>{t('accountPlan.upgradeTo', 'Upgrade to {{name}}', { name: selectedPlan?.name })}</ModalTitle>
          </ModalHeader>
          <ModalContent>
            <p className="text-gray-600 mb-4">{t('accountPlan.redirectToStripe', "You'll be redirected to Stripe to complete your subscription.")}</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('common.screens', 'Screens')}</span><span className="font-medium">{formatLimitValue(selectedPlan?.maxScreens)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('accountPlan.mediaAssets', 'Media Assets')}</span><span className="font-medium">{formatLimitValue(selectedPlan?.maxMediaAssets)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('common.playlists', 'Playlists')}</span><span className="font-medium">{formatLimitValue(selectedPlan?.maxPlaylists)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('common.layouts', 'Layouts')}</span><span className="font-medium">{formatLimitValue(selectedPlan?.maxLayouts)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-600">{t('common.schedules', 'Schedules')}</span><span className="font-medium">{formatLimitValue(selectedPlan?.maxSchedules)}</span></div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={() => { setShowUpgradeModal(false); setSelectedPlan(null); }} disabled={upgrading !== null}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => handleUpgrade(selectedPlan?.slug)} disabled={upgrading !== null} loading={upgrading === selectedPlan?.slug} icon={<ExternalLink className="w-4 h-4" />} iconPosition="right">
              {t('accountPlan.continueToCheckout', 'Continue to Checkout')}
            </Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageLayout>
  );
};

export default AccountPlanPage;
