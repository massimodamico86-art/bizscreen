/**
 * Content Resolution Integration Tests
 *
 * Tests the content priority system:
 * Active Campaign > Schedule Entry > Default Playlist
 *
 * These tests validate the content resolution logic that determines
 * what content should play on a screen at any given time.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTestScreen,
  createTestPlaylist,
  createTestCampaign,
  createTestSchedule,
  createTestLayout,
  generateUUID
} from '../../utils/factories';

/**
 * Content Resolution Service
 *
 * Determines what content should play on a screen based on priority:
 * 1. Active Campaign (highest priority)
 * 2. Current Schedule time block
 * 3. Assigned Layout
 * 4. Default Playlist (lowest priority)
 */
class ContentResolutionService {
  constructor() {
    this.campaigns = new Map();
    this.schedules = new Map();
    this.layouts = new Map();
    this.playlists = new Map();
    this.screens = new Map();
  }

  /**
   * Add a campaign to the system
   */
  addCampaign(campaign) {
    this.campaigns.set(campaign.id, campaign);
  }

  /**
   * Add a schedule to the system
   */
  addSchedule(schedule) {
    this.schedules.set(schedule.id, schedule);
  }

  /**
   * Add a layout to the system
   */
  addLayout(layout) {
    this.layouts.set(layout.id, layout);
  }

  /**
   * Add a playlist to the system
   */
  addPlaylist(playlist) {
    this.playlists.set(playlist.id, playlist);
  }

  /**
   * Add a screen to the system
   */
  addScreen(screen) {
    this.screens.set(screen.id, screen);
  }

  /**
   * Check if a campaign is currently active
   */
  isCampaignActive(campaign, currentTime = new Date()) {
    if (campaign.status !== 'active') return false;

    const now = currentTime.getTime();
    const startDate = campaign.start_date ? new Date(campaign.start_date).getTime() : 0;
    const endDate = campaign.end_date ? new Date(campaign.end_date).getTime() : Infinity;

    // Check date range
    if (now < startDate || now > endDate) return false;

    // Check day of week if specified (using UTC for consistency)
    if (campaign.days_of_week && campaign.days_of_week.length > 0) {
      const dayOfWeek = currentTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
      if (!campaign.days_of_week.includes(dayOfWeek)) return false;
    }

    // Check time range if specified (using UTC for consistency)
    if (campaign.start_time && campaign.end_time) {
      const currentMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();
      const [startH, startM] = campaign.start_time.split(':').map(Number);
      const [endH, endM] = campaign.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes < startMinutes || currentMinutes >= endMinutes) return false;
    }

    return true;
  }

  /**
   * Get active campaigns for a screen, sorted by priority
   */
  getActiveCampaignsForScreen(screenId, currentTime = new Date()) {
    const screen = this.screens.get(screenId);
    if (!screen) return [];

    const activeCampaigns = [];

    for (const campaign of this.campaigns.values()) {
      // Check if campaign targets this screen
      const targetsScreen = campaign.screen_ids?.includes(screenId) ||
        campaign.screen_group_ids?.some(gid => screen.group_ids?.includes(gid)) ||
        campaign.target_all_screens;

      if (targetsScreen && this.isCampaignActive(campaign, currentTime)) {
        activeCampaigns.push(campaign);
      }
    }

    // Sort by priority (higher priority first)
    return activeCampaigns.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Find the current schedule time block
   */
  getCurrentScheduleBlock(scheduleId, currentTime = new Date()) {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.time_blocks) return null;

    // Use UTC for consistent time handling in tests
    const currentMinutes = currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes();
    const dayOfWeek = currentTime.getUTCDay();

    for (const block of schedule.time_blocks) {
      // Check day of week if specified
      if (block.days_of_week && block.days_of_week.length > 0) {
        if (!block.days_of_week.includes(dayOfWeek)) continue;
      }

      // Check time range
      const [startH, startM] = block.start_time.split(':').map(Number);
      const [endH, endM] = block.end_time.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return block;
      }
    }

    return null;
  }

  /**
   * Resolve content for a screen
   * Returns: { type: 'campaign'|'schedule'|'layout'|'playlist'|'empty', content: {...}, priority: number }
   */
  resolveContent(screenId, currentTime = new Date()) {
    const screen = this.screens.get(screenId);
    if (!screen) {
      return { type: 'empty', content: null, priority: 0, reason: 'Screen not found' };
    }

    // Priority 1: Active Campaign
    const activeCampaigns = this.getActiveCampaignsForScreen(screenId, currentTime);
    if (activeCampaigns.length > 0) {
      const campaign = activeCampaigns[0]; // Highest priority
      return {
        type: 'campaign',
        content: campaign,
        priority: 100 + (campaign.priority || 0),
        reason: 'Active campaign'
      };
    }

    // Priority 2: Schedule
    if (screen.schedule_id) {
      const scheduleBlock = this.getCurrentScheduleBlock(screen.schedule_id, currentTime);
      if (scheduleBlock) {
        return {
          type: 'schedule',
          content: scheduleBlock,
          priority: 50,
          reason: 'Current schedule block'
        };
      }
    }

    // Priority 3: Layout
    if (screen.layout_id) {
      const layout = this.layouts.get(screen.layout_id);
      if (layout) {
        return {
          type: 'layout',
          content: layout,
          priority: 25,
          reason: 'Assigned layout'
        };
      }
    }

    // Priority 4: Default Playlist
    if (screen.playlist_id) {
      const playlist = this.playlists.get(screen.playlist_id);
      if (playlist) {
        return {
          type: 'playlist',
          content: playlist,
          priority: 10,
          reason: 'Default playlist'
        };
      }
    }

    // No content assigned
    return { type: 'empty', content: null, priority: 0, reason: 'No content assigned' };
  }

  /**
   * Select content from campaign based on weights
   */
  selectWeightedContent(campaign) {
    if (!campaign.contents || campaign.contents.length === 0) {
      return null;
    }

    const totalWeight = campaign.contents.reduce((sum, c) => sum + (c.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const content of campaign.contents) {
      random -= (content.weight || 1);
      if (random <= 0) {
        return content;
      }
    }

    return campaign.contents[0]; // Fallback
  }
}

describe('Content Resolution', () => {
  let service;
  let fixedTime;

  beforeEach(() => {
    service = new ContentResolutionService();
    // Fixed time: Wednesday Jan 15, 2024 at 14:30 (2:30 PM)
    fixedTime = new Date('2024-01-15T14:30:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Priority System', () => {
    it('campaign overrides schedule when active', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();
      const scheduleId = generateUUID();
      const campaignId = generateUUID();

      // Set up screen with schedule and playlist
      service.addScreen(createTestScreen({
        id: screenId,
        playlist_id: playlistId,
        schedule_id: scheduleId
      }));

      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default Playlist' }));

      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [{
          id: 'block-1',
          start_time: '00:00',
          end_time: '23:59',
          playlist_id: 'schedule-playlist'
        }]
      }));

      // Add active campaign targeting this screen
      service.addCampaign(createTestCampaign({
        id: campaignId,
        name: 'Priority Campaign',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString(),
        end_date: new Date('2024-12-31').toISOString()
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('campaign');
      expect(result.content.name).toBe('Priority Campaign');
      expect(result.priority).toBeGreaterThan(50); // Higher than schedule
    });

    it('schedule overrides playlist when time block matches', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();
      const scheduleId = generateUUID();
      const schedulePlaylistId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        playlist_id: playlistId,
        schedule_id: scheduleId
      }));

      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default Playlist' }));
      service.addPlaylist(createTestPlaylist({ id: schedulePlaylistId, name: 'Schedule Playlist' }));

      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [{
          id: 'afternoon-block',
          start_time: '12:00',
          end_time: '18:00',
          playlist_id: schedulePlaylistId
        }]
      }));

      const result = service.resolveContent(screenId, fixedTime); // 14:30

      expect(result.type).toBe('schedule');
      expect(result.content.id).toBe('afternoon-block');
      expect(result.priority).toBe(50);
    });

    it('default playlist returned when no campaign or schedule matches', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();
      const scheduleId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        playlist_id: playlistId,
        schedule_id: scheduleId
      }));

      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default Playlist' }));

      // Schedule with no matching time block for 14:30
      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [{
          id: 'evening-block',
          start_time: '18:00',
          end_time: '23:00',
          playlist_id: 'evening-playlist'
        }]
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('playlist');
      expect(result.content.name).toBe('Default Playlist');
      expect(result.priority).toBe(10);
    });

    it('higher priority campaign wins over lower priority', () => {
      const screenId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId }));

      // Low priority campaign
      service.addCampaign(createTestCampaign({
        id: 'campaign-low',
        name: 'Low Priority',
        status: 'active',
        priority: 5,
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString()
      }));

      // High priority campaign
      service.addCampaign(createTestCampaign({
        id: 'campaign-high',
        name: 'High Priority',
        status: 'active',
        priority: 100,
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString()
      }));

      // Medium priority campaign
      service.addCampaign(createTestCampaign({
        id: 'campaign-medium',
        name: 'Medium Priority',
        status: 'active',
        priority: 50,
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString()
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('campaign');
      expect(result.content.name).toBe('High Priority');
    });

    it('layout used when no schedule block matches', () => {
      const screenId = generateUUID();
      const layoutId = generateUUID();
      const scheduleId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        layout_id: layoutId,
        schedule_id: scheduleId
      }));

      service.addLayout(createTestLayout({ id: layoutId, name: 'Main Layout' }));

      // Schedule with no matching time block
      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [{
          id: 'night-block',
          start_time: '22:00',
          end_time: '06:00',
          playlist_id: 'night-playlist'
        }]
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('layout');
      expect(result.content.name).toBe('Main Layout');
      expect(result.priority).toBe(25);
    });
  });

  describe('Campaign Scheduling', () => {
    it('expired campaign (end_date past) not returned', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId, playlist_id: playlistId }));
      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default' }));

      service.addCampaign(createTestCampaign({
        id: 'expired-campaign',
        name: 'Expired Campaign',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2023-01-01').toISOString(),
        end_date: new Date('2023-12-31').toISOString() // Ended in 2023
      }));

      const result = service.resolveContent(screenId, fixedTime); // Jan 2024

      expect(result.type).toBe('playlist'); // Falls back to playlist
      expect(result.content.name).toBe('Default');
    });

    it('future campaign (start_date future) not returned', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId, playlist_id: playlistId }));
      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default' }));

      service.addCampaign(createTestCampaign({
        id: 'future-campaign',
        name: 'Future Campaign',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2025-01-01').toISOString() // Starts in 2025
      }));

      const result = service.resolveContent(screenId, fixedTime); // Jan 2024

      expect(result.type).toBe('playlist');
    });

    it('campaign outside time window not active', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId, playlist_id: playlistId }));
      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default' }));

      service.addCampaign(createTestCampaign({
        id: 'morning-campaign',
        name: 'Morning Only',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString(),
        start_time: '08:00',
        end_time: '12:00' // 8am - 12pm only
      }));

      // Current time is 14:30 (2:30 PM)
      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('playlist'); // Outside time window
    });

    it('campaign within time window is active', () => {
      const screenId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId }));

      service.addCampaign(createTestCampaign({
        id: 'afternoon-campaign',
        name: 'Afternoon Campaign',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString(),
        start_time: '12:00',
        end_time: '18:00' // 12pm - 6pm
      }));

      // Current time is 14:30 (2:30 PM) - within range
      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('campaign');
      expect(result.content.name).toBe('Afternoon Campaign');
    });

    it('campaign respects day of week settings', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId, playlist_id: playlistId }));
      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default' }));

      // fixedTime is Wednesday (day 3)
      service.addCampaign(createTestCampaign({
        id: 'weekend-campaign',
        name: 'Weekend Only',
        status: 'active',
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString(),
        days_of_week: [0, 6] // Sunday and Saturday only
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('playlist'); // Not active on Wednesday
    });

    it('draft campaign not active regardless of dates', () => {
      const screenId = generateUUID();
      const playlistId = generateUUID();

      service.addScreen(createTestScreen({ id: screenId, playlist_id: playlistId }));
      service.addPlaylist(createTestPlaylist({ id: playlistId, name: 'Default' }));

      service.addCampaign(createTestCampaign({
        id: 'draft-campaign',
        name: 'Draft Campaign',
        status: 'draft', // Not active
        screen_ids: [screenId],
        start_date: new Date('2024-01-01').toISOString()
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('playlist');
    });
  });

  describe('Schedule Time Block Resolution', () => {
    it('correct time block selected based on current time', () => {
      const scheduleId = generateUUID();

      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [
          { id: 'morning', start_time: '06:00', end_time: '12:00', playlist_id: 'morning-playlist' },
          { id: 'afternoon', start_time: '12:00', end_time: '18:00', playlist_id: 'afternoon-playlist' },
          { id: 'evening', start_time: '18:00', end_time: '23:00', playlist_id: 'evening-playlist' }
        ]
      }));

      // Test at 14:30 (2:30 PM)
      const block = service.getCurrentScheduleBlock(scheduleId, fixedTime);
      expect(block.id).toBe('afternoon');

      // Test at 08:00
      const morningTime = new Date('2024-01-15T08:00:00Z');
      const morningBlock = service.getCurrentScheduleBlock(scheduleId, morningTime);
      expect(morningBlock.id).toBe('morning');

      // Test at 20:00
      const eveningTime = new Date('2024-01-15T20:00:00Z');
      const eveningBlock = service.getCurrentScheduleBlock(scheduleId, eveningTime);
      expect(eveningBlock.id).toBe('evening');
    });

    it('returns null when no time block matches', () => {
      const scheduleId = generateUUID();

      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [
          { id: 'business-hours', start_time: '09:00', end_time: '17:00', playlist_id: 'work-playlist' }
        ]
      }));

      // Test at 05:00 (before business hours)
      const earlyTime = new Date('2024-01-15T05:00:00Z');
      const block = service.getCurrentScheduleBlock(scheduleId, earlyTime);
      expect(block).toBeNull();
    });

    it('schedule block respects day of week', () => {
      const scheduleId = generateUUID();

      service.addSchedule(createTestSchedule({
        id: scheduleId,
        time_blocks: [
          {
            id: 'weekday-block',
            start_time: '09:00',
            end_time: '17:00',
            playlist_id: 'weekday-playlist',
            days_of_week: [1, 2, 3, 4, 5] // Mon-Fri
          },
          {
            id: 'weekend-block',
            start_time: '10:00',
            end_time: '20:00',
            playlist_id: 'weekend-playlist',
            days_of_week: [0, 6] // Sun, Sat
          }
        ]
      }));

      // Wednesday at 14:30
      const weekdayBlock = service.getCurrentScheduleBlock(scheduleId, fixedTime);
      expect(weekdayBlock.id).toBe('weekday-block');

      // Saturday at 14:30
      const saturday = new Date('2024-01-13T14:30:00Z');
      const weekendBlock = service.getCurrentScheduleBlock(scheduleId, saturday);
      expect(weekendBlock.id).toBe('weekend-block');
    });
  });

  describe('Weighted Content Selection', () => {
    it('selects content based on weights (statistical test)', () => {
      const campaign = createTestCampaign({
        id: 'weighted-campaign',
        contents: [
          { id: 'content-a', weight: 70 },
          { id: 'content-b', weight: 20 },
          { id: 'content-c', weight: 10 }
        ]
      });

      const selections = { 'content-a': 0, 'content-b': 0, 'content-c': 0 };

      // Run 1000 selections
      for (let i = 0; i < 1000; i++) {
        const selected = service.selectWeightedContent(campaign);
        selections[selected.id]++;
      }

      // Check that distribution roughly matches weights (with tolerance)
      // content-a should be ~70%, content-b ~20%, content-c ~10%
      expect(selections['content-a']).toBeGreaterThan(600); // >60%
      expect(selections['content-a']).toBeLessThan(800); // <80%
      expect(selections['content-b']).toBeGreaterThan(100); // >10%
      expect(selections['content-b']).toBeLessThan(300); // <30%
      expect(selections['content-c']).toBeGreaterThan(50); // >5%
      expect(selections['content-c']).toBeLessThan(200); // <20%
    });

    it('handles equal weights', () => {
      const campaign = createTestCampaign({
        id: 'equal-campaign',
        contents: [
          { id: 'content-a', weight: 1 },
          { id: 'content-b', weight: 1 },
          { id: 'content-c', weight: 1 }
        ]
      });

      const selections = { 'content-a': 0, 'content-b': 0, 'content-c': 0 };

      for (let i = 0; i < 300; i++) {
        const selected = service.selectWeightedContent(campaign);
        selections[selected.id]++;
      }

      // Each should be roughly 33% (100 each, with tolerance)
      expect(selections['content-a']).toBeGreaterThan(50);
      expect(selections['content-b']).toBeGreaterThan(50);
      expect(selections['content-c']).toBeGreaterThan(50);
    });

    it('returns null for campaign with no contents', () => {
      const campaign = createTestCampaign({
        id: 'empty-campaign',
        contents: []
      });

      const selected = service.selectWeightedContent(campaign);
      expect(selected).toBeNull();
    });
  });

  describe('Fallback Behavior', () => {
    it('returns empty result for screen with no content', () => {
      const screenId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        playlist_id: null,
        schedule_id: null,
        layout_id: null
      }));

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('empty');
      expect(result.content).toBeNull();
      expect(result.reason).toContain('No content assigned');
    });

    it('returns empty result for non-existent screen', () => {
      const result = service.resolveContent('non-existent-screen', fixedTime);

      expect(result.type).toBe('empty');
      expect(result.reason).toContain('not found');
    });

    it('gracefully handles missing playlist reference', () => {
      const screenId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        playlist_id: 'missing-playlist-id'
      }));

      // Note: playlist is NOT added to service

      const result = service.resolveContent(screenId, fixedTime);

      expect(result.type).toBe('empty');
    });

    it('resolution does not throw for malformed data', () => {
      const screenId = generateUUID();

      service.addScreen(createTestScreen({
        id: screenId,
        schedule_id: 'bad-schedule'
      }));

      // Add schedule with malformed time blocks
      service.addSchedule({
        id: 'bad-schedule',
        time_blocks: null // Should be array
      });

      expect(() => {
        service.resolveContent(screenId, fixedTime);
      }).not.toThrow();
    });
  });

  describe('Campaign Targeting', () => {
    it('campaign targets specific screen IDs', () => {
      const targetScreenId = generateUUID();
      const otherScreenId = generateUUID();

      service.addScreen(createTestScreen({ id: targetScreenId }));
      service.addScreen(createTestScreen({ id: otherScreenId }));

      service.addCampaign(createTestCampaign({
        id: 'targeted-campaign',
        name: 'Targeted',
        status: 'active',
        screen_ids: [targetScreenId], // Only targets one screen
        start_date: new Date('2024-01-01').toISOString()
      }));

      const targetResult = service.resolveContent(targetScreenId, fixedTime);
      const otherResult = service.resolveContent(otherScreenId, fixedTime);

      expect(targetResult.type).toBe('campaign');
      expect(otherResult.type).toBe('empty');
    });

    it('campaign with target_all_screens affects all screens', () => {
      const screen1 = generateUUID();
      const screen2 = generateUUID();

      service.addScreen(createTestScreen({ id: screen1 }));
      service.addScreen(createTestScreen({ id: screen2 }));

      service.addCampaign(createTestCampaign({
        id: 'global-campaign',
        name: 'Global',
        status: 'active',
        target_all_screens: true,
        start_date: new Date('2024-01-01').toISOString()
      }));

      expect(service.resolveContent(screen1, fixedTime).type).toBe('campaign');
      expect(service.resolveContent(screen2, fixedTime).type).toBe('campaign');
    });
  });
});
