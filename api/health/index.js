/**
 * Health Check Endpoint
 *
 * GET /api/health
 * Returns application health status for uptime monitoring.
 *
 * Response:
 * - status: 'ok' | 'degraded' | 'error'
 * - version: Package version from package.json
 * - timestamp: ISO 8601 timestamp
 * - uptime: Process uptime in seconds (if available)
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get package version safely
function getVersion() {
  try {
    // For Vercel serverless, we need to read the package.json
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const packagePath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

export default async function handler(req, res) {
  // Only accept GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const health = {
      status: 'ok',
      version: getVersion(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Add process uptime if available (in serverless, this may be short-lived)
    if (typeof process.uptime === 'function') {
      health.uptime = Math.round(process.uptime());
    }

    // Set cache headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).json(health);

  } catch (error) {
    // Even in error, return a valid response structure
    return res.status(500).json({
      status: 'error',
      version: 'unknown',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
}
