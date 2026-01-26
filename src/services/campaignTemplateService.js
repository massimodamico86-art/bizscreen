/**
 * Campaign Template Service - Template CRUD and seasonal activation functions
 *
 * Templates store campaign structure (target types, content types, settings)
 * but NOT specific content/target IDs. Users fill those when creating from template.
 *
 * Seasonal recurrence allows yearly auto-activation of campaigns.
 */
import { supabase } from '../supabase';
import { getEffectiveOwnerId } from './tenantService';
import { createScopedLogger } from './loggingService';
import { getCampaign, createCampaign } from './campaignService';

const logger = createScopedLogger('CampaignTemplateService');

/**
 * Get all templates for current tenant (plus system templates)
 * @returns {Promise<Array>} Templates sorted by name
 */
export async function getTemplates() {
  logger.debug('getTemplates: fetching templates');

  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    logger.error('getTemplates: failed to fetch', { error });
    throw error;
  }

  return data || [];
}

/**
 * Get single template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Template
 */
export async function getTemplate(templateId) {
  logger.debug('getTemplate: fetching template', { templateId });

  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    logger.error('getTemplate: failed to fetch', { templateId, error });
    throw error;
  }

  return data;
}

/**
 * Save existing campaign as template
 * Extracts structure but NOT specific content/target IDs
 * @param {string} campaignId - Campaign ID to save as template
 * @param {string} templateName - Name for the template
 * @param {string} description - Optional description
 * @param {string[]} tags - Optional tags for categorization
 * @returns {Promise<Object>} Created template
 */
export async function saveAsTemplate(campaignId, templateName, description = '', tags = []) {
  logger.info('saveAsTemplate: saving campaign as template', { campaignId, templateName });

  // Load the campaign with targets and contents
  const campaign = await getCampaign(campaignId);

  // Extract template_data - structure only, not specific IDs
  const templateData = {
    targets: (campaign.targets || []).map(t => ({
      target_type: t.target_type
      // Don't store target_id - user selects specific targets when applying
    })),
    contents: (campaign.contents || []).map(c => ({
      content_type: c.content_type,
      weight: c.weight || 1,
      position: c.position || 0
      // Don't store content_id - user selects specific content when applying
    })),
    settings: {
      priority: campaign.priority || 100
    }
  };

  // Get current tenant
  const tenantId = await getEffectiveOwnerId();
  if (!tenantId) {
    throw new Error('No tenant context');
  }

  const { data, error } = await supabase
    .from('campaign_templates')
    .insert({
      tenant_id: tenantId,
      name: templateName.trim(),
      description: description?.trim() || null,
      template_data: templateData,
      is_system: false,
      tags: tags || []
    })
    .select()
    .single();

  if (error) {
    logger.error('saveAsTemplate: failed to create template', { campaignId, templateName, error });
    throw error;
  }

  logger.info('saveAsTemplate: template created', { templateId: data.id, templateName });
  return data;
}

/**
 * Create new campaign from template
 * Applies template settings, user must add specific content/targets
 * @param {string} templateId - Template ID
 * @param {string} campaignName - Name for the new campaign
 * @param {Object} overrides - Optional overrides for settings
 * @returns {Promise<Object>} Created campaign
 */
export async function createFromTemplate(templateId, campaignName, overrides = {}) {
  logger.info('createFromTemplate: creating campaign from template', { templateId, campaignName });

  // Load template
  const template = await getTemplate(templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  const templateData = template.template_data || {};
  const settings = templateData.settings || {};

  // Create campaign with template settings
  const campaign = await createCampaign({
    name: campaignName,
    description: `Created from template: ${template.name}`,
    priority: overrides.priority || settings.priority || 100,
    status: 'draft',
    startAt: overrides.startAt || null,
    endAt: overrides.endAt || null
  });

  logger.info('createFromTemplate: campaign created', {
    campaignId: campaign.id,
    templateId,
    campaignName
  });

  // Note: User fills in specific targets and content after creation
  return campaign;
}

/**
 * Delete a template
 * @param {string} templateId - Template ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTemplate(templateId) {
  logger.info('deleteTemplate: deleting template', { templateId });

  const { error } = await supabase
    .from('campaign_templates')
    .delete()
    .eq('id', templateId);

  if (error) {
    logger.error('deleteTemplate: failed to delete', { templateId, error });
    throw error;
  }

  return true;
}

/**
 * Update a template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates (name, description, tags)
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  logger.debug('updateTemplate: updating template', { templateId, updates });

  const allowedUpdates = {};
  if ('name' in updates) allowedUpdates.name = updates.name;
  if ('description' in updates) allowedUpdates.description = updates.description;
  if ('tags' in updates) allowedUpdates.tags = updates.tags;
  allowedUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('campaign_templates')
    .update(allowedUpdates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    logger.error('updateTemplate: failed to update', { templateId, error });
    throw error;
  }

  return data;
}

// ============================================================================
// SEASONAL RECURRENCE
// ============================================================================

/**
 * Update campaign's seasonal recurrence rule
 * @param {string} campaignId - Campaign ID
 * @param {Object} recurrenceRule - Recurrence rule: {type, month, day, duration_days}
 * @returns {Promise<Object>} Updated campaign
 */
export async function setSeasonalRecurrence(campaignId, recurrenceRule) {
  logger.info('setSeasonalRecurrence: setting recurrence', { campaignId, recurrenceRule });

  // Validate recurrence rule
  if (recurrenceRule) {
    if (recurrenceRule.type !== 'yearly') {
      throw new Error('Only yearly recurrence is currently supported');
    }
    if (!recurrenceRule.month || recurrenceRule.month < 1 || recurrenceRule.month > 12) {
      throw new Error('Month must be between 1 and 12');
    }
    if (!recurrenceRule.day || recurrenceRule.day < 1 || recurrenceRule.day > 31) {
      throw new Error('Day must be between 1 and 31');
    }
    if (!recurrenceRule.duration_days || recurrenceRule.duration_days < 1) {
      throw new Error('Duration must be at least 1 day');
    }

    // Validate day for the month
    const maxDays = new Date(2024, recurrenceRule.month, 0).getDate(); // Use leap year
    if (recurrenceRule.day > maxDays) {
      throw new Error(`Day ${recurrenceRule.day} is invalid for month ${recurrenceRule.month}`);
    }
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update({
      recurrence_rule: recurrenceRule,
      updated_at: new Date().toISOString()
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (error) {
    logger.error('setSeasonalRecurrence: failed to set', { campaignId, error });
    throw error;
  }

  return data;
}

/**
 * Clear seasonal recurrence (make campaign one-time)
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} Updated campaign
 */
export async function clearSeasonalRecurrence(campaignId) {
  logger.info('clearSeasonalRecurrence: clearing recurrence', { campaignId });
  return setSeasonalRecurrence(campaignId, null);
}

/**
 * Calculate next activation date for seasonal campaign
 * @param {Object} recurrenceRule - Recurrence rule: {type, month, day, duration_days}
 * @returns {Object|null} { startDate, endDate } or null if no recurrence
 */
export function calculateNextActivation(recurrenceRule) {
  if (!recurrenceRule || recurrenceRule.type !== 'yearly') {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const { month, day, duration_days } = recurrenceRule;

  // Calculate this year's activation window
  let startDate = new Date(currentYear, month - 1, day); // month is 0-indexed
  let endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration_days);

  // If we're past this year's window, calculate next year's
  if (now > endDate) {
    startDate = new Date(currentYear + 1, month - 1, day);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + duration_days);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    isActive: now >= startDate && now <= endDate
  };
}

/**
 * Format recurrence rule as human-readable string
 * @param {Object} recurrenceRule - Recurrence rule
 * @returns {string} Human-readable description
 */
export function formatRecurrenceRule(recurrenceRule) {
  if (!recurrenceRule) return 'One-time campaign';

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const { month, day, duration_days } = recurrenceRule;
  const monthName = monthNames[month - 1];

  return `Yearly on ${monthName} ${day} for ${duration_days} day${duration_days > 1 ? 's' : ''}`;
}

export default {
  getTemplates,
  getTemplate,
  saveAsTemplate,
  createFromTemplate,
  deleteTemplate,
  updateTemplate,
  setSeasonalRecurrence,
  clearSeasonalRecurrence,
  calculateNextActivation,
  formatRecurrenceRule
};
