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
  owner_id: 'user-123',
  tenant_id: 'tenant-123',
  shuffle: false,
  defaultDuration: 10,
  items: [mockPlaylistItem],
};

export const mockPlaylistItems = [
  mockPlaylistItem,
  { ...mockPlaylistItem, id: 'item-2', position: 1, name: 'Image 2' },
];

export function createMockPlaylist(overrides = {}) {
  return { ...mockPlaylist, ...overrides };
}
