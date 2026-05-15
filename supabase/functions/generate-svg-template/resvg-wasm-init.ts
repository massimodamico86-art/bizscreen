// Phase 177 — @resvg/resvg-wasm WASM init + rasterize helper.
// D-15 OVERRIDE: WASM (not @resvg/resvg-js); Supabase Edge Functions only support
// WASM image libraries; the N-API variant crashes at runtime
// (https://supabase.com/docs/guides/functions/examples/image-manipulation).
//
// index_bg.wasm is bundled via supabase/config.toml [functions.generate-svg-template]
// static_files (path is supabase/-relative — see Plan 01 deviation note).
//
// One-shot init pattern: the wasmReady promise is cached at module scope so any
// number of approve calls in the same EF cold-start share a single initWasm().
// rasterize() awaits ensureWasm() before constructing Resvg — safe to call from
// the first request onward.
//
// Pitfall 2 mitigation: `loadSystemFonts: false` — there are NO system fonts
// inside the Deno EF runtime; loadSystemFonts: true would silently render text
// with the WASM fallback (often invisible). Prompt library forces sans-serif/
// serif/monospace generic families which resvg renders synthetically.
import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@^2.6.2";

let wasmReady: Promise<void> | null = null;

export async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    const wasmBytes = await Deno.readFile(new URL("./index_bg.wasm", import.meta.url));
    wasmReady = initWasm(wasmBytes);
  }
  return wasmReady;
}

export async function rasterize(
  svg: string,
  opts: { width: number; height: number },
): Promise<Uint8Array> {
  await ensureWasm();
  const useWidthFit = opts.width >= opts.height;
  const resvg = new Resvg(svg, {
    fitTo: useWidthFit
      ? { mode: "width", value: opts.width }
      : { mode: "height", value: opts.height },
    background: "rgba(255,255,255,1)",
    font: { loadSystemFonts: false }, // Pitfall 2 — WASM has no system fonts; prompts force sans-serif.
  });
  return resvg.render().asPng();
}
