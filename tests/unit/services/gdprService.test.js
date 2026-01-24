/**
 * Tests for GDPR Service
 * Phase 11: GDPR Compliance
 *
 * Verifies data export and account deletion service functions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock the logging service
vi.mock('../../../src/services/loggingService.js', () => ({
  createScopedLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { supabase } from '../../../src/supabase';
import {
  requestDataExport,
  getLatestExportStatus,
  requestAccountDeletion,
  cancelAccountDeletion,
  getDeletionStatus,
  DELETION_REASONS,
} from '../../../src/services/gdprService.js';

describe('gdprService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requestDataExport', () => {
    it('should call RPC with format parameter', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 'request-id-123', error: null });

      const result = await requestDataExport('json');

      expect(supabase.rpc).toHaveBeenCalledWith('request_data_export', { p_format: 'json' });
      expect(result.success).toBe(true);
      expect(result.requestId).toBe('request-id-123');
    });

    it('should default to json format', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 'request-id', error: null });

      await requestDataExport();

      expect(supabase.rpc).toHaveBeenCalledWith('request_data_export', { p_format: 'json' });
    });

    it('should support csv format', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: 'request-id-csv', error: null });

      const result = await requestDataExport('csv');

      expect(supabase.rpc).toHaveBeenCalledWith('request_data_export', { p_format: 'csv' });
      expect(result.success).toBe(true);
    });

    it('should return error on RPC failure', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Already pending' } });

      const result = await requestDataExport();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Already pending');
    });

    it('should handle thrown exceptions', async () => {
      supabase.rpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await requestDataExport();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getLatestExportStatus', () => {
    it('should return latest export request', async () => {
      const mockExport = {
        id: 'export-123',
        status: 'completed',
        format: 'json',
        created_at: '2026-01-24T00:00:00Z',
      };

      const singleMock = vi.fn().mockResolvedValueOnce({ data: mockExport, error: null });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({ select: selectMock });

      const result = await getLatestExportStatus();

      expect(supabase.from).toHaveBeenCalledWith('data_export_requests');
      expect(result).toEqual(mockExport);
    });

    it('should return null when no exports exist', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({ select: selectMock });

      const result = await getLatestExportStatus();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      const singleMock = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST500', message: 'Server error' },
      });
      const limitMock = vi.fn().mockReturnValue({ single: singleMock });
      const orderMock = vi.fn().mockReturnValue({ limit: limitMock });
      const selectMock = vi.fn().mockReturnValue({ order: orderMock });

      supabase.from.mockReturnValue({ select: selectMock });

      const result = await getLatestExportStatus();

      expect(result).toBeNull();
    });
  });

  describe('requestAccountDeletion', () => {
    it('should call RPC with reason and feedback', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 'deletion-id', error: null }) // request_account_deletion
        .mockResolvedValueOnce({ data: [{ days_remaining: 30, scheduled_deletion_at: '2026-02-23T00:00:00Z' }], error: null }); // get_deletion_status

      const result = await requestAccountDeletion({
        reason: 'privacy_concerns',
        feedback: 'Closing account',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('request_account_deletion', {
        p_reason: 'privacy_concerns',
        p_feedback: 'Closing account',
      });
      expect(result.success).toBe(true);
      expect(result.daysRemaining).toBe(30);
    });

    it('should handle null reason and feedback', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 'deletion-id', error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      await requestAccountDeletion({});

      expect(supabase.rpc).toHaveBeenCalledWith('request_account_deletion', {
        p_reason: null,
        p_feedback: null,
      });
    });

    it('should handle missing options', async () => {
      supabase.rpc
        .mockResolvedValueOnce({ data: 'deletion-id', error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      await requestAccountDeletion();

      expect(supabase.rpc).toHaveBeenCalledWith('request_account_deletion', {
        p_reason: null,
        p_feedback: null,
      });
    });

    it('should return error on RPC failure', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Request already exists' },
      });

      const result = await requestAccountDeletion({ reason: 'other' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request already exists');
    });

    it('should handle thrown exceptions', async () => {
      supabase.rpc.mockRejectedValueOnce(new Error('Connection timeout'));

      const result = await requestAccountDeletion({ reason: 'not_using' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should call RPC and return success', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: true, error: null });

      const result = await cancelAccountDeletion();

      expect(supabase.rpc).toHaveBeenCalledWith('cancel_account_deletion');
      expect(result.success).toBe(true);
    });

    it('should return error on failure', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'No request found' } });

      const result = await cancelAccountDeletion();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No request found');
    });

    it('should handle false return value', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: false, error: null });

      const result = await cancelAccountDeletion();

      expect(result.success).toBe(false);
    });

    it('should handle thrown exceptions', async () => {
      supabase.rpc.mockRejectedValueOnce(new Error('Auth error'));

      const result = await cancelAccountDeletion();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auth error');
    });
  });

  describe('getDeletionStatus', () => {
    it('should return deletion status from RPC', async () => {
      const mockStatus = {
        id: 'status-id',
        status: 'scheduled',
        scheduled_deletion_at: '2026-02-23T00:00:00Z',
        days_remaining: 30,
      };
      supabase.rpc.mockResolvedValueOnce({ data: [mockStatus], error: null });

      const result = await getDeletionStatus();

      expect(supabase.rpc).toHaveBeenCalledWith('get_deletion_status');
      expect(result).toEqual(mockStatus);
    });

    it('should return null when no pending deletion', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getDeletionStatus();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Error' } });

      const result = await getDeletionStatus();

      expect(result).toBeNull();
    });

    it('should return null on exception', async () => {
      supabase.rpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await getDeletionStatus();

      expect(result).toBeNull();
    });
  });

  describe('DELETION_REASONS', () => {
    it('should export array of reasons with id and label', () => {
      expect(Array.isArray(DELETION_REASONS)).toBe(true);
      expect(DELETION_REASONS.length).toBeGreaterThan(0);

      DELETION_REASONS.forEach((reason) => {
        expect(reason).toHaveProperty('id');
        expect(reason).toHaveProperty('label');
        expect(typeof reason.id).toBe('string');
        expect(typeof reason.label).toBe('string');
      });
    });

    it('should include privacy_concerns reason', () => {
      const privacyReason = DELETION_REASONS.find((r) => r.id === 'privacy_concerns');
      expect(privacyReason).toBeDefined();
      expect(privacyReason.label).toContain('Privacy');
    });

    it('should include not_using reason', () => {
      const notUsingReason = DELETION_REASONS.find((r) => r.id === 'not_using');
      expect(notUsingReason).toBeDefined();
    });

    it('should include other reason', () => {
      const otherReason = DELETION_REASONS.find((r) => r.id === 'other');
      expect(otherReason).toBeDefined();
    });

    it('should have unique IDs', () => {
      const ids = DELETION_REASONS.map((r) => r.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });
  });

  describe('API function exports', () => {
    it('exports all required GDPR functions', async () => {
      const gdprService = await import('../../../src/services/gdprService.js');

      expect(typeof gdprService.requestDataExport).toBe('function');
      expect(typeof gdprService.getDataExportRequests).toBe('function');
      expect(typeof gdprService.getLatestExportStatus).toBe('function');
      expect(typeof gdprService.downloadExport).toBe('function');
      expect(typeof gdprService.generateClientSideExport).toBe('function');
      expect(typeof gdprService.downloadClientSideExport).toBe('function');
      expect(typeof gdprService.getExportData).toBe('function');
      expect(typeof gdprService.downloadExportAsFile).toBe('function');
      expect(typeof gdprService.requestAccountDeletion).toBe('function');
      expect(typeof gdprService.cancelAccountDeletion).toBe('function');
      expect(typeof gdprService.getDeletionStatus).toBe('function');
      expect(typeof gdprService.getDeletionHistory).toBe('function');
      expect(Array.isArray(gdprService.DELETION_REASONS)).toBe(true);
    });
  });
});
