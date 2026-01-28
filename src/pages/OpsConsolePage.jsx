import { useState, useEffect } from 'react';

import { useTranslation } from '../i18n';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Operations Console Page
 * Provides super_admin tools for managing tenants and monitoring system health.
 */
export default function OpsConsolePage() {
  const { t } = useTranslation();
  const { impersonateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('tenants');
  const [tenants, setTenants] = useState([]);
  const [queueStats, setQueueStats] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTenants(),
        fetchQueueStats(),
        fetchWarnings()
      ]);
    } catch (error) {
      console.error('Error fetching ops data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      // Get all profiles with role = 'client' (tenant owners)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .in('role', ['client', 'admin'])
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get screen counts per owner
      const { data: screens, error: screensError } = await supabase
        .from('tv_devices')
        .select('id, is_online, is_paired, listing:listings(owner_id)');

      if (screensError) throw screensError;

      // Get API token counts per owner
      const { data: tokens, error: tokensError } = await supabase
        .from('api_tokens')
        .select('id, user_id');

      if (tokensError) throw tokensError;

      // Get subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('user_id, plan_id');

      // Aggregate data per tenant
      const tenantsWithStats = (profiles || []).map(profile => {
        const ownerScreens = (screens || []).filter(s =>
          s.listing?.owner_id === profile.id
        );
        const ownerTokens = (tokens || []).filter(t => t.user_id === profile.id);
        const subscription = (subscriptions || []).find(s => s.user_id === profile.id);

        return {
          ...profile,
          stats: {
            totalScreens: ownerScreens.length,
            onlineScreens: ownerScreens.filter(s => s.is_online).length,
            offlineScreens: ownerScreens.filter(s => !s.is_online && s.is_paired).length,
            apiTokens: ownerTokens.length,
            plan: subscription?.plan_id || 'free'
          }
        };
      });

      setTenants(tenantsWithStats);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchQueueStats = async () => {
    try {
      // Webhook events queue
      const { count: pendingWebhooks } = await supabase
        .from('webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: failedWebhooks } = await supabase
        .from('webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      // Pending screen commands
      const { count: pendingCommands } = await supabase
        .from('screen_commands')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Pending offline alerts (screens offline > 5 min without alert)
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: potentialAlerts } = await supabase
        .from('tv_devices')
        .select('*', { count: 'exact', head: true })
        .eq('is_online', false)
        .eq('is_paired', true)
        .lt('last_seen_at', fiveMinAgo);

      setQueueStats({
        webhooks: {
          pending: pendingWebhooks || 0,
          failed: failedWebhooks || 0
        },
        commands: {
          pending: pendingCommands || 0
        },
        alerts: {
          potential: potentialAlerts || 0
        }
      });
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchWarnings = async () => {
    const warningsList = [];

    try {
      // Check for domains failing verification (pending > 24h)
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pendingDomains } = await supabase
        .from('custom_domains')
        .select('domain, created_at')
        .eq('verified', false)
        .lt('created_at', dayAgo);

      if (pendingDomains?.length > 0) {
        warningsList.push({
          type: 'domain_verification',
          severity: 'warning',
          message: `${pendingDomains.length} domain(s) pending verification > 24h`,
          details: pendingDomains.map(d => d.domain).join(', ')
        });
      }

      // Check for high webhook failure rate
      if (queueStats?.webhooks?.failed > 10) {
        warningsList.push({
          type: 'webhook_failures',
          severity: 'error',
          message: `${queueStats.webhooks.failed} failed webhook deliveries`,
          details: 'Check webhook endpoints and retry failed events'
        });
      }

      // Check for large pending queue
      if (queueStats?.webhooks?.pending > 100) {
        warningsList.push({
          type: 'webhook_backlog',
          severity: 'warning',
          message: `Webhook queue backlog: ${queueStats.webhooks.pending} pending`,
          details: 'Consider scaling webhook processing'
        });
      }

      setWarnings(warningsList);
    } catch (error) {
      console.error('Error fetching warnings:', error);
    }
  };

  const handleImpersonate = async (userId, email) => {
    if (!window.confirm(`Impersonate ${email}? You will view the app as this user.`)) {
      return;
    }

    try {
      await impersonateUser(userId);
      window.location.href = '/app';
    } catch (error) {
      console.error('Impersonation failed:', error);
      alert('Failed to impersonate user: ' + error.message);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      tenant.email?.toLowerCase().includes(query) ||
      tenant.full_name?.toLowerCase().includes(query)
    );
  });

  const tabs = [
    { id: 'tenants', label: t('opsConsole.tabs.tenants', 'Tenants'), icon: <Building2 size={16} aria-hidden="true" /> },
    { id: 'queues', label: t('opsConsole.tabs.queues', 'Queues'), icon: <Activity size={16} aria-hidden="true" /> },
    { id: 'warnings', label: t('opsConsole.tabs.warnings', 'Warnings'), icon: <AlertTriangle size={16} aria-hidden="true" />, badge: warnings.length }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('opsConsole.title', 'Operations Console')}</h1>
          <p className="text-gray-500 text-sm">
            {t('opsConsole.subtitle', 'Super admin tools for tenant management and system monitoring')}
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          aria-label={t('opsConsole.refresh', 'Refresh data')}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
          <span className="ml-2">{t('common.refresh', 'Refresh')}</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4" role="tablist" aria-label={t('opsConsole.tabs.label', 'Operations console tabs')}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <Badge variant="danger" className="ml-1">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tenants' && (
        <TenantsTab
          tenants={filteredTenants}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onImpersonate={handleImpersonate}
          loading={loading}
        />
      )}

      {activeTab === 'queues' && (
        <QueuesTab stats={queueStats} loading={loading} />
      )}

      {activeTab === 'warnings' && (
        <WarningsTab warnings={warnings} loading={loading} />
      )}
    </div>
  );
}

function TenantsTab({ tenants, searchQuery, setSearchQuery, onImpersonate, loading }) {
  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tenant</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Plan</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Screens</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">API Tokens</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Created</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                  Loading tenants...
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  No tenants found
                </td>
              </tr>
            ) : (
              tenants.map(tenant => (
                <tr key={tenant.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{tenant.full_name || 'Unnamed'}</p>
                      <p className="text-sm text-gray-500">{tenant.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tenant.stats.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                      tenant.stats.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {tenant.stats.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="flex items-center gap-1 text-sm">
                        <Wifi size={14} className="text-green-500" />
                        {tenant.stats.onlineScreens}
                      </span>
                      <span className="text-gray-300">/</span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <WifiOff size={14} />
                        {tenant.stats.offlineScreens}
                      </span>
                      <span className="text-gray-300">/</span>
                      <span className="text-sm text-gray-500">
                        {tenant.stats.totalScreens}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-sm">
                      <Key size={14} className="text-gray-400" />
                      {tenant.stats.apiTokens}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onImpersonate(tenant.id, tenant.email)}
                      title="Impersonate user"
                    >
                      <ExternalLink size={14} />
                      <span className="ml-1">View</span>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500 mt-4">
        Showing {tenants.length} tenant(s)
      </p>
    </div>
  );
}

function QueuesTab({ stats, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const queues = [
    {
      name: 'Webhook Events',
      icon: <Activity size={20} />,
      items: [
        { label: 'Pending', value: stats?.webhooks?.pending || 0, status: stats?.webhooks?.pending > 100 ? 'warning' : 'ok' },
        { label: 'Failed', value: stats?.webhooks?.failed || 0, status: stats?.webhooks?.failed > 0 ? 'error' : 'ok' }
      ]
    },
    {
      name: 'Screen Commands',
      icon: <Monitor size={20} />,
      items: [
        { label: 'Pending', value: stats?.commands?.pending || 0, status: 'ok' }
      ]
    },
    {
      name: 'Offline Alerts',
      icon: <AlertTriangle size={20} />,
      items: [
        { label: 'Potential', value: stats?.alerts?.potential || 0, status: stats?.alerts?.potential > 0 ? 'warning' : 'ok' }
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {queues.map(queue => (
        <div key={queue.name} className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4 text-gray-700">
            {queue.icon}
            <h3 className="font-semibold">{queue.name}</h3>
          </div>
          <div className="space-y-3">
            {queue.items.map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-gray-600">{item.label}</span>
                <span className={`text-lg font-semibold ${
                  item.status === 'error' ? 'text-red-600' :
                  item.status === 'warning' ? 'text-yellow-600' :
                  'text-gray-900'
                }`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WarningsTab({ warnings, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (warnings.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900">No Warnings</h3>
        <p className="text-gray-500">All systems are operating normally</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          className={`border rounded-lg p-4 ${
            warning.severity === 'error' ? 'border-red-200 bg-red-50' :
            'border-yellow-200 bg-yellow-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {warning.severity === 'error' ? (
              <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            ) : (
              <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={20} />
            )}
            <div>
              <h4 className={`font-medium ${
                warning.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
              }`}>
                {warning.message}
              </h4>
              {warning.details && (
                <p className="text-sm text-gray-600 mt-1">{warning.details}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
