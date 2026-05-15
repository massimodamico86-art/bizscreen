import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminTemplateQueuePage from '../../../../src/pages/Admin/AdminTemplateQueuePage';

const SAMPLE_DRAFT = {
  id: 'draft-fixture-1',
  svg_content:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#1f2937"/><text id="title" x="960" y="540" fill="#ffffff" font-family="sans-serif" font-size="96" text-anchor="middle">Hello</text></svg>',
  prompt: 'Test prompt for fixture draft',
  source: 'ai_generation',
  status: 'pending',
  vertical: null,
  metadata: { template_type: 'announcement', attempt_count: 1 },
  created_at: '2026-05-07T00:00:00Z',
};

vi.mock('../../../../src/services/aiTemplate/templateDraftsService', () => ({
  fetchPendingDrafts: vi.fn(),
  approveDraft: vi.fn(),
  rejectDraft: vi.fn(),
  generateDraft: vi.fn(),
  saveDraftSvgContent: vi.fn(),
}));

import * as service from '../../../../src/services/aiTemplate/templateDraftsService';

describe('AdminTemplateQueuePage — smoke (177-05)', () => {
  beforeEach(() => {
    service.fetchPendingDrafts.mockReset().mockResolvedValue([]);
    service.approveDraft.mockReset();
    service.rejectDraft.mockReset();
    service.generateDraft.mockReset();
    service.saveDraftSvgContent.mockReset();
  });

  it('renders the page shell with both tabs and an empty Pending list', async () => {
    render(<AdminTemplateQueuePage showToast={vi.fn()} onNavigate={() => {}} />);
    expect(screen.getByText('Template Queue')).toBeTruthy();
    expect(screen.getByTestId('tab-pending')).toBeTruthy();
    expect(screen.getByTestId('tab-generate')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText(/No pending drafts/i)).toBeTruthy()
    );
  });

  it('Generate tab renders the OptiSigns-style form + card grid (Plan 05)', async () => {
    render(<AdminTemplateQueuePage showToast={vi.fn()} onNavigate={() => {}} />);
    fireEvent.click(screen.getByTestId('tab-generate'));
    // Form surfaces
    await waitFor(() =>
      expect(screen.getByTestId('generate-tab')).toBeTruthy()
    );
    expect(screen.getByTestId('gen-vertical')).toBeTruthy();
    expect(screen.getByTestId('gen-type')).toBeTruthy();
    expect(screen.getByTestId('gen-prompt-textarea')).toBeTruthy();
    expect(screen.getByTestId('gen-submit')).toBeTruthy();
    // Card grid + at least one card per template_type.
    // promptLibrary contains multiple entries per template_type (cross-vertical
    // + per-vertical variants), so each `prompt-card-<type>` test-id renders
    // multiple times. Assert "at least one" via getAllByTestId instead of
    // single getByTestId — the contract is that each named template_type is
    // represented in the grid, not that there is exactly one card for it.
    expect(screen.getByTestId('prompt-card-grid')).toBeTruthy();
    for (const type of ['menu', 'promo', 'announcement', 'reminder', 'wayfinding', 'health_tip']) {
      expect(screen.getAllByTestId(`prompt-card-${type}`).length).toBeGreaterThan(0);
    }
  });

  it('Picking a card pre-fills the form (template_type + prompt)', async () => {
    render(<AdminTemplateQueuePage showToast={vi.fn()} onNavigate={() => {}} />);
    fireEvent.click(screen.getByTestId('tab-generate'));
    await waitFor(() =>
      expect(screen.getAllByTestId('prompt-card-promo').length).toBeGreaterThan(0)
    );
    // First matching card (the cross-vertical promo entry — first in the
    // promptLibrary array) is sufficient; we only need to prove that picking
    // any promo card pre-fills the form to template_type='promo'.
    fireEvent.click(screen.getAllByTestId('prompt-card-promo')[0]);
    const typeSelect = screen.getByTestId('gen-type');
    expect(typeSelect.value).toBe('promo');
    const prompt = screen.getByTestId('gen-prompt-textarea');
    expect(String(prompt.value).length).toBeGreaterThan(0);
  });

  it('Edit button opens the inline TemplateDraftEditModal (D-04 OVERRIDE)', async () => {
    service.fetchPendingDrafts.mockResolvedValue([SAMPLE_DRAFT]);
    render(<AdminTemplateQueuePage showToast={vi.fn()} onNavigate={() => {}} />);
    await waitFor(() => expect(screen.getByTestId('btn-edit')).toBeTruthy());
    fireEvent.click(screen.getByTestId('btn-edit'));
    await waitFor(() => expect(screen.getByTestId('edit-draft-modal')).toBeTruthy());
    // Read-only metadata + editable textarea + Save & Publish CTA all present.
    expect(screen.getByTestId('edit-draft-metadata')).toBeTruthy();
    expect(screen.getByTestId('edit-svg-textarea')).toBeTruthy();
    expect(screen.getByTestId('btn-save-publish')).toBeTruthy();
    expect(screen.getByTestId('btn-revalidate')).toBeTruthy();
    // Cancel closes the modal.
    fireEvent.click(screen.getByTestId('btn-edit-cancel'));
    await waitFor(() =>
      expect(screen.queryByTestId('edit-draft-modal')).toBeNull()
    );
  });
});
