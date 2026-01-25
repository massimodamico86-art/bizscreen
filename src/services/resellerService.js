/**
 * Reseller Service
 *
 * Handles reseller account management, tenant management,
 * and commission tracking.
 *
 * @module services/resellerService
 */
import { supabase } from '../supabase';
import { createScopedLogger } from './loggingService';

const logger = createScopedLogger('ResellerService');

/**
 * Reseller status values
 */
export const RESELLER_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  TERMINATED: 'terminated'
};

/**
 * Billing methods
 */
export const BILLING_METHODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'invoice', label: 'Invoice' }
];

/**
 * Get current user's reseller account
 */
export async function getMyResellerAccount() {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reseller_accounts')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

/**
 * Get reseller account by ID
 */
export async function getResellerAccount(resellerId) {
  const { data, error } = await supabase
    .from('reseller_accounts')
    .select('*')
    .eq('id', resellerId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * List all reseller accounts (super_admin only)
 */
export async function listResellerAccounts(options = {}) {
  const { status = null, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('reseller_accounts')
    .select(`
      *,
      user:profiles(id, email, full_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Create reseller account application
 */
export async function applyForResellerAccount(applicationData) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reseller_accounts')
    .insert({
      user_id: user.id,
      company_name: applicationData.companyName,
      company_email: applicationData.companyEmail,
      company_phone: applicationData.companyPhone,
      company_website: applicationData.companyWebsite,
      company_address: applicationData.companyAddress,
      primary_contact_name: applicationData.contactName,
      primary_contact_email: applicationData.contactEmail,
      primary_contact_phone: applicationData.contactPhone,
      notes: applicationData.notes,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Approve reseller account (super_admin only)
 */
export async function approveResellerAccount(resellerId, commissionPercent = 20) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('reseller_accounts')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      commission_percent: commissionPercent
    })
    .eq('id', resellerId)
    .select()
    .single();

  if (error) throw error;

  // Update user's profile to mark as reseller
  const reseller = data;
  await supabase
    .from('profiles')
    .update({
      is_reseller: true,
      reseller_account_id: resellerId
    })
    .eq('id', reseller.user_id);

  return data;
}

/**
 * Suspend reseller account
 */
export async function suspendResellerAccount(resellerId, reason = null) {
  const { data, error } = await supabase
    .from('reseller_accounts')
    .update({
      status: 'suspended',
      notes: reason ? `Suspended: ${reason}` : null
    })
    .eq('id', resellerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get reseller portfolio stats
 */
export async function getPortfolioStats(resellerId) {
  const { data, error } = await supabase.rpc('get_reseller_portfolio_stats', {
    p_reseller_id: resellerId
  });

  if (error) throw error;
  return data;
}

/**
 * Get reseller earnings
 */
export async function getResellerEarnings(resellerId, startDate = null, endDate = null) {
  const { data, error } = await supabase.rpc('get_reseller_earnings', {
    p_reseller_id: resellerId,
    p_start_date: startDate,
    p_end_date: endDate
  });

  if (error) throw error;
  return data || [];
}

/**
 * List reseller's tenants
 */
export async function listResellerTenants(resellerId, options = {}) {
  const { status = null, limit = 50, offset = 0 } = options;

  const { data, error } = await supabase.rpc('list_reseller_tenants', {
    p_reseller_id: resellerId,
    p_status: status,
    p_limit: limit,
    p_offset: offset
  });

  if (error) throw error;
  return data || [];
}

/**
 * Create tenant for reseller
 */
export async function createResellerTenant(resellerId, tenantData) {
  const { data, error } = await supabase.rpc('create_reseller_tenant', {
    p_reseller_id: resellerId,
    p_email: tenantData.email,
    p_business_name: tenantData.businessName,
    p_plan_level: tenantData.planLevel || 'starter',
    p_license_code: tenantData.licenseCode || null
  });

  if (error) throw error;
  return data;
}

/**
 * Link existing tenant to reseller
 */
export async function linkTenantToReseller(resellerId, tenantId, licenseId = null) {
  const { data, error } = await supabase.rpc('link_reseller_tenant', {
    p_reseller_id: resellerId,
    p_tenant_id: tenantId,
    p_license_id: licenseId
  });

  if (error) throw error;
  return data;
}

/**
 * Get commission events for reseller
 */
export async function getCommissionEvents(resellerId, options = {}) {
  const { status = null, limit = 50, offset = 0 } = options;

  let query = supabase
    .from('commission_events')
    .select(`
      *,
      tenant:profiles(id, email, business_name, full_name)
    `)
    .eq('reseller_id', resellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get brand variants for reseller
 */
export async function getBrandVariants(resellerId) {
  const { data, error } = await supabase
    .from('brand_variants')
    .select('*')
    .eq('reseller_id', resellerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create brand variant
 */
export async function createBrandVariant(resellerId, variantData) {
  const { data, error } = await supabase
    .from('brand_variants')
    .insert({
      reseller_id: resellerId,
      name: variantData.name,
      slug: variantData.slug,
      logo_url: variantData.logoUrl,
      favicon_url: variantData.faviconUrl,
      primary_color: variantData.primaryColor || '#3B82F6',
      secondary_color: variantData.secondaryColor || '#1E40AF',
      custom_domain: variantData.customDomain,
      app_name: variantData.appName,
      tagline: variantData.tagline,
      support_email: variantData.supportEmail,
      support_url: variantData.supportUrl,
      terms_url: variantData.termsUrl,
      privacy_url: variantData.privacyUrl,
      show_powered_by: variantData.showPoweredBy ?? true,
      pricing_config: variantData.pricingConfig || {}
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update brand variant
 */
export async function updateBrandVariant(variantId, updates) {
  const { data, error } = await supabase
    .from('brand_variants')
    .update({
      name: updates.name,
      logo_url: updates.logoUrl,
      favicon_url: updates.faviconUrl,
      primary_color: updates.primaryColor,
      secondary_color: updates.secondaryColor,
      custom_domain: updates.customDomain,
      app_name: updates.appName,
      tagline: updates.tagline,
      support_email: updates.supportEmail,
      support_url: updates.supportUrl,
      terms_url: updates.termsUrl,
      privacy_url: updates.privacyUrl,
      show_powered_by: updates.showPoweredBy,
      pricing_config: updates.pricingConfig,
      is_active: updates.isActive
    })
    .eq('id', variantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete brand variant
 */
export async function deleteBrandVariant(variantId) {
  const { error } = await supabase
    .from('brand_variants')
    .delete()
    .eq('id', variantId);

  if (error) throw error;
  return true;
}

/**
 * Check if current user is a reseller
 */
export async function isReseller() {
  const account = await getMyResellerAccount();
  return account?.status === 'active';
}

/**
 * Impersonate tenant as reseller
 */
export async function impersonateTenant(tenantId) {
  // Verify this tenant belongs to current reseller
  const reseller = await getMyResellerAccount();
  if (!reseller) {
    throw new Error('Not a reseller');
  }

  const { data: relationship } = await supabase
    .from('reseller_tenants')
    .select('*')
    .eq('reseller_id', reseller.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .single();

  if (!relationship) {
    throw new Error('Tenant not in your portfolio');
  }

  // Use existing impersonation system
  const { startImpersonation } = await import('./tenantService');
  return startImpersonation(tenantId);
}
