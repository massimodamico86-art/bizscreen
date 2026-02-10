export const mockPlaylistItem = {
  id: 'item-1',
  position: 0,
  type: 'media',
  mediaType: 'image',
  url: 'https://example.com/image.jpg',
  name: 'Test Image',
  duration: 10,
};

export const mockPlaylist = {
  id: 'playlist-123',
  name: 'Test Playlist',
  description: null,
  owner_id: 'user-123',
  tenant_id: 'tenant-123',
  shuffle: false,
  default_duration: 10,
  transition_effect: 'fade',
  items: [mockPlaylistItem],
};

export const mockPlaylistItems = [
  mockPlaylistItem,
  { ...mockPlaylistItem, id: 'item-2', position: 1, name: 'Image 2' },
];

/**
 *
 * @param overrides
 */
export function createMockPlaylist(overrides = {}) {
  return { ...mockPlaylist, ...overrides };
}
