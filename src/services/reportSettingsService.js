/**
 * Report Settings Service
 *
 * Manages email report subscriptions for analytics.
 */

import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';

/**
 * Get all report subscriptions for the current tenant
 */
export async function getReportSubscriptions() {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('report_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific report subscription
 */
export async function getReportSubscription(frequency) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { data, error } = await supabase
    .from('report_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('frequency', frequency)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Update or create a report subscription
 */
export async function updateReportSubscription(frequency, updates) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  // Get the current user's email for default
  const { data: { user } } = await supabase.auth.getUser();
  const defaultEmail = user?.email;

  // Check if subscription exists
  const existing = await getReportSubscription(frequency);

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('report_subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new
    const { data, error } = await supabase
      .from('report_subscriptions')
      .insert({
        tenant_id: tenantId,
        frequency,
        send_to_email: updates.send_to_email || defaultEmail,
        enabled: updates.enabled !== undefined ? updates.enabled : true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Delete a report subscription
 */
export async function deleteReportSubscription(frequency) {
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) throw new Error('No tenant context');

  const { error } = await supabase
    .from('report_subscriptions')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('frequency', frequency);

  if (error) throw error;
}

/**
 * Toggle a report subscription on/off
 */
export async function toggleReportSubscription(frequency, enabled) {
  return updateReportSubscription(frequency, { enabled });
}

/**
 * Update the email address for a subscription
 */
export async function updateReportEmail(frequency, email) {
  return updateReportSubscription(frequency, { send_to_email: email });
}
