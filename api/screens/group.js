/**
 * Screen Groups API
 * Protected by the screen_groups feature flag AND quota enforcement
 *
 * Usage:
 *   POST /api/screens/group
 *   Authorization: Bearer <token>
 *   Body: { name: string, screenIds: string[], settings: object }
 */

import { checkFeatureOrThrow } from '../lib/featureCheck.js';
import { withQuotaCheck, QuotaExceededError } from '../lib/usageTracker.js';

export default withQuotaCheck('screen_groups', async (req, res, context, quotaStatus) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check feature flag
    await checkFeatureOrThrow(req, 'screen_groups');

    const { name, screenIds = [], settings = {} } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Mock screen group creation
    const group = {
      id: `group-${Date.now()}`,
      name,
      screenIds,
      screenCount: screenIds.length,
      settings,
      createdAt: new Date().toISOString(),
      createdBy: context?.userId,
      tenantId: context?.tenantId,
    };

    return res.status(201).json({
      success: true,
      data: group,
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
    console.error('Screen group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
