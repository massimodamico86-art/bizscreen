/**
 * Feedback Service - In-app feedback collection and announcements
 *
 * Provides functions to submit user feedback and manage in-app announcements.
 */
import { supabase } from '../supabase';
import { uploadBase64ToCloudinary, isCloudinaryConfigured } from './cloudinaryService';

import { createScopedLogger } from './loggingService.js';

const logger = createScopedLogger('FeedbackService');

// In-memory cache for announcements
let announcementCache = {
  data: null,
  tenantId: null,
  timestamp: null,
  ttl: 5 * 60 * 1000, // 5 minutes cache TTL
};

// localStorage key for dismissed announcements
const DISMISSED_KEY = 'bizscreen_dismissed_announcements';

/**
 * @typedef {Object} FeedbackSubmission
 * @property {string} type - Feedback type (bug, feature_request, general, complaint, praise)
 * @property {string} message - The feedback message
 * @property {Object} [context] - Contextual information (page, component, etc.)
 * @property {number} [sentiment] - Sentiment score (-1 to 1)
 */

/**
 * @typedef {Object} Announcement
 * @property {string} id - Announcement ID
 * @property {string} title - Announcement title
 * @property {string} message - Announcement message
 * @property {string} type - Type (info, success, warning, feature, maintenance)
 * @property {string} [ctaText] - Call-to-action button text
 * @property {string} [ctaUrl] - Call-to-action URL
 * @property {boolean} dismissible - Whether it can be dismissed
 * @property {boolean} priority - High priority (show as banner)
 */

/**
 * Get the current user's tenant ID
 * @returns {Promise<string|null>}
 */
async function getCurrentTenantId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // In this schema, user.id IS the tenant_id for clients
  // (profiles.id = auth.users.id = tenant identifier)
  return user.user_metadata?.tenant_id || user.id;
}

/**
 * Get the current user's plan
 * @param {string} tenantId
 * @returns {Promise<string>}
 */
async function getCurrentPlan(tenantId) {
  if (!tenantId) return 'free';

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id, plans(slug)')
    .eq('owner_id', tenantId)
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return subscription?.plans?.slug || 'free';
}

// ============================================
// Feedback Functions
// ============================================

/**
 * Submit user feedback
 * @param {FeedbackSubmission} feedback - The feedback to submit
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitFeedback(feedback) {
  try {
    const tenantId = await getCurrentTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('submit_in_app_feedback', {
      p_tenant_id: tenantId,
      p_type: feedback.type,
      p_message: feedback.message,
      p_context: feedback.context || {},
      p_sentiment: feedback.sentiment,
    });

    if (error) {
      logger.error('Error submitting feedback:', { error: error });
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (e) {
    logger.error('Error submitting feedback:', { error: e });
    return { success: false, error: e.message };
  }
}

/**
 * Quick feedback submission with auto-context
 * @param {string} type - Feedback type
 * @param {string} message - The message
 * @param {Object} [additionalContext] - Extra context
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitQuickFeedback(type, message, additionalContext = {}) {
  // Gather automatic context
  const context = {
    page: window.location.pathname,
    url: window.location.href,
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
    ...additionalContext,
  };

  return submitFeedback({
    type,
    message,
    context,
  });
}

/**
 * Submit a bug report with screenshot support
 * @param {string} description - Bug description
 * @param {string} [screenshotDataUrl] - Optional screenshot as data URL
 * @param {Object} [additionalContext] - Extra context
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitBugReport(description, screenshotDataUrl, additionalContext = {}) {
  const context = {
    page: window.location.pathname,
    url: window.location.href,
    userAgent: navigator.userAgent,
    screenSize: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
    hasScreenshot: !!screenshotDataUrl,
    ...additionalContext,
  };

  // Upload screenshot to Cloudinary if provided
  if (screenshotDataUrl) {
    context.screenshotIncluded = true;

    if (isCloudinaryConfigured()) {
      try {
        const screenshotUrl = await uploadBase64ToCloudinary(screenshotDataUrl, {
          folder: 'feedback-screenshots',
          resourceType: 'image',
        });
        context.screenshotUrl = screenshotUrl;
      } catch (uploadError) {
        logger.warn('Failed to upload screenshot:', { data: uploadError });
        context.screenshotUploadFailed = true;
      }
    } else {
      context.screenshotUploadSkipped = 'cloudinary_not_configured';
    }
  }

  return submitFeedback({
    type: 'bug',
    message: description,
    context,
    sentiment: -0.5, // Bugs are generally negative sentiment
  });
}

/**
 * Submit a feature request
 * @param {string} title - Feature title
 * @param {string} description - Feature description
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function submitFeatureRequest(title, description) {
  return submitFeedback({
    type: 'feature_request',
    message: `${title}\n\n${description}`,
    context: {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    sentiment: 0.3, // Feature requests are mildly positive
  });
}

// ============================================
// Announcement Functions
// ============================================

/**
 * Load dismissed announcement IDs from localStorage
 * @returns {Set<string>}
 */
function getDismissedIds() {
  try {
    const stored = localStorage.getItem(DISMISSED_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * Save dismissed ID to localStorage
 * @param {string} announcementId
 */
function saveDismissedId(announcementId) {
  try {
    const dismissed = getDismissedIds();
    dismissed.add(announcementId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
  } catch (e) {
    logger.warn('Failed to save dismissed announcement:', { data: e });
  }
}

/**
 * Get active announcements for the current user
 * @param {boolean} [forceRefresh=false] - Bypass cache
 * @returns {Promise<Announcement[]>}
 */
export async function getActiveAnnouncements(forceRefresh = false) {
  const tenantId = await getCurrentTenantId();
  const plan = await getCurrentPlan(tenantId);

  // Check cache
  if (
    !forceRefresh &&
    announcementCache.data &&
    announcementCache.tenantId === tenantId &&
    announcementCache.timestamp &&
    Date.now() - announcementCache.timestamp < announcementCache.ttl
  ) {
    return announcementCache.data;
  }

  // Fetch from database
  const { data, error } = await supabase.rpc('get_active_announcements_for_tenant', {
    p_tenant_id: tenantId,
    p_plan: plan,
  });

  if (error) {
    logger.error('Error fetching announcements:', { error: error });
    return [];
  }

  // Get dismissed IDs
  const dismissedIds = getDismissedIds();

  // Filter and transform
  const announcements = (data || [])
    .filter(a => !dismissedIds.has(a.id))
    .map(a => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      ctaText: a.cta_text,
      ctaUrl: a.cta_url,
      dismissible: a.dismissible,
      priority: a.priority,
    }));

  // Update cache
  announcementCache = {
    data: announcements,
    tenantId,
    timestamp: Date.now(),
    ttl: announcementCache.ttl,
  };

  return announcements;
}

/**
 * Get priority announcements (for banner display)
 * @returns {Promise<Announcement[]>}
 */
export async function getPriorityAnnouncements() {
  const all = await getActiveAnnouncements();
  return all.filter(a => a.priority);
}

/**
 * Dismiss an announcement
 * @param {string} announcementId - The announcement ID
 * @returns {Promise<void>}
 */
export async function dismissAnnouncement(announcementId) {
  const tenantId = await getCurrentTenantId();

  // Save to database
  if (tenantId) {
    await supabase.rpc('dismiss_announcement', {
      p_tenant_id: tenantId,
      p_announcement_id: announcementId,
    });
  }

  // Save locally
  saveDismissedId(announcementId);

  // Update cache
  if (announcementCache.data) {
    announcementCache.data = announcementCache.data.filter(a => a.id !== announcementId);
  }
}

/**
 * Clear announcement cache (call when user logs out)
 */
export function clearAnnouncementCache() {
  announcementCache = {
    data: null,
    tenantId: null,
    timestamp: null,
    ttl: announcementCache.ttl,
  };
}

// ============================================
// Admin Functions (for FeatureFlagsPage)
// ============================================

/**
 * Get all feedback submissions (admin)
 * @param {Object} [filters] - Optional filters
 * @returns {Promise<Array>}
 */
export async function getAllFeedback(filters = {}) {
  let query = supabase
    .from('in_app_feedback')
    .select(`
      *,
      profiles(email, full_name)
    `)
    .order('created_at', { ascending: false });

  if (filters.type) {
    query = query.eq('type', filters.type);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching feedback:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Update feedback status (admin)
 * @param {string} feedbackId - The feedback ID
 * @param {string} status - New status (new, reviewed, in_progress, resolved, wont_fix)
 * @param {string} [adminResponse] - Optional admin response
 * @returns {Promise<Object>}
 */
export async function updateFeedbackStatus(feedbackId, status, adminResponse) {
  const updates = { status };
  if (adminResponse !== undefined) {
    updates.admin_response = adminResponse;
  }

  const { data, error } = await supabase
    .from('in_app_feedback')
    .update(updates)
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating feedback:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Get all announcements (admin)
 * @returns {Promise<Array>}
 */
export async function getAllAnnouncements() {
  const { data, error } = await supabase
    .from('in_app_announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching announcements:', { error: error });
    throw error;
  }

  return data || [];
}

/**
 * Create an announcement (admin)
 * @param {Object} announcement - Announcement data
 * @returns {Promise<Object>}
 */
export async function createAnnouncement(announcement) {
  const { data, error } = await supabase
    .from('in_app_announcements')
    .insert({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type || 'info',
      cta_text: announcement.ctaText,
      cta_url: announcement.ctaUrl,
      target_audience: announcement.targetAudience || 'all',
      target_plans: announcement.targetPlans || [],
      target_tenants: announcement.targetTenants || [],
      priority: announcement.priority || false,
      dismissible: announcement.dismissible !== false,
      active: announcement.active !== false,
      start_date: announcement.startDate,
      end_date: announcement.endDate,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating announcement:', { error: error });
    throw error;
  }

  return data;
}

/**
 * Update an announcement (admin)
 * @param {string} announcementId - The announcement ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>}
 */
export async function updateAnnouncement(announcementId, updates) {
  const updateData = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.message !== undefined) updateData.message = updates.message;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.ctaText !== undefined) updateData.cta_text = updates.ctaText;
  if (updates.ctaUrl !== undefined) updateData.cta_url = updates.ctaUrl;
  if (updates.targetAudience !== undefined) updateData.target_audience = updates.targetAudience;
  if (updates.targetPlans !== undefined) updateData.target_plans = updates.targetPlans;
  if (updates.targetTenants !== undefined) updateData.target_tenants = updates.targetTenants;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.dismissible !== undefined) updateData.dismissible = updates.dismissible;
  if (updates.active !== undefined) updateData.active = updates.active;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;

  const { data, error } = await supabase
    .from('in_app_announcements')
    .update(updateData)
    .eq('id', announcementId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating announcement:', { error: error });
    throw error;
  }

  // Clear cache
  clearAnnouncementCache();

  return data;
}

/**
 * Delete an announcement (admin)
 * @param {string} announcementId - The announcement ID
 * @returns {Promise<void>}
 */
export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase
    .from('in_app_announcements')
    .delete()
    .eq('id', announcementId);

  if (error) {
    logger.error('Error deleting announcement:', { error: error });
    throw error;
  }

  clearAnnouncementCache();
}

// Feedback types enum
export const FeedbackTypes = {
  BUG: 'bug',
  FEATURE_REQUEST: 'feature_request',
  GENERAL: 'general',
  COMPLAINT: 'complaint',
  PRAISE: 'praise',
};

// Announcement types enum
export const AnnouncementTypes = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  FEATURE: 'feature',
  MAINTENANCE: 'maintenance',
};
