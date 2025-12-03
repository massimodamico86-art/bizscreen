/**
 * Audit Log API
 * Protected by the audit_logs feature flag AND quota enforcement
 *
 * Usage:
 *   POST /api/audit/log
 *   Authorization: Bearer <token>
 *   Body: { action: string, resource: string, details: object }
 */

import { checkFeatureOrThrow } from '../lib/featureCheck.js';
import { withQuotaCheck, QuotaExceededError } from '../lib/usageTracker.js';

export default withQuotaCheck('audit_logs', async (req, res, context, quotaStatus) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check feature flag
    await checkFeatureOrThrow(req, 'audit_logs');

    const { action, resource, details = {} } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    if (!resource) {
      return res.status(400).json({ error: 'Resource is required' });
    }

    // Mock audit log entry
    const logEntry = {
      id: `log-${Date.now()}`,
      action,
      resource,
      details,
      userId: context?.userId,
      tenantId: context?.tenantId,
      timestamp: new Date().toISOString(),
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    return res.status(201).json({
      success: true,
      data: logEntry,
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
    console.error('Audit log error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
