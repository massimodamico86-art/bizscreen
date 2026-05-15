/**
 * AdminStarterPacksPage Unit Tests — RED scaffolding (Phase 173 Plan 09)
 *
 * This file intentionally begins in a FAILING state. The component under test
 * (`src/pages/Admin/AdminStarterPacksPage.jsx`) is not yet implemented — Plan
 * 09 Task 1 will create it and turn these tests GREEN.
 *
 * Suite coverage:
 *   - List renders rows with columns Name | Industry | Active | Display Order
 *     | Actions (TPCK-03)
 *   - "New pack" button with variant="primary" opens PackEditorPanel in 'new'
 *     mode (UI-SPEC Copywriting)
 *   - Delete confirmation dialog renders UI-SPEC Copywriting VERBATIM:
 *     - title: 'Delete "[Pack name]"?'
 *     - body: 'This removes the pack but does not delete its templates or any
 *       scenes you've already created from it.'
 *     - dismiss button: 'Keep pack'
 *     - confirm button: 'Delete pack'
 *   - Row Delete button carries `data-testid="delete-pack-<id>"` (W-7 fix)
 *   - Toggle Active flips is_active via updatePack
 *   - Delete confirmation fires deletePack(id)
 *
 * Mocks are scoped to marketplaceService pack-CRUD exports; the sibling
 * PackEditorPanel component is stubbed to avoid pulling in templateGalleryService.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock services used directly by AdminStarterPacksPage
const mockFetchStarterPacks = vi.fn();
const mockUpdatePack = vi.fn();
const mockDeletePack = vi.fn();

vi.mock('../../../../src/services/marketplaceService', () => ({
  fetchStarterPacks: (...args) => mockFetchStarterPacks(...args),
  updatePack: (...args) => mockUpdatePack(...args),
  deletePack: (...args) => mockDeletePack(...args),
}));

// Stub the sibling editor panel — we don't test its internals here (it has its
// own suite via direct render once shipped; here we just need a visible marker
// when AdminStarterPacksPage opens the editor).
vi.mock('../../../../src/pages/Admin/PackEditorPanel', () => ({
  default: ({ packId, onClose }) => (
    <div data-testid="pack-editor-panel-stub">
      editor-mode:{String(packId)}
      <button type="button" onClick={onClose}>stub-close</button>
    </div>
  ),
}));

import AdminStarterPacksPage from '../../../../src/pages/Admin/AdminStarterPacksPage';

const PACKS = [
  { id: 'p-1', name: 'Restaurant Essentials', industry: 'restaurant', is_active: true,  display_order: 1, slug: 'restaurant-essentials' },
  { id: 'p-2', name: 'Retail Starter',        industry: 'retail',     is_active: false, display_order: 2, slug: 'retail-starter' },
];

const renderPage = (props = {}) =>
  render(<AdminStarterPacksPage showToast={vi.fn()} onNavigate={vi.fn()} {...props} />);

beforeEach(() => {
  mockFetchStarterPacks.mockReset();
  mockUpdatePack.mockReset();
  mockDeletePack.mockReset();
  mockFetchStarterPacks.mockResolvedValue(PACKS);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('AdminStarterPacksPage — list render', () => {
  it('fetches ALL packs including inactive (activeOnly:false)', async () => {
    renderPage();
    await waitFor(() => expect(mockFetchStarterPacks).toHaveBeenCalled());
    expect(mockFetchStarterPacks).toHaveBeenCalledWith(
      expect.objectContaining({ activeOnly: false })
    );
  });

  it('renders a row for each pack with its Name, Industry, and Display Order', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Restaurant Essentials')).toBeInTheDocument());
    expect(screen.getByText('Retail Starter')).toBeInTheDocument();
    expect(screen.getByText('restaurant')).toBeInTheDocument();
    expect(screen.getByText('retail')).toBeInTheDocument();
  });

  it('renders the "New pack" CTA button (UI-SPEC Copywriting)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /new pack/i })).toBeInTheDocument());
  });
});

describe('AdminStarterPacksPage — New pack opens editor in new mode', () => {
  it('clicking "New pack" mounts PackEditorPanel with packId="new"', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /new pack/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /new pack/i }));
    expect(screen.getByTestId('pack-editor-panel-stub')).toHaveTextContent('editor-mode:new');
  });
});

describe('AdminStarterPacksPage — Toggle Active row action', () => {
  it('calls updatePack(id, { is_active: !current }) when toggle is clicked', async () => {
    mockUpdatePack.mockResolvedValue({});
    renderPage();
    await waitFor(() => expect(screen.getByText('Restaurant Essentials')).toBeInTheDocument());

    // Restaurant Essentials is Active; clicking its badge toggles to inactive
    const activeBadge = screen.getAllByText(/^active$/i).find(
      (el) => el.tagName === 'BUTTON' || el.closest('button')
    );
    expect(activeBadge).toBeTruthy();
    fireEvent.click(activeBadge.tagName === 'BUTTON' ? activeBadge : activeBadge.closest('button'));

    await waitFor(() => expect(mockUpdatePack).toHaveBeenCalled());
    expect(mockUpdatePack).toHaveBeenCalledWith('p-1', { is_active: false });
  });
});

describe('AdminStarterPacksPage — Delete confirmation (UI-SPEC verbatim copy)', () => {
  it('row Delete button carries data-testid="delete-pack-<id>" (W-7 fix)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Restaurant Essentials')).toBeInTheDocument());
    expect(screen.getByTestId('delete-pack-p-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-pack-p-2')).toBeInTheDocument();
  });

  it('opens a confirmation with VERBATIM UI-SPEC copywriting', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-pack-p-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-pack-p-1'));

    // Title — quotes around pack name
    await waitFor(() =>
      expect(
        screen.getByText((_, node) => node?.textContent === 'Delete "Restaurant Essentials"?')
      ).toBeInTheDocument()
    );
    // Body — VERBATIM
    expect(
      screen.getByText(
        "This removes the pack but does not delete its templates or any scenes you've already created from it."
      )
    ).toBeInTheDocument();
    // Buttons — VERBATIM labels
    expect(screen.getByRole('button', { name: 'Keep pack' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete pack' })).toBeInTheDocument();
  });

  it('clicking "Delete pack" invokes deletePack(id)', async () => {
    mockDeletePack.mockResolvedValue(undefined);
    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-pack-p-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-pack-p-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete pack' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Delete pack' }));

    await waitFor(() => expect(mockDeletePack).toHaveBeenCalledWith('p-1'));
  });

  it('clicking "Keep pack" dismisses confirmation without calling deletePack', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('delete-pack-p-1')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('delete-pack-p-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Keep pack' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Keep pack' }));

    // deletePack must NOT have been called
    expect(mockDeletePack).not.toHaveBeenCalled();
  });
});
