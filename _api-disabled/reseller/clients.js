/**
 * Reseller Client Management API
 * Protected by the reseller_portal feature flag
 *
 * This endpoint is only available to users with the Reseller plan.
 *
 * Usage:
 *   GET /api/reseller/clients - List all clients
 *   POST /api/reseller/clients - Create a new client
 *   Authorization: Bearer <token>
 */

import { checkFeatureOrThrow, checkMultipleFeatures } from '../lib/featureCheck.js';

export default async function handler(req, res) {
  try {
    // Check that user has reseller_portal feature
    const context = await checkFeatureOrThrow(req, 'reseller_portal');

    switch (req.method) {
      case 'GET':
        return handleGetClients(req, res, context);
      case 'POST':
        return handleCreateClient(req, res, context);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    // Handle feature not enabled error
    if (error.code === 'FEATURE_NOT_ENABLED') {
      return res.status(403).json({
        error: error.message,
        code: error.code,
        featureKey: error.featureKey,
        currentPlan: error.currentPlan,
        requiredPlan: 'reseller',
      });
    }

    // Handle authentication error
    if (error.statusCode === 401) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    console.error('Reseller API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get list of reseller's clients
 */
async function handleGetClients(req, res, context) {
  // In a real implementation, query the database for this reseller's clients
  // For now, return mock data
  return res.status(200).json({
    success: true,
    data: {
      clients: [
        {
          id: '1',
          name: 'Acme Corp',
          email: 'admin@acme.com',
          plan: 'pro',
          screens: 15,
          status: 'active',
          createdAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          name: 'TechStart Inc',
          email: 'hello@techstart.io',
          plan: 'starter',
          screens: 5,
          status: 'active',
          createdAt: '2024-02-20T14:30:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 2,
      },
    },
    context: {
      plan: context.plan,
      tenantId: context.tenantId,
    },
  });
}

/**
 * Create a new client for the reseller
 */
async function handleCreateClient(req, res, context) {
  const { name, email, plan = 'starter' } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      error: 'Name and email are required',
      code: 'VALIDATION_ERROR',
    });
  }

  // In a real implementation, create the client in the database
  // For now, return mock created client
  return res.status(201).json({
    success: true,
    data: {
      client: {
        id: 'new-' + Date.now(),
        name,
        email,
        plan,
        screens: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        resellerId: context.tenantId,
      },
    },
    message: 'Client created successfully',
  });
}

/**
 * Example of checking multiple features at once
 */
export async function handleBulkOperations(req, res) {
  try {
    // Check if user has both reseller_portal AND bulk_operations features
    const result = await checkMultipleFeatures(req, [
      'reseller_portal',
      'bulk_operations',
    ]);

    if (!result.allowed) {
      return res.status(403).json({
        error: 'Missing required features',
        code: 'FEATURES_NOT_ENABLED',
        missing: result.missing,
        requiredFeatures: ['reseller_portal', 'bulk_operations'],
      });
    }

    // Proceed with bulk operation
    return res.status(200).json({
      success: true,
      message: 'Bulk operation completed',
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
