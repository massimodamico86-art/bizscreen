// Approval Service - Content review and approval workflow management
import { supabase } from '../supabase';

/**
 * Approval statuses
 */
export const APPROVAL_STATUS = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

/**
 * Review request statuses
 */
export const REVIEW_STATUS = {
  OPEN: 'open',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

/**
 * Resource types that support approval
 */
export const RESOURCE_TYPES = {
  PLAYLIST: 'playlist',
  LAYOUT: 'layout',
  CAMPAIGN: 'campaign'
};

/**
 * Get the table name for a resource type
 */
function getTableName(resourceType) {
  const tableMap = {
    playlist: 'playlists',
    layout: 'layouts',
    campaign: 'campaigns'
  };
  return tableMap[resourceType];
}

/**
 * Request approval for a resource
 * @param {Object} options - Request options
 * @param {string} options.resourceType - Type of resource (playlist, layout, campaign)
 * @param {string} options.resourceId - ID of the resource
 * @param {string} options.title - Title for the review request
 * @param {string} options.message - Optional message/context
 * @param {Date} options.dueAt - Optional due date
 * @returns {Promise<Object>} Created review request
 */
export async function requestApproval({ resourceType, resourceId, title, message = '', dueAt = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get user's tenant_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, managed_tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = profile?.managed_tenant_id || user.id;

  // Create review request
  const { data: review, error: reviewError } = await supabase
    .from('review_requests')
    .insert({
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
      status: REVIEW_STATUS.OPEN,
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      title: title || `Review ${resourceType}`,
      message,
      due_at: dueAt
    })
    .select()
    .single();

  if (reviewError) throw reviewError;

  // Update resource approval status
  const tableName = getTableName(resourceType);
  const { error: updateError } = await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.IN_REVIEW,
      approval_requested_by: user.id,
      approval_requested_at: new Date().toISOString()
    })
    .eq('id', resourceId);

  if (updateError) throw updateError;

  return review;
}

/**
 * Cancel a review request
 * @param {string} reviewId - Review request ID
 * @returns {Promise<Object>} Updated review request
 */
export async function cancelApproval(reviewId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get the review to find resource info
  const { data: review, error: fetchError } = await supabase
    .from('review_requests')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError) throw fetchError;

  // Update review status
  const { data: updatedReview, error: reviewError } = await supabase
    .from('review_requests')
    .update({
      status: REVIEW_STATUS.CANCELLED,
      decided_by: user.id,
      decided_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (reviewError) throw reviewError;

  // Reset resource to draft
  const tableName = getTableName(review.resource_type);
  await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.DRAFT,
      approval_requested_by: null,
      approval_requested_at: null
    })
    .eq('id', review.resource_id);

  return updatedReview;
}

/**
 * Approve a review request
 * @param {string} reviewId - Review request ID
 * @param {Object} options - Approval options
 * @param {string} options.comment - Decision comment
 * @returns {Promise<Object>} Updated review request
 */
export async function approveReview(reviewId, { comment = '' } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  // Get the review to find resource info
  const { data: review, error: fetchError } = await supabase
    .from('review_requests')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError) throw fetchError;

  // Update review status
  const { data: updatedReview, error: reviewError } = await supabase
    .from('review_requests')
    .update({
      status: REVIEW_STATUS.APPROVED,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_comment: comment
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (reviewError) throw reviewError;

  // Update resource approval status
  const tableName = getTableName(review.resource_type);
  await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.APPROVED,
      approval_decided_by: user.id,
      approval_decided_at: new Date().toISOString(),
      approval_comment: comment
    })
    .eq('id', review.resource_id);

  return updatedReview;
}

/**
 * Reject a review request
 * @param {string} reviewId - Review request ID
 * @param {Object} options - Rejection options
 * @param {string} options.comment - Decision comment (required for rejection)
 * @returns {Promise<Object>} Updated review request
 */
export async function rejectReview(reviewId, { comment = '' } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  if (!comment) throw new Error('A comment is required when rejecting');

  // Get the review to find resource info
  const { data: review, error: fetchError } = await supabase
    .from('review_requests')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (fetchError) throw fetchError;

  // Update review status
  const { data: updatedReview, error: reviewError } = await supabase
    .from('review_requests')
    .update({
      status: REVIEW_STATUS.REJECTED,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      decision_comment: comment
    })
    .eq('id', reviewId)
    .select()
    .single();

  if (reviewError) throw reviewError;

  // Update resource approval status
  const tableName = getTableName(review.resource_type);
  await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.REJECTED,
      approval_decided_by: user.id,
      approval_decided_at: new Date().toISOString(),
      approval_comment: comment
    })
    .eq('id', review.resource_id);

  return updatedReview;
}

/**
 * Revert a resource to draft status
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @returns {Promise<boolean>} Success
 */
export async function revertToDraft(resourceType, resourceId) {
  const tableName = getTableName(resourceType);

  const { error } = await supabase
    .from(tableName)
    .update({
      approval_status: APPROVAL_STATUS.DRAFT,
      approval_requested_by: null,
      approval_requested_at: null,
      approval_decided_by: null,
      approval_decided_at: null,
      approval_comment: null
    })
    .eq('id', resourceId);

  if (error) throw error;
  return true;
}

/**
 * Fetch open review requests
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status
 * @param {string} options.resourceType - Filter by resource type
 * @returns {Promise<Array>} Review requests with details
 */
export async function fetchOpenReviews({ status = null, resourceType = null } = {}) {
  let query = supabase
    .from('v_review_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  } else {
    // Default to open reviews
    query = query.eq('status', REVIEW_STATUS.OPEN);
  }

  if (resourceType) {
    query = query.eq('resource_type', resourceType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch all review requests with optional filters
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status (null for all)
 * @param {string} options.resourceType - Filter by resource type
 * @returns {Promise<Array>} Review requests
 */
export async function fetchReviews({ status = null, resourceType = null } = {}) {
  let query = supabase
    .from('v_review_requests_with_details')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (resourceType && resourceType !== 'all') {
    query = query.eq('resource_type', resourceType);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch a single review request with details and comments
 * @param {string} reviewId - Review request ID
 * @returns {Promise<Object>} Review request with comments
 */
export async function fetchReview(reviewId) {
  // Fetch review
  const { data: review, error: reviewError } = await supabase
    .from('v_review_requests_with_details')
    .select('*')
    .eq('id', reviewId)
    .single();

  if (reviewError) throw reviewError;

  // Fetch comments
  const { data: comments, error: commentsError } = await supabase
    .from('review_comments')
    .select(`
      id,
      author_id,
      author_name,
      is_external,
      message,
      created_at,
      author:profiles(full_name)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  // Process comments to include author name
  const processedComments = (comments || []).map(c => ({
    ...c,
    author_name: c.is_external ? c.author_name : (c.author?.full_name || 'Unknown')
  }));

  return {
    ...review,
    comments: processedComments
  };
}

/**
 * Add a comment to a review
 * @param {string} reviewId - Review request ID
 * @param {string} message - Comment message
 * @returns {Promise<Object>} Created comment
 */
export async function addReviewComment(reviewId, message) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const { data, error } = await supabase
    .from('review_comments')
    .insert({
      review_id: reviewId,
      author_id: user.id,
      is_external: false,
      message
    })
    .select(`
      id,
      author_id,
      is_external,
      message,
      created_at,
      author:profiles(full_name)
    `)
    .single();

  if (error) throw error;

  return {
    ...data,
    author_name: data.author?.full_name || 'Unknown'
  };
}

/**
 * Get the latest open review for a resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @returns {Promise<Object|null>} Latest open review or null
 */
export async function getOpenReviewForResource(resourceType, resourceId) {
  const { data, error } = await supabase
    .from('review_requests')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('status', REVIEW_STATUS.OPEN)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error
  return data || null;
}

/**
 * Get review history for a resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - ID of the resource
 * @returns {Promise<Array>} Review history
 */
export async function getReviewHistory(resourceType, resourceId) {
  const { data, error } = await supabase
    .from('v_review_requests_with_details')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get approval status badge configuration
 * @param {string} status - Approval status
 * @returns {Object} Badge configuration
 */
export function getApprovalStatusConfig(status) {
  const configs = {
    draft: {
      label: 'Draft',
      variant: 'default',
      color: 'gray'
    },
    in_review: {
      label: 'In Review',
      variant: 'warning',
      color: 'yellow'
    },
    approved: {
      label: 'Approved',
      variant: 'success',
      color: 'green'
    },
    rejected: {
      label: 'Rejected',
      variant: 'danger',
      color: 'red'
    }
  };
  return configs[status] || configs.draft;
}

export default {
  requestApproval,
  cancelApproval,
  approveReview,
  rejectReview,
  revertToDraft,
  fetchOpenReviews,
  fetchReviews,
  fetchReview,
  addReviewComment,
  getOpenReviewForResource,
  getReviewHistory,
  getApprovalStatusConfig,
  APPROVAL_STATUS,
  REVIEW_STATUS,
  RESOURCE_TYPES
};
