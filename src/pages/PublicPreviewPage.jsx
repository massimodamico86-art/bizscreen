/**
 * PublicPreviewPage - Token-based public preview for external reviewers
 *
 * Route: /preview/:token
 * No authentication required - uses token-based access
 *
 * Features:
 * - Renders playlist, layout, or campaign content
 * - Comments section (if enabled for the preview link)
 * - Responsive preview with scale controls
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  Clock,
  Image as ImageIcon,
  Layout,
  ListVideo,
  Zap,
  User,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useTranslation } from '../i18n';

// API base URL
const API_BASE = '';

// ============================================================================
// PREVIEW CONTENT FETCHING
// ============================================================================

async function fetchPreviewContent(token) {
  const res = await fetch(`${API_BASE}/api/preview/${token}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to load preview' }));
    throw new Error(error.error || 'Failed to load preview');
  }
  return res.json();
}

async function fetchPreviewComments(token) {
  const res = await fetch(`${API_BASE}/api/preview/comment?token=${token}`);
  if (!res.ok) {
    return { comments: [] };
  }
  return res.json();
}

async function addPreviewComment(token, message, authorName) {
  const res = await fetch(`${API_BASE}/api/preview/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, message, authorName }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to add comment' }));
    throw new Error(error.error || 'Failed to add comment');
  }
  return res.json();
}

// ============================================================================
// APP COMPONENTS (copied from Player.jsx for standalone rendering)
// ============================================================================

function ClockApp({ config }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = () => {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: config?.format?.includes('A') || config?.format?.includes('a'),
    };
    if (config?.showSeconds) {
      options.second = '2-digit';
    }
    if (config?.timezone && config.timezone !== 'device') {
      options.timeZone = config.timezone;
    }
    return time.toLocaleTimeString('en-US', options);
  };

  const formatDate = () => {
    const options = {
      weekday: config?.dateFormat?.includes('dddd') ? 'long' : undefined,
      month: config?.dateFormat?.includes('MMMM')
        ? 'long'
        : config?.dateFormat?.includes('MMM')
        ? 'short'
        : '2-digit',
      day: 'numeric',
      year: config?.dateFormat?.includes('YYYY') ? 'numeric' : undefined,
    };
    if (config?.timezone && config.timezone !== 'device') {
      options.timeZone = config.timezone;
    }
    return time.toLocaleDateString('en-US', options);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: 'clamp(3rem, 12vw, 8rem)',
            fontWeight: '200',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: '0.5rem',
          }}
        >
          {formatTime()}
        </p>
        {config?.showDate !== false && (
          <p
            style={{
              fontSize: 'clamp(1rem, 3vw, 2rem)',
              color: '#94a3b8',
              fontWeight: '300',
            }}
          >
            {formatDate()}
          </p>
        )}
      </div>
    </div>
  );
}

function WebPageApp({ config, name }) {
  if (!config?.url) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p>No URL configured</p>
      </div>
    );
  }

  return (
    <iframe
      src={config.url}
      title={name || 'Web Page'}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        transform: config.zoomLevel ? `scale(${config.zoomLevel})` : undefined,
        transformOrigin: 'top left',
      }}
    />
  );
}

function AppRenderer({ item }) {
  const config = item.config || {};
  const appType = config.appType;

  if (appType === 'clock') {
    return <ClockApp config={config} />;
  }

  if (appType === 'web_page') {
    return <WebPageApp config={config} name={item.name} />;
  }

  // Unknown app type placeholder
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          {item.name}
        </p>
        <p style={{ color: '#64748b' }}>App: {appType || 'Unknown'}</p>
      </div>
    </div>
  );
}

// ============================================================================
// ZONE PLAYER (for layout previews)
// ============================================================================

function ZonePlayer({ zone, autoPlay = true }) {
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (zone.content?.type === 'playlist' && zone.content.items) {
      setItems(zone.content.items);
      setCurrentIndex(0);
    } else if (zone.content?.type === 'media' && zone.content.item) {
      setItems([zone.content.item]);
      setCurrentIndex(0);
    } else {
      setItems([]);
    }
  }, [zone]);

  const advanceToNext = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  // Timer for duration-based advancement
  useEffect(() => {
    if (!autoPlay || items.length === 0) return;
    const currentItem = items[currentIndex];
    if (!currentItem || currentItem.mediaType === 'video') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const duration = (currentItem.duration || zone.content?.playlist?.defaultDuration || 10) * 1000;
    timerRef.current = setTimeout(advanceToNext, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items, zone.content?.playlist?.defaultDuration, advanceToNext, autoPlay]);

  if (!zone.content || items.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.3)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '0.875rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p>{zone.zone_name}</p>
          <p style={{ opacity: 0.5 }}>No content</p>
        </div>
      </div>
    );
  }

  const currentItem = items[currentIndex];

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {currentItem.mediaType === 'video' ? (
        <video
          ref={videoRef}
          key={currentItem.id}
          src={currentItem.url}
          autoPlay={autoPlay}
          muted
          playsInline
          onEnded={advanceToNext}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'image' ? (
        <img
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.name}
          onError={advanceToNext}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : currentItem.mediaType === 'app' ? (
        <AppRenderer item={currentItem} />
      ) : currentItem.mediaType === 'web_page' ? (
        <iframe
          key={currentItem.id}
          src={currentItem.url}
          title={currentItem.name}
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1e293b',
            color: 'white',
          }}
        >
          <p>{currentItem.name}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LAYOUT RENDERER
// ============================================================================

function LayoutRenderer({ layout, autoPlay = true }) {
  if (!layout || !layout.zones || layout.zones.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{layout?.name || 'Layout'}</p>
          <p style={{ color: '#64748b' }}>No zones configured</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
      }}
    >
      {layout.zones.map((zone) => (
        <div
          key={zone.id}
          style={{
            position: 'absolute',
            left: `${zone.x_percent}%`,
            top: `${zone.y_percent}%`,
            width: `${zone.width_percent}%`,
            height: `${zone.height_percent}%`,
            zIndex: zone.z_index || 0,
            overflow: 'hidden',
          }}
        >
          <ZonePlayer zone={zone} autoPlay={autoPlay} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PLAYLIST PREVIEW PLAYER
// ============================================================================

function PlaylistPreviewPlayer({ items, defaultDuration = 10, autoPlay = true }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  const currentItem = items[currentIndex] || null;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Timer for duration-based advancement
  useEffect(() => {
    if (!isPlaying || items.length === 0 || !currentItem) return;
    if (currentItem.mediaType === 'video') return; // Videos use onEnded

    if (timerRef.current) clearTimeout(timerRef.current);

    const duration = (currentItem.duration || defaultDuration) * 1000;
    timerRef.current = setTimeout(goToNext, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items.length, currentItem, defaultDuration, goToNext, isPlaying]);

  if (items.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p>No items in playlist</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* Content */}
      <div className="absolute inset-0">
        {currentItem.mediaType === 'video' ? (
          <video
            ref={videoRef}
            key={currentItem.id}
            src={currentItem.url}
            autoPlay={isPlaying}
            muted
            playsInline
            onEnded={goToNext}
            className="w-full h-full object-contain"
          />
        ) : currentItem.mediaType === 'image' ? (
          <img
            key={currentItem.id}
            src={currentItem.url}
            alt={currentItem.name}
            className="w-full h-full object-contain"
          />
        ) : currentItem.mediaType === 'app' ? (
          <AppRenderer item={currentItem} />
        ) : currentItem.mediaType === 'web_page' ? (
          <iframe
            key={currentItem.id}
            src={currentItem.url}
            title={currentItem.name}
            className="w-full h-full border-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
            <p>{currentItem.name}</p>
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrev}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Previous"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="Next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm opacity-75">
              {currentIndex + 1} / {items.length}
            </span>
            <span className="text-sm font-medium truncate max-w-[200px]">
              {currentItem.name}
            </span>
          </div>
        </div>

        {/* Progress dots */}
        {items.length > 1 && items.length <= 20 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// COMMENTS SECTION
// ============================================================================

function CommentsSection({ token, allowComments }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      try {
        const data = await fetchPreviewComments(token);
        setComments(data.comments || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoading(false);
      }
    };
    loadComments();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await addPreviewComment(token, newComment.trim(), authorName.trim() || 'Anonymous');
      // Reload comments
      const data = await fetchPreviewComments(token);
      setComments(data.comments || []);
      setNewComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!allowComments) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-900">Comments</h3>
        <span className="text-sm text-gray-500">({comments.length})</span>
      </div>

      {/* Comments list */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No comments yet. Be the first!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900">
                        {comment.author_name || 'Anonymous'}
                      </span>
                      {comment.is_external && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          External
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-t border-gray-200">
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="mb-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// MAIN PUBLIC PREVIEW PAGE
// ============================================================================

export default function PublicPreviewPage() {
  const { token } = useParams();
  const { t } = useTranslation();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Load preview content
  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchPreviewContent(token);
        setPreview(data);
      } catch (err) {
        console.error('Failed to load preview:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [token]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get resource type icon
  const getResourceIcon = (type) => {
    switch (type) {
      case 'playlist':
        return <ListVideo className="w-5 h-5" />;
      case 'layout':
        return <Layout className="w-5 h-5" />;
      case 'campaign':
        return <Zap className="w-5 h-5" />;
      default:
        return <ImageIcon className="w-5 h-5" />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Play className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <p className="text-gray-600">{t('publicPreview.loading', 'Loading preview...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('publicPreview.error.title', 'Preview Unavailable')}</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            {t('publicPreview.error.description', 'This preview link may have expired or been revoked.')}
          </p>
        </div>
      </div>
    );
  }

  // No content
  if (!preview || !preview.content) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{t('publicPreview.noContent.title', 'No Content')}</h1>
          <p className="text-gray-600">{t('publicPreview.noContent.description', 'This preview has no content to display.')}</p>
        </div>
      </div>
    );
  }

  const { resource, content, review, link } = preview;
  const resourceType = resource?.type || 'playlist';
  const resourceName = resource?.name || 'Preview';
  const allowComments = link?.allow_comments ?? false;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Skip to content link - accessibility */}
      <a href="#main-content" className="skip-link">
        {t('accessibility.skipToContent')}
      </a>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              {getResourceIcon(resourceType)}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{resourceName}</h1>
              <p className="text-sm text-gray-500 capitalize flex items-center gap-2">
                {resourceType} Preview
                {review?.status === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    <Clock className="w-3 h-3" />
                    Awaiting Review
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={isFullscreen ? t('publicPreview.exitFullscreen', 'Exit fullscreen') : t('publicPreview.fullscreen', 'Fullscreen')}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-600" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview area */}
          <div className={`${allowComments ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div
              ref={containerRef}
              className="bg-black rounded-xl overflow-hidden shadow-lg"
              style={{ aspectRatio: '16/9' }}
            >
              {resourceType === 'layout' && content.layout ? (
                <LayoutRenderer layout={content.layout} autoPlay={true} />
              ) : resourceType === 'playlist' && content.items ? (
                <PlaylistPreviewPlayer
                  items={content.items}
                  defaultDuration={content.playlist?.defaultDuration || 10}
                  autoPlay={true}
                />
              ) : resourceType === 'campaign' && content.layout ? (
                <LayoutRenderer layout={content.layout} autoPlay={true} />
              ) : resourceType === 'campaign' && content.items ? (
                <PlaylistPreviewPlayer
                  items={content.items}
                  defaultDuration={content.playlist?.defaultDuration || 10}
                  autoPlay={true}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p>Unable to render preview</p>
                </div>
              )}
            </div>

            {/* Resource info */}
            <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {content.playlist && (
                  <div className="flex items-center gap-1.5">
                    <ListVideo className="w-4 h-4" />
                    <span>{content.items?.length || 0} items</span>
                  </div>
                )}
                {content.layout && (
                  <div className="flex items-center gap-1.5">
                    <Layout className="w-4 h-4" />
                    <span>{content.layout.zones?.length || 0} zones</span>
                  </div>
                )}
                {review?.message && (
                  <div className="flex-1 border-l border-gray-200 pl-4 ml-2">
                    <p className="text-gray-500 italic">"{review.message}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Comments sidebar */}
          {allowComments && (
            <div className="lg:col-span-1">
              <CommentsSection token={token} allowComments={allowComments} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 pb-6 text-center text-sm text-gray-500">
        <p>Preview shared via BizScreen</p>
        {link?.expires_at && (
          <p className="mt-1">
            Link expires: {new Date(link.expires_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </footer>
    </div>
  );
}
