import { generateMediaId } from '../types/media';

/**
 * Migrate old media format to UnifiedMediaState
 *
 * Converts:
 * - carouselImages → imageItems
 * - backgroundImage → imageItems
 * - backgroundVideo → videoItems
 *
 * @param {Object} listing - Old listing object with carousel/background fields
 * @returns {import('../types/media').UnifiedMediaState}
 */
export function migrateToUnifiedMedia(listing) {
  const imageItems = [];
  const videoItems = [];
  let activeType = 'image';

  // Migrate carousel images (uploaded)
  if (listing.carouselImages && Array.isArray(listing.carouselImages)) {
    listing.carouselImages.forEach(url => {
      if (url) {
        imageItems.push({
          id: generateMediaId(),
          url,
          source: 'uploaded' // Carousel images were uploaded
        });
      }
    });
  }

  // Migrate background image
  if (listing.backgroundImage && listing.backgroundImage.trim()) {
    // Check if it's already in imageItems (avoid duplicates)
    const exists = imageItems.some(item => item.url === listing.backgroundImage);
    if (!exists) {
      // Determine if it's predefined or uploaded
      const isPredefined = listing.backgroundImage.includes('unsplash.com');
      imageItems.push({
        id: generateMediaId(),
        url: listing.backgroundImage,
        source: isPredefined ? 'predefined' : 'uploaded'
      });
    }
  }

  // Migrate background video
  if (listing.backgroundVideo && listing.backgroundVideo.trim()) {
    const isPredefined = listing.backgroundVideo.includes('googleapis.com');
    videoItems.push({
      id: generateMediaId(),
      url: listing.backgroundVideo,
      source: isPredefined ? 'predefined' : 'uploaded'
    });
    // If there's a video, make video the active type
    if (videoItems.length > 0) {
      activeType = 'video';
    }
  }

  // If both exist, prefer images as active type unless video was explicitly set
  if (imageItems.length > 0 && videoItems.length === 0) {
    activeType = 'image';
  }

  // If unifiedMediaState already exists, use it (already migrated)
  if (listing.unifiedMediaState) {
    return listing.unifiedMediaState;
  }

  return {
    activeType,
    imageItems,
    videoItems,
    imageRotationIntervalSeconds: 10 // default
  };
}

/**
 * Convert UnifiedMediaState back to old format for database storage
 * (Temporary - until database schema is updated)
 *
 * @param {import('../types/media').UnifiedMediaState} unifiedMediaState
 * @returns {Object} - Old format fields
 */
export function convertToLegacyFormat(unifiedMediaState) {
  const { activeType, imageItems, videoItems } = unifiedMediaState;

  // For backwards compatibility
  const result = {
    carouselImages: [],
    backgroundImage: '',
    backgroundVideo: ''
  };

  if (activeType === 'image' && imageItems.length > 0) {
    // Use all image URLs as carousel images
    result.carouselImages = imageItems.map(item => item.url);
    // First image as background (for legacy)
    result.backgroundImage = imageItems[0].url;
  } else if (activeType === 'video' && videoItems.length > 0) {
    // First video as background (for legacy)
    result.backgroundVideo = videoItems[0].url;
  }

  return result;
}
