/**
 * AI Tag Generation API
 *
 * Uses Claude API to generate tags and categories for SVG templates.
 */

import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Predefined categories for validation
const TEMPLATE_CATEGORIES = [
  'restaurant',
  'retail',
  'hospitality',
  'healthcare',
  'education',
  'corporate',
  'real-estate',
  'fitness',
  'entertainment',
  'transportation',
  'finance',
  'automotive',
  'salon-spa',
  'events',
  'social-media',
  'general',
];

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Anthropic API key not configured' });
  }

  try {
    const { prompt, analysis } = req.body;

    if (!prompt || !analysis) {
      return res.status(400).json({ error: 'Missing prompt or analysis' });
    }

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Use Haiku for speed/cost efficiency
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `You are a digital signage template classification expert.
Your task is to analyze SVG templates and assign appropriate categories and tags.
Always respond with valid JSON only, no other text.
Categories must be one of: ${TEMPLATE_CATEGORIES.join(', ')}
Tags should be lowercase, hyphenated, and relevant to digital signage use cases.`,
    });

    // Extract text content
    const responseText = message.content[0]?.text || '';

    // Try to parse JSON from response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and normalize category
        let category = (parsed.category || 'general').toLowerCase().trim().replace(/\s+/g, '-');
        if (!TEMPLATE_CATEGORIES.includes(category)) {
          category = 'general';
        }

        // Normalize tags
        const tags = Array.isArray(parsed.tags)
          ? parsed.tags
              .map(tag => String(tag).toLowerCase().trim().replace(/\s+/g, '-'))
              .filter(tag => tag.length > 1 && tag.length < 30)
              .slice(0, 15)
          : [];

        return res.status(200).json({
          category,
          tags,
          description: parsed.description || '',
          confidence: parsed.confidence || 0.8,
        });
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }

    // If JSON parsing failed, try to extract meaningful data
    return res.status(200).json({
      category: 'general',
      tags: [],
      description: '',
      confidence: 0,
      raw: responseText,
    });
  } catch (error) {
    console.error('AI tag generation error:', error);
    return res.status(500).json({
      error: 'AI tag generation failed',
      message: error.message,
    });
  }
}
