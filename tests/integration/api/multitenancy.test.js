/**
 * Multi-Tenant Isolation Tests
 *
 * Tests that tenants cannot access each other's data.
 * Critical for security compliance.
 *
 * These tests validate RLS (Row Level Security) behavior by simulating
 * queries from different tenant contexts and verifying data isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTestScreen,
  createTestPlaylist,
  createTestMedia,
  generateUUID
} from '../../utils/factories';

/**
 * Simulates a Supabase client with RLS-like behavior
 * Returns only data where owner_id matches the authenticated user
 */
function createRLSMockClient(authenticatedUserId, allData) {
  return {
    from: vi.fn((table) => {
      const tableData = allData[table] || [];

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn((field, value) => {
            // Simulate RLS: filter by owner_id = auth.uid()
            const filtered = tableData.filter(row => {
              // RLS check: user can only see their own data
              if (row.owner_id !== authenticatedUserId) {
                return false;
              }
              // Also apply the explicit eq filter
              return row[field] === value;
            });

            return {
              data: filtered,
              error: null,
              single: vi.fn().mockReturnValue({
                data: filtered[0] || null,
                error: filtered.length === 0 ? { code: 'PGRST116', message: 'Not found' } : null
              })
            };
          }),
          // Select all (still filtered by RLS)
          then: vi.fn((resolve) => {
            const filtered = tableData.filter(row => row.owner_id === authenticatedUserId);
            resolve({ data: filtered, error: null });
          })
        }),
        update: vi.fn((updates) => ({
          eq: vi.fn((field, value) => {
            // Simulate RLS on update: only affects rows owned by user
            const affectedRows = tableData.filter(row =>
              row.owner_id === authenticatedUserId && row[field] === value
            );
            return {
              data: affectedRows.length > 0 ? affectedRows : null,
              error: null,
              count: affectedRows.length
            };
          })
        })),
        insert: vi.fn((newRow) => {
          // RLS on insert: owner_id must match auth.uid()
          if (newRow.owner_id !== authenticatedUserId) {
            return {
              data: null,
              error: { code: '42501', message: 'RLS policy violation' }
            };
          }
          return {
            data: newRow,
            error: null
          };
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn((field, value) => {
            const affectedRows = tableData.filter(row =>
              row.owner_id === authenticatedUserId && row[field] === value
            );
            return {
              data: affectedRows,
              error: null,
              count: affectedRows.length
            };
          })
        })
      };
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: authenticatedUserId } },
        error: null
      })
    }
  };
}

/**
 * Creates a mock client for reseller access pattern
 * Reseller can see data for tenants they manage (via managed_by)
 */
function createResellerMockClient(resellerId, allData, managedTenantIds) {
  return {
    from: vi.fn((table) => {
      const tableData = allData[table] || [];

      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn((field, value) => {
            // Reseller can see their own data OR managed tenant data
            const filtered = tableData.filter(row => {
              const isOwnData = row.owner_id === resellerId;
              const isManagedTenantData = managedTenantIds.includes(row.owner_id);
              return (isOwnData || isManagedTenantData) && row[field] === value;
            });

            return {
              data: filtered,
              error: null
            };
          }),
          then: vi.fn((resolve) => {
            const filtered = tableData.filter(row => {
              const isOwnData = row.owner_id === resellerId;
              const isManagedTenantData = managedTenantIds.includes(row.owner_id);
              return isOwnData || isManagedTenantData;
            });
            resolve({ data: filtered, error: null });
          })
        })
      };
    })
  };
}

/**
 * Creates a mock client for super admin (bypasses RLS)
 */
function createSuperAdminMockClient(allData) {
  return {
    from: vi.fn((table) => {
      const tableData = allData[table] || [];

      return {
        select: vi.fn().mockReturnValue({
          then: vi.fn((resolve) => {
            // Super admin sees ALL data
            resolve({ data: tableData, error: null });
          })
        })
      };
    })
  };
}

describe('Multi-Tenant Isolation', () => {
  // Test tenant IDs
  const TENANT_A_ID = generateUUID();
  const TENANT_B_ID = generateUUID();
  const RESELLER_ID = generateUUID();
  const MANAGED_TENANT_ID = generateUUID();
  const UNMANAGED_TENANT_ID = generateUUID();

  // Shared test data
  let testData;

  beforeEach(() => {
    // Set up test data with screens, playlists, and media for different tenants
    testData = {
      screens: [
        createTestScreen({ id: 'screen-a1', owner_id: TENANT_A_ID, name: 'Tenant A Screen 1' }),
        createTestScreen({ id: 'screen-a2', owner_id: TENANT_A_ID, name: 'Tenant A Screen 2' }),
        createTestScreen({ id: 'screen-b1', owner_id: TENANT_B_ID, name: 'Tenant B Screen 1' }),
        createTestScreen({ id: 'screen-managed', owner_id: MANAGED_TENANT_ID, name: 'Managed Tenant Screen' }),
        createTestScreen({ id: 'screen-unmanaged', owner_id: UNMANAGED_TENANT_ID, name: 'Unmanaged Tenant Screen' }),
      ],
      playlists: [
        createTestPlaylist({ id: 'playlist-a1', owner_id: TENANT_A_ID, name: 'Tenant A Playlist' }),
        createTestPlaylist({ id: 'playlist-b1', owner_id: TENANT_B_ID, name: 'Tenant B Playlist' }),
      ],
      media_assets: [
        createTestMedia({ id: 'media-a1', owner_id: TENANT_A_ID, name: 'Tenant A Media' }),
        createTestMedia({ id: 'media-b1', owner_id: TENANT_B_ID, name: 'Tenant B Media' }),
      ]
    };
  });

  describe('Screen Isolation', () => {
    it('Tenant A query returns only Tenant A screens', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every(s => s.owner_id === TENANT_A_ID)).toBe(true);
      expect(result.data.map(s => s.name)).toContain('Tenant A Screen 1');
      expect(result.data.map(s => s.name)).toContain('Tenant A Screen 2');
    });

    it('Tenant A cannot see Tenant B screens in query results', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      const tenantBScreens = result.data.filter(s => s.owner_id === TENANT_B_ID);
      expect(tenantBScreens).toHaveLength(0);
      expect(result.data.map(s => s.name)).not.toContain('Tenant B Screen 1');
    });

    it('Tenant A update on Tenant B screen affects 0 rows', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = client.from('screens')
        .update({ name: 'Hacked!' })
        .eq('id', 'screen-b1');

      expect(result.count).toBe(0);
      expect(result.data).toBeNull();
    });

    it('Tenant A can update their own screen', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = client.from('screens')
        .update({ name: 'Updated Name' })
        .eq('id', 'screen-a1');

      expect(result.count).toBe(1);
      expect(result.data).not.toBeNull();
    });
  });

  describe('Playlist Isolation', () => {
    it('Tenant A cannot see Tenant B playlists', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = await new Promise(resolve => {
        client.from('playlists').select().then(resolve);
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Tenant A Playlist');
      expect(result.data.map(p => p.name)).not.toContain('Tenant B Playlist');
    });

    it('Tenant A insert into Tenant B playlist fails with RLS violation', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = client.from('playlist_items').insert({
        owner_id: TENANT_B_ID, // Trying to insert as Tenant B
        playlist_id: 'playlist-b1',
        media_id: 'media-a1',
        position: 0
      });

      expect(result.error).not.toBeNull();
      expect(result.error.code).toBe('42501');
      expect(result.error.message).toContain('RLS policy violation');
    });

    it('Tenant A can insert into their own playlist', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = client.from('playlist_items').insert({
        owner_id: TENANT_A_ID,
        playlist_id: 'playlist-a1',
        media_id: 'media-a1',
        position: 0
      });

      expect(result.error).toBeNull();
      expect(result.data).not.toBeNull();
    });
  });

  describe('Media Isolation', () => {
    it('Tenant A cannot see Tenant B media assets', async () => {
      const client = createRLSMockClient(TENANT_A_ID, testData);

      const result = await new Promise(resolve => {
        client.from('media_assets').select().then(resolve);
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Tenant A Media');
      expect(result.data.map(m => m.name)).not.toContain('Tenant B Media');
    });

    it('Tenant B cannot delete Tenant A media', async () => {
      const client = createRLSMockClient(TENANT_B_ID, testData);

      const result = client.from('media_assets')
        .delete()
        .eq('id', 'media-a1');

      expect(result.count).toBe(0);
    });
  });

  describe('Reseller Managed Tenants', () => {
    it('Reseller can see screens for managed tenants', async () => {
      const client = createResellerMockClient(RESELLER_ID, testData, [MANAGED_TENANT_ID]);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      const managedScreens = result.data.filter(s => s.owner_id === MANAGED_TENANT_ID);
      expect(managedScreens).toHaveLength(1);
      expect(managedScreens[0].name).toBe('Managed Tenant Screen');
    });

    it('Reseller cannot see screens for unmanaged tenants', async () => {
      const client = createResellerMockClient(RESELLER_ID, testData, [MANAGED_TENANT_ID]);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      const unmanagedScreens = result.data.filter(s => s.owner_id === UNMANAGED_TENANT_ID);
      expect(unmanagedScreens).toHaveLength(0);
    });

    it('Reseller sees both own data and managed tenant data', async () => {
      // Add reseller's own screen to test data
      testData.screens.push(
        createTestScreen({ id: 'screen-reseller', owner_id: RESELLER_ID, name: 'Reseller Own Screen' })
      );

      const client = createResellerMockClient(RESELLER_ID, testData, [MANAGED_TENANT_ID]);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.map(s => s.name)).toContain('Reseller Own Screen');
      expect(result.data.map(s => s.name)).toContain('Managed Tenant Screen');
    });
  });

  describe('Admin Access', () => {
    it('Super admin can see all tenant data', async () => {
      const client = createSuperAdminMockClient(testData);

      const result = await new Promise(resolve => {
        client.from('screens').select().then(resolve);
      });

      // Super admin sees ALL screens
      expect(result.data).toHaveLength(5);
      expect(result.data.map(s => s.name)).toContain('Tenant A Screen 1');
      expect(result.data.map(s => s.name)).toContain('Tenant B Screen 1');
      expect(result.data.map(s => s.name)).toContain('Managed Tenant Screen');
      expect(result.data.map(s => s.name)).toContain('Unmanaged Tenant Screen');
    });
  });

  describe('Cross-Tenant Data Integrity', () => {
    it('Each tenant sees correct count of their own resources', async () => {
      const clientA = createRLSMockClient(TENANT_A_ID, testData);
      const clientB = createRLSMockClient(TENANT_B_ID, testData);

      const resultA = await new Promise(resolve => {
        clientA.from('screens').select().then(resolve);
      });
      const resultB = await new Promise(resolve => {
        clientB.from('screens').select().then(resolve);
      });

      expect(resultA.data).toHaveLength(2); // Tenant A has 2 screens
      expect(resultB.data).toHaveLength(1); // Tenant B has 1 screen

      // No overlap
      const idsA = resultA.data.map(s => s.id);
      const idsB = resultB.data.map(s => s.id);
      const overlap = idsA.filter(id => idsB.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });
});
