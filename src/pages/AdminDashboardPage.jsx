import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';



export default function AdminDashboardPage({ onNavigate }) {
  const { t } = useTranslation();
  const logger = useLogger('AdminDashboardPage');
  const { userProfile } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    totalListings: 0,
    totalGuests: 0
  });

  // Modal states
  const [addPropertyModal, setAddPropertyModal] = useState(false);
  const [importGuestsModal, setImportGuestsModal] = useState(false);
  const [generateReportModal, setGenerateReportModal] = useState(false);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [guestFile, setGuestFile] = useState(null);
  const [reportDateRange, setReportDateRange] = useState({ start: '', end: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

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
      logger.error('Error fetching admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Property
  const handleAddProperty = async () => {
    if (!selectedClientId || !propertyName) {
      setError(t('admin.selectClientAndName', 'Please select a client and enter a property name'));
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          owner_id: selectedClientId,
          name: propertyName,
          address: propertyAddress || null,
          status: 'active'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActionSuccess(t('admin.propertyCreated', 'Property created successfully!'));
      setAddPropertyModal(false);
      setPropertyName('');
      setPropertyAddress('');
      setSelectedClientId('');
      fetchAdminData(); // Refresh data
    } catch (err) {
      logger.error('Error creating property:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Import Guests (CSV)
  const handleImportGuests = async () => {
    if (!selectedClientId || !guestFile) {
      setError(t('admin.selectClientAndFile', 'Please select a client and upload a CSV file'));
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      // Read CSV file
      const text = await guestFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Get client's listings
      const { data: clientListings } = await supabase
        .from('listings')
        .select('id, name')
        .eq('owner_id', selectedClientId);

      if (!clientListings || clientListings.length === 0) {
        throw new Error(t('admin.noListingsForClient', 'Client has no properties. Create a property first.'));
      }

      const defaultListingId = clientListings[0].id;

      // Parse CSV rows
      const guests = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const guest = {};

        headers.forEach((header, index) => {
          if (header === 'name' || header === 'full_name') guest.name = values[index];
          if (header === 'email') guest.email = values[index];
          if (header === 'phone') guest.phone = values[index];
        });

        if (guest.name || guest.email) {
          guests.push({
            ...guest,
            listing_id: defaultListingId,
            status: 'active'
          });
        }
      }

      if (guests.length === 0) {
        throw new Error(t('admin.noValidGuests', 'No valid guest data found in CSV'));
      }

      // Insert guests
      const { error: insertError } = await supabase
        .from('guests')
        .insert(guests);

      if (insertError) throw insertError;

      setActionSuccess(t('admin.guestsImported', '{{count}} guests imported successfully!', { count: guests.length }));
      setImportGuestsModal(false);
      setGuestFile(null);
      setSelectedClientId('');
      fetchAdminData();
    } catch (err) {
      logger.error('Error importing guests:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Generate Report
  const handleGenerateReport = async () => {
    setActionLoading(true);
    setError('');

    try {
      // Generate CSV report
      const reportData = [];
      reportData.push(['Client', 'Email', 'Properties', 'Guests', 'Joined']);

      clients.forEach(client => {
        reportData.push([
          client.full_name || 'No name',
          client.email,
          client.listingsCount,
          client.guestsCount,
          new Date(client.created_at).toLocaleDateString()
        ]);
      });

      // Create CSV
      const csvContent = reportData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setActionSuccess(t('admin.reportGenerated', 'Report downloaded successfully!'));
      setGenerateReportModal(false);
    } catch (err) {
      logger.error('Error generating report:', err);
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Clear success message after 3 seconds
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccess]);

  // Defense-in-depth: Check role even though App.jsx should handle routing
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

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

  // Access denied for non-admin users
  if (!isAdmin) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{t('common.accessDenied', 'Access Denied')}</h2>
              <p className="text-gray-600">{t('admin.adminAccessRequired', 'Admin access required to view this page.')}</p>
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

          {/* Success Message */}
          {actionSuccess && (
            <Alert variant="success" className="mb-6">
              {actionSuccess}
            </Alert>
          )}

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
                  <Button icon={<Plus className="w-4 h-4" />} onClick={() => setAddPropertyModal(true)}>
                    {t('admin.addProperty', 'Add New Property')}
                  </Button>
                  <Button variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => setImportGuestsModal(true)}>
                    {t('admin.importGuests', 'Import Guests')}
                  </Button>
                  <Button variant="secondary" icon={<FileText className="w-4 h-4" />} onClick={() => setGenerateReportModal(true)}>
                    {t('admin.generateReport', 'Generate Report')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Add Property Modal */}
          {addPropertyModal && (
            <Modal
              isOpen={addPropertyModal}
              onClose={() => setAddPropertyModal(false)}
              title={t('admin.addProperty', 'Add New Property')}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.selectClient', 'Select Client')} *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('admin.chooseClient', 'Choose a client...')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.full_name || client.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.propertyName', 'Property Name')} *
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder={t('admin.enterPropertyName', 'Enter property name')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.propertyAddress', 'Address')} ({t('common.optional', 'optional')})
                  </label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder={t('admin.enterAddress', 'Enter address')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setAddPropertyModal(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button onClick={handleAddProperty} disabled={actionLoading}>
                    {actionLoading ? t('common.creating', 'Creating...') : t('admin.createProperty', 'Create Property')}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Import Guests Modal */}
          {importGuestsModal && (
            <Modal
              isOpen={importGuestsModal}
              onClose={() => setImportGuestsModal(false)}
              title={t('admin.importGuests', 'Import Guests')}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.selectClient', 'Select Client')} *
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('admin.chooseClient', 'Choose a client...')}</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.full_name || client.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('admin.csvFile', 'CSV File')} *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setGuestFile(e.target.files?.[0] || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin.csvFormat', 'CSV format: name, email, phone (with header row)')}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setImportGuestsModal(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button onClick={handleImportGuests} disabled={actionLoading}>
                    {actionLoading ? t('common.importing', 'Importing...') : t('admin.import', 'Import')}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Generate Report Modal */}
          {generateReportModal && (
            <Modal
              isOpen={generateReportModal}
              onClose={() => setGenerateReportModal(false)}
              title={t('admin.generateReport', 'Generate Report')}
            >
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('admin.reportDesc', 'Generate a CSV report of all your clients with their properties and guest counts.')}
                </p>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">{t('admin.reportIncludes', 'Report includes:')}</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• {t('admin.clientNames', 'Client names and emails')}</li>
                    <li>• {t('admin.propertyCounts', 'Property counts')}</li>
                    <li>• {t('admin.guestCounts', 'Guest counts')}</li>
                    <li>• {t('admin.joinDates', 'Join dates')}</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setGenerateReportModal(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button onClick={handleGenerateReport} disabled={actionLoading} icon={<Download className="w-4 h-4" />}>
                    {actionLoading ? t('common.generating', 'Generating...') : t('admin.downloadReport', 'Download Report')}
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </PageContent>
      </PageLayout>
    </ErrorBoundary>
  );
}
