/**
 * Content Analytics Service Unit Tests
 * Tests for analytics helper functions, formatting utilities, and Phase 10 RPC functions.
 *
 * Phase 10 Requirements tested:
 * - ANA-01: View duration tracked (getContentMetrics returns avg_view_duration_seconds)
 * - ANA-02: Completion rate calculated (getContentMetrics returns completion_rate)
 * - ANA-03: Content performance by view time (getContentPerformanceList)
 * - ANA-04: Viewing heatmap patterns (getViewingHeatmap)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase and tenantService before importing the service
vi.mock('../../../src/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

vi.mock('../../../src/services/tenantService', () => ({
  getEffectiveOwnerId: vi.fn().mockResolvedValue('test-tenant-123'),
}));

// Import mocked modules to access them in tests
import { supabase } from '../../../src/supabase';
import { getEffectiveOwnerId } from '../../../src/services/tenantService';

// Import after mocking
import {
  DATE_RANGES,
  getDateRange,
  getCustomDateRange,
  formatDuration,
  formatHours,
  getUptimeColor,
  getUptimeBgColor,
  formatRelativeTime,
  formatTopScenesForChart,
  formatTimelineForChart,
  formatDeviceUptimeForChart,
  // Phase 10 RPC functions
  getContentMetrics,
  getContentPerformanceList,
  getViewingHeatmap,
} from '../../../src/services/contentAnalyticsService';

// ============================================================================
// DATE RANGES TESTS
// ============================================================================

describe('contentAnalyticsService DATE_RANGES', () => {
  it('exports 24h range', () => {
    expect(DATE_RANGES['24h']).toBeDefined();
    expect(DATE_RANGES['24h'].hours).toBe(24);
    expect(DATE_RANGES['24h'].label).toBe('Last 24 Hours');
  });

  it('exports 7d range', () => {
    expect(DATE_RANGES['7d']).toBeDefined();
    expect(DATE_RANGES['7d'].hours).toBe(168); // 24 * 7
    expect(DATE_RANGES['7d'].label).toBe('Last 7 Days');
  });

  it('exports 30d range', () => {
    expect(DATE_RANGES['30d']).toBeDefined();
    expect(DATE_RANGES['30d'].hours).toBe(720); // 24 * 30
    expect(DATE_RANGES['30d'].label).toBe('Last 30 Days');
  });

  it('exports 90d range', () => {
    expect(DATE_RANGES['90d']).toBeDefined();
    expect(DATE_RANGES['90d'].hours).toBe(2160); // 24 * 90
    expect(DATE_RANGES['90d'].label).toBe('Last 90 Days');
  });
});

// ============================================================================
// DATE RANGE HELPERS TESTS
// ============================================================================

describe('contentAnalyticsService getDateRange', () => {
  it('returns ISO timestamps for 24h preset', () => {
    const result = getDateRange('24h');

    expect(result.fromTs).toBeTruthy();
    expect(result.toTs).toBeTruthy();
    expect(result.label).toBe('Last 24 Hours');

    // Verify timestamps are valid ISO strings
    expect(() => new Date(result.fromTs)).not.toThrow();
    expect(() => new Date(result.toTs)).not.toThrow();
  });

  it('returns correct time span for 7d preset', () => {
    const result = getDateRange('7d');

    const fromDate = new Date(result.fromTs);
    const toDate = new Date(result.toTs);
    const diffHours = (toDate - fromDate) / (1000 * 60 * 60);

    expect(diffHours).toBeCloseTo(168, 0); // 7 days in hours
  });

  it('defaults to 7d for unknown preset', () => {
    const result = getDateRange('unknown');

    expect(result.label).toBe('Last 7 Days');
  });

  it('returns ISO format timestamps', () => {
    const result = getDateRange('24h');

    // ISO format check
    expect(result.fromTs).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(result.toTs).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('contentAnalyticsService getCustomDateRange', () => {
  it('converts dates to ISO timestamps', () => {
    const from = new Date('2024-01-01T00:00:00Z');
    const to = new Date('2024-01-07T23:59:59Z');

    const result = getCustomDateRange(from, to);

    expect(result.fromTs).toBe(from.toISOString());
    expect(result.toTs).toBe(to.toISOString());
  });

  it('handles same day range', () => {
    const date = new Date('2024-01-15T12:00:00Z');

    const result = getCustomDateRange(date, date);

    expect(result.fromTs).toBe(result.toTs);
  });
});

// ============================================================================
// DURATION FORMATTING TESTS
// ============================================================================

describe('contentAnalyticsService formatDuration', () => {
  it('returns 0s for null input', () => {
    expect(formatDuration(null)).toBe('0s');
  });

  it('returns 0s for undefined input', () => {
    expect(formatDuration(undefined)).toBe('0s');
  });

  it('returns 0s for negative input', () => {
    expect(formatDuration(-10)).toBe('0s');
  });

  it('returns 0s for zero input', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3725)).toBe('1h 2m');
  });

  it('formats multiple hours', () => {
    expect(formatDuration(7200)).toBe('2h 0m');
  });

  it('handles large values', () => {
    expect(formatDuration(86400)).toBe('24h 0m');
  });
});

describe('contentAnalyticsService formatHours', () => {
  it('returns 0h for null input', () => {
    expect(formatHours(null)).toBe('0h');
  });

  it('returns 0h for undefined input', () => {
    expect(formatHours(undefined)).toBe('0h');
  });

  it('returns 0h for negative input', () => {
    expect(formatHours(-5)).toBe('0h');
  });

  it('formats sub-hour as minutes', () => {
    expect(formatHours(0.5)).toBe('30m');
  });

  it('formats hours with decimal', () => {
    expect(formatHours(2.5)).toBe('2.5h');
  });

  it('formats 24+ hours as days', () => {
    expect(formatHours(48)).toBe('2d 0h');
  });

  it('formats days and remaining hours', () => {
    expect(formatHours(30)).toBe('1d 6h');
  });
});

// ============================================================================
// UPTIME COLOR TESTS
// ============================================================================

describe('contentAnalyticsService getUptimeColor', () => {
  it('returns green for 95%+', () => {
    expect(getUptimeColor(95)).toBe('text-green-600');
    expect(getUptimeColor(100)).toBe('text-green-600');
  });

  it('returns yellow for 80-94%', () => {
    expect(getUptimeColor(80)).toBe('text-yellow-600');
    expect(getUptimeColor(94)).toBe('text-yellow-600');
  });

  it('returns orange for 50-79%', () => {
    expect(getUptimeColor(50)).toBe('text-orange-600');
    expect(getUptimeColor(79)).toBe('text-orange-600');
  });

  it('returns red for below 50%', () => {
    expect(getUptimeColor(49)).toBe('text-red-600');
    expect(getUptimeColor(0)).toBe('text-red-600');
  });
});

describe('contentAnalyticsService getUptimeBgColor', () => {
  it('returns green background for 95%+', () => {
    expect(getUptimeBgColor(95)).toBe('bg-green-100');
    expect(getUptimeBgColor(100)).toBe('bg-green-100');
  });

  it('returns yellow background for 80-94%', () => {
    expect(getUptimeBgColor(80)).toBe('bg-yellow-100');
    expect(getUptimeBgColor(94)).toBe('bg-yellow-100');
  });

  it('returns orange background for 50-79%', () => {
    expect(getUptimeBgColor(50)).toBe('bg-orange-100');
    expect(getUptimeBgColor(79)).toBe('bg-orange-100');
  });

  it('returns red background for below 50%', () => {
    expect(getUptimeBgColor(49)).toBe('bg-red-100');
    expect(getUptimeBgColor(0)).toBe('bg-red-100');
  });
});

// ============================================================================
// RELATIVE TIME FORMATTING TESTS
// ============================================================================

describe('contentAnalyticsService formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Never" for null input', () => {
    expect(formatRelativeTime(null)).toBe('Never');
  });

  it('returns "Never" for undefined input', () => {
    expect(formatRelativeTime(undefined)).toBe('Never');
  });

  it('returns "Just now" for very recent timestamps', () => {
    const recent = new Date('2024-01-15T11:59:30Z').toISOString();
    expect(formatRelativeTime(recent)).toBe('Just now');
  });

  it('returns minutes ago for recent timestamps', () => {
    const fiveMinAgo = new Date('2024-01-15T11:55:00Z').toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago for today timestamps', () => {
    const threeHoursAgo = new Date('2024-01-15T09:00:00Z').toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago for recent past', () => {
    const twoDaysAgo = new Date('2024-01-13T12:00:00Z').toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns formatted date for older timestamps', () => {
    const twoWeeksAgo = new Date('2024-01-01T12:00:00Z').toISOString();
    const result = formatRelativeTime(twoWeeksAgo);
    // Should be a date string, not relative
    expect(result).not.toContain('ago');
  });
});

// ============================================================================
// CHART DATA FORMATTING TESTS
// ============================================================================

describe('contentAnalyticsService formatTopScenesForChart', () => {
  it('formats empty array', () => {
    const result = formatTopScenesForChart([]);

    expect(result.labels).toEqual([]);
    expect(result.datasets[0].data).toEqual([]);
  });

  it('formats scene names as labels', () => {
    const scenes = [
      { scene_name: 'Scene A', total_duration_seconds: 3600 },
      { scene_name: 'Scene B', total_duration_seconds: 7200 },
    ];

    const result = formatTopScenesForChart(scenes);

    expect(result.labels).toEqual(['Scene A', 'Scene B']);
  });

  it('handles unnamed scenes', () => {
    const scenes = [
      { scene_name: null, total_duration_seconds: 3600 },
    ];

    const result = formatTopScenesForChart(scenes);

    expect(result.labels).toEqual(['Unnamed']);
  });

  it('converts seconds to hours', () => {
    const scenes = [
      { scene_name: 'Test', total_duration_seconds: 3600 }, // 1 hour
    ];

    const result = formatTopScenesForChart(scenes);

    expect(result.datasets[0].data[0]).toBe(1);
  });

  it('provides colors for each bar', () => {
    const scenes = Array(10).fill({ scene_name: 'Test', total_duration_seconds: 100 });

    const result = formatTopScenesForChart(scenes);

    expect(result.datasets[0].backgroundColor.length).toBe(10);
    // All colors should be hex colors
    result.datasets[0].backgroundColor.forEach(color => {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

describe('contentAnalyticsService formatTimelineForChart', () => {
  it('formats empty array', () => {
    const result = formatTimelineForChart([]);

    expect(result.labels).toEqual([]);
    expect(result.datasets[0].data).toEqual([]);
  });

  it('formats bucket timestamps as labels', () => {
    const timeline = [
      { bucket_start: '2024-01-15T10:00:00Z', total_duration_seconds: 600 },
      { bucket_start: '2024-01-15T11:00:00Z', total_duration_seconds: 1200 },
    ];

    const result = formatTimelineForChart(timeline);

    expect(result.labels.length).toBe(2);
    // Labels should be formatted date strings
    result.labels.forEach(label => {
      expect(typeof label).toBe('string');
    });
  });

  it('converts seconds to minutes', () => {
    const timeline = [
      { bucket_start: '2024-01-15T10:00:00Z', total_duration_seconds: 600 }, // 10 minutes
    ];

    const result = formatTimelineForChart(timeline);

    expect(result.datasets[0].data[0]).toBe(10);
  });

  it('includes chart styling options', () => {
    const timeline = [
      { bucket_start: '2024-01-15T10:00:00Z', total_duration_seconds: 600 },
    ];

    const result = formatTimelineForChart(timeline);

    expect(result.datasets[0].borderColor).toBeTruthy();
    expect(result.datasets[0].backgroundColor).toBeTruthy();
    expect(result.datasets[0].fill).toBe(true);
    expect(result.datasets[0].tension).toBeDefined();
  });
});

describe('contentAnalyticsService formatDeviceUptimeForChart', () => {
  it('formats empty array', () => {
    const result = formatDeviceUptimeForChart([]);

    expect(result.labels).toEqual([]);
    expect(result.datasets[0].data).toEqual([]);
  });

  it('formats device names as labels', () => {
    const devices = [
      { device_name: 'Device A', uptime_percent: 95 },
      { device_name: 'Device B', uptime_percent: 80 },
    ];

    const result = formatDeviceUptimeForChart(devices);

    expect(result.labels).toEqual(['Device A', 'Device B']);
  });

  it('handles unnamed devices', () => {
    const devices = [
      { device_name: null, uptime_percent: 90 },
    ];

    const result = formatDeviceUptimeForChart(devices);

    expect(result.labels).toEqual(['Unknown']);
  });

  it('extracts uptime percentages as data', () => {
    const devices = [
      { device_name: 'Test', uptime_percent: 95.5 },
    ];

    const result = formatDeviceUptimeForChart(devices);

    expect(result.datasets[0].data[0]).toBe(95.5);
  });

  it('color-codes bars by uptime level', () => {
    const devices = [
      { device_name: 'High', uptime_percent: 98 },    // Green
      { device_name: 'Medium', uptime_percent: 85 },  // Yellow
      { device_name: 'Low', uptime_percent: 40 },     // Red
    ];

    const result = formatDeviceUptimeForChart(devices);

    expect(result.datasets[0].backgroundColor[0]).toBe('#10B981'); // Green
    expect(result.datasets[0].backgroundColor[1]).toBe('#F59E0B'); // Yellow
    expect(result.datasets[0].backgroundColor[2]).toBe('#EF4444'); // Red
  });

  it('handles missing uptime values', () => {
    const devices = [
      { device_name: 'Test', uptime_percent: null },
    ];

    const result = formatDeviceUptimeForChart(devices);

    expect(result.datasets[0].data[0]).toBe(0);
  });
});

// ============================================================================
// PHASE 10 RPC FUNCTION TESTS
// ============================================================================

describe('contentAnalyticsService getContentMetrics (ANA-01, ANA-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls RPC with correct parameters for scene content', async () => {
    const mockData = [{
      avg_view_duration_seconds: 25.5,
      completion_rate: 85.0,
      total_views: 150,
      last_viewed_at: '2024-01-15T10:00:00Z',
      total_view_time_seconds: 3825,
    }];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getContentMetrics('scene-id-123', 'scene', '7d');

    expect(supabase.rpc).toHaveBeenCalledWith('get_content_metrics', {
      p_tenant_id: 'test-tenant-123',
      p_content_id: 'scene-id-123',
      p_content_type: 'scene',
      p_from_ts: expect.any(String),
      p_to_ts: expect.any(String),
    });
    expect(result).toEqual(mockData[0]);
  });

  it('calls RPC with correct parameters for media content', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [{ avg_view_duration_seconds: 10 }], error: null });

    await getContentMetrics('media-id-456', 'media', '30d');

    expect(supabase.rpc).toHaveBeenCalledWith('get_content_metrics', expect.objectContaining({
      p_content_id: 'media-id-456',
      p_content_type: 'media',
    }));
  });

  it('calls RPC with correct parameters for playlist content', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [{ avg_view_duration_seconds: 60 }], error: null });

    await getContentMetrics('playlist-id-789', 'playlist', '90d');

    expect(supabase.rpc).toHaveBeenCalledWith('get_content_metrics', expect.objectContaining({
      p_content_id: 'playlist-id-789',
      p_content_type: 'playlist',
    }));
  });

  it('returns default values when RPC returns empty result', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    const result = await getContentMetrics('content-id', 'scene');

    expect(result).toEqual({
      avg_view_duration_seconds: 0,
      completion_rate: 0,
      total_views: 0,
      last_viewed_at: null,
      total_view_time_seconds: 0,
    });
  });

  it('returns default values when RPC returns null data', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await getContentMetrics('content-id', 'scene');

    expect(result).toEqual({
      avg_view_duration_seconds: 0,
      completion_rate: 0,
      total_views: 0,
      last_viewed_at: null,
      total_view_time_seconds: 0,
    });
  });

  it('defaults to 7d date range when not specified', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getContentMetrics('content-id', 'scene');

    const call = supabase.rpc.mock.calls[0];
    const params = call[1];
    const fromDate = new Date(params.p_from_ts);
    const toDate = new Date(params.p_to_ts);
    const diffHours = (toDate - fromDate) / (1000 * 60 * 60);

    expect(diffHours).toBeCloseTo(168, 0); // 7 days
  });

  it('throws error on RPC failure', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    await expect(getContentMetrics('content-id', 'scene')).rejects.toThrow();
  });

  it('throws error when no tenant context', async () => {
    getEffectiveOwnerId.mockResolvedValueOnce(null);

    await expect(getContentMetrics('content-id', 'scene')).rejects.toThrow('No tenant context');
  });

  it('returns avg_view_duration_seconds for ANA-01 compliance', async () => {
    const mockData = [{ avg_view_duration_seconds: 45.25, completion_rate: 0, total_views: 0, last_viewed_at: null, total_view_time_seconds: 0 }];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getContentMetrics('content-id', 'scene');

    expect(result).toHaveProperty('avg_view_duration_seconds');
    expect(typeof result.avg_view_duration_seconds).toBe('number');
  });

  it('returns completion_rate for ANA-02 compliance', async () => {
    const mockData = [{ avg_view_duration_seconds: 0, completion_rate: 92.5, total_views: 0, last_viewed_at: null, total_view_time_seconds: 0 }];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getContentMetrics('content-id', 'scene');

    expect(result).toHaveProperty('completion_rate');
    expect(typeof result.completion_rate).toBe('number');
  });
});

describe('contentAnalyticsService getContentPerformanceList (ANA-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls RPC with correct parameters', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getContentPerformanceList('30d', 10);

    expect(supabase.rpc).toHaveBeenCalledWith('get_content_performance_list', {
      p_tenant_id: 'test-tenant-123',
      p_from_ts: expect.any(String),
      p_to_ts: expect.any(String),
      p_limit: 10,
    });
  });

  it('defaults to 7d date range and limit 20', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getContentPerformanceList();

    expect(supabase.rpc).toHaveBeenCalledWith('get_content_performance_list', expect.objectContaining({
      p_limit: 20,
    }));
  });

  it('returns array of content items', async () => {
    const mockData = [
      { content_id: 'id-1', content_type: 'scene', content_name: 'Scene 1', total_view_time_seconds: 5000 },
      { content_id: 'id-2', content_type: 'media', content_name: 'Video 1', total_view_time_seconds: 3000 },
    ];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getContentPerformanceList('7d', 20);

    expect(result).toEqual(mockData);
    expect(result.length).toBe(2);
  });

  it('returns empty array when no data', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await getContentPerformanceList();

    expect(result).toEqual([]);
  });

  it('throws error on RPC failure', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    await expect(getContentPerformanceList()).rejects.toThrow();
  });

  it('throws error when no tenant context', async () => {
    getEffectiveOwnerId.mockResolvedValueOnce(null);

    await expect(getContentPerformanceList()).rejects.toThrow('No tenant context');
  });

  it('returns items sorted by total_view_time_seconds for ANA-03 compliance', async () => {
    const mockData = [
      { content_id: 'id-1', total_view_time_seconds: 5000 },
      { content_id: 'id-2', total_view_time_seconds: 3000 },
    ];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getContentPerformanceList();

    expect(result[0].total_view_time_seconds).toBeGreaterThan(result[1].total_view_time_seconds);
  });
});

describe('contentAnalyticsService getViewingHeatmap (ANA-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls RPC with correct parameters including timezone', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getViewingHeatmap('7d', 'America/New_York');

    expect(supabase.rpc).toHaveBeenCalledWith('get_viewing_heatmap', {
      p_tenant_id: 'test-tenant-123',
      p_from_ts: expect.any(String),
      p_to_ts: expect.any(String),
      p_timezone: 'America/New_York',
    });
  });

  it('uses browser timezone when not specified', async () => {
    // Mock Intl.DateTimeFormat to return a specific timezone
    const mockTimezone = 'Europe/London';
    const originalDateTimeFormat = Intl.DateTimeFormat;
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation((...args) => {
      const instance = new originalDateTimeFormat(...args);
      return {
        ...instance,
        resolvedOptions: () => ({ ...instance.resolvedOptions(), timeZone: mockTimezone }),
      };
    });

    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getViewingHeatmap('7d');

    expect(supabase.rpc).toHaveBeenCalledWith('get_viewing_heatmap', expect.objectContaining({
      p_timezone: mockTimezone,
    }));

    vi.restoreAllMocks();
  });

  it('falls back to UTC when browser timezone detection fails', async () => {
    // Mock Intl.DateTimeFormat to return undefined timezone
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({
      resolvedOptions: () => ({ timeZone: undefined }),
    }));

    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

    await getViewingHeatmap('7d', null);

    expect(supabase.rpc).toHaveBeenCalledWith('get_viewing_heatmap', expect.objectContaining({
      p_timezone: 'UTC',
    }));

    vi.restoreAllMocks();
  });

  it('returns array of heatmap cells', async () => {
    const mockData = [
      { day_of_week: 0, hour_of_day: 9, view_count: 10, total_duration_seconds: 300 },
      { day_of_week: 0, hour_of_day: 10, view_count: 15, total_duration_seconds: 450 },
    ];
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getViewingHeatmap('7d', 'UTC');

    expect(result).toEqual(mockData);
  });

  it('returns empty array when no data', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });

    const result = await getViewingHeatmap();

    expect(result).toEqual([]);
  });

  it('throws error on RPC failure', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

    await expect(getViewingHeatmap()).rejects.toThrow();
  });

  it('throws error when no tenant context', async () => {
    getEffectiveOwnerId.mockResolvedValueOnce(null);

    await expect(getViewingHeatmap()).rejects.toThrow('No tenant context');
  });

  it('returns 7x24 grid structure for ANA-04 compliance', async () => {
    // Full 168-cell grid (7 days x 24 hours)
    const mockData = [];
    for (let day = 0; day <= 6; day++) {
      for (let hour = 0; hour <= 23; hour++) {
        mockData.push({ day_of_week: day, hour_of_day: hour, view_count: 0, total_duration_seconds: 0 });
      }
    }
    supabase.rpc.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await getViewingHeatmap();

    expect(result.length).toBe(168);
    // Verify structure contains day_of_week (0-6) and hour_of_day (0-23)
    const days = new Set(result.map(r => r.day_of_week));
    const hours = new Set(result.map(r => r.hour_of_day));
    expect([...days].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([...hours].sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });
});
