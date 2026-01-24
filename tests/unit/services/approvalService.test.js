/**
 * Approval Service Unit Tests
 * Phase 12: Tests for content approval workflow
 *
 * Tests approval workflow functions to verify:
 * - APR-01: Content submission (requestApproval for playlist/scene)
 * - APR-02: Review queue (getOpenReviewForResource, fetchOpenReviews)
 * - APR-03: Approve/reject (approveReview, rejectReview)
 * - APR-05: Email notifications on decisions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock email service
vi.mock('../../../src/services/emailService.js', () => ({
  sendApprovalRequestEmail: vi.fn().mockResolvedValue({ success: true }),
  sendApprovalDecisionEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock loggingService
vi.mock('../../../src/services/loggingService.js', () => ({
  createScopedLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock window.location for URL generation
const mockWindowLocation = {
  origin: 'https://app.bizscreen.com',
};
vi.stubGlobal('window', { location: mockWindowLocation });

describe('approvalService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('RESOURCE_TYPES', () => {
    it('includes scene resource type', async () => {
      const { RESOURCE_TYPES } = await import('../../../src/services/approvalService');
      expect(RESOURCE_TYPES.SCENE).toBe('scene');
    });

    it('includes all content types', async () => {
      const { RESOURCE_TYPES } = await import('../../../src/services/approvalService');
      expect(RESOURCE_TYPES).toEqual({
        PLAYLIST: 'playlist',
        LAYOUT: 'layout',
        CAMPAIGN: 'campaign',
        SCENE: 'scene',
      });
    });
  });

  describe('APPROVAL_STATUS', () => {
    it('exports all approval statuses', async () => {
      const { APPROVAL_STATUS } = await import('../../../src/services/approvalService');
      expect(APPROVAL_STATUS).toEqual({
        DRAFT: 'draft',
        IN_REVIEW: 'in_review',
        APPROVED: 'approved',
        REJECTED: 'rejected',
      });
    });
  });

  describe('REVIEW_STATUS', () => {
    it('exports all review statuses', async () => {
      const { REVIEW_STATUS } = await import('../../../src/services/approvalService');
      expect(REVIEW_STATUS).toEqual({
        OPEN: 'open',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
      });
    });
  });

  describe('requestApproval', () => {
    it('creates review request for playlist', async () => {
      const { supabase } = await import('../../../src/supabase');
      const userId = 'user-1';
      const playlistId = 'playlist-1';

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: userId, managed_tenant_id: 'tenant-1', full_name: 'Test User' },
              error: null,
            }),
          };
        }
        if (table === 'review_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'review-1', status: 'open', resource_type: 'playlist' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'playlists') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { requestApproval } = await import('../../../src/services/approvalService');
      const result = await requestApproval({
        resourceType: 'playlist',
        resourceId: playlistId,
        title: 'Review my playlist',
      });

      expect(result.status).toBe('open');
      expect(result.resource_type).toBe('playlist');
    });

    it('creates review request for scene', async () => {
      const { supabase } = await import('../../../src/supabase');
      const userId = 'user-1';
      const sceneId = 'scene-1';

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: userId } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: userId, managed_tenant_id: 'tenant-1', full_name: 'Test User' },
              error: null,
            }),
          };
        }
        if (table === 'review_requests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'review-1', resource_type: 'scene', status: 'open' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'scenes') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { requestApproval } = await import('../../../src/services/approvalService');
      const result = await requestApproval({
        resourceType: 'scene',
        resourceId: sceneId,
        title: 'Review my scene',
      });

      expect(result.resource_type).toBe('scene');
    });

    it('throws error when user is not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { requestApproval } = await import('../../../src/services/approvalService');

      await expect(
        requestApproval({
          resourceType: 'playlist',
          resourceId: 'playlist-1',
          title: 'Test',
        })
      ).rejects.toThrow('User must be authenticated');
    });
  });

  describe('approveReview', () => {
    it('updates review and resource status to approved', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { sendApprovalDecisionEmail } = await import('../../../src/services/emailService.js');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'approver-1' } } });

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'review-1', status: 'approved' },
              error: null,
            }),
          }),
        }),
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'review_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'review-1',
                    resource_type: 'playlist',
                    resource_id: 'playlist-1',
                    title: 'My Playlist',
                    requester: { email: 'creator@test.com', full_name: 'Creator' },
                  },
                  error: null,
                }),
              }),
            }),
            update: mockUpdateFn,
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Approver' },
              error: null,
            }),
          };
        }
        if (table === 'playlists') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { approveReview } = await import('../../../src/services/approvalService');
      const result = await approveReview('review-1', { comment: 'Looks good!' });

      expect(result.status).toBe('approved');
      expect(mockUpdateFn).toHaveBeenCalled();
    });

    it('sends email notification on approval', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { sendApprovalDecisionEmail } = await import('../../../src/services/emailService.js');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'approver-1' } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'review_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'review-1',
                    resource_type: 'playlist',
                    resource_id: 'playlist-1',
                    title: 'My Playlist',
                    requester: { email: 'creator@test.com', full_name: 'Creator' },
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'review-1', status: 'approved' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Approver' },
              error: null,
            }),
          };
        }
        if (table === 'playlists') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { approveReview } = await import('../../../src/services/approvalService');
      await approveReview('review-1', { comment: 'Approved!' });

      // Wait for async email to be attempted
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendApprovalDecisionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'creator@test.com',
          decision: 'approved',
        })
      );
    });

    it('throws error when user is not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { approveReview } = await import('../../../src/services/approvalService');

      await expect(approveReview('review-1')).rejects.toThrow('User must be authenticated');
    });
  });

  describe('rejectReview', () => {
    it('throws error if comment is empty', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'reviewer-1' } } });

      const { rejectReview } = await import('../../../src/services/approvalService');

      await expect(rejectReview('review-1', { comment: '' })).rejects.toThrow(
        'A comment is required when rejecting'
      );
    });

    it('throws error if comment is not provided', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'reviewer-1' } } });

      const { rejectReview } = await import('../../../src/services/approvalService');

      await expect(rejectReview('review-1', {})).rejects.toThrow(
        'A comment is required when rejecting'
      );
    });

    it('sends email notification on rejection with feedback', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { sendApprovalDecisionEmail } = await import('../../../src/services/emailService.js');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'reviewer-1' } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'review_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'review-1',
                    resource_type: 'playlist',
                    resource_id: 'playlist-1',
                    title: 'My Playlist',
                    requester: { email: 'creator@test.com', full_name: 'Creator' },
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'review-1', status: 'rejected' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Reviewer' },
              error: null,
            }),
          };
        }
        if (table === 'playlists') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { rejectReview } = await import('../../../src/services/approvalService');
      await rejectReview('review-1', { comment: 'Needs more content' });

      // Wait for async email to be attempted
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(sendApprovalDecisionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'creator@test.com',
          decision: 'rejected',
          feedback: 'Needs more content',
        })
      );
    });

    it('updates review and resource status to rejected', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'reviewer-1' } } });

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'review-1', status: 'rejected' },
              error: null,
            }),
          }),
        }),
      });

      supabase.from.mockImplementation((table) => {
        if (table === 'review_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'review-1',
                    resource_type: 'scene',
                    resource_id: 'scene-1',
                    title: 'My Scene',
                    requester: { email: 'creator@test.com', full_name: 'Creator' },
                  },
                  error: null,
                }),
              }),
            }),
            update: mockUpdateFn,
          };
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { full_name: 'Reviewer' },
              error: null,
            }),
          };
        }
        if (table === 'scenes') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { rejectReview } = await import('../../../src/services/approvalService');
      const result = await rejectReview('review-1', { comment: 'Please fix issues' });

      expect(result.status).toBe('rejected');
    });
  });

  describe('getOpenReviewForResource', () => {
    it('returns null when no open review exists', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // No rows
        }),
      });

      const { getOpenReviewForResource } = await import('../../../src/services/approvalService');
      const result = await getOpenReviewForResource('playlist', 'playlist-1');

      expect(result).toBeNull();
    });

    it('returns existing open review', async () => {
      const { supabase } = await import('../../../src/supabase');
      const review = { id: 'review-1', status: 'open', resource_type: 'scene' };

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: review, error: null }),
      });

      const { getOpenReviewForResource } = await import('../../../src/services/approvalService');
      const result = await getOpenReviewForResource('scene', 'scene-1');

      expect(result).toEqual(review);
    });

    it('throws error on database errors (not no-rows)', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST500', message: 'Database error' },
        }),
      });

      const { getOpenReviewForResource } = await import('../../../src/services/approvalService');

      await expect(getOpenReviewForResource('playlist', 'playlist-1')).rejects.toThrow();
    });
  });

  describe('fetchOpenReviews', () => {
    it('fetches open reviews by default', async () => {
      const { supabase } = await import('../../../src/supabase');
      const reviews = [
        { id: 'review-1', status: 'open', resource_type: 'playlist' },
        { id: 'review-2', status: 'open', resource_type: 'scene' },
      ];

      // Create a chainable query mock that resolves with data when awaited
      const createChainableMock = (resolveData) => {
        const chainable = {
          select: vi.fn(() => chainable),
          order: vi.fn(() => chainable),
          eq: vi.fn(() => chainable),
          then: (resolve) => resolve(resolveData),
        };
        return chainable;
      };

      supabase.from.mockReturnValue(
        createChainableMock({ data: reviews, error: null })
      );

      const { fetchOpenReviews } = await import('../../../src/services/approvalService');
      const result = await fetchOpenReviews();

      expect(result).toEqual(reviews);
    });

    it('filters by resource type when provided', async () => {
      const { supabase } = await import('../../../src/supabase');
      const reviews = [{ id: 'review-1', status: 'open', resource_type: 'scene' }];

      const mockEq = vi.fn();
      const createChainableMock = (resolveData) => {
        const chainable = {
          select: vi.fn(() => chainable),
          order: vi.fn(() => chainable),
          eq: mockEq.mockImplementation(() => chainable),
          then: (resolve) => resolve(resolveData),
        };
        return chainable;
      };

      supabase.from.mockReturnValue(
        createChainableMock({ data: reviews, error: null })
      );

      const { fetchOpenReviews } = await import('../../../src/services/approvalService');
      await fetchOpenReviews({ resourceType: 'scene' });

      // eq should be called for both status and resourceType
      expect(mockEq).toHaveBeenCalled();
    });
  });

  describe('cancelApproval', () => {
    it('updates review status to cancelled', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'review_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'review-1', resource_type: 'playlist', resource_id: 'playlist-1' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'review-1', status: 'cancelled' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'playlists') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const { cancelApproval } = await import('../../../src/services/approvalService');
      const result = await cancelApproval('review-1');

      expect(result.status).toBe('cancelled');
    });

    it('throws error when user is not authenticated', async () => {
      const { supabase } = await import('../../../src/supabase');
      supabase.auth.getUser.mockResolvedValue({ data: { user: null } });

      const { cancelApproval } = await import('../../../src/services/approvalService');

      await expect(cancelApproval('review-1')).rejects.toThrow('User must be authenticated');
    });
  });

  describe('revertToDraft', () => {
    it('resets resource to draft status', async () => {
      const { supabase } = await import('../../../src/supabase');

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      supabase.from.mockReturnValue({
        update: mockUpdateFn,
      });

      const { revertToDraft } = await import('../../../src/services/approvalService');
      const result = await revertToDraft('scene', 'scene-1');

      expect(result).toBe(true);
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          approval_status: 'draft',
          approval_requested_by: null,
          approval_requested_at: null,
          approval_decided_by: null,
          approval_decided_at: null,
          approval_comment: null,
        })
      );
    });

    it('throws error on database failure', async () => {
      const { supabase } = await import('../../../src/supabase');

      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }),
      });

      const { revertToDraft } = await import('../../../src/services/approvalService');

      await expect(revertToDraft('playlist', 'playlist-1')).rejects.toThrow();
    });
  });

  describe('getApprovalStatusConfig', () => {
    it('returns config for draft status', async () => {
      const { getApprovalStatusConfig } = await import('../../../src/services/approvalService');
      const config = getApprovalStatusConfig('draft');

      expect(config.label).toBe('Draft');
      expect(config.color).toBe('gray');
    });

    it('returns config for in_review status', async () => {
      const { getApprovalStatusConfig } = await import('../../../src/services/approvalService');
      const config = getApprovalStatusConfig('in_review');

      expect(config.label).toBe('In Review');
      expect(config.color).toBe('yellow');
    });

    it('returns config for approved status', async () => {
      const { getApprovalStatusConfig } = await import('../../../src/services/approvalService');
      const config = getApprovalStatusConfig('approved');

      expect(config.label).toBe('Approved');
      expect(config.color).toBe('green');
    });

    it('returns config for rejected status', async () => {
      const { getApprovalStatusConfig } = await import('../../../src/services/approvalService');
      const config = getApprovalStatusConfig('rejected');

      expect(config.label).toBe('Rejected');
      expect(config.color).toBe('red');
    });

    it('returns draft config for unknown status', async () => {
      const { getApprovalStatusConfig } = await import('../../../src/services/approvalService');
      const config = getApprovalStatusConfig('unknown');

      expect(config.label).toBe('Draft');
    });
  });

  describe('API function exports', () => {
    it('exports all required approval functions', async () => {
      const approvalService = await import('../../../src/services/approvalService');

      // Constants
      expect(approvalService.APPROVAL_STATUS).toBeDefined();
      expect(approvalService.REVIEW_STATUS).toBeDefined();
      expect(approvalService.RESOURCE_TYPES).toBeDefined();

      // Core functions
      expect(typeof approvalService.requestApproval).toBe('function');
      expect(typeof approvalService.cancelApproval).toBe('function');
      expect(typeof approvalService.approveReview).toBe('function');
      expect(typeof approvalService.rejectReview).toBe('function');
      expect(typeof approvalService.revertToDraft).toBe('function');

      // Query functions
      expect(typeof approvalService.fetchOpenReviews).toBe('function');
      expect(typeof approvalService.fetchReviews).toBe('function');
      expect(typeof approvalService.fetchReview).toBe('function');
      expect(typeof approvalService.getOpenReviewForResource).toBe('function');
      expect(typeof approvalService.getReviewHistory).toBe('function');

      // Helpers
      expect(typeof approvalService.getApprovalStatusConfig).toBe('function');
      expect(typeof approvalService.addReviewComment).toBe('function');
    });
  });
});
