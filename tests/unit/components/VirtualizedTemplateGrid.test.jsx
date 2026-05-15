/**
 * VirtualizedTemplateGrid — Phase 179 (TVRZ-01, SC-1, SC-3, SC-5)
 *
 * Six-test unit gate locked by Plan 04. Plan 03 scaffolded the four
 * count/aria tests + two `it.todo` markers; Plan 04 implements the
 * component AND activates both markers by spying on the
 * `@tanstack/react-virtual` import via `vi.mock`.
 *
 * Coverage:
 *   - SC-1: overscan >= 3 ; count = 0 when templates=[] ; aria-rowcount math
 *   - SC-3: scrollToOffset(0) on templates identity change (spy)
 *   - SC-5: tolerates null scrollElement on initial render
 *
 * NOTE: `vi.mock('@tanstack/react-virtual', ...)` is hoisted by vitest, so
 * EVERY test in this file (including the original 4) is now exercising the
 * mocked virtualizer. The original assertions still hold because
 * `aria-rowcount` is read from the component's own `rows.length` math
 * (independent of the virtualizer's `getVirtualItems()` return value).
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Module-level spy state for the two activated tests.
// `vi.mock` is hoisted above all top-level code by vitest's transform, so
// these `let` bindings must live in a closure the factory can write into.
let capturedVirtualizerOptions = null;
let scrollToOffsetSpy = vi.fn();

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options) => {
    capturedVirtualizerOptions = options;
    // Minimal mock satisfying the component contract:
    //   - getVirtualItems() returns [] so no rows are rendered (count/aria
    //     math in the component still derives from rows.length independently)
    //   - getTotalSize() returns 0 (height style is a numeric)
    //   - scrollToOffset is the module-level spy (Test 6 asserts on it)
    //   - measureElement is a no-op ref callback
    return {
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      scrollToOffset: scrollToOffsetSpy,
      measureElement: (_el) => { void _el; },
    };
  },
}));

const MODULE_PATH = '../../../src/components/template-gallery/VirtualizedTemplateGrid';

describe('VirtualizedTemplateGrid (SC-1, SC-3, SC-5)', () => {
  it('renders role="grid" with aria-rowcount=0 when templates=[]', async () => {
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const { container } = render(
      <VirtualizedTemplateGrid templates={[]} cols={4} scrollElement={null} />
    );
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
    expect(grid).toHaveAttribute('aria-rowcount', '0');
  });

  it('aria-rowcount equals ceil(templates.length / cols) at cols=4', async () => {
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const templates = Array.from({ length: 17 }, (_, i) => ({
      id: `t${i}`,
      name: `Template ${i}`,
      description: '',
      thumbnail: null,
      orientation: 'landscape',
    }));
    const { container } = render(
      <VirtualizedTemplateGrid templates={templates} cols={4} scrollElement={document.body} />
    );
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '5');
  });

  it('aria-rowcount equals ceil(templates.length / cols) at cols=3', async () => {
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const templates = Array.from({ length: 12 }, (_, i) => ({
      id: `t${i}`,
      name: 'T',
      description: '',
      thumbnail: null,
      orientation: 'landscape',
    }));
    const { container } = render(
      <VirtualizedTemplateGrid templates={templates} cols={3} scrollElement={document.body} />
    );
    expect(container.querySelector('[role="grid"]')).toHaveAttribute('aria-rowcount', '4');
  });

  it('tolerates null scrollElement on first render (no crash)', async () => {
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const templates = Array.from({ length: 4 }, (_, i) => ({
      id: `t${i}`,
      name: 'T',
      description: '',
      thumbnail: null,
      orientation: 'landscape',
    }));
    // MUST NOT throw — page rendering sequence is render -> ref attaches -> re-render.
    const { container } = render(
      <VirtualizedTemplateGrid templates={templates} cols={4} scrollElement={null} />
    );
    expect(container.querySelector('[role="grid"]')).not.toBeNull();
  });

  it('overscan default is >= 3 (SC-1)', async () => {
    capturedVirtualizerOptions = null;
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const templates = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`, name: 'T', description: '', thumbnail: null, orientation: 'landscape',
    }));
    render(<VirtualizedTemplateGrid templates={templates} cols={4} scrollElement={document.body} />);
    expect(capturedVirtualizerOptions).not.toBeNull();
    expect(capturedVirtualizerOptions.overscan).toBeGreaterThanOrEqual(3);
  });

  it('scrollToOffset(0) is called when templates reference changes (SC-3)', async () => {
    scrollToOffsetSpy = vi.fn();
    const mod = await import(MODULE_PATH);
    const VirtualizedTemplateGrid = mod.default;
    const t1 = [{ id: 'a', name: 'A', description: '', thumbnail: null, orientation: 'landscape' }];
    const t2 = [{ id: 'b', name: 'B', description: '', thumbnail: null, orientation: 'landscape' }];

    const { rerender } = render(
      <VirtualizedTemplateGrid templates={t1} cols={4} scrollElement={document.body} />
    );
    // Clear mount-call so the assertion below measures ONLY the rerender effect (CR-02 fix)
    scrollToOffsetSpy.mockClear();
    // Initial render triggers the effect once with t1.
    // Rerender with a fresh array reference (t2) — effect must fire scrollToOffset(0) again.
    rerender(
      <VirtualizedTemplateGrid templates={t2} cols={4} scrollElement={document.body} />
    );

    // Per RESEARCH §Pitfall 2: assertion is "called" (not exactly-once) because
    // fuse-driven re-renders can fire the effect multiple times in succession.
    expect(scrollToOffsetSpy).toHaveBeenCalled();
    expect(scrollToOffsetSpy).toHaveBeenCalledWith(0);
  });
});
