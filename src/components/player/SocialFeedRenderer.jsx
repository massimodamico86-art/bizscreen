/**
 * Social Feed Renderer for Player
 *
 * Renders social media feeds in the Player using cached data only.
 * Does NOT make API calls - relies entirely on pre-synced cached data.
 * Supports offline mode using last-known cached content.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Heart, MessageCircle, Share2, Star } from 'lucide-react';
import { supabase } from '../../supabase';
import { loggingService } from '../../services/loggingService.js';

/**
 * Fetch cached posts for player (no API calls, cached data only)
 */
async function fetchCachedPosts(widgetId, accountId, maxItems = 6) {
  try {
    // Try to get from widget settings first
    if (widgetId) {
      const { data: settings } = await supabase
        .from('social_feed_settings')
        .select('*')
        .eq('widget_id', widgetId)
        .single();

      if (settings?.account_id) {
        const { data: posts } = await supabase
          .from('social_feeds')
          .select('*')
          .eq('account_id', settings.account_id)
          .order('posted_at', { ascending: false })
          .limit(settings.max_items || maxItems);

        return { posts: posts || [], settings };
      }
    }

    // Fallback to direct account query
    if (accountId) {
      const { data: posts } = await supabase
        .from('social_feeds')
        .select('*')
        .eq('account_id', accountId)
        .order('posted_at', { ascending: false })
        .limit(maxItems);

      return { posts: posts || [], settings: null };
    }

    return { posts: [], settings: null };
  } catch (error) {
    loggingService.error('[SocialFeedRenderer] Error fetching cached posts', { error, widgetId, accountId });
    return { posts: [], settings: null };
  }
}

/**
 * Main Social Feed Renderer for Player
 */
export default function SocialFeedRenderer({
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
  style = {},
  onError,
}) {
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const rotationRef = useRef(null);

  // Effective settings (from widget config or props)
  const effectiveLayout = settings?.layout || layout;
  const effectiveMaxItems = settings?.max_items || maxItems;
  const effectiveShowCaption = settings?.show_caption ?? showCaption;
  const effectiveShowLikes = settings?.show_likes ?? showLikes;
  const effectiveShowDate = settings?.show_date ?? showDate;
  const effectiveShowAuthor = settings?.show_author ?? showAuthor;
  const effectiveRotationSpeed = settings?.rotation_speed || rotationSpeed;

  // Load cached posts
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const result = await fetchCachedPosts(widgetId, accountId, effectiveMaxItems);
        setPosts(result.posts);
        setSettings(result.settings);
      } catch (error) {
        loggingService.error('[SocialFeedRenderer] Error loading posts', { error, widgetId, accountId });
        onError?.(error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [widgetId, accountId, effectiveMaxItems, onError]);

  // Auto-rotation for carousel/single layouts
  useEffect(() => {
    if (
      (effectiveLayout === 'carousel' || effectiveLayout === 'single') &&
      posts.length > 1 &&
      effectiveRotationSpeed > 0
    ) {
      rotationRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }, effectiveRotationSpeed * 1000);

      return () => {
        if (rotationRef.current) {
          clearInterval(rotationRef.current);
        }
      };
    }
  }, [effectiveLayout, posts.length, effectiveRotationSpeed]);

  // Loading state - show subtle placeholder
  if (loading) {
    return (
      <div style={style} className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="animate-pulse w-8 h-8 rounded-full bg-white/20" />
      </div>
    );
  }

  // No posts - show placeholder
  if (posts.length === 0) {
    return (
      <div style={style} className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-white/50 text-sm">Social Feed</div>
      </div>
    );
  }

  // Render based on layout
  const renderProps = {
    posts,
    currentIndex,
    provider: settings?.provider || provider,
    showCaption: effectiveShowCaption,
    showLikes: effectiveShowLikes,
    showDate: effectiveShowDate,
    showAuthor: effectiveShowAuthor,
    style,
  };

  switch (effectiveLayout) {
    case 'carousel':
      return <CarouselView {...renderProps} />;
    case 'grid':
      return <GridView {...renderProps} />;
    case 'list':
      return <ListView {...renderProps} />;
    case 'single':
      return <SingleView {...renderProps} />;
    case 'masonry':
      return <MasonryView {...renderProps} />;
    default:
      return <CarouselView {...renderProps} />;
  }
}

/**
 * Carousel View - auto-rotating single post display
 */
function CarouselView({ posts, currentIndex, provider, showCaption, showLikes, showDate, showAuthor, style }) {
  const post = posts[currentIndex];
  if (!post) return null;

  return (
    <div style={style} className="w-full h-full relative overflow-hidden">
      {/* Media */}
      <div className="absolute inset-0">
        {post.media_type === 'video' ? (
          <video
            src={post.media_url}
            poster={post.thumbnail_url}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        ) : (
          <img
            src={post.media_url || post.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Gradient overlay */}
      {(showCaption || showLikes || showAuthor) && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      )}

      {/* Post info */}
      {(showCaption || showLikes || showAuthor) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          {showAuthor && post.author_name && (
            <p className="font-semibold text-sm mb-1">{post.author_name}</p>
          )}
          {showCaption && post.content_text && (
            <p className="text-sm opacity-90 line-clamp-2 mb-2">{post.content_text}</p>
          )}
          {showLikes && (
            <div className="flex items-center gap-3 text-xs opacity-75">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" />
                {formatNumber(post.likes_count)}
              </span>
              {post.comments_count > 0 && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {formatNumber(post.comments_count)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Position dots */}
      {posts.length > 1 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
          {posts.map((_, idx) => (
            <div
              key={idx}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Grid View - fixed grid of posts
 */
function GridView({ posts, provider, showCaption, showLikes, style }) {
  const gridCols = posts.length <= 4 ? 2 : 3;

  return (
    <div
      style={style}
      className="w-full h-full grid gap-1 p-1"
      style={{
        ...style,
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${Math.ceil(posts.length / gridCols)}, 1fr)`,
      }}
    >
      {posts.map((post, idx) => (
        <div key={post.id || idx} className="relative overflow-hidden bg-gray-800">
          <img
            src={post.thumbnail_url || post.media_url}
            alt=""
            className="w-full h-full object-cover"
          />
          {post.media_type === 'video' && (
            <div className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1 rounded">
              Video
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * List View - vertical list of posts
 */
function ListView({ posts, provider, showCaption, showLikes, showDate, showAuthor, style }) {
  return (
    <div style={style} className="w-full h-full overflow-hidden flex flex-col gap-2 p-2">
      {posts.slice(0, 4).map((post, idx) => (
        <div key={post.id || idx} className="flex gap-2 bg-white/10 rounded p-2 flex-1 min-h-0">
          {/* Thumbnail */}
          <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden">
            <img
              src={post.thumbnail_url || post.media_url}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 text-white">
            {showAuthor && post.author_name && (
              <p className="text-xs font-medium truncate">{post.author_name}</p>
            )}
            {showCaption && post.content_text && (
              <p className="text-xs opacity-75 line-clamp-2">{post.content_text}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single View - single post with full details
 */
function SingleView({ posts, currentIndex, provider, showCaption, showLikes, showDate, showAuthor, style }) {
  const post = posts[currentIndex];
  if (!post) return null;

  // Google Reviews special rendering
  if (provider === 'google' && post.rating) {
    return (
      <div style={style} className="w-full h-full bg-white flex flex-col p-4">
        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-5 h-5 ${
                star <= post.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        {/* Review text */}
        {showCaption && post.content_text && (
          <p className="text-gray-700 text-sm flex-1 line-clamp-4">"{post.content_text}"</p>
        )}
        {/* Author */}
        {showAuthor && post.author_name && (
          <div className="flex items-center gap-2 mt-2">
            {post.author_avatar && (
              <img src={post.author_avatar} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm font-medium text-gray-900">{post.author_name}</span>
          </div>
        )}
      </div>
    );
  }

  // Standard post
  return (
    <div style={style} className="w-full h-full relative overflow-hidden">
      {post.media_type === 'video' ? (
        <video
          src={post.media_url}
          poster={post.thumbnail_url}
          className="w-full h-full object-cover"
          muted
          loop
          autoPlay
          playsInline
        />
      ) : (
        <img
          src={post.media_url || post.thumbnail_url}
          alt=""
          className="w-full h-full object-cover"
        />
      )}

      {(showCaption || showLikes || showAuthor) && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            {showAuthor && post.author_name && (
              <p className="font-semibold text-sm mb-1">{post.author_name}</p>
            )}
            {showCaption && post.content_text && (
              <p className="text-sm opacity-90 line-clamp-3">{post.content_text}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Masonry View - Pinterest-style layout
 */
function MasonryView({ posts, provider, showCaption, style }) {
  const leftCol = posts.filter((_, i) => i % 2 === 0);
  const rightCol = posts.filter((_, i) => i % 2 === 1);

  return (
    <div style={style} className="w-full h-full flex gap-1 p-1">
      {[leftCol, rightCol].map((col, colIdx) => (
        <div key={colIdx} className="flex-1 flex flex-col gap-1">
          {col.map((post, idx) => (
            <div key={post.id || idx} className="relative overflow-hidden rounded flex-1">
              <img
                src={post.thumbnail_url || post.media_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Helpers
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}
