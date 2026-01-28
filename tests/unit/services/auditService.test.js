/**
 * Audit Service Unit Tests
 * Phase 18: Tests for audit log service functions
 */
import { describe, it, expect } from 'vitest';
import {
  EVENT_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  SEVERITY_LEVELS,
  SYSTEM_SOURCES,
  getEventTypeLabel,
  getEntityTypeLabel,
} from '../../../src/services/auditService';

describe('auditService', () => {
  describe('getEventTypeLabel', () => {
    it('returns label for known event types', () => {
      expect(getEventTypeLabel('auth.login')).toBe('User Login');
      expect(getEventTypeLabel('user.created')).toBe('User Created');
      expect(getEventTypeLabel('screen.rebooted')).toBe('Screen Rebooted');
      expect(getEventTypeLabel('tenant.plan_changed')).toBe('Plan Changed');
    });

    it('returns event type as-is for unknown types', () => {
      expect(getEventTypeLabel('custom.event')).toBe('custom.event');
      expect(getEventTypeLabel('unknown_event')).toBe('unknown_event');
    });

    it('handles undefined and null gracefully', () => {
      expect(getEventTypeLabel(undefined)).toBe(undefined);
      expect(getEventTypeLabel(null)).toBe(null);
    });
  });

  describe('getEntityTypeLabel', () => {
    it('returns label for known entity types', () => {
      expect(getEntityTypeLabel('user')).toBe('User');
      expect(getEntityTypeLabel('tenant')).toBe('Tenant');
      expect(getEntityTypeLabel('screen')).toBe('Screen');
      expect(getEntityTypeLabel('campaign')).toBe('Campaign');
    });

    it('returns entity type as-is for unknown types', () => {
      expect(getEntityTypeLabel('custom_entity')).toBe('custom_entity');
    });
  });

  describe('EVENT_TYPE_LABELS', () => {
    it('has authentication event labels', () => {
      expect(EVENT_TYPE_LABELS['auth.login']).toBe('User Login');
      expect(EVENT_TYPE_LABELS['auth.logout']).toBe('User Logout');
      expect(EVENT_TYPE_LABELS['auth.password_reset']).toBe('Password Reset');
    });

    it('has user management event labels', () => {
      expect(EVENT_TYPE_LABELS['user.created']).toBe('User Created');
      expect(EVENT_TYPE_LABELS['user.updated']).toBe('User Updated');
      expect(EVENT_TYPE_LABELS['user.deleted']).toBe('User Deleted');
      expect(EVENT_TYPE_LABELS['user.disabled']).toBe('User Disabled');
    });

    it('has tenant management event labels', () => {
      expect(EVENT_TYPE_LABELS['tenant.created']).toBe('Tenant Created');
      expect(EVENT_TYPE_LABELS['tenant.suspended']).toBe('Tenant Suspended');
      expect(EVENT_TYPE_LABELS['tenant.plan_changed']).toBe('Plan Changed');
    });

    it('has screen management event labels', () => {
      expect(EVENT_TYPE_LABELS['screen.created']).toBe('Screen Created');
      expect(EVENT_TYPE_LABELS['screen.rebooted']).toBe('Screen Rebooted');
      expect(EVENT_TYPE_LABELS['screen.paired']).toBe('Screen Paired');
    });

    it('has content management event labels', () => {
      expect(EVENT_TYPE_LABELS['media.uploaded']).toBe('Media Uploaded');
      expect(EVENT_TYPE_LABELS['playlist.created']).toBe('Playlist Created');
      expect(EVENT_TYPE_LABELS['campaign.published']).toBe('Campaign Published');
    });

    it('has AI assistant event labels', () => {
      expect(EVENT_TYPE_LABELS['ai.query']).toBe('AI Query');
      expect(EVENT_TYPE_LABELS['ai.content_generated']).toBe('AI Content Generated');
    });

    it('has billing event labels', () => {
      expect(EVENT_TYPE_LABELS['subscription.created']).toBe('Subscription Created');
      expect(EVENT_TYPE_LABELS['payment.succeeded']).toBe('Payment Succeeded');
      expect(EVENT_TYPE_LABELS['payment.failed']).toBe('Payment Failed');
    });
  });

  describe('ENTITY_TYPE_LABELS', () => {
    it('has all expected entity type labels', () => {
      expect(ENTITY_TYPE_LABELS.user).toBe('User');
      expect(ENTITY_TYPE_LABELS.tenant).toBe('Tenant');
      expect(ENTITY_TYPE_LABELS.screen).toBe('Screen');
      expect(ENTITY_TYPE_LABELS.media).toBe('Media');
      expect(ENTITY_TYPE_LABELS.playlist).toBe('Playlist');
      expect(ENTITY_TYPE_LABELS.campaign).toBe('Campaign');
      expect(ENTITY_TYPE_LABELS.subscription).toBe('Subscription');
      expect(ENTITY_TYPE_LABELS.feature_flag).toBe('Feature Flag');
      expect(ENTITY_TYPE_LABELS.quota).toBe('Quota');
      expect(ENTITY_TYPE_LABELS.integration).toBe('Integration');
      expect(ENTITY_TYPE_LABELS.settings).toBe('Settings');
    });
  });

  describe('SEVERITY_LEVELS', () => {
    it('has all expected severity levels', () => {
      expect(SEVERITY_LEVELS.debug).toEqual({ label: 'Debug', color: 'gray' });
      expect(SEVERITY_LEVELS.info).toEqual({ label: 'Info', color: 'blue' });
      expect(SEVERITY_LEVELS.warning).toEqual({ label: 'Warning', color: 'yellow' });
      expect(SEVERITY_LEVELS.error).toEqual({ label: 'Error', color: 'red' });
      expect(SEVERITY_LEVELS.critical).toEqual({ label: 'Critical', color: 'purple' });
    });

    it('has 5 severity levels', () => {
      expect(Object.keys(SEVERITY_LEVELS)).toHaveLength(5);
    });
  });

  describe('SYSTEM_SOURCES', () => {
    it('has all expected system sources', () => {
      expect(SYSTEM_SOURCES.api).toEqual({ label: 'API', color: 'blue' });
      expect(SYSTEM_SOURCES.scheduler).toEqual({ label: 'Scheduler', color: 'purple' });
      expect(SYSTEM_SOURCES.system).toEqual({ label: 'System', color: 'gray' });
      expect(SYSTEM_SOURCES.admin).toEqual({ label: 'Admin', color: 'orange' });
      expect(SYSTEM_SOURCES.worker).toEqual({ label: 'Worker', color: 'green' });
    });

    it('has 5 system sources', () => {
      expect(Object.keys(SYSTEM_SOURCES)).toHaveLength(5);
    });
  });
});

describe('auditService constants completeness', () => {
  it('EVENT_TYPE_LABELS covers common audit scenarios', () => {
    const expectedCategories = ['auth', 'user', 'tenant', 'feature', 'quota', 'screen', 'media', 'playlist', 'campaign', 'ai', 'settings', 'integration', 'subscription', 'payment'];

    const hasCategory = (category) => {
      return Object.keys(EVENT_TYPE_LABELS).some(key => key.startsWith(category + '.'));
    };

    expectedCategories.forEach(category => {
      expect(hasCategory(category)).toBe(true);
    });
  });

  it('all severity levels have required properties', () => {
    Object.values(SEVERITY_LEVELS).forEach(level => {
      expect(level).toHaveProperty('label');
      expect(level).toHaveProperty('color');
      expect(typeof level.label).toBe('string');
      expect(typeof level.color).toBe('string');
    });
  });

  it('all system sources have required properties', () => {
    Object.values(SYSTEM_SOURCES).forEach(source => {
      expect(source).toHaveProperty('label');
      expect(source).toHaveProperty('color');
      expect(typeof source.label).toBe('string');
      expect(typeof source.color).toBe('string');
    });
  });
});
