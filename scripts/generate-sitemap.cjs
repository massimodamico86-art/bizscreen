/**
 * Sitemap Generator Script
 *
 * Generates sitemap.xml for BizScreen public routes.
 * Run with: npm run generate:sitemap
 *
 * Configuration:
 * - BASE_URL: Update for your production domain
 * - routes: Add/remove public routes as needed
 */

const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.SITE_URL || 'https://bizscreen.app';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

// Public routes to include in sitemap
// NOTE: Only include publicly accessible, indexable routes
const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/features', changefreq: 'weekly', priority: '0.9' },
  { path: '/auth/login', changefreq: 'monthly', priority: '0.5' },
  { path: '/auth/signup', changefreq: 'monthly', priority: '0.7' },
];

// Get current date in ISO format (YYYY-MM-DD)
const today = new Date().toISOString().split('T')[0];

// Generate XML
function generateSitemap() {
  const urlEntries = routes
    .map(
      (route) => `  <url>
    <loc>${BASE_URL}${route.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

  return sitemap;
}

// Write sitemap to file
function writeSitemap() {
  const sitemap = generateSitemap();

  // Ensure public directory exists
  const publicDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, sitemap, 'utf8');
  console.log(`Sitemap generated: ${OUTPUT_PATH}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Routes included: ${routes.length}`);
}

// Run
writeSitemap();
