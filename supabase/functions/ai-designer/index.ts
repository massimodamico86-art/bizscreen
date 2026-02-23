/**
 * AI Designer Edge Function
 *
 * Proxies Anthropic API calls to generate layout elements from text prompts.
 * Keeps the ANTHROPIC_API_KEY server-side (never exposed to the browser).
 *
 * Accepts POST requests with:
 * - prompt (string, required): Text description of the desired layout
 * - messages (array, optional): Conversation history for refinement
 * - orientation (string, optional): '16:9' | '9:16' | '4:3' | '1:1'
 * - brandContext (object, optional): Brand colors, fonts, logo URL
 * - imageBase64 (string, optional): Base64-encoded reference image
 *
 * Returns: { elements: [...], background: {...}, name: string }
 */

import { corsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const FETCH_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  orientation: string,
  brandContext?: {
    colors?: { primary?: string; secondary?: string; accent?: string };
    fonts?: { heading?: string; body?: string };
    logoUrl?: string;
  },
): string {
  const aspectDescriptions: Record<string, string> = {
    '16:9': 'landscape widescreen (16:9, wider than tall)',
    '9:16': 'portrait vertical (9:16, taller than wide)',
    '4:3': 'standard landscape (4:3)',
    '1:1': 'square (1:1)',
  };

  const aspectDesc = aspectDescriptions[orientation] || aspectDescriptions['16:9'];

  let brandInstructions = '';
  if (brandContext) {
    const parts: string[] = [];
    if (brandContext.colors) {
      const c = brandContext.colors;
      if (c.primary) parts.push(`Primary color: ${c.primary}`);
      if (c.secondary) parts.push(`Secondary color: ${c.secondary}`);
      if (c.accent) parts.push(`Accent color: ${c.accent}`);
    }
    if (brandContext.fonts) {
      const f = brandContext.fonts;
      if (f.heading) parts.push(`Heading font: ${f.heading}`);
      if (f.body) parts.push(`Body font: ${f.body}`);
    }
    if (brandContext.logoUrl) {
      parts.push(`Brand logo URL: ${brandContext.logoUrl}`);
    }
    if (parts.length > 0) {
      brandInstructions = `\n\nBrand guidelines to follow:\n${parts.join('\n')}`;
    }
  }

  return `You are an expert digital signage layout designer. You create layouts for ${aspectDesc} displays.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation, no code fences). The JSON must have this exact structure:

{
  "name": "A short descriptive name for this layout",
  "background": {
    "type": "solid" | "gradient",
    "color": "#hex" (for solid),
    "from": "#hex" (for gradient),
    "to": "#hex" (for gradient),
    "direction": "180deg" (for gradient, CSS direction)
  },
  "elements": [
    {
      "id": "{type}-{timestamp}-{random9chars}",
      "type": "text" | "image" | "shape" | "widget",
      "position": { "x": 0-1, "y": 0-1, "width": 0-1, "height": 0-1 },
      "layer": number (z-index, higher = on top),
      "props": { ... type-specific properties }
    }
  ]
}

Element types and their props:

TEXT elements:
- props: { "text": string, "fontSize": number (16-72), "fontFamily": string, "fontWeight": "normal"|"bold"|"600"|"700", "align": "left"|"center"|"right", "color": "#hex", "backgroundColor": "#hex" (optional), "padding": number (0-20), "borderRadius": number (0-24) }

IMAGE elements:
- props: { "url": "https://placehold.co/800x600/HEXCOLOR/white?text=Description", "fit": "cover"|"contain"|"fill", "borderRadius": number, "opacity": 0-1 }
- Use placehold.co URLs with descriptive text and appropriate colors (omit the # from hex in URL)

SHAPE elements:
- props: { "shapeType": "rectangle"|"circle"|"line", "fill": "#hex", "stroke": "#hex" (optional), "strokeWidth": number, "borderRadius": number, "opacity": 0-1 }

WIDGET elements (also include "widgetType" at element level):
- widgetType: "clock" -> props: { "textColor": "#hex", "format": "12h"|"24h", "showSeconds": false }
- widgetType: "date" -> props: { "textColor": "#hex", "format": "short"|"long"|"full" }
- widgetType: "weather" -> props: { "textColor": "#hex", "location": "City, State", "units": "imperial"|"metric", "style": "minimal"|"card" }
- widgetType: "qr" -> props: { "qrType": "url", "url": "https://example.com", "label": "Scan Me", "qrFgColor": "#000000", "qrBgColor": "#ffffff" }

RULES:
1. All position values (x, y, width, height) are fractions from 0 to 1 representing percentage of canvas.
2. Generate IDs using pattern: {type}-{timestamp}-{random9chars} where timestamp is a 13-digit number and random is 9 alphanumeric chars.
3. Ensure elements don't overflow the canvas (x + width <= 1, y + height <= 1).
4. Use a professional, modern design style appropriate for digital signage.
5. Layer background shapes at lower layer values, content at higher values.
6. Make text readable - ensure good contrast between text and background colors.
7. Create visually balanced layouts with proper spacing and alignment.
8. For images, use placehold.co URLs with contextually appropriate placeholder text and colors.${brandInstructions}

When refining an existing layout, modify the elements based on the user's request. You may add, remove, or modify elements. Always return the complete updated layout.`;
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed. Use POST.' },
      405,
    );
  }

  try {
    // -- Verify API key -------------------------------------------------------
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('[ai-designer] ANTHROPIC_API_KEY is not set');
      return jsonResponse(
        { error: 'AI Designer is not configured. Please set the ANTHROPIC_API_KEY secret.' },
        503,
      );
    }

    // -- Parse request body ---------------------------------------------------
    let body: {
      prompt?: string;
      messages?: Array<{ role: string; content: string }>;
      orientation?: string;
      brandContext?: {
        colors?: { primary?: string; secondary?: string; accent?: string };
        fonts?: { heading?: string; body?: string };
        logoUrl?: string;
      };
      imageBase64?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { prompt, messages, orientation = '16:9', brandContext, imageBase64 } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return jsonResponse(
        { error: 'prompt is required and must be a non-empty string' },
        400,
      );
    }

    // Validate orientation
    const validOrientations = ['16:9', '9:16', '4:3', '1:1'];
    const safeOrientation = validOrientations.includes(orientation) ? orientation : '16:9';

    // -- Build Claude API messages --------------------------------------------
    const systemPrompt = buildSystemPrompt(safeOrientation, brandContext);

    // Build the messages array for the API call
    // deno-lint-ignore no-explicit-any
    const apiMessages: Array<{ role: string; content: any }> = [];

    // Include conversation history for refinement
    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Pass through conversation history
      for (const msg of messages) {
        if (msg.role && msg.content) {
          apiMessages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }
    }

    // Add the current prompt as the latest user message
    // If imageBase64 is provided, use multimodal content
    if (imageBase64) {
      apiMessages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      });
    } else {
      apiMessages.push({
        role: 'user',
        content: prompt,
      });
    }

    // -- Call Anthropic API ---------------------------------------------------
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let anthropicResponse: Response;
    try {
      anthropicResponse = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: apiMessages,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const message = err instanceof Error && err.name === 'AbortError'
        ? `AI request timed out after ${FETCH_TIMEOUT_MS / 1000}s`
        : `Failed to reach AI service: ${err instanceof Error ? err.message : 'Unknown error'}`;
      return jsonResponse({ error: message }, 502);
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle rate limiting
    if (anthropicResponse.status === 429) {
      return jsonResponse(
        { error: 'AI service is temporarily rate-limited. Please try again in a moment.' },
        503,
      );
    }

    // Handle other API errors
    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error(`[ai-designer] Anthropic API error (${anthropicResponse.status}):`, errorBody);
      return jsonResponse(
        { error: `AI service returned an error (HTTP ${anthropicResponse.status})` },
        500,
      );
    }

    // -- Parse Anthropic response ---------------------------------------------
    // deno-lint-ignore no-explicit-any
    const anthropicData: any = await anthropicResponse.json();

    // Extract text content from the response
    const textContent = anthropicData.content?.find(
      // deno-lint-ignore no-explicit-any
      (block: any) => block.type === 'text',
    );

    if (!textContent?.text) {
      console.error('[ai-designer] No text content in Anthropic response:', JSON.stringify(anthropicData));
      return jsonResponse(
        { error: 'AI service returned an empty response' },
        500,
      );
    }

    // -- Parse JSON from response text ----------------------------------------
    let layoutData: {
      name?: string;
      elements?: unknown[];
      background?: Record<string, unknown>;
    };

    try {
      // Try to extract JSON from the response (handle potential markdown fences)
      let jsonText = textContent.text.trim();

      // Strip markdown code fences if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }

      layoutData = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error('[ai-designer] Failed to parse layout JSON:', parseErr, 'Raw:', textContent.text);
      return jsonResponse(
        { error: 'AI generated an invalid layout format. Please try rephrasing your prompt.' },
        500,
      );
    }

    // -- Validate and return --------------------------------------------------
    const elements = Array.isArray(layoutData.elements) ? layoutData.elements : [];
    const background = layoutData.background || { type: 'solid', color: '#1a1a2e' };
    const name = layoutData.name || 'AI Generated Layout';

    return jsonResponse({
      elements,
      background,
      name,
    });
  } catch (err) {
    console.error('[ai-designer] Unhandled error:', err);
    return jsonResponse(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred' },
      500,
    );
  }
});
