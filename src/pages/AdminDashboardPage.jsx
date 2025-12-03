import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useTranslation } from '../i18n';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  StatCard,
  Button,
  Badge,
  Alert,
  EmptyState
} from '../design-system';
import { Users, Building2, UserCheck, ExternalLink, Plus, Upload, FileText } from 'lucide-react';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    totalListings: 0,
    totalGuests: 0
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch assigned clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('managed_by', userProfile.id)
        .eq('role', 'client')
        .order('full_name', { ascending: true });

      if (clientsError) throw clientsError;

      // For each client, fetch their listings count and guests count
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          // First, fetch listing IDs for this client
          const { data: clientListings } = await supabase
            .from('listings')
            .select('id')
            .eq('owner_id', client.id);

          const listingIds = clientListings?.map(l => l.id) || [];

          // Now fetch counts in parallel
          const [listingsResult, guestsResult] = await Promise.all([
            supabase
              .from('listings')
              .select('*', { count: 'exact', head: true })
              .eq('owner_id', client.id),

            listingIds.length > 0
              ? supabase
                  .from('guests')
                  .select('*', { count: 'exact', head: true })
                  .in('listing_id', listingIds)
              : Promise.resolve({ count: 0 })
          ]);

          return {
            ...client,
            listingsCount: listingsResult.count || 0,
            guestsCount: guestsResult.count || 0
          };
        })
      );

      setClients(clientsWithStats);

      // Calculate totals
      const totalListings = clientsWithStats.reduce((sum, c) => sum + c.listingsCount, 0);
      const totalGuests = clientsWithStats.reduce((sum, c) => sum + c.guestsCount, 0);

      setStats({
        totalClients: clientsWithStats.length,
        totalListings,
        totalGuests
      });

    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('admin.loadingClients', 'Loading your clients...')}</p>
            </div>
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <ErrorBoundary>
      <PageLayout>
        <PageHeader
          title={t('admin.dashboard', 'Admin Dashboard')}
          description={t('admin.welcomeBack', 'Welcome back, {{name}}', { name: userProfile?.full_name || userProfile?.email })}
        />

        <PageContent>
          {/* Error Message */}
          {error && (
            <Alert variant="error" className="mb-6">
              {t('common.error', 'Error')}: {error}
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title={t('admin.totalClients', 'Total Clients')}
              value={stats.totalClients}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title={t('admin.totalProperties', 'Total Properties')}
              value={stats.totalListings}
              icon={<Building2 className="w-5 h-5" />}
            />
            <StatCard
              title={t('admin.totalGuests', 'Total Guests')}
              value={stats.totalGuests}
              icon={<UserCheck className="w-5 h-5" />}
            />
          </div>

          {/* Clients List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.yourClients', 'Your Clients')}</CardTitle>
              <CardDescription>
                {t('admin.manageClientsDesc', 'Manage properties and guests for your assigned clients')}
              </CardDescription>
            </CardHeader>

            {clients.length === 0 ? (
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title={t('admin.noClientsAssigned', 'No Clients Assigned')}
                description={t('admin.noClientsDesc', "You don't have any clients assigned yet. Contact your administrator to get started.")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label={t('admin.clientsTable', 'Clients table')}>
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.client', 'Client')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.email', 'Email')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.properties', 'Properties')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.guests', 'Guests')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.joined', 'Joined')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('common.actions', 'Actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {(client.full_name || client.email).charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {client.full_name || t('common.noName', 'No name')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {client.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="success">{client.listingsCount}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="purple">{client.guestsCount}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(client.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => window.location.href = `/admin/clients/${client.id}`}
                            icon={<ExternalLink className="w-4 h-4" />}
                            iconPosition="right"
                          >
                            {t('common.viewDetails', 'View Details')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          {clients.length > 0 && (
            <Card className="mt-8 bg-blue-50 border-blue-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  {t('admin.quickActions', 'Quick Actions')}
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  {t('admin.quickActionsDesc', 'Common tasks for managing your clients')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button icon={<Plus className="w-4 h-4" />}>
                    {t('admin.addProperty', 'Add New Property')}
                  </Button>
                  <Button variant="secondary" icon={<Upload className="w-4 h-4" />}>
                    {t('admin.importGuests', 'Import Guests')}
                  </Button>
                  <Button variant="secondary" icon={<FileText className="w-4 h-4" />}>
                    {t('admin.generateReport', 'Generate Report')}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </PageContent>
      </PageLayout>
    </ErrorBoundary>
  );
}
