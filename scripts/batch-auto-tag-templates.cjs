#!/usr/bin/env node

/**
 * Batch Auto-Tag Templates Script
 *
 * Processes all SVG templates in a directory or database and
 * generates tags, categories, and descriptions using AI or rules.
 *
 * Usage:
 *   node scripts/batch-auto-tag-templates.cjs [options]
 *
 * Options:
 *   --dir <path>      Process templates from directory
 *   --database        Process templates from database
 *   --dry-run         Show what would be done without saving
 *   --rules-only      Use rule-based tagging (no AI)
 *   --verbose         Show detailed output
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  dir: null,
  database: false,
  dryRun: false,
  rulesOnly: false,
  verbose: false,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--dir':
      options.dir = args[++i];
      break;
    case '--database':
      options.database = true;
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--rules-only':
      options.rulesOnly = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      console.log(`
Batch Auto-Tag Templates Script

Processes SVG templates and generates tags, categories, and descriptions.

Usage:
  node scripts/batch-auto-tag-templates.cjs [options]

Options:
  --dir <path>      Process templates from directory (e.g., public/templates/svg)
  --database        Process templates from Supabase database
  --dry-run         Show what would be done without saving
  --rules-only      Use rule-based tagging only (no AI API calls)
  --verbose         Show detailed output

Examples:
  # Process local templates
  node scripts/batch-auto-tag-templates.cjs --dir public/templates/svg --verbose

  # Process database templates (dry run)
  node scripts/batch-auto-tag-templates.cjs --database --dry-run

  # Process with rules only (no AI)
  node scripts/batch-auto-tag-templates.cjs --database --rules-only
      `);
      process.exit(0);
  }
}

// Validate options
if (!options.dir && !options.database) {
  console.error('Error: Must specify --dir or --database');
  console.log('Use --help for usage information');
  process.exit(1);
}

// Supabase client
let supabase = null;
if (options.database) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Supabase credentials not found in environment');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, supabaseKey);
}

// ============================================================
// SVG Analysis (simplified version for Node.js)
// ============================================================

function analyzeSvgContent(svgContent) {
  // Simple regex-based analysis for Node.js environment
  const features = {
    texts: [],
    colors: { palette: [], dominant: '#ffffff' },
    dimensions: { width: 1920, height: 1080, orientation: 'landscape' },
    patterns: [],
  };

  // Extract text content
  const textMatches = svgContent.matchAll(/<text[^>]*>([^<]+)<\/text>/gi);
  for (const match of textMatches) {
    const text = match[1].trim();
    if (text) {
      features.texts.push({
        content: text,
        type: 'body',
        contentType: detectTextContentType(text),
      });
    }
  }

  // Extract tspan text
  const tspanMatches = svgContent.matchAll(/<tspan[^>]*>([^<]+)<\/tspan>/gi);
  for (const match of tspanMatches) {
    const text = match[1].trim();
    if (text && !features.texts.some(t => t.content === text)) {
      features.texts.push({
        content: text,
        type: 'body',
        contentType: detectTextContentType(text),
      });
    }
  }

  // Extract colors
  const colorMatches = svgContent.matchAll(/(?:fill|stroke|stop-color)=["']([^"']+)["']/gi);
  const colors = new Set();
  for (const match of colorMatches) {
    const color = match[1];
    if (color && color !== 'none' && !color.startsWith('url(')) {
      colors.add(color);
    }
  }
  features.colors.palette = Array.from(colors).slice(0, 10).map(hex => ({ hex, category: 'unknown' }));
  features.colors.dominant = features.colors.palette[0]?.hex || '#ffffff';

  // Extract dimensions
  const viewBoxMatch = svgContent.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/\s+/).map(Number);
    if (parts.length >= 4) {
      features.dimensions.width = parts[2];
      features.dimensions.height = parts[3];
    }
  }

  const widthMatch = svgContent.match(/width=["'](\d+)/i);
  const heightMatch = svgContent.match(/height=["'](\d+)/i);
  if (widthMatch) features.dimensions.width = parseInt(widthMatch[1]);
  if (heightMatch) features.dimensions.height = parseInt(heightMatch[1]);

  // Determine orientation
  if (features.dimensions.height > features.dimensions.width) {
    features.dimensions.orientation = 'portrait';
  } else if (Math.abs(features.dimensions.width - features.dimensions.height) < 50) {
    features.dimensions.orientation = 'square';
  }

  // Detect patterns
  if ((svgContent.match(/<rect/gi) || []).length >= 4) {
    features.patterns.push('grid-layout');
  }
  if (svgContent.match(/rx=|ry=/i)) {
    features.patterns.push('card-layout');
  }

  // Generate summary
  const headlines = features.texts.slice(0, 3).map(t => t.content);
  features.summary = `${features.dimensions.orientation} design. Text: ${headlines.join(', ') || 'none'}`;

  return features;
}

function detectTextContentType(text) {
  const lowerText = text.toLowerCase();

  if (/^\$[\d,.]+$/.test(text) || /price|cost/i.test(text)) return 'price';
  if (/^\d{1,2}:\d{2}/.test(text) || /am|pm|hours?/i.test(text)) return 'time';
  if (/\d+%|off|discount|sale/i.test(text)) return 'discount';
  if (/menu|appetizer|entree|dessert/i.test(text)) return 'menu_section';
  if (/buy|shop|order|book/i.test(lowerText)) return 'cta';

  return 'general';
}

// ============================================================
// Rule-based Tagging
// ============================================================

function generateTagsWithRules(analysis) {
  const tags = new Set();
  let category = 'general';
  let description = '';
  let confidence = 0.5;

  const allText = analysis.texts.map(t => t.content.toLowerCase()).join(' ');

  // Restaurant detection
  if (/menu|appetizer|entree|dessert|food|drink|beverage/i.test(allText)) {
    category = 'restaurant';
    tags.add('menu');
    tags.add('food');
    confidence = 0.7;

    if (/pizza/i.test(allText)) tags.add('pizza');
    if (/burger/i.test(allText)) tags.add('burger');
    if (/coffee|cafe/i.test(allText)) { tags.add('coffee'); tags.add('cafe'); }
    if (/sushi/i.test(allText)) tags.add('sushi');
    if (/bakery/i.test(allText)) tags.add('bakery');
  }

  // Retail detection
  if (/sale|discount|%\s*off|price|shop/i.test(allText)) {
    if (category === 'general') category = 'retail';
    tags.add('promotion');
    tags.add('sale');
    confidence = Math.max(confidence, 0.65);
  }

  // Real estate detection
  if (/property|home|house|apartment|rent|bedroom/i.test(allText)) {
    category = 'real-estate';
    tags.add('listing');
    confidence = 0.7;
  }

  // Healthcare detection
  if (/doctor|clinic|health|medical|hospital/i.test(allText)) {
    category = 'healthcare';
    tags.add('medical');
    confidence = 0.7;
  }

  // Fitness detection
  if (/gym|fitness|workout|exercise/i.test(allText)) {
    category = 'fitness';
    tags.add('gym');
    confidence = 0.7;
  }

  // Content type tags
  analysis.texts.forEach(t => {
    if (t.contentType === 'price') tags.add('pricing');
    if (t.contentType === 'time') tags.add('hours');
    if (t.contentType === 'discount') { tags.add('promotion'); tags.add('sale'); }
    if (t.contentType === 'cta') tags.add('call-to-action');
  });

  // Orientation tag
  tags.add(analysis.dimensions.orientation);

  // Generate description
  const firstText = analysis.texts[0]?.content;
  if (firstText) {
    description = `Template featuring "${firstText.slice(0, 50)}"`;
    if (category !== 'general') {
      description += ` for ${category} displays`;
    }
  } else {
    description = `${category} template`;
  }

  return {
    category,
    tags: Array.from(tags).slice(0, 15),
    description,
    confidence,
    source: 'rules',
  };
}

// ============================================================
// AI Tagging (via API)
// ============================================================

async function generateTagsWithAI(analysis) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('Warning: ANTHROPIC_API_KEY not set, falling back to rules');
    return generateTagsWithRules(analysis);
  }

  const categories = [
    'restaurant', 'retail', 'hospitality', 'healthcare', 'education',
    'corporate', 'real-estate', 'fitness', 'entertainment', 'transportation',
    'finance', 'automotive', 'salon-spa', 'events', 'social-media', 'general',
  ];

  const prompt = `Analyze this SVG template and generate appropriate tags for a digital signage system.

Template Analysis:
${analysis.summary}

Text Content Found:
${analysis.texts.slice(0, 20).map(t => `- "${t.content}" (${t.contentType})`).join('\n')}

Patterns: ${analysis.patterns.join(', ') || 'none'}
Dimensions: ${analysis.dimensions.width}x${analysis.dimensions.height} (${analysis.dimensions.orientation})

Provide:
1. A single category from: ${categories.join(', ')}
2. Up to 10 relevant tags
3. A brief description (1-2 sentences)

Respond in JSON only:
{"category": "...", "tags": [...], "description": "...", "confidence": 0.0-1.0}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let category = (parsed.category || 'general').toLowerCase().replace(/\s+/g, '-');
      if (!categories.includes(category)) category = 'general';

      return {
        category,
        tags: (parsed.tags || []).map(t => t.toLowerCase().replace(/\s+/g, '-')).slice(0, 15),
        description: parsed.description || '',
        confidence: parsed.confidence || 0.8,
        source: 'ai',
      };
    }
  } catch (error) {
    console.warn(`AI tagging failed: ${error.message}`);
  }

  return generateTagsWithRules(analysis);
}

// ============================================================
// Main Processing Functions
// ============================================================

async function processDirectory(dirPath) {
  const results = [];
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.svg'));

  console.log(`Found ${files.length} SVG files in ${dirPath}\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(dirPath, file);

    try {
      const svgContent = fs.readFileSync(filePath, 'utf-8');
      const analysis = analyzeSvgContent(svgContent);

      let result;
      if (options.rulesOnly) {
        result = generateTagsWithRules(analysis);
      } else {
        result = await generateTagsWithAI(analysis);
      }

      results.push({
        file,
        ...result,
      });

      const statusIcon = result.source === 'ai' ? 'AI' : 'R';
      console.log(`[${i + 1}/${files.length}] [${statusIcon}] ${file}`);
      console.log(`  Category: ${result.category}`);
      console.log(`  Tags: ${result.tags.join(', ')}`);
      if (options.verbose) {
        console.log(`  Description: ${result.description}`);
        console.log(`  Confidence: ${result.confidence}`);
      }
      console.log('');

      // Small delay between AI calls
      if (!options.rulesOnly && i < files.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) {
      console.error(`[${i + 1}/${files.length}] Error processing ${file}: ${error.message}`);
      results.push({ file, error: error.message });
    }
  }

  return results;
}

async function processDatabase() {
  console.log('Fetching templates from database...\n');

  const { data: templates, error } = await supabase
    .from('svg_templates')
    .select('id, name, svg_content, svg_url, category, tags')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Database error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${templates.length} templates\n`);

  const results = [];

  for (let i = 0; i < templates.length; i++) {
    const template = templates[i];

    try {
      let svgContent = template.svg_content;

      // Fetch from URL if no inline content
      if (!svgContent && template.svg_url) {
        const response = await fetch(template.svg_url);
        svgContent = await response.text();
      }

      if (!svgContent) {
        console.warn(`[${i + 1}/${templates.length}] Skipping ${template.name}: No SVG content`);
        continue;
      }

      const analysis = analyzeSvgContent(svgContent);

      let result;
      if (options.rulesOnly) {
        result = generateTagsWithRules(analysis);
      } else {
        result = await generateTagsWithAI(analysis);
      }

      const statusIcon = result.source === 'ai' ? 'AI' : 'R';
      console.log(`[${i + 1}/${templates.length}] [${statusIcon}] ${template.name}`);
      console.log(`  Category: ${result.category}`);
      console.log(`  Tags: ${result.tags.join(', ')}`);
      if (options.verbose) {
        console.log(`  Description: ${result.description}`);
        console.log(`  Confidence: ${result.confidence}`);
      }

      // Update database unless dry run
      if (!options.dryRun) {
        const { error: updateError } = await supabase
          .from('svg_templates')
          .update({
            category: result.category,
            tags: result.tags,
            description: result.description || template.description,
            metadata: {
              ...template.metadata,
              auto_tagged: true,
              tag_source: result.source,
              tag_confidence: result.confidence,
              tagged_at: new Date().toISOString(),
            },
          })
          .eq('id', template.id);

        if (updateError) {
          console.error(`  Update failed: ${updateError.message}`);
        } else {
          console.log('  Updated in database');
        }
      } else {
        console.log('  (dry run - not saved)');
      }

      console.log('');

      results.push({
        id: template.id,
        name: template.name,
        ...result,
      });

      // Small delay between AI calls
      if (!options.rulesOnly && i < templates.length - 1) {
        await new Promise(r => setTimeout(r, 300));
      }
    } catch (error) {
      console.error(`[${i + 1}/${templates.length}] Error processing ${template.name}: ${error.message}`);
      results.push({ id: template.id, name: template.name, error: error.message });
    }
  }

  return results;
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Batch Auto-Tag Templates');
  console.log('='.repeat(60));
  console.log(`Mode: ${options.rulesOnly ? 'Rules Only' : 'AI + Rules Fallback'}`);
  console.log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('='.repeat(60) + '\n');

  let results;

  if (options.dir) {
    const dirPath = path.resolve(options.dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`Error: Directory not found: ${dirPath}`);
      process.exit(1);
    }
    results = await processDirectory(dirPath);
  } else if (options.database) {
    results = await processDatabase();
  }

  // Summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  const aiTagged = results.filter(r => r.source === 'ai');
  const ruleTagged = results.filter(r => r.source === 'rules');

  console.log(`Total processed: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`AI tagged: ${aiTagged.length}`);
  console.log(`Rule tagged: ${ruleTagged.length}`);

  // Category breakdown
  const categories = {};
  successful.forEach(r => {
    categories[r.category] = (categories[r.category] || 0) + 1;
  });
  console.log('\nCategories:');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

  // Output results to JSON file
  const outputPath = path.join(process.cwd(), 'auto-tag-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
