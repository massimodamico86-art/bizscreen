/**
 * AI Translation Suggestion API
 *
 * Generates AI-powered translation suggestions for scene content using Claude.
 * Extracts translatable text from Polotno scene settings and returns translations.
 *
 * POST /api/translations/suggest
 * Body: { sourceSceneId: string, targetLanguage: string }
 * Returns: { sourceLanguage: string, targetLanguage: string, translations: object }
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Language code to name mapping for better prompts
const LANGUAGE_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  nl: 'Dutch',
  pl: 'Polish',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  ro: 'Romanian',
  hu: 'Hungarian',
  uk: 'Ukrainian',
};

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
    const { sourceSceneId, targetLanguage } = req.body;

    if (!sourceSceneId || !targetLanguage) {
      return res.status(400).json({ error: 'Missing sourceSceneId or targetLanguage' });
    }

    // Initialize Supabase client with service role key for full access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get source scene
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .select('name, settings')
      .eq('id', sourceSceneId)
      .single();

    if (sceneError || !scene) {
      console.error('Scene fetch error:', sceneError);
      return res.status(404).json({ error: 'Scene not found' });
    }

    // Extract translatable text from scene settings
    const textsToTranslate = extractTranslatableTexts(scene);

    // Get language name for better prompt
    const langName = LANGUAGE_NAMES[targetLanguage] || targetLanguage.toUpperCase();

    // Call Claude for translations
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Translate the following digital signage content to ${langName}.
Return ONLY valid JSON with the same structure. Preserve any {{placeholder}} variables exactly.
Keep brand names and proper nouns unchanged unless they have official translations.

${JSON.stringify(textsToTranslate, null, 2)}`,
        },
      ],
    });

    const responseText = message.content[0]?.text || '{}';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch =
      responseText.match(/```json\n?([\s\S]*?)\n?```/) ||
      responseText.match(/\{[\s\S]*\}/);
    const translations = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');

    return res.status(200).json({
      sourceLanguage: 'en',
      targetLanguage,
      translations,
      originalTexts: textsToTranslate,
    });
  } catch (error) {
    console.error('Translation suggestion error:', error);
    return res.status(500).json({
      error: 'Failed to generate translation',
      message: error.message,
    });
  }
}

/**
 * Extract translatable texts from a scene
 * @param {Object} scene - Scene object with name and settings
 * @returns {Object} Object containing all translatable text elements
 */
function extractTranslatableTexts(scene) {
  const result = { name: scene.name };

  // Extract text from Polotno scene settings
  if (scene.settings?.pages) {
    result.texts = [];
    for (const page of scene.settings.pages) {
      for (const element of page.children || []) {
        if (element.type === 'text' && element.text) {
          // Include the element ID for reference when applying translations
          result.texts.push({
            id: element.id,
            text: element.text,
          });
        }
      }
    }
  }

  // Also check for any metadata text fields
  if (scene.settings?.metadata) {
    const metadata = scene.settings.metadata;
    if (metadata.title) {
      result.metadataTitle = metadata.title;
    }
    if (metadata.subtitle) {
      result.metadataSubtitle = metadata.subtitle;
    }
    if (metadata.description) {
      result.metadataDescription = metadata.description;
    }
  }

  return result;
}
