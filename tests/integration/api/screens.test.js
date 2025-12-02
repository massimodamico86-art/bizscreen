/**
 * Screen Pairing Integration Tests
 *
 * Tests the full screen pairing flow:
 * 1. Generate OTP code
 * 2. Claim code via pair endpoint
 * 3. Verify screen becomes online
 * 4. Verify heartbeat updates last_seen
 *
 * These tests validate the screen management API behavior using
 * mock handlers that simulate real API responses.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createTestScreen,
  generateUUID
} from '../../utils/factories';

/**
 * Generate a 6-character OTP code (uppercase alphanumeric, no confusing chars)
 */
function generateOTPCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a screen API key
 */
function generateAPIKey() {
  return `sk_screen_${generateUUID().replace(/-/g, '')}`;
}

/**
 * Simulates the screen pairing service
 */
class MockScreenPairingService {
  constructor() {
    this.pendingCodes = new Map(); // code -> { screenId, createdAt, ownerId }
    this.screens = new Map(); // screenId -> screen data
    this.pairingAttempts = new Map(); // ip -> { count, lastAttempt }
    this.RATE_LIMIT = 5; // max attempts per minute
    this.OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a new pairing code for a screen
   */
  generatePairingCode(ownerId, screenName) {
    const code = generateOTPCode();
    const screenId = generateUUID();

    this.pendingCodes.set(code, {
      screenId,
      ownerId,
      screenName,
      createdAt: Date.now()
    });

    return { code, screenId };
  }

  /**
   * Claim a pairing code and activate the screen
   */
  claimCode(code, deviceInfo, clientIp = '127.0.0.1') {
    // Rate limiting check
    const attempts = this.pairingAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
    const oneMinuteAgo = Date.now() - 60 * 1000;

    if (attempts.lastAttempt > oneMinuteAgo) {
      attempts.count++;
    } else {
      attempts.count = 1;
    }
    attempts.lastAttempt = Date.now();
    this.pairingAttempts.set(clientIp, attempts);

    if (attempts.count > this.RATE_LIMIT) {
      return {
        success: false,
        error: { code: 429, message: 'Too many pairing attempts. Try again later.' }
      };
    }

    // Validate code
    const pending = this.pendingCodes.get(code);
    if (!pending) {
      return {
        success: false,
        error: { code: 404, message: 'Invalid pairing code' }
      };
    }

    // Check expiry
    if (Date.now() - pending.createdAt > this.OTP_EXPIRY_MS) {
      this.pendingCodes.delete(code);
      return {
        success: false,
        error: { code: 404, message: 'Pairing code expired' }
      };
    }

    // Create the screen
    const apiKey = generateAPIKey();
    const screen = createTestScreen({
      id: pending.screenId,
      owner_id: pending.ownerId,
      name: pending.screenName,
      status: 'online',
      device_id: deviceInfo.deviceId,
      api_key: apiKey,
      last_seen_at: new Date().toISOString(),
      paired_at: new Date().toISOString()
    });

    this.screens.set(pending.screenId, screen);
    this.pendingCodes.delete(code);

    return {
      success: true,
      data: {
        screenId: screen.id,
        apiKey: apiKey,
        name: screen.name
      }
    };
  }

  /**
   * Process a heartbeat from a screen
   */
  heartbeat(screenId, apiKey) {
    const screen = this.screens.get(screenId);

    if (!screen) {
      return {
        success: false,
        error: { code: 404, message: 'Screen not found' }
      };
    }

    if (screen.api_key !== apiKey) {
      return {
        success: false,
        error: { code: 401, message: 'Invalid API key' }
      };
    }

    // Update last_seen
    const previousLastSeen = screen.last_seen_at;
    screen.last_seen_at = new Date().toISOString();
    screen.status = 'online';

    // Get pending commands
    const commands = screen.pending_commands || [];
    screen.pending_commands = []; // Clear after retrieval

    return {
      success: true,
      data: {
        screenId: screen.id,
        lastSeen: screen.last_seen_at,
        previousLastSeen,
        commands,
        status: screen.status
      }
    };
  }

  /**
   * Queue a command for a screen
   */
  queueCommand(screenId, command) {
    const screen = this.screens.get(screenId);
    if (!screen) return false;

    screen.pending_commands = screen.pending_commands || [];
    screen.pending_commands.push({
      id: generateUUID(),
      type: command.type,
      payload: command.payload,
      createdAt: new Date().toISOString()
    });
    return true;
  }

  /**
   * Determine if a screen is online based on last_seen
   */
  isScreenOnline(screenId, thresholdMs = 2 * 60 * 1000) {
    const screen = this.screens.get(screenId);
    if (!screen || !screen.last_seen_at) return false;

    const lastSeen = new Date(screen.last_seen_at).getTime();
    return Date.now() - lastSeen < thresholdMs;
  }

  /**
   * Get a screen by ID
   */
  getScreen(screenId) {
    return this.screens.get(screenId);
  }
}

describe('Screen Pairing API', () => {
  let service;

  beforeEach(() => {
    service = new MockScreenPairingService();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('OTP Code Generation', () => {
    it('generates a 6-character OTP code', () => {
      const result = service.generatePairingCode('owner-123', 'Test Screen');

      expect(result.code).toHaveLength(6);
      expect(result.code).toMatch(/^[A-Z0-9]+$/);
      expect(result.screenId).toBeDefined();
    });

    it('generates unique codes for multiple screens', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        const result = service.generatePairingCode('owner-123', `Screen ${i}`);
        codes.add(result.code);
      }
      expect(codes.size).toBe(100);
    });

    it('uses only unambiguous characters (no 0, O, I, L, 1)', () => {
      for (let i = 0; i < 50; i++) {
        const result = service.generatePairingCode('owner-123', `Screen ${i}`);
        expect(result.code).not.toMatch(/[0OIL1]/);
      }
    });
  });

  describe('POST /api/screens/pair - Code Claiming', () => {
    it('valid OTP claim returns screen ID and API key', () => {
      const { code } = service.generatePairingCode('owner-123', 'Lobby Display');

      const result = service.claimCode(code, { deviceId: 'device-abc' });

      expect(result.success).toBe(true);
      expect(result.data.screenId).toBeDefined();
      expect(result.data.apiKey).toBeDefined();
      expect(result.data.apiKey).toMatch(/^sk_screen_/);
      expect(result.data.name).toBe('Lobby Display');
    });

    it('invalid OTP returns 404 error', () => {
      const result = service.claimCode('INVALID', { deviceId: 'device-abc' });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(404);
      expect(result.error.message).toContain('Invalid pairing code');
    });

    it('expired OTP (>5 min) returns 404 error', () => {
      const { code } = service.generatePairingCode('owner-123', 'Test Screen');

      // Advance time by 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      const result = service.claimCode(code, { deviceId: 'device-abc' });

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(404);
      expect(result.error.message).toContain('expired');
    });

    it('OTP can only be used once', () => {
      const { code } = service.generatePairingCode('owner-123', 'Test Screen');

      const result1 = service.claimCode(code, { deviceId: 'device-1' });
      expect(result1.success).toBe(true);

      const result2 = service.claimCode(code, { deviceId: 'device-2' });
      expect(result2.success).toBe(false);
      expect(result2.error.code).toBe(404);
    });

    it('rate limiting after 5 failed attempts returns 429', () => {
      const clientIp = '192.168.1.100';

      // Make 5 invalid attempts
      for (let i = 0; i < 5; i++) {
        service.claimCode(`BAD${i}X`, { deviceId: 'device' }, clientIp);
      }

      // 6th attempt should be rate limited
      const result = service.claimCode('ANOTHER', { deviceId: 'device' }, clientIp);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(429);
      expect(result.error.message).toContain('Too many');
    });

    it('rate limit resets after 1 minute', () => {
      const clientIp = '192.168.1.100';

      // Make 5 invalid attempts
      for (let i = 0; i < 5; i++) {
        service.claimCode(`BAD${i}X`, { deviceId: 'device' }, clientIp);
      }

      // Advance time by 61 seconds
      vi.advanceTimersByTime(61 * 1000);

      // Now generate a valid code and claim it
      const { code } = service.generatePairingCode('owner-123', 'Test Screen');
      const result = service.claimCode(code, { deviceId: 'device' }, clientIp);

      expect(result.success).toBe(true);
    });
  });

  describe('POST /api/screens/heartbeat', () => {
    let screenId;
    let apiKey;

    beforeEach(() => {
      const { code, screenId: sId } = service.generatePairingCode('owner-123', 'Test Screen');
      const result = service.claimCode(code, { deviceId: 'device-abc' });
      screenId = result.data.screenId;
      apiKey = result.data.apiKey;
    });

    it('heartbeat updates last_seen timestamp', () => {
      const initialScreen = service.getScreen(screenId);
      const initialLastSeen = initialScreen.last_seen_at;

      // Advance time
      vi.advanceTimersByTime(30 * 1000);

      const result = service.heartbeat(screenId, apiKey);

      expect(result.success).toBe(true);
      expect(result.data.lastSeen).not.toBe(initialLastSeen);
      expect(new Date(result.data.lastSeen).getTime())
        .toBeGreaterThan(new Date(initialLastSeen).getTime());
    });

    it('heartbeat returns pending commands array', () => {
      // Queue some commands
      service.queueCommand(screenId, { type: 'reload', payload: {} });
      service.queueCommand(screenId, { type: 'clear_cache', payload: {} });

      const result = service.heartbeat(screenId, apiKey);

      expect(result.success).toBe(true);
      expect(result.data.commands).toHaveLength(2);
      expect(result.data.commands[0].type).toBe('reload');
      expect(result.data.commands[1].type).toBe('clear_cache');
    });

    it('commands are cleared after heartbeat retrieval', () => {
      service.queueCommand(screenId, { type: 'reload', payload: {} });

      const result1 = service.heartbeat(screenId, apiKey);
      expect(result1.data.commands).toHaveLength(1);

      const result2 = service.heartbeat(screenId, apiKey);
      expect(result2.data.commands).toHaveLength(0);
    });

    it('heartbeat rejects requests without valid API key', () => {
      const result = service.heartbeat(screenId, 'invalid-key');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(401);
      expect(result.error.message).toContain('Invalid API key');
    });

    it('heartbeat rejects requests for non-existent screen', () => {
      const result = service.heartbeat('non-existent-screen', apiKey);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe(404);
    });
  });

  describe('Screen Online/Offline Detection', () => {
    let screenId;
    let apiKey;

    beforeEach(() => {
      const { code } = service.generatePairingCode('owner-123', 'Test Screen');
      const result = service.claimCode(code, { deviceId: 'device-abc' });
      screenId = result.data.screenId;
      apiKey = result.data.apiKey;
    });

    it('screen marked online when last_seen < 2 min ago', () => {
      // Just paired, should be online
      expect(service.isScreenOnline(screenId)).toBe(true);

      // Advance 1 minute
      vi.advanceTimersByTime(60 * 1000);
      service.heartbeat(screenId, apiKey);

      expect(service.isScreenOnline(screenId)).toBe(true);
    });

    it('screen marked offline when last_seen > 2 min ago', () => {
      // Advance 3 minutes without heartbeat
      vi.advanceTimersByTime(3 * 60 * 1000);

      expect(service.isScreenOnline(screenId)).toBe(false);
    });

    it('screen comes back online after heartbeat', () => {
      // Go offline
      vi.advanceTimersByTime(3 * 60 * 1000);
      expect(service.isScreenOnline(screenId)).toBe(false);

      // Send heartbeat
      service.heartbeat(screenId, apiKey);

      expect(service.isScreenOnline(screenId)).toBe(true);
    });

    it('custom timeout threshold is respected', () => {
      const shortThreshold = 30 * 1000; // 30 seconds

      // Advance 45 seconds
      vi.advanceTimersByTime(45 * 1000);

      // Default 2-min threshold: still online
      expect(service.isScreenOnline(screenId)).toBe(true);

      // Custom 30-second threshold: offline
      expect(service.isScreenOnline(screenId, shortThreshold)).toBe(false);
    });
  });

  describe('Device Command Queue', () => {
    let screenId;

    beforeEach(() => {
      const { code } = service.generatePairingCode('owner-123', 'Test Screen');
      const result = service.claimCode(code, { deviceId: 'device-abc' });
      screenId = result.data.screenId;
    });

    it('supports reboot command', () => {
      const success = service.queueCommand(screenId, {
        type: 'reboot',
        payload: { delay: 5 }
      });

      expect(success).toBe(true);
      const screen = service.getScreen(screenId);
      expect(screen.pending_commands[0].type).toBe('reboot');
      expect(screen.pending_commands[0].payload.delay).toBe(5);
    });

    it('supports update_content command', () => {
      const success = service.queueCommand(screenId, {
        type: 'update_content',
        payload: { playlistId: 'playlist-123' }
      });

      expect(success).toBe(true);
      const screen = service.getScreen(screenId);
      expect(screen.pending_commands[0].type).toBe('update_content');
    });

    it('returns false for non-existent screen', () => {
      const success = service.queueCommand('fake-screen', {
        type: 'reboot',
        payload: {}
      });

      expect(success).toBe(false);
    });

    it('commands have unique IDs and timestamps', () => {
      service.queueCommand(screenId, { type: 'reboot', payload: {} });
      service.queueCommand(screenId, { type: 'reload', payload: {} });

      const screen = service.getScreen(screenId);
      const cmd1 = screen.pending_commands[0];
      const cmd2 = screen.pending_commands[1];

      expect(cmd1.id).not.toBe(cmd2.id);
      expect(cmd1.createdAt).toBeDefined();
      expect(cmd2.createdAt).toBeDefined();
    });
  });
});
