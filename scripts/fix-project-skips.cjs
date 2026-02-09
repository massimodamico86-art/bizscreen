#!/usr/bin/env node
/**
 * Fix project-specific skips in E2E test files.
 *
 * Replaces broken describe-level test.skip(({}, testInfo) => ...) with
 * working beforeEach-level test.skip(testInfo.project.name !== ...) calls.
 */
const fs = require('fs');
const path = require('path');

const dir = 'tests/e2e';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.spec.js'));

let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Pattern: test.skip(({}, testInfo) => testInfo.project.name !== 'PROJECT', 'MESSAGE');
  const skipPattern = /^(\s*)test\.skip\(\(\{\}, testInfo\) => testInfo\.project\.name !== '([^']+)', '([^']+)'\);?\s*\n/gm;

  const matches = [...content.matchAll(skipPattern)];
  if (matches.length === 0) continue;

  console.log(`\n${file}: ${matches.length} skip(s) to fix`);

  // For each match, we need to:
  // 1. Remove the broken skip line
  // 2. Find the nearest beforeEach in the same describe block and add the skip there

  // Strategy: Process the file line by line, track describe nesting
  const lines = content.split('\n');
  const skipLines = new Set();
  const skipInfo = []; // { lineIdx, indent, project, message }

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)test\.skip\(\(\{\}, testInfo\) => testInfo\.project\.name !== '([^']+)', '([^']+)'\);?$/);
    if (match) {
      skipLines.add(i);
      skipInfo.push({
        lineIdx: i,
        indent: match[1],
        project: match[2],
        message: match[3],
      });
    }
  }

  // For each skip, find the nearest beforeEach after it (in the same describe scope)
  const insertions = []; // { lineIdx, indent, project, message }

  for (const skip of skipInfo) {
    let found = false;

    // Look forward from the skip line for the nearest beforeEach
    for (let i = skip.lineIdx + 1; i < lines.length; i++) {
      const line = lines[i];

      // Check if we've left the describe block (by finding a closing brace at the skip's indent level or less)
      // This is approximate but works for well-formatted code

      // Match test.beforeEach pattern
      const beforeEachMatch = line.match(/^(\s*)test\.beforeEach\(async \((\{[^}]*\})(?:,\s*testInfo)?\)/);
      if (beforeEachMatch) {
        const beIndent = beforeEachMatch[1];
        const fixtures = beforeEachMatch[2];

        // Add testInfo parameter if not already there
        if (!line.includes('testInfo')) {
          // Replace the beforeEach line to include testInfo
          const newLine = line.replace(
            /test\.beforeEach\(async \((\{[^}]*\})\)/,
            'test.beforeEach(async ($1, testInfo)'
          );
          lines[i] = newLine;
        }

        // Add the skip call as the first line inside the beforeEach
        // Find the opening brace line
        let braceIdx = i;
        if (!line.includes('{', line.indexOf('=>'))) {
          // Arrow function without brace on same line - find it
          for (let j = i; j < Math.min(i + 3, lines.length); j++) {
            if (lines[j].includes('{')) {
              braceIdx = j;
              break;
            }
          }
        }

        // Insert skip after the opening brace (next line)
        insertions.push({
          afterLine: braceIdx,
          text: `${beIndent}  test.skip(testInfo.project.name !== '${skip.project}', '${skip.message}');`,
        });

        found = true;
        break;
      }

      // If we hit another test.describe or are outside the block, stop
      if (line.match(/^(\s*)test\.describe/) && !line.includes(skip.indent + '  ')) {
        break;
      }
    }

    if (!found) {
      // No beforeEach found - need to add one
      // Insert a beforeEach right after the skip line position
      const innerIndent = skip.indent + '  ';
      insertions.push({
        afterLine: skip.lineIdx,
        text: `${skip.indent}test.beforeEach(async ({}, testInfo) => {\n${innerIndent}test.skip(testInfo.project.name !== '${skip.project}', '${skip.message}');\n${skip.indent}});\n`,
      });
    }

    totalFixed++;
  }

  // Apply changes: first remove skip lines, then add insertions (from bottom to top)
  // Sort insertions by line number descending to avoid index shifts
  insertions.sort((a, b) => b.afterLine - a.afterLine);

  // Apply insertions
  for (const ins of insertions) {
    lines.splice(ins.afterLine + 1, 0, ins.text);
  }

  // Remove skip lines (adjust for insertions above them)
  // Since we inserted from bottom to top, lines below skip lines may have shifted
  // Rebuild skip line indices
  const newLines = [];
  let skipCount = 0;
  for (let i = 0; i < lines.length; i++) {
    const isSkipLine = lines[i].match(/^\s*test\.skip\(\(\{\}, testInfo\) => testInfo\.project\.name !== '[^']+', '[^']+'\);?\s*$/);
    if (isSkipLine) {
      skipCount++;
      continue; // Skip this line
    }
    newLines.push(lines[i]);
  }

  console.log(`  Removed ${skipCount} broken skip lines, added ${insertions.length} beforeEach skips`);

  fs.writeFileSync(filePath, newLines.join('\n'));
}

console.log(`\nTotal fixes: ${totalFixed}`);
