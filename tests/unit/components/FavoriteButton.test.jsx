/**
 * Phase 173 — FavoriteButton primitive (TFAV-01, RESEARCH Pattern 5).
 * Live tests; flipped from Wave 0 RED stub by Plan 06 Task 1 (W-2 fix).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FavoriteButton from '../../../src/design-system/components/FavoriteButton';

describe('FavoriteButton', () => {
  it('optimistic flip happens BEFORE await onToggle (Pattern 5)', async () => {
    let resolveToggle;
    const onToggle = vi.fn(() => new Promise((resolve) => { resolveToggle = resolve; }));
    render(<FavoriteButton isFavorited={false} onToggle={onToggle} />);

    const btn = screen.getByRole('button', { name: /Add to favorites/i });
    expect(btn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(btn);

    // Synchronously after click — BEFORE the toggle promise resolves — aria-pressed has flipped.
    expect(screen.getByRole('button', { name: /Remove from favorites/i }).getAttribute('aria-pressed')).toBe('true');
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);

    // Resolve the toggle so the test can clean up.
    resolveToggle();
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });

  it('reverts optimistic state on mutation error', async () => {
    const err = new Error('rpc fail');
    const onToggle = vi.fn(() => Promise.reject(err));
    const onError = vi.fn();
    render(<FavoriteButton isFavorited={false} onToggle={onToggle} onError={onError} />);

    fireEvent.click(screen.getByRole('button', { name: /Add to favorites/i }));

    // After the rejection settles, aria-pressed reverts to false.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add to favorites/i }).getAttribute('aria-pressed')).toBe('false');
    });
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('busy guard prevents double-click re-entry (only one onToggle call per intent)', () => {
    const onToggle = vi.fn(() => new Promise(() => { /* never resolves */ }));
    render(<FavoriteButton isFavorited={false} onToggle={onToggle} />);

    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    // Only one call — the second/third clicks are no-ops while the first is in flight.
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
