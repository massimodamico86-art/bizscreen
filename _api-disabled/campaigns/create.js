/**
 * Campaign Creation API
 * Protected by the campaigns feature flag AND quota enforcement
 *
 * Usage:
 *   POST /api/campaigns/create
 *   Authorization: Bearer <token>
 *   Body: { name: string, description: string, startDate: string, endDate: string }
 */

import { checkFeatureOrThrow } from '../lib/featureCheck.js';
import { withQuotaCheck, QuotaExceededError } from '../lib/usageTracker.js';

export default withQuotaCheck('campaigns', async (req, res, context, quotaStatus) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check feature flag
    await checkFeatureOrThrow(req, 'campaigns');

    const { name, description, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Campaign name is required' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Mock campaign creation response
    const campaign = {
      id: `campaign-${Date.now()}`,
      name,
      description: description || '',
      startDate,
      endDate,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdBy: context?.userId,
    };

    return res.status(201).json({
      success: true,
      data: campaign,
      _quota: quotaStatus
        ? {
            used: quotaStatus.currentUsage + 1,
            limit: quotaStatus.quota,
            remaining: quotaStatus.remaining,
            isUnlimited: quotaStatus.isUnlimited,
          }
        : null,
    });
  } catch (error) {
    if (error.code === 'FEATURE_NOT_ENABLED') {
      return res.status(403).json({
        error: error.message,
        code: error.code,
        featureKey: error.featureKey,
        currentPlan: error.currentPlan,
      });
    }
    if (error instanceof QuotaExceededError) {
      return res.status(429).json({
        error: error.message,
        code: error.code,
        featureKey: error.featureKey,
        currentUsage: error.currentUsage,
        quota: error.quota,
      });
    }
    console.error('Campaign creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
