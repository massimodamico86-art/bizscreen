#!/usr/bin/env node
/**
 * Screenshot Comparison Report Generator
 *
 * Compares current screenshots on disk against the committed baseline (git HEAD)
 * and generates an HTML report showing visual changes.
 *
 * How it works:
 *   1. Uses `git ls-tree` to enumerate baseline screenshots in HEAD
 *   2. Uses `fs.readdirSync` to enumerate current screenshots on disk
 *   3. Compares SHA-256 hashes of baseline vs current file content
 *   4. Generates an HTML report at test-results/screenshot-report.html
 *
 * Exit code: always 0 (informational only, not a gate)
 *
 * Usage:
 *   node scripts/screenshot-compare.cjs
 *
 * No external dependencies required -- uses only Node.js built-ins.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SCREENSHOTS_DIR = 'screenshots';
const REPORT_PATH = 'test-results/screenshot-report.html';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Get the list of screenshot files tracked in git HEAD.
 * Returns an array of relative paths (e.g., "screenshots/98-01-homepage.png").
 */
function getBaselineFiles() {
  try {
    const output = execSync(
      `git ls-tree -r --name-only HEAD -- ${SCREENSHOTS_DIR}/`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return output
      .trim()
      .split('\n')
      .filter((line) => line.endsWith('.png'));
  } catch (_err) {
    // No git repo, no HEAD, or no screenshots in HEAD
    return [];
  }
}

/**
 * Get the SHA-256 hash of a file as it exists in git HEAD.
 * Returns null if the file cannot be retrieved.
 */
function getBaselineHash(filePath) {
  try {
    const buffer = execSync(`git show HEAD:${filePath}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 50 * 1024 * 1024, // 50MB for large screenshots
    });
    return sha256(buffer);
  } catch (_err) {
    return null;
  }
}

/**
 * Recursively collect all .png files under a directory.
 * Returns relative paths from the repo root.
 */
function getCurrentFiles(dir) {
  const results = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.png')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Read a file from disk and return its SHA-256 hash.
 * Returns null if the file cannot be read.
 */
function getCurrentHash(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    return sha256(buffer);
  } catch (_err) {
    return null;
  }
}

/**
 * Read a file from disk and return it as a base64 data URI.
 */
function toDataUri(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (_err) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Comparison Logic
// ---------------------------------------------------------------------------

function compareScreenshots() {
  const baselineFiles = new Set(getBaselineFiles());
  const currentFiles = new Set(getCurrentFiles(SCREENSHOTS_DIR));

  const results = {
    unchanged: [],
    changed: [],
    added: [],
    removed: [],
  };

  // Check all files in baseline
  for (const file of baselineFiles) {
    if (currentFiles.has(file)) {
      // File exists in both -- compare hashes
      const baselineHash = getBaselineHash(file);
      const currentHash = getCurrentHash(file);

      if (baselineHash && currentHash && baselineHash === currentHash) {
        results.unchanged.push(file);
      } else {
        results.changed.push(file);
      }
      currentFiles.delete(file);
    } else {
      // File in baseline but not on disk
      results.removed.push(file);
    }
  }

  // Remaining current files are new (not in baseline)
  for (const file of currentFiles) {
    results.added.push(file);
  }

  // Sort all arrays for consistent output
  results.unchanged.sort();
  results.changed.sort();
  results.added.sort();
  results.removed.sort();

  return results;
}

// ---------------------------------------------------------------------------
// HTML Report Generation
// ---------------------------------------------------------------------------

function generateReport(results) {
  const totalCount =
    results.unchanged.length +
    results.changed.length +
    results.added.length +
    results.removed.length;

  const timestamp = new Date().toISOString();

  // Build table rows for changed/new/removed files
  let tableRows = '';

  for (const file of results.changed) {
    const dataUri = toDataUri(file);
    const imgTag = dataUri
      ? `<img src="${dataUri}" alt="${file}" style="max-width:300px;max-height:200px;border:1px solid #ccc;">`
      : '<em>Could not load image</em>';
    tableRows += `
      <tr class="changed">
        <td><span class="badge badge-changed">CHANGED</span></td>
        <td>${escapeHtml(file)}</td>
        <td>${imgTag}</td>
      </tr>`;
  }

  for (const file of results.added) {
    const dataUri = toDataUri(file);
    const imgTag = dataUri
      ? `<img src="${dataUri}" alt="${file}" style="max-width:300px;max-height:200px;border:1px solid #ccc;">`
      : '<em>Could not load image</em>';
    tableRows += `
      <tr class="added">
        <td><span class="badge badge-added">NEW</span></td>
        <td>${escapeHtml(file)}</td>
        <td>${imgTag}</td>
      </tr>`;
  }

  for (const file of results.removed) {
    tableRows += `
      <tr class="removed">
        <td><span class="badge badge-removed">REMOVED</span></td>
        <td>${escapeHtml(file)}</td>
        <td><em>File no longer on disk</em></td>
      </tr>`;
  }

  if (!tableRows) {
    tableRows = `
      <tr>
        <td colspan="3" style="text-align:center;color:#666;padding:20px;">
          No changes detected -- all screenshots match the baseline.
        </td>
      </tr>`;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screenshot Comparison Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background: #f8f9fa; color: #333; }
    h1 { margin-bottom: 8px; }
    .timestamp { color: #666; font-size: 14px; margin-bottom: 24px; }

    .summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .summary-card { padding: 16px 24px; border-radius: 8px; text-align: center; min-width: 120px; }
    .summary-card .count { font-size: 32px; font-weight: bold; }
    .summary-card .label { font-size: 14px; margin-top: 4px; }

    .card-total { background: #e9ecef; }
    .card-unchanged { background: #d4edda; color: #155724; }
    .card-changed { background: #fff3cd; color: #856404; }
    .card-added { background: #cce5ff; color: #004085; }
    .card-removed { background: #f8d7da; color: #721c24; }

    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #343a40; color: white; padding: 12px 16px; text-align: left; }
    td { padding: 12px 16px; border-bottom: 1px solid #e9ecef; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }

    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .badge-changed { background: #fff3cd; color: #856404; }
    .badge-added { background: #cce5ff; color: #004085; }
    .badge-removed { background: #f8d7da; color: #721c24; }

    tr.changed:hover { background: #fffde7; }
    tr.added:hover { background: #e8f4fd; }
    tr.removed:hover { background: #fde8e8; }
  </style>
</head>
<body>
  <h1>Screenshot Comparison Report</h1>
  <p class="timestamp">Generated: ${timestamp}</p>

  <div class="summary">
    <div class="summary-card card-total">
      <div class="count">${totalCount}</div>
      <div class="label">Total</div>
    </div>
    <div class="summary-card card-unchanged">
      <div class="count">${results.unchanged.length}</div>
      <div class="label">Unchanged</div>
    </div>
    <div class="summary-card card-changed">
      <div class="count">${results.changed.length}</div>
      <div class="label">Changed</div>
    </div>
    <div class="summary-card card-added">
      <div class="count">${results.added.length}</div>
      <div class="label">New</div>
    </div>
    <div class="summary-card card-removed">
      <div class="count">${results.removed.length}</div>
      <div class="label">Removed</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:120px;">Status</th>
        <th>File Path</th>
        <th style="width:320px;">Preview</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`;

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('='.repeat(60));
  console.log('SCREENSHOT COMPARISON REPORT');
  console.log('='.repeat(60));
  console.log('');

  // Ensure output directory exists
  const reportDir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Handle edge case: no screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.log(`No ${SCREENSHOTS_DIR}/ directory found. Generating empty report.`);
    const emptyResults = { unchanged: [], changed: [], added: [], removed: [] };
    fs.writeFileSync(REPORT_PATH, generateReport(emptyResults));
    console.log(`Report written to: ${REPORT_PATH}`);
    process.exit(0);
  }

  const results = compareScreenshots();

  // Print summary to console
  const totalCount =
    results.unchanged.length +
    results.changed.length +
    results.added.length +
    results.removed.length;

  console.log(`Total screenshots: ${totalCount}`);
  console.log(`  Unchanged: ${results.unchanged.length}`);
  console.log(`  Changed:   ${results.changed.length}`);
  console.log(`  New:       ${results.added.length}`);
  console.log(`  Removed:   ${results.removed.length}`);
  console.log('');

  // Generate HTML report
  const html = generateReport(results);
  fs.writeFileSync(REPORT_PATH, html);
  console.log(`Report written to: ${REPORT_PATH}`);
  console.log('');
  console.log('='.repeat(60));

  // Always exit 0 -- this is informational only
  process.exit(0);
}

main();
