/**
 * ResellerBillingPage Component
 *
 * Reseller billing and commission management:
 * - Revenue charts
 * - Commission events table
 * - Payout status
 *
 * @module pages/ResellerBillingPage
 */
import { useState, useEffect } from 'react';
import {
  DollarSign
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';


import {
  getMyResellerAccount,
  getResellerEarnings,
  getCommissionEvents
} from '../services/resellerService';

export default function ResellerBillingPage({ showToast, onNavigate }) {
  const { userProfile } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [resellerAccount, setResellerAccount] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [commissionEvents, setCommissionEvents] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const account = await getMyResellerAccount();
      setResellerAccount(account);

      if (account?.status === 'active') {
        // Calculate date range based on period
        let startDate = null;
        let endDate = null;

        if (selectedPeriod === '30d') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
        } else if (selectedPeriod === '90d') {
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 90);
        } else if (selectedPeriod === '1y') {
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
        }

        const [earningsData, eventsData] = await Promise.all([
          getResellerEarnings(
            account.id,
            startDate?.toISOString().split('T')[0],
            endDate?.toISOString().split('T')[0]
          ),
          getCommissionEvents(account.id, { status: statusFilter, limit: 50 })
        ]);

        setEarnings(earningsData);
        setCommissionEvents(eventsData);
      }
    } catch (err) {
      console.error('Error loading billing data:', err);
      showToast?.('Error loading billing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = earnings.reduce((acc, e) => ({
    revenue: acc.revenue + parseFloat(e.revenue || 0),
    commission: acc.commission + parseFloat(e.commission || 0),
    events: acc.events + parseInt(e.events_count || 0)
  }), { revenue: 0, commission: 0, events: 0 });

  const pendingCommission = commissionEvents
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + parseFloat(e.commission_amount), 0);

  const paidCommission = commissionEvents
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + parseFloat(e.commission_amount), 0);

  const getEventTypeLabel = (type) => {
    const labels = {
      subscription_created: t('reseller.eventNewSubscription', 'New Subscription'),
      subscription_upgraded: t('reseller.eventUpgrade', 'Upgrade'),
      subscription_renewed: t('reseller.eventRenewal', 'Renewal'),
      screens_added: t('reseller.eventScreensAdded', 'Screens Added'),
      addon_purchased: t('reseller.eventAddon', 'Add-on'),
      refund: t('reseller.eventRefund', 'Refund')
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'info',
      paid: 'success',
      cancelled: 'default'
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64" role="status" aria-label={t('common.loading', 'Loading')}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true"></div>
        </div>
      </PageLayout>
    );
  }

  if (!resellerAccount || resellerAccount.status !== 'active') {
    return (
      <PageLayout>
        <PageContent className="max-w-2xl mx-auto">
          <EmptyState
            icon={DollarSign}
            title={t('reseller.billingNotAvailable', 'Billing Not Available')}
            description={t('reseller.billingNotAvailableDesc', 'You need an active reseller account to view billing information.')}
          />
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('reseller.billingCommissions', 'Billing & Commissions')}
        description={resellerAccount.company_name}
        actions={
          <Button variant="secondary" onClick={() => onNavigate?.('reseller-dashboard')} icon={<ChevronLeft size={18} aria-hidden="true" />}>
            {t('reseller.backToDashboard', 'Back to Dashboard')}
          </Button>
        }
      />

      <PageContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg" aria-hidden="true">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.totalRevenue', 'Total Revenue')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${totals.revenue.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {t('reseller.fromTransactions', 'From {{count}} transactions', { count: totals.events })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
                <DollarSign size={20} className="text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.totalCommission', 'Total Commission')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${totals.commission.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {t('reseller.ratePercent', '{{percent}}% rate', { percent: resellerAccount.commission_percent })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 rounded-lg" aria-hidden="true">
                <Clock size={20} className="text-amber-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.pendingPayout', 'Pending Payout')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${pendingCommission.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {t('reseller.awaitingProcessing', 'Awaiting processing')}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg" aria-hidden="true">
                <CheckCircle size={20} className="text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">{t('reseller.totalPaid', 'Total Paid')}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ${paidCommission.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {t('reseller.allTimePayouts', 'All time payouts')}
            </div>
          </Card>
        </div>

        {/* Revenue Chart (Simplified) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">{t('reseller.earningsByMonth', 'Earnings by Month')}</h3>
            <div className="flex items-center gap-2" role="group" aria-label={t('reseller.timePeriodFilter', 'Time period filter')}>
              {[
                { value: 'all', label: t('reseller.allTime', 'All Time') },
                { value: '1y', label: t('reseller.oneYear', '1 Year') },
                { value: '90d', label: t('reseller.ninetyDays', '90 Days') },
                { value: '30d', label: t('reseller.thirtyDays', '30 Days') }
              ].map(period => (
                <button
                  key={period.value}
                  onClick={() => setSelectedPeriod(period.value)}
                  className={`px-3 py-1 rounded text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    selectedPeriod === period.value
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  aria-pressed={selectedPeriod === period.value}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {earnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <BarChart3 className="w-12 h-12 mb-3 text-gray-300" aria-hidden="true" />
              <p>{t('reseller.noEarningsData', 'No earnings data available')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" role="table" aria-label={t('reseller.earningsTable', 'Earnings by month table')}>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.month', 'Month')}</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.revenue', 'Revenue')}</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.commission', 'Commission')}</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.transactions', 'Transactions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{row.month}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        ${parseFloat(row.revenue).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        ${parseFloat(row.commission).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">{row.events_count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4 text-gray-900">{t('common.total', 'Total')}</td>
                    <td className="py-3 px-4 text-right text-gray-900">
                      ${totals.revenue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-green-600">
                      ${totals.commission.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900">{totals.events}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        {/* Commission Events */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t('reseller.commissionEvents', 'Commission Events')}</CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter || ''}
                onChange={e => setStatusFilter(e.target.value || null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label={t('reseller.filterByStatus', 'Filter by status')}
              >
                <option value="">{t('reseller.allStatus', 'All Status')}</option>
                <option value="pending">{t('reseller.statusPending', 'Pending')}</option>
                <option value="approved">{t('reseller.statusApproved', 'Approved')}</option>
                <option value="paid">{t('reseller.statusPaid', 'Paid')}</option>
                <option value="cancelled">{t('reseller.statusCancelled', 'Cancelled')}</option>
              </select>
              <Button variant="ghost" size="sm" aria-label={t('common.export', 'Export')}>
                <Download size={18} aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            {commissionEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 mb-3 text-gray-300" aria-hidden="true" />
                <p>{t('reseller.noCommissionEvents', 'No commission events yet')}</p>
              </div>
            ) : (
              <table className="w-full" role="table" aria-label={t('reseller.commissionEventsTable', 'Commission events table')}>
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('common.date', 'Date')}</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.tenant', 'Tenant')}</th>
                    <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.event', 'Event')}</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.amount', 'Amount')}</th>
                    <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('reseller.commission', 'Commission')}</th>
                    <th scope="col" className="text-center py-3 px-4 text-sm font-medium text-gray-500">{t('common.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionEvents.map(event => (
                    <tr key={event.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(event.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {event.tenant?.business_name || event.tenant?.full_name || t('common.unknown', 'Unknown')}
                        </div>
                        <div className="text-xs text-gray-500">{event.tenant?.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 ${
                          event.event_type === 'refund' ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {event.event_type === 'refund' ? (
                            <ArrowDownRight size={14} aria-hidden="true" />
                          ) : (
                            <ArrowUpRight size={14} className="text-green-500" aria-hidden="true" />
                          )}
                          {getEventTypeLabel(event.event_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        ${parseFloat(event.transaction_amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        <span className={event.event_type === 'refund' ? 'text-red-600' : 'text-green-600'}>
                          {event.event_type === 'refund' ? '-' : '+'}
                          ${parseFloat(event.commission_amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(event.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Payout Settings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t('reseller.payoutSettings', 'Payout Settings')}</h3>
            <Button variant="ghost" size="sm">
              {t('common.configure', 'Configure')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">{t('reseller.billingMethod', 'Billing Method')}</div>
              <div className="font-medium text-gray-900 capitalize">
                {resellerAccount.billing_method}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">{t('reseller.paymentTerms', 'Payment Terms')}</div>
              <div className="font-medium text-gray-900">
                {t('reseller.netDays', 'Net {{days}} days', { days: resellerAccount.payment_terms_days })}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">{t('reseller.payoutStatus', 'Payout Status')}</div>
              <div className="flex items-center gap-2">
                {resellerAccount.payout_enabled ? (
                  <>
                    <CheckCircle size={16} className="text-green-500" aria-hidden="true" />
                    <span className="font-medium text-green-600">{t('common.enabled', 'Enabled')}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-amber-500" aria-hidden="true" />
                    <span className="font-medium text-amber-600">{t('reseller.notConfigured', 'Not configured')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {!resellerAccount.payout_enabled && (
            <Alert variant="warning" className="mt-4">
              <div className="flex items-start gap-2">
                <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="text-sm">
                  <p className="font-medium">{t('reseller.payoutNotConfigured', 'Payout not configured')}</p>
                  <p className="mt-1">
                    {t('reseller.connectStripeDesc', 'Connect your Stripe account to receive automatic commission payouts.')}
                  </p>
                  <button className="mt-2 text-amber-700 underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">
                    {t('reseller.connectStripe', 'Connect Stripe')}
                  </button>
                </div>
              </div>
            </Alert>
          )}
        </Card>
      </PageContent>
    </PageLayout>
  );
}
