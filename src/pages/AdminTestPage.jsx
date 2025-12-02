import { useState } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  getAllUsers,
  getAllAdmins,
  getAllClients,
  getUnassignedClients,
  assignClientToAdmin,
  unassignClient
} from '../services/adminService';

export default function AdminTestPage() {
  const { userProfile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Create test admin user
  const createTestAdmin = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Create auth user via Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'testadmin@bizscreen.test',
        password: 'TestAdmin123!',
        options: {
          data: {
            full_name: 'Test Admin User'
          }
        }
      });

      if (authError) throw authError;

      // Update profile to admin role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;

      setMessage(`✅ Admin created: testadmin@bizscreen.test (ID: ${authData.user.id})`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create test client user
  const createTestClient = async (clientNumber) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const email = `testclient${clientNumber}@bizscreen.test`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: 'TestClient123!',
        options: {
          data: {
            full_name: `Test Client ${clientNumber}`
          }
        }
      });

      if (authError) throw authError;

      setMessage(`✅ Client ${clientNumber} created: ${email} (ID: ${authData.user.id})`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Assign client to admin
  const assignClient = async (clientId, adminId) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await assignClientToAdmin(clientId, adminId);
      setMessage(`✅ Client assigned to admin`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load all users
  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Only super admin can access this page
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2">Only super admins can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">RBAC Testing Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Logged in as: <span className="font-semibold">{userProfile?.email}</span>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
            {userProfile?.role}
          </span>
        </p>

        {/* Messages */}
        {message && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            ❌ {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Test Users</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={createTestAdmin}
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Test Admin'}
            </button>
            <button
              onClick={() => createTestClient(1)}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Test Client 1'}
            </button>
            <button
              onClick={() => createTestClient(2)}
              disabled={loading}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Test Client 2'}
            </button>
          </div>
        </div>

        {/* Load Users Button */}
        <div className="mb-4">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Users List'}
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Managed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      Click "Refresh Users List" to load users
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.managed_by ? (
                          <span className="text-xs">
                            {users.find(u => u.id === user.managed_by)?.email || user.managed_by}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.role === 'client' && !user.managed_by && (
                          <button
                            onClick={() => {
                              const admin = users.find(u => u.role === 'admin');
                              if (admin) {
                                assignClient(user.id, admin.id);
                              } else {
                                setError('No admin user found. Create one first.');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-xs"
                          >
                            Assign to Admin
                          </button>
                        )}
                        {user.role === 'client' && user.managed_by && (
                          <button
                            onClick={() => unassignClient(user.id).then(loadUsers)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Unassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Test Credentials */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Test User Credentials</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Admin:</strong> testadmin@bizscreen.test / TestAdmin123!</p>
            <p><strong>Client 1:</strong> testclient1@bizscreen.test / TestClient123!</p>
            <p><strong>Client 2:</strong> testclient2@bizscreen.test / TestClient123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
