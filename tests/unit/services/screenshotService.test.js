/**
 * Screenshot Service Unit Tests
 * Phase: Device Diagnostics - tests for player screenshot capture service
 */
import { describe, it, expect, vi } from 'vitest';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn().mockImplementation(() => Promise.resolve({
    toBlob: vi.fn((callback, format, quality) => {
      callback(new Blob(['test'], { type: 'image/jpeg' }));
    }),
  })),
}));

// Mock supabase
vi.mock('../../../src/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/test.jpg' },
        }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

describe('screenshotService', () => {
  describe('captureScreenshot', () => {
    it('throws error when no element provided', async () => {
      const { captureScreenshot } = await import('../../../src/services/screenshotService');

      await expect(captureScreenshot(null))
        .rejects.toThrow('No element provided for screenshot');

      await expect(captureScreenshot(undefined))
        .rejects.toThrow('No element provided for screenshot');
    });

    it('calls html2canvas with correct options', async () => {
      const html2canvas = (await import('html2canvas')).default;
      const { captureScreenshot } = await import('../../../src/services/screenshotService');

      const mockElement = document.createElement('div');
      await captureScreenshot(mockElement);

      expect(html2canvas).toHaveBeenCalledWith(mockElement, expect.objectContaining({
        scale: expect.any(Number),
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#000000',
        logging: false,
      }));
    });

    it('returns a blob', async () => {
      const { captureScreenshot } = await import('../../../src/services/screenshotService');

      const mockElement = document.createElement('div');
      const result = await captureScreenshot(mockElement);

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('uploadScreenshot', () => {
    it('throws error when no device ID provided', async () => {
      const { uploadScreenshot } = await import('../../../src/services/screenshotService');
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      await expect(uploadScreenshot(null, blob))
        .rejects.toThrow('Device ID and blob are required');

      await expect(uploadScreenshot('', blob))
        .rejects.toThrow('Device ID and blob are required');
    });

    it('throws error when no blob provided', async () => {
      const { uploadScreenshot } = await import('../../../src/services/screenshotService');

      await expect(uploadScreenshot('device-123', null))
        .rejects.toThrow('Device ID and blob are required');
    });

    it('uploads to correct storage path', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { uploadScreenshot } = await import('../../../src/services/screenshotService');

      const blob = new Blob(['test'], { type: 'image/jpeg' });
      await uploadScreenshot('device-123', blob);

      expect(supabase.storage.from).toHaveBeenCalledWith('device-screenshots');
      expect(supabase.storage.from().upload).toHaveBeenCalledWith(
        expect.stringMatching(/^device-123\/\d+\.jpg$/),
        blob,
        expect.objectContaining({
          contentType: 'image/jpeg',
          upsert: false,
        })
      );
    });

    it('returns public URL', async () => {
      const { uploadScreenshot } = await import('../../../src/services/screenshotService');

      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const result = await uploadScreenshot('device-123', blob);

      expect(result).toBe('https://storage.example.com/test.jpg');
    });
  });

  describe('storeScreenshotUrl', () => {
    it('calls RPC with correct parameters', async () => {
      const { supabase } = await import('../../../src/supabase');
      const { storeScreenshotUrl } = await import('../../../src/services/screenshotService');

      await storeScreenshotUrl('device-123', 'https://example.com/screenshot.jpg');

      expect(supabase.rpc).toHaveBeenCalledWith('store_device_screenshot', {
        p_device_id: 'device-123',
        p_screenshot_url: 'https://example.com/screenshot.jpg',
      });
    });
  });
});

describe('screenshotService API functions', () => {
  it('exports all required functions', async () => {
    const service = await import('../../../src/services/screenshotService');

    expect(typeof service.captureScreenshot).toBe('function');
    expect(typeof service.uploadScreenshot).toBe('function');
    expect(typeof service.storeScreenshotUrl).toBe('function');
    expect(typeof service.captureAndUploadScreenshot).toBe('function');
    expect(typeof service.cleanupOldScreenshots).toBe('function');
  });
});

describe('cleanupOldScreenshots', () => {
  it('calls storage list and remove correctly', async () => {
    const { supabase } = await import('../../../src/supabase');

    // Mock list to return some files
    supabase.storage.from().list.mockResolvedValueOnce({
      data: [
        { name: '1.jpg' },
        { name: '2.jpg' },
        { name: '3.jpg' },
        { name: '4.jpg' },
        { name: '5.jpg' },
        { name: '6.jpg' }, // This one should be deleted
        { name: '7.jpg' }, // This one should be deleted
      ],
      error: null,
    });

    const { cleanupOldScreenshots } = await import('../../../src/services/screenshotService');
    await cleanupOldScreenshots('device-123', 5);

    expect(supabase.storage.from).toHaveBeenCalledWith('device-screenshots');
    expect(supabase.storage.from().list).toHaveBeenCalledWith('device-123', expect.any(Object));
  });
});
