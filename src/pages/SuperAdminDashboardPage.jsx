import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import {
  getAllUsers,
  getAllAdmins,
  getAllClients,
  getUnassignedClients,
  assignClientToAdmin,
  unassignClient
} from '../services/adminService';
import ErrorBoundary from '../components/ErrorBoundary';
import {
  Shield,
  FileText,
  Activity,
  Server,
  Wrench,
  Building2,
  Flag,
  Play,
  UserCheck,
  ChevronRight,
  LayoutTemplate,
} from 'lucide-react';

export default function SuperAdminDashboardPage({ onNavigate }) {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalClients: 0,
    unassignedClients: 0
  });
  const [admins, setAdmins] = useState([]);
  const [clients, setClients] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // overview, admins, clients

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch all data in parallel
      const [allUsers, allAdmins, allClients, unassignedClients] = await Promise.all([
        getAllUsers(),
        getAllAdmins(),
        getAllClients(),
        getUnassignedClients()
      ]);

      setAdmins(allAdmins);
      setClients(allClients);
      setUnassigned(unassignedClients);

      setStats({
        totalUsers: allUsers.length,
        totalAdmins: allAdmins.length,
        totalClients: allClients.length,
        unassignedClients: unassignedClients.length
      });

    } catch (err) {
      console.error('Error fetching super admin data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClient = async (clientId, adminId) => {
    try {
      await assignClientToAdmin(clientId, adminId);
      await fetchSuperAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUnassignClient = async (clientId) => {
    try {
      await unassignClient(clientId);
      await fetchSuperAdminData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Defense-in-depth: Check role even though App.jsx should handle routing
  const isSuperAdmin = userProfile?.role === 'super_admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system overview...</p>
        </div>
      </div>
    );
  }

  // Access denied for non-super-admin users
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Super admin access required to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            System-wide management and analytics
          </p>
        </div>

        {/* Admin Tools Quick Links */}
        {onNavigate && (
          <div className="mb-8 bg-white rounded-lg shadow p-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Admin Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {[
                { id: 'admin-tenants', label: 'Tenant Management', icon: Shield, color: 'text-purple-600 bg-purple-100' },
                { id: 'admin-audit-logs', label: 'Audit Logs', icon: FileText, color: 'text-blue-600 bg-blue-100' },
                { id: 'admin-system-events', label: 'System Events', icon: Activity, color: 'text-green-600 bg-green-100' },
                { id: 'status', label: 'System Status', icon: Server, color: 'text-gray-600 bg-gray-100' },
                { id: 'ops-console', label: 'Ops Console', icon: Wrench, color: 'text-orange-600 bg-orange-100' },
                { id: 'tenant-admin', label: 'Tenant Lifecycle', icon: Building2, color: 'text-indigo-600 bg-indigo-100' },
                { id: 'feature-flags', label: 'Feature Flags', icon: Flag, color: 'text-red-600 bg-red-100' },
                { id: 'demo-tools', label: 'Demo Tools', icon: Play, color: 'text-pink-600 bg-pink-100' },
                { id: 'clients', label: 'Client Management', icon: UserCheck, color: 'text-teal-600 bg-teal-100' },
                { id: 'admin-templates', label: 'Templates', icon: LayoutTemplate, color: 'text-cyan-600 bg-cyan-100' },
              ].map(tool => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onNavigate(tool.id)}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className={`p-2 rounded-lg ${tool.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{tool.label}</span>
                    <ChevronRight size={14} className="ml-auto text-gray-400 group-hover:text-gray-600" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            Error: {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAdmins}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unassigned</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.unassignedClients}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'admins'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Admins ({stats.totalAdmins})
              </button>
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'clients'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                Clients ({stats.totalClients})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>

                {stats.unassignedClients > 0 && (
                  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start">
                      <svg className="w-6 h-6 text-orange-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-orange-900">Action Required</h4>
                        <p className="text-sm text-orange-800 mt-1">
                          You have {stats.unassignedClients} unassigned client(s). Assign them to admins to ensure proper management.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Admins</h4>
                    {admins.slice(0, 5).map(admin => (
                      <div key={admin.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{admin.full_name || admin.email}</p>
                          <p className="text-xs text-gray-600">{admin.email}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {clients.filter(c => c.managed_by === admin.id).length} clients
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Unassigned Clients</h4>
                    {unassigned.slice(0, 5).map(client => (
                      <div key={client.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.full_name || client.email}</p>
                          <p className="text-xs text-gray-600">{client.email}</p>
                        </div>
                        <button
                          onClick={() => setActiveTab('clients')}
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                    {unassigned.length === 0 && (
                      <p className="text-sm text-gray-600 text-center py-4">All clients are assigned</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'admins' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Admin Management</h3>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    + Create Admin
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clients</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {admins.map(admin => {
                        const clientCount = clients.filter(c => c.managed_by === admin.id).length;
                        return (
                          <tr key={admin.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {admin.full_name || 'No name'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {admin.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {clientCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(admin.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button className="text-purple-600 hover:text-purple-800 font-medium">
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Client Management</h3>
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    + Create Client
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Managed By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map(client => {
                        const managingAdmin = admins.find(a => a.id === client.managed_by);
                        return (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {client.full_name || 'No name'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {client.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {managingAdmin ? (
                                <span className="text-gray-900">{managingAdmin.full_name || managingAdmin.email}</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                  Unassigned
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(client.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {!client.managed_by && admins.length > 0 ? (
                                <select
                                  onChange={(e) => handleAssignClient(client.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded px-2 py-1"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Assign to...</option>
                                  {admins.map(admin => (
                                    <option key={admin.id} value={admin.id}>
                                      {admin.full_name || admin.email}
                                    </option>
                                  ))}
                                </select>
                              ) : client.managed_by ? (
                                <button
                                  onClick={() => handleUnassignClient(client.id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Unassign
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500">No admins</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
