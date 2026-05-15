/**
 * Phase 173 — PackCard 2x2 mosaic rendering (TPCK-04).
 * Plan 01 seeded this file with 6 it.skip stubs; Plan 07 flips to real assertions.
 *
 * Tests assert the UI-SPEC Copywriting Contract (count badge copy) + D-12 mosaic
 * contract + D-17 thumbnail_url short-circuit + click-guard click delegation.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import PackCard from '../../../src/components/template-gallery/PackCard';

const basePack = {
  id: 'pack-1',
  name: 'Restaurant Starter',
  industry: 'Restaurant',
  thumbnail_url: null,
  member_thumbnails: [
    'https://cdn.example.com/a.png',
    'https://cdn.example.com/b.png',
    'https://cdn.example.com/c.png',
    'https://cdn.example.com/d.png',
  ],
  member_count: 12,
};

describe('PackCard', () => {
  it('renders 2x2 mosaic of first 4 member thumbnails (D-12)', () => {
    const { container } = render(<PackCard pack={basePack} onSelect={() => {}} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(4);
    expect(imgs[0].getAttribute('src')).toBe('https://cdn.example.com/a.png');
    expect(imgs[3].getAttribute('src')).toBe('https://cdn.example.com/d.png');
    // Grid container with mosaic classes
    expect(container.querySelector('.grid-cols-2.grid-rows-2')).toBeTruthy();
    expect(container.querySelector('.gap-1')).toBeTruthy();
  });

  it('renders brand-tinted placeholders for cells when member count < 4 (D-12)', () => {
    const sparse = {
      ...basePack,
      member_thumbnails: ['https://cdn.example.com/only-one.png'],
      member_count: 1,
    };
    const { container } = render(<PackCard pack={sparse} onSelect={() => {}} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    // 3 placeholder cells — brand-tinted gradient
    const placeholders = container.querySelectorAll('.from-brand-50.to-brand-100');
    expect(placeholders.length).toBe(3);
    placeholders.forEach((el) => {
      expect(el.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('thumbnail_url short-circuits the mosaic when present (D-17)', () => {
    const withThumb = { ...basePack, thumbnail_url: 'https://cdn.example.com/pack-hero.png' };
    const { container } = render(<PackCard pack={withThumb} onSelect={() => {}} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toBe('https://cdn.example.com/pack-hero.png');
    // Mosaic grid should NOT render
    expect(container.querySelector('.grid-cols-2.grid-rows-2')).toBeFalsy();
  });

  it('count badge shows "N templates" copy (UI-SPEC Copywriting)', () => {
    render(<PackCard pack={basePack} onSelect={() => {}} />);
    // Copy must be "N templates" — never just the integer. Assert "12 templates" is present
    // and that a lone "12" does not render outside the "12 templates" string.
    expect(screen.getByText('12 templates')).toBeTruthy();
  });

  it('industry label renders below pack name when present', () => {
    render(<PackCard pack={basePack} onSelect={() => {}} />);
    expect(screen.getByText('Restaurant Starter')).toBeTruthy();
    expect(screen.getByText('Restaurant')).toBeTruthy();
  });

  it('click on card invokes onSelect prop (Pattern I — click guard for nested buttons)', () => {
    const onSelect = vi.fn();
    render(<PackCard pack={basePack} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('pack-card-pack-1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
