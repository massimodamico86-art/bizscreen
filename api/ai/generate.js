/**
 * AI Content Generation API
 * Protected by the ai_assistant feature flag
 *
 * This endpoint is only available to users on Pro, Enterprise, or Reseller plans.
 *
 * Usage:
 *   POST /api/ai/generate
 *   Authorization: Bearer <token>
 *   Body: { prompt: string, type: 'playlist' | 'content' | 'schedule' }
 */

import { checkFeatureOrThrow, requireFeature } from '../lib/featureCheck.js';

/**
 * Handler wrapped with feature check using requireFeature middleware
 */
export default requireFeature('ai_assistant', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, type = 'content' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // In a real implementation, this would call an AI service
    // For now, return a mock response
    const mockResponses = {
      playlist: {
        success: true,
        data: {
          name: 'AI Generated Playlist',
          description: `Playlist generated from: "${prompt}"`,
          items: [
            { type: 'media', duration: 10 },
            { type: 'media', duration: 15 },
          ],
        },
      },
      content: {
        success: true,
        data: {
          title: 'AI Generated Content',
          body: `Content generated from: "${prompt}"`,
          suggestions: ['Add more visuals', 'Consider shorter duration'],
        },
      },
      schedule: {
        success: true,
        data: {
          name: 'AI Generated Schedule',
          description: `Schedule optimized for: "${prompt}"`,
          slots: [
            { startTime: '09:00', endTime: '12:00' },
            { startTime: '14:00', endTime: '18:00' },
          ],
        },
      },
    };

    return res.status(200).json(mockResponses[type] || mockResponses.content);
  } catch (error) {
    console.error('AI generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Alternative handler using checkFeatureOrThrow directly
 * (shown for documentation purposes)
 */
export async function handleWithDirectCheck(req, res) {
  try {
    // This will throw if the feature is not enabled
    await checkFeatureOrThrow(req, 'ai_assistant');

    // ... rest of handler
    return res.status(200).json({ message: 'AI feature enabled' });
  } catch (error) {
    if (error.code === 'FEATURE_NOT_ENABLED') {
      return res.status(403).json({
        error: error.message,
        code: error.code,
        featureKey: error.featureKey,
        currentPlan: error.currentPlan,
      });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
