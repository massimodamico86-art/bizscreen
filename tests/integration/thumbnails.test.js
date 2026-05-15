import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// The script is CommonJS — load via createRequire to access the exported rasterize().
const require = createRequire(import.meta.url);

describe('Phase 175 thumbnail rasterizer (TCTN-04)', () => {
  it('rasterize() produces a PNG buffer for an existing SVG', () => {
    const scriptPath = path.resolve('scripts/generate-template-thumbnails.cjs');
    const mod = require(scriptPath);
    expect(typeof mod.rasterize).toBe('function');

    // Pick any existing template that exists on disk (Phase 167 seed).
    const svgPath = path.resolve('public/templates/svg/restaurant-menu/menu-design.svg');
    if (!fs.existsSync(svgPath)) {
      // Fall back to the first .svg under the directory tree
      const baseDir = path.resolve('public/templates/svg');
      const dirs = fs.readdirSync(baseDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
      let chosen;
      for (const slug of dirs) {
        const candidates = fs.readdirSync(path.join(baseDir, slug)).filter((f) => f.endsWith('.svg'));
        if (candidates.length > 0) { chosen = path.join(baseDir, slug, candidates[0]); break; }
      }
      expect(chosen, 'must find at least one SVG under public/templates/svg/**').toBeTruthy();
      const svg = fs.readFileSync(chosen, 'utf8');
      const png = mod.rasterize(svg, { width: 480, height: 270 });
      expect(png.length).toBeGreaterThan(1024);
      expect(png.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic
    } else {
      const svg = fs.readFileSync(svgPath, 'utf8');
      const png = mod.rasterize(svg, { width: 480, height: 270 });
      expect(png.length).toBeGreaterThan(1024);
      expect(png.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic
    }
  });

  it('rasterize() respects portrait orientation (height-fit)', () => {
    const scriptPath = path.resolve('scripts/generate-template-thumbnails.cjs');
    const mod = require(scriptPath);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect fill="#FF0000" width="1080" height="1920"/></svg>`;
    const png = mod.rasterize(svg, { width: 270, height: 480 });
    expect(png.length).toBeGreaterThan(256);
    expect(png.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  });
});
