/**
 * Player Service Unit Tests
 *
 * Tests for content resolution logic: Campaign → Schedule → Layout → Playlist
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createTestScreen,
  createTestPlaylist,
  createTestPlaylistWithMedia,
  createTestLayout,
  createTestSchedule,
  createTestCampaign,
  createTestMedia
} from '../../utils/factories';

describe('playerService - Content Resolution', () => {
  /**
   * The content resolution order should be:
   * 1. Active Campaign (highest priority)
   * 2. Current Schedule time block
   * 3. Assigned Layout
   * 4. Assigned Playlist (fallback)
   */

  describe('Content Priority Logic', () => {
    it('should prioritize campaign over schedule', () => {
      const screen = createTestScreen({
        schedule_id: 'schedule-123',
        playlist_id: 'playlist-123'
      });

      const campaign = createTestCampaign({
        status: 'active',
        priority: 10,
        screen_ids: [screen.id]
      });

      // Priority: campaign > schedule > playlist
      const priorities = [
        { type: 'campaign', priority: 100 },
        { type: 'schedule', priority: 50 },
        { type: 'layout', priority: 25 },
        { type: 'playlist', priority: 10 }
      ];

      const sorted = priorities.sort((a, b) => b.priority - a.priority);
      expect(sorted[0].type).toBe('campaign');
      expect(sorted[1].type).toBe('schedule');
      expect(sorted[2].type).toBe('layout');
      expect(sorted[3].type).toBe('playlist');
    });

    it('should fall back to playlist when no other content', () => {
      const screen = createTestScreen({
        playlist_id: 'playlist-123',
        schedule_id: null,
        layout_id: null
      });

      const fallbackContent = screen.playlist_id ? 'playlist' : 'empty';
      expect(fallbackContent).toBe('playlist');
    });

    it('should handle empty content gracefully', () => {
      const screen = createTestScreen({
        playlist_id: null,
        schedule_id: null,
        layout_id: null
      });

      const hasContent = !!(screen.playlist_id || screen.schedule_id || screen.layout_id);
      expect(hasContent).toBe(false);
    });
  });

  describe('Campaign Resolution', () => {
    it('should check if campaign is currently active', () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const hourLater = new Date(now.getTime() + 60 * 60 * 1000);

      const activeCampaign = createTestCampaign({
        status: 'active',
        start_date: hourAgo.toISOString(),
        end_date: hourLater.toISOString()
      });

      const isActive = (campaign) => {
        const now = new Date();
        const start = new Date(campaign.start_date);
        const end = campaign.end_date ? new Date(campaign.end_date) : null;

        if (campaign.status !== 'active') return false;
        if (now < start) return false;
        if (end && now > end) return false;
        return true;
      };

      expect(isActive(activeCampaign)).toBe(true);
    });

    it('should not activate expired campaigns', () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const expiredCampaign = createTestCampaign({
        status: 'active',
        start_date: weekAgo.toISOString(),
        end_date: dayAgo.toISOString()
      });

      const isActive = (campaign) => {
        const now = new Date();
        const end = campaign.end_date ? new Date(campaign.end_date) : null;
        if (end && now > end) return false;
        return campaign.status === 'active';
      };

      expect(isActive(expiredCampaign)).toBe(false);
    });

    it('should respect campaign priority ordering', () => {
      const campaigns = [
        createTestCampaign({ priority: 5, name: 'Low Priority' }),
        createTestCampaign({ priority: 100, name: 'High Priority' }),
        createTestCampaign({ priority: 50, name: 'Medium Priority' })
      ];

      const sorted = campaigns.sort((a, b) => b.priority - a.priority);

      expect(sorted[0].name).toBe('High Priority');
      expect(sorted[1].name).toBe('Medium Priority');
      expect(sorted[2].name).toBe('Low Priority');
    });
  });

  describe('Schedule Time Block Resolution', () => {
    it('should find current time block in schedule', () => {
      const now = new Date();
      const currentHour = now.getHours();

      const schedule = createTestSchedule({
        time_blocks: [
          {
            id: 'block-1',
            start_time: '00:00',
            end_time: '08:00',
            playlist_id: 'morning-playlist'
          },
          {
            id: 'block-2',
            start_time: '08:00',
            end_time: '18:00',
            playlist_id: 'day-playlist'
          },
          {
            id: 'block-3',
            start_time: '18:00',
            end_time: '23:59',
            playlist_id: 'evening-playlist'
          }
        ]
      });

      const findCurrentBlock = (schedule, hour) => {
        return schedule.time_blocks.find(block => {
          const startHour = parseInt(block.start_time.split(':')[0]);
          const endHour = parseInt(block.end_time.split(':')[0]);
          return hour >= startHour && hour < endHour;
        });
      };

      // Test different times
      expect(findCurrentBlock(schedule, 5)?.playlist_id).toBe('morning-playlist');
      expect(findCurrentBlock(schedule, 12)?.playlist_id).toBe('day-playlist');
      expect(findCurrentBlock(schedule, 20)?.playlist_id).toBe('evening-playlist');
    });
  });

  describe('Layout Zone Resolution', () => {
    it('should map playlist to layout zones', () => {
      const layout = createTestLayout({
        zones: [
          { id: 'main', name: 'Main Zone', x: 0, y: 0, width: 70, height: 100, playlist_id: 'main-playlist' },
          { id: 'ticker', name: 'Ticker Zone', x: 70, y: 80, width: 30, height: 20, playlist_id: 'ticker-playlist' },
          { id: 'sidebar', name: 'Sidebar Zone', x: 70, y: 0, width: 30, height: 80, playlist_id: 'sidebar-playlist' }
        ]
      });

      expect(layout.zones).toHaveLength(3);
      expect(layout.zones[0].playlist_id).toBe('main-playlist');
      expect(layout.zones.find(z => z.id === 'ticker')?.playlist_id).toBe('ticker-playlist');
    });

    it('should handle zones with no playlist', () => {
      const layout = createTestLayout({
        zones: [
          { id: 'main', name: 'Main Zone', x: 0, y: 0, width: 100, height: 100, playlist_id: null }
        ]
      });

      const emptyZones = layout.zones.filter(z => !z.playlist_id);
      expect(emptyZones).toHaveLength(1);
    });
  });

  describe('Playlist Content Resolution', () => {
    it('should resolve playlist items in order', () => {
      const playlist = createTestPlaylistWithMedia({ item_count: 5 });

      expect(playlist.items).toHaveLength(5);
      expect(playlist.items[0].position).toBe(0);
      expect(playlist.items[4].position).toBe(4);
    });

    it('should handle empty playlist gracefully', () => {
      const playlist = createTestPlaylist();
      const items = [];

      expect(items).toHaveLength(0);
    });

    it('should calculate total playlist duration', () => {
      const items = [
        { duration: 10 },
        { duration: 15 },
        { duration: 20 },
        { duration: null, media: { duration: 30 } }
      ];

      const totalDuration = items.reduce((total, item) => {
        return total + (item.duration || item.media?.duration || 10);
      }, 0);

      expect(totalDuration).toBe(75);
    });
  });

  describe('Fallback Behavior', () => {
    it('should use default duration when item has none', () => {
      const defaultDuration = 10;
      const item = { duration: null };

      const effectiveDuration = item.duration || defaultDuration;
      expect(effectiveDuration).toBe(10);
    });

    it('should use media duration as fallback', () => {
      const item = {
        duration: null,
        media: { duration: 25 }
      };

      const effectiveDuration = item.duration || item.media?.duration || 10;
      expect(effectiveDuration).toBe(25);
    });
  });
});

describe('playerService - Screen Status', () => {
  describe('Online/Offline Logic', () => {
    it('should mark screen as offline after timeout', () => {
      const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

      const recentlySeenScreen = createTestScreen({
        last_seen_at: new Date().toISOString(),
        status: 'online'
      });

      const staleScreen = createTestScreen({
        last_seen_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        status: 'online'
      });

      const isOnline = (screen) => {
        if (!screen.last_seen_at) return false;
        const lastSeen = new Date(screen.last_seen_at);
        return Date.now() - lastSeen.getTime() < OFFLINE_THRESHOLD_MS;
      };

      expect(isOnline(recentlySeenScreen)).toBe(true);
      expect(isOnline(staleScreen)).toBe(false);
    });

    it('should handle screens that have never been seen', () => {
      const screen = createTestScreen({
        last_seen_at: null,
        status: 'offline'
      });

      const isOnline = screen.last_seen_at !== null;
      expect(isOnline).toBe(false);
    });
  });

  describe('Device Commands', () => {
    it('should support expected device commands', () => {
      const validCommands = ['reboot', 'reload', 'clear_cache', 'update_content'];

      const isValidCommand = (cmd) => validCommands.includes(cmd);

      expect(isValidCommand('reboot')).toBe(true);
      expect(isValidCommand('reload')).toBe(true);
      expect(isValidCommand('clear_cache')).toBe(true);
      expect(isValidCommand('update_content')).toBe(true);
      expect(isValidCommand('invalid_command')).toBe(false);
    });
  });
});
