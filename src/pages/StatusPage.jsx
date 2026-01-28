import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';



import { supabase } from '../supabase';
import { getDataCacheStats } from '../hooks/useDataCache';

export default function StatusPage() {
  const { t } = useTranslation();
  const [appHealth, setAppHealth] = useState(null);
  const [depHealth, setDepHealth] = useState(null);
  const [screenStats, setScreenStats] = useState(null);
  const [webhookStats, setWebhookStats] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => { fetchAllStatus(); }, []);

  const fetchAllStatus = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchAppHealth(), fetchDependencyHealth(), fetchScreenStats(),
        fetchWebhookStats(), fetchPerformanceMetrics(), fetchCacheStats()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAppHealth = async () => {
    try {
      const response = await fetch('/api/health/app');
      const data = await response.json();
      setAppHealth(data);
    } catch (error) {
      setAppHealth({ status: 'error', error: error.message });
    }
  };

  const fetchDependencyHealth = async () => {
    try {
      const response = await fetch('/api/health/dependencies');
      const data = await response.json();
      setDepHealth(data);
    } catch (error) {
      setDepHealth({ status: 'error', error: error.message });
    }
  };

  const fetchScreenStats = async () => {
    try {
      const { data, error } = await supabase.from('tv_devices').select('is_online, is_paired');
      if (error) throw error;
      setScreenStats({
        total: data?.length || 0,
        online: data?.filter(d => d.is_online).length || 0,
        offline: data?.filter(d => !d.is_online && d.is_paired).length || 0,
        unpaired: data?.filter(d => !d.is_paired).length || 0
      });
    } catch (error) {
      setScreenStats({ error: error.message });
    }
  };

  const fetchWebhookStats = async () => {
    try {
      const { count: pendingCount } = await supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const { count: failedCount } = await supabase.from('webhook_events').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', yesterday.toISOString());
      setWebhookStats({ pending: pendingCount || 0, failedLast24h: failedCount || 0 });
    } catch (error) {
      setWebhookStats({ error: error.message });
    }
  };

  const fetchPerformanceMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_performance_summary', { p_hours: 24 });
      if (error) { setPerformanceMetrics({ metrics: [], error: null }); return; }
      const grouped = {};
      (data || []).forEach(metric => {
        if (!grouped[metric.metric_type]) grouped[metric.metric_type] = [];
        grouped[metric.metric_type].push(metric);
      });
      setPerformanceMetrics({ metrics: data || [], grouped });
    } catch (error) {
      setPerformanceMetrics({ error: error.message, metrics: [] });
    }
  };

  const fetchCacheStats = async () => {
    try {
      const clientStats = getDataCacheStats();
      const { data: dbStats } = await supabase.from('tv_devices').select('id', { count: 'exact', head: true });
      const { data: mediaCount } = await supabase.from('media_assets').select('id', { count: 'exact', head: true }).is('deleted_at', null);
      const { data: playlistCount } = await supabase.from('playlists').select('id', { count: 'exact', head: true });
      setCacheStats({
        client: clientStats,
        database: { totalScreens: dbStats?.count || 0, totalMedia: mediaCount?.count || 0, totalPlaylists: playlistCount?.count || 0 }
      });
    } catch (error) {
      setCacheStats({ error: error.message });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': case 'ok': return <CheckCircle2 className="text-green-500" size={20} aria-hidden="true" />;
      case 'degraded': case 'warning': return <AlertTriangle className="text-yellow-500" size={20} aria-hidden="true" />;
      case 'unhealthy': case 'error': return <XCircle className="text-red-500" size={20} aria-hidden="true" />;
      case 'not_configured': return <AlertTriangle className="text-gray-400" size={20} aria-hidden="true" />;
      default: return <Clock className="text-gray-400" size={20} aria-hidden="true" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': case 'ok': return 'bg-green-50 border-green-200';
      case 'degraded': case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'unhealthy': case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-gray-400" size={32} aria-label={t('common.loading', 'Loading')} />
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('status.title', 'System Status')}
        description={t('status.description', 'Monitor system health and dependencies')}
        actions={
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <span className="text-sm text-gray-500">
                {t('status.lastUpdated', 'Last updated: {{time}}', { time: lastRefresh.toLocaleTimeString() })}
              </span>
            )}
            <Button onClick={fetchAllStatus} disabled={refreshing} variant="secondary" icon={<RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />}>
              {t('common.refresh', 'Refresh')}
            </Button>
          </div>
        }
      />

      <PageContent className="max-w-6xl mx-auto space-y-6">
        {/* Overall Status Banner */}
        {appHealth && (
          <div className={`rounded-lg border p-4 ${getStatusColor(depHealth?.status || 'ok')}`} role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              {getStatusIcon(depHealth?.status || 'ok')}
              <div>
                <h2 className="font-semibold">
                  {depHealth?.status === 'healthy' ? t('status.allOperational', 'All Systems Operational') :
                   depHealth?.status === 'degraded' ? t('status.someDegraded', 'Some Systems Degraded') :
                   t('status.issuesDetected', 'System Issues Detected')}
                </h2>
                <p className="text-sm text-gray-600">
                  {t('status.envVersion', 'Environment: {{env}} | Version: {{version}}', { env: appHealth.environment, version: appHealth.version })}
                  {appHealth.build?.sha && ` | Build: ${appHealth.build.sha}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dependency Health Cards */}
        <section aria-labelledby="dependencies-heading">
          <h2 id="dependencies-heading" className="sr-only">{t('status.dependencies', 'System Dependencies')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DependencyCard icon={<Database size={20} />} name={t('status.database', 'Database (Supabase)')} status={depHealth?.checks?.supabase?.status} latency={depHealth?.checks?.supabase?.latencyMs} error={depHealth?.checks?.supabase?.error} t={t} />
            <DependencyCard icon={<CreditCard size={20} />} name={t('status.payments', 'Payments (Stripe)')} status={depHealth?.checks?.stripe?.status} details={depHealth?.checks?.stripe?.mode ? `Mode: ${depHealth.checks.stripe.mode}` : null} error={depHealth?.checks?.stripe?.error} t={t} />
            <DependencyCard icon={<Mail size={20} />} name={t('status.email', 'Email (Resend)')} status={depHealth?.checks?.email?.status} details={depHealth?.checks?.email?.provider} error={depHealth?.checks?.email?.error} t={t} />
            <DependencyCard icon={<Cloud size={20} />} name={t('status.mediaStorage', 'Media Storage (Cloudinary)')} status={depHealth?.checks?.cloudinary?.status} details={depHealth?.checks?.cloudinary?.cloudName} error={depHealth?.checks?.cloudinary?.error} t={t} />
            <DependencyCard icon={<Cpu size={20} />} name={t('status.aiServices', 'AI Services')} status={depHealth?.checks?.ai?.status} details={depHealth?.checks?.ai?.providers ? `OpenAI: ${depHealth.checks.ai.providers.openai ? 'Yes' : 'No'}, Anthropic: ${depHealth.checks.ai.providers.anthropic ? 'Yes' : 'No'}` : null} t={t} />
            <DependencyCard icon={<Server size={20} />} name={t('status.server', 'Server')} status="healthy" details={`Region: ${appHealth?.server?.region || 'local'}`} latency={appHealth?.uptime ? `Uptime: ${Math.round(appHealth.uptime / 60)}m` : null} t={t} />
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="default">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Monitor size={18} aria-hidden="true" />
              {t('status.screenStatus', 'Screen Status')}
            </h3>
            {screenStats?.error ? (
              <Alert variant="error">{screenStats.error}</Alert>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <StatItem label={t('status.totalScreens', 'Total Screens')} value={screenStats?.total || 0} icon={<Monitor size={16} />} />
                <StatItem label={t('status.online', 'Online')} value={screenStats?.online || 0} icon={<Wifi size={16} className="text-green-500" />} color="text-green-600" />
                <StatItem label={t('status.offline', 'Offline')} value={screenStats?.offline || 0} icon={<WifiOff size={16} className="text-red-500" />} color="text-red-600" />
                <StatItem label={t('status.unpaired', 'Unpaired')} value={screenStats?.unpaired || 0} icon={<AlertTriangle size={16} className="text-yellow-500" />} color="text-yellow-600" />
              </div>
            )}
          </Card>

          <Card padding="default">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity size={18} aria-hidden="true" />
              {t('status.webhookQueue', 'Webhook Queue')}
            </h3>
            {webhookStats?.error ? (
              <Alert variant="error">{webhookStats.error}</Alert>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <StatItem label={t('status.pending', 'Pending')} value={webhookStats?.pending || 0} icon={<Clock size={16} />} color={webhookStats?.pending > 100 ? 'text-yellow-600' : 'text-gray-600'} />
                <StatItem label={t('status.failed24h', 'Failed (24h)')} value={webhookStats?.failedLast24h || 0} icon={<XCircle size={16} className="text-red-500" />} color={webhookStats?.failedLast24h > 0 ? 'text-red-600' : 'text-gray-600'} />
              </div>
            )}
          </Card>
        </div>

        {/* Performance & Cache */}
        <section aria-labelledby="performance-heading">
          <h2 id="performance-heading" className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Gauge size={20} aria-hidden="true" />
            {t('status.performanceCaching', 'Performance & Caching')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card padding="default">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Zap size={18} aria-hidden="true" />{t('status.clientCache', 'Client Cache')}</h3>
              {cacheStats?.error ? <Alert variant="error">{cacheStats.error}</Alert> : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('status.cachedEntries', 'Cached Entries')}</span><span className="font-semibold">{cacheStats?.client?.totalEntries || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('status.valid', 'Valid')}</span><span className="font-semibold text-green-600">{cacheStats?.client?.validEntries || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('status.stale', 'Stale')}</span><span className="font-semibold text-yellow-600">{cacheStats?.client?.staleEntries || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('status.expired', 'Expired')}</span><span className="font-semibold text-gray-400">{cacheStats?.client?.expiredEntries || 0}</span></div>
                </div>
              )}
            </Card>

            <Card padding="default">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><HardDrive size={18} aria-hidden="true" />{t('status.databaseStats', 'Database Stats')}</h3>
              {cacheStats?.error ? <Alert variant="error">{cacheStats.error}</Alert> : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('common.screens', 'Screens')}</span><span className="font-semibold">{cacheStats?.database?.totalScreens || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('status.mediaAssets', 'Media Assets')}</span><span className="font-semibold">{cacheStats?.database?.totalMedia || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-gray-600">{t('common.playlists', 'Playlists')}</span><span className="font-semibold">{cacheStats?.database?.totalPlaylists || 0}</span></div>
                </div>
              )}
            </Card>

            <Card padding="default">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 size={18} aria-hidden="true" />{t('status.apiPerformance', 'API Performance (24h)')}</h3>
              {performanceMetrics?.error ? <Alert variant="error">{performanceMetrics.error}</Alert> : performanceMetrics?.metrics?.length > 0 ? (
                <div className="space-y-3">
                  {performanceMetrics.grouped?.api_latency?.slice(0, 4).map((metric, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 truncate max-w-[140px]" title={metric.metric_name}>{metric.metric_name}</span>
                      <span className={`font-semibold ${metric.avg_value > 500 ? 'text-yellow-600' : 'text-green-600'}`}>{metric.avg_value?.toFixed(0)}ms</span>
                    </div>
                  ))}
                  {(!performanceMetrics.grouped?.api_latency || performanceMetrics.grouped.api_latency.length === 0) && <p className="text-sm text-gray-500">{t('status.noMetrics', 'No metrics recorded yet')}</p>}
                </div>
              ) : <p className="text-sm text-gray-500">{t('status.noPerformanceData', 'No performance data available')}</p>}
            </Card>
          </div>
        </section>

        {/* Tips */}
        <Alert variant="info" className="bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-800"><TrendingUp size={18} aria-hidden="true" />{t('status.recommendations', 'Performance Recommendations')}</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
            <li>{t('status.tip1', 'Database indexes optimized for high-traffic queries')}</li>
            <li>{t('status.tip2', 'Client-side caching enabled with stale-while-revalidate strategy')}</li>
            <li>{t('status.tip3', 'Code splitting active for faster initial page loads')}</li>
            <li>{t('status.tip4', 'Data prefetching enabled for common navigation paths')}</li>
          </ul>
        </Alert>
      </PageContent>
    </PageLayout>
  );
}

function DependencyCard({ icon, name, status, latency, details, error, t }) {
  const getStatusBg = (s) => {
    switch (s) {
      case 'healthy': return 'bg-green-100 text-green-700';
      case 'degraded': return 'bg-yellow-100 text-yellow-700';
      case 'unhealthy': return 'bg-red-100 text-red-700';
      case 'not_configured': return 'bg-gray-100 text-gray-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <Card padding="default">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-700">
          <span aria-hidden="true">{icon}</span>
          <span className="font-medium">{name}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBg(status)}`}>{status || t('status.unknown', 'unknown')}</span>
      </div>
      {latency && typeof latency === 'number' && <p className="text-sm text-gray-500">{t('status.latency', 'Latency')}: {latency}ms</p>}
      {latency && typeof latency === 'string' && <p className="text-sm text-gray-500">{latency}</p>}
      {details && <p className="text-sm text-gray-500">{details}</p>}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </Card>
  );
}

function StatItem({ label, value, icon, color = 'text-gray-900' }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400" aria-hidden="true">{icon}</div>
      <div>
        <p className={`text-2xl font-semibold ${color}`}>{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
