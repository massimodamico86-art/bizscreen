/**
 * Social Feed Widget
 *
 * Widget component for displaying social media feeds in scenes.
 * Supports Instagram, Facebook, TikTok, and Google Reviews with
 * various layout options.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LAYOUT_OPTIONS,
} from '../services/social';
import { getSocialFeedPosts, getCachedPosts } from '../services/socialFeedSyncService';
import { useLogger } from '../hooks/useLogger.js';

/**
 * Main Social Feed Widget component
 */
export default function SocialFeedWidget({
  widgetId,
  accountId,
  provider = 'instagram',
  layout = 'carousel',
  maxItems = 6,
  showCaption = true,
  showLikes = true,
  showDate = true,
  showAuthor = true,
  rotationSpeed = 5,
  className = '',
  isPreview = false,
}) {
  const logger = useLogger('SocialFeedWidget');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let feedPosts;

      if (widgetId) {
        feedPosts = await getSocialFeedPosts(widgetId);
      } else if (accountId) {
        feedPosts = await getCachedPosts(accountId, maxItems);
      }

      setPosts(feedPosts || []);
    } catch (err) {
      logger.error('Failed to load social feed', { error: err, widgetId, accountId, provider });
      setError(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [widgetId, accountId, maxItems]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Auto-rotate for carousel/single layouts
  useEffect(() => {
    if (
      (layout === LAYOUT_OPTIONS.CAROUSEL || layout === LAYOUT_OPTIONS.SINGLE) &&
      posts.length > 1 &&
      rotationSpeed > 0
    ) {
      const timer = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }, rotationSpeed * 1000);

      return () => clearInterval(timer);
    }
  }, [layout, posts.length, rotationSpeed]);

  // Navigation for carousel
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % posts.length);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 text-red-500 ${className}`}>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className={`flex items-center justify-center p-4 text-gray-400 ${className}`}>
        <p className="text-sm">No posts to display</p>
      </div>
    );
  }

  // Render based on layout
  switch (layout) {
    case LAYOUT_OPTIONS.CAROUSEL:
      return (
        <CarouselLayout
          posts={posts}
          currentIndex={currentIndex}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          showDate={showDate}
          showAuthor={showAuthor}
          onPrevious={goToPrevious}
          onNext={goToNext}
          className={className}
        />
      );

    case LAYOUT_OPTIONS.GRID:
      return (
        <GridLayout
          posts={posts.slice(0, maxItems)}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          className={className}
        />
      );

    case LAYOUT_OPTIONS.LIST:
      return (
        <ListLayout
          posts={posts.slice(0, maxItems)}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          showDate={showDate}
          showAuthor={showAuthor}
          className={className}
        />
      );

    case LAYOUT_OPTIONS.SINGLE:
      return (
        <SingleLayout
          post={posts[currentIndex]}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          showDate={showDate}
          showAuthor={showAuthor}
          className={className}
        />
      );

    case LAYOUT_OPTIONS.MASONRY:
      return (
        <MasonryLayout
          posts={posts.slice(0, maxItems)}
          provider={provider}
          showCaption={showCaption}
          className={className}
        />
      );

    default:
      return (
        <GridLayout
          posts={posts.slice(0, maxItems)}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          className={className}
        />
      );
  }
}

/**
 * Carousel Layout - horizontal sliding carousel
 */
function CarouselLayout({
  posts,
  currentIndex,
  provider,
  showCaption,
  showLikes,
  showDate,
  showAuthor,
  onPrevious,
  onNext,
  className,
}) {
  const post = posts[currentIndex];
  if (!post) return null;

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Main content */}
      <div className="w-full h-full flex flex-col">
        {/* Media */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {post.media_type === 'video' ? (
            <video
              src={post.media_url}
              poster={post.thumbnail_url}
              className="w-full h-full object-cover"
              muted
              loop
              autoPlay
            />
          ) : (
            <img
              src={post.media_url || post.thumbnail_url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}

          {/* Navigation arrows */}
          {posts.length > 1 && (
            <>
              <button
                onClick={onPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Position indicator */}
          {posts.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {posts.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Post info */}
        {(showCaption || showLikes || showAuthor) && (
          <PostInfo
            post={post}
            provider={provider}
            showCaption={showCaption}
            showLikes={showLikes}
            showDate={showDate}
            showAuthor={showAuthor}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Grid Layout - fixed grid of posts
 */
function GridLayout({ posts, provider, showCaption, showLikes, className }) {
  const gridCols = posts.length <= 4 ? 2 : 3;

  return (
    <div
      className={`grid gap-2 w-full h-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
    >
      {posts.map((post) => (
        <div key={post.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
          <img
            src={post.thumbnail_url || post.media_url}
            alt=""
            className="w-full h-full object-cover"
          />

          {/* Overlay with info */}
          {(showCaption || showLikes) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                {showLikes && (
                  <div className="flex items-center gap-2 text-xs">
                    <Heart className="w-3 h-3" />
                    {post.likes_count}
                    {post.comments_count > 0 && (
                      <>
                        <MessageCircle className="w-3 h-3 ml-2" />
                        {post.comments_count}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video indicator */}
          {post.media_type === 'video' && (
            <div className="absolute top-2 right-2 bg-black/50 text-white px-1.5 py-0.5 rounded text-xs">
              Video
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * List Layout - vertical scrolling list
 */
function ListLayout({
  posts,
  provider,
  showCaption,
  showLikes,
  showDate,
  showAuthor,
  className,
}) {
  return (
    <div className={`flex flex-col gap-3 overflow-y-auto ${className}`}>
      {posts.map((post) => (
        <div key={post.id} className="flex gap-3 bg-white rounded-lg p-3 shadow-sm">
          {/* Thumbnail */}
          <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={post.thumbnail_url || post.media_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {showAuthor && post.author_name && (
              <p className="text-sm font-medium text-gray-900 truncate">
                {post.author_name}
              </p>
            )}
            {showCaption && post.content_text && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                {post.content_text}
              </p>
            )}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {showLikes && (
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {post.likes_count}
                </span>
              )}
              {showDate && post.posted_at && (
                <span>{formatDate(post.posted_at)}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single Layout - single post display
 */
function SingleLayout({
  post,
  provider,
  showCaption,
  showLikes,
  showDate,
  showAuthor,
  className,
}) {
  if (!post) return null;

  // Google Reviews special layout
  if (provider === 'google' && post.rating) {
    return (
      <div className={`flex flex-col h-full bg-white rounded-lg p-4 ${className}`}>
        {/* Rating stars */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-6 h-6 ${
                star <= post.rating
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Review text */}
        {showCaption && post.content_text && (
          <p className="text-gray-700 flex-1 text-lg leading-relaxed line-clamp-4">
            "{post.content_text}"
          </p>
        )}

        {/* Author */}
        {showAuthor && post.author_name && (
          <div className="flex items-center gap-3 mt-4">
            {post.author_avatar && (
              <img
                src={post.author_avatar}
                alt=""
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-gray-900">{post.author_name}</p>
              {showDate && post.posted_at && (
                <p className="text-sm text-gray-500">{formatDate(post.posted_at)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard post layout
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Media */}
      <div className="flex-1 relative overflow-hidden rounded-t-lg bg-black">
        {post.media_type === 'video' ? (
          <video
            src={post.media_url}
            poster={post.thumbnail_url}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
          />
        ) : (
          <img
            src={post.media_url || post.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Post info */}
      {(showCaption || showLikes || showAuthor) && (
        <PostInfo
          post={post}
          provider={provider}
          showCaption={showCaption}
          showLikes={showLikes}
          showDate={showDate}
          showAuthor={showAuthor}
        />
      )}
    </div>
  );
}

/**
 * Masonry Layout - Pinterest-style masonry grid
 */
function MasonryLayout({ posts, provider, showCaption, className }) {
  // Simple 2-column masonry
  const leftColumn = posts.filter((_, i) => i % 2 === 0);
  const rightColumn = posts.filter((_, i) => i % 2 === 1);

  return (
    <div className={`flex gap-2 h-full ${className}`}>
      {[leftColumn, rightColumn].map((column, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-2">
          {column.map((post) => (
            <div
              key={post.id}
              className="relative rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={post.thumbnail_url || post.media_url}
                alt=""
                className="w-full"
              />
              {showCaption && post.content_text && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs line-clamp-2">
                    {post.content_text}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Post Info component - displays author, caption, likes, date
 */
function PostInfo({ post, provider, showCaption, showLikes, showDate, showAuthor }) {
  return (
    <div className="bg-white p-3 rounded-b-lg">
      {/* Author */}
      {showAuthor && post.author_name && (
        <div className="flex items-center gap-2 mb-2">
          {post.author_avatar && (
            <img
              src={post.author_avatar}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium text-gray-900 text-sm">
            {post.author_name}
          </span>
        </div>
      )}

      {/* Caption */}
      {showCaption && post.content_text && (
        <p className="text-sm text-gray-700 line-clamp-2 mb-2">
          {post.content_text}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        {showLikes && (
          <>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatNumber(post.likes_count)}
            </span>
            {post.comments_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {formatNumber(post.comments_count)}
              </span>
            )}
            {post.shares_count > 0 && (
              <span className="flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" />
                {formatNumber(post.shares_count)}
              </span>
            )}
          </>
        )}
        {showDate && post.posted_at && (
          <span className="ml-auto">{formatDate(post.posted_at)}</span>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
