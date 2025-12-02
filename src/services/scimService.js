/**
 * SCIM Service
 *
 * Handles SCIM-style user provisioning operations.
 * Used by IdPs (Okta, Azure AD, etc.) to sync users.
 *
 * @module services/scimService
 */
import { supabase } from '../supabase';

/**
 * SCIM API scopes
 */
export const SCIM_SCOPES = {
  READ: 'scim:read',
  WRITE: 'scim:write'
};

/**
 * List users for SCIM provisioning
 */
export async function listUsers(tenantId, options = {}) {
  const { limit = 100, offset = 0, filter = null } = options;

  const { data, error } = await supabase.rpc('scim_list_users', {
    p_tenant_id: tenantId,
    p_limit: limit,
    p_offset: offset
  });

  if (error) throw error;

  // Format as SCIM ListResponse
  return {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: data?.length || 0,
    startIndex: offset + 1,
    itemsPerPage: limit,
    Resources: (data || []).map(formatUserToSCIM)
  };
}

/**
 * Get a single user by ID
 */
export async function getUser(tenantId, userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      role,
      is_active,
      scim_external_id,
      created_at,
      updated_at,
      user:auth.users(email)
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;

  return formatUserToSCIM(data);
}

/**
 * Create a new user via SCIM
 */
export async function createUser(tenantId, userData) {
  const { data, error } = await supabase.rpc('scim_upsert_user', {
    p_tenant_id: tenantId,
    p_email: userData.email,
    p_name: userData.name,
    p_role: mapSCIMRoleToInternal(userData.role),
    p_active: userData.active !== false,
    p_external_id: userData.externalId
  });

  if (error) throw error;

  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: data?.user_id,
    meta: {
      resourceType: 'User',
      created: new Date().toISOString()
    },
    ...userData
  };
}

/**
 * Update an existing user via SCIM
 */
export async function updateUser(tenantId, userId, userData) {
  // Get existing user
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!existing) {
    throw new Error('User not found');
  }

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: userData.name || existing.full_name,
      role: userData.role ? mapSCIMRoleToInternal(userData.role) : existing.role,
      is_active: userData.active !== undefined ? userData.active : existing.is_active,
      scim_external_id: userData.externalId || existing.scim_external_id,
      scim_provisioned: true,
      scim_last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;

  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: userId,
    meta: {
      resourceType: 'User',
      lastModified: new Date().toISOString()
    },
    ...userData
  };
}

/**
 * Deactivate (soft delete) a user via SCIM
 */
export async function deactivateUser(tenantId, userId) {
  const { data, error } = await supabase.rpc('scim_deactivate_user', {
    p_tenant_id: tenantId,
    p_user_id: userId
  });

  if (error) throw error;

  return { success: data };
}

/**
 * Format internal user to SCIM schema
 */
function formatUserToSCIM(user) {
  return {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: user.id,
    externalId: user.scim_external_id,
    userName: user.email,
    name: {
      formatted: user.full_name
    },
    displayName: user.full_name,
    active: user.is_active,
    emails: [
      {
        value: user.email,
        primary: true,
        type: 'work'
      }
    ],
    roles: [
      {
        value: mapInternalRoleToSCIM(user.role),
        primary: true
      }
    ],
    meta: {
      resourceType: 'User',
      created: user.created_at,
      lastModified: user.updated_at
    }
  };
}

/**
 * Map SCIM role to internal role
 */
function mapSCIMRoleToInternal(scimRole) {
  const roleMap = {
    'admin': 'admin',
    'editor': 'client', // We use 'client' internally for editors
    'viewer': 'client',
    'member': 'client',
    'user': 'client'
  };
  return roleMap[scimRole?.toLowerCase()] || 'client';
}

/**
 * Map internal role to SCIM role
 */
function mapInternalRoleToSCIM(internalRole) {
  const roleMap = {
    'super_admin': 'admin',
    'admin': 'admin',
    'client': 'member'
  };
  return roleMap[internalRole] || 'member';
}

/**
 * Parse SCIM filter string
 * Simple implementation supporting basic filters
 */
export function parseSCIMFilter(filterString) {
  if (!filterString) return null;

  // Support basic filters like: userName eq "user@example.com"
  const match = filterString.match(/(\w+)\s+(eq|ne|co|sw|ew)\s+"([^"]+)"/i);

  if (match) {
    return {
      attribute: match[1],
      operator: match[2].toLowerCase(),
      value: match[3]
    };
  }

  return null;
}

/**
 * Validate SCIM request
 */
export function validateSCIMRequest(schemas) {
  const validSchemas = [
    'urn:ietf:params:scim:schemas:core:2.0:User',
    'urn:ietf:params:scim:api:messages:2.0:PatchOp'
  ];

  if (!schemas || !Array.isArray(schemas)) {
    return { valid: false, error: 'Missing schemas array' };
  }

  const hasValidSchema = schemas.some(s => validSchemas.includes(s));
  if (!hasValidSchema) {
    return { valid: false, error: 'Invalid schema' };
  }

  return { valid: true };
}
