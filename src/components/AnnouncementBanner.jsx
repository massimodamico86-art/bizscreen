/**
 * AnnouncementBanner Component
 *
 * Displays priority announcements as a banner at the top of the page.
 * Shows one announcement at a time with auto-rotation.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, Megaphone, Sparkles, AlertTriangle, Wrench, Info } from 'lucide-react';
import { getPriorityAnnouncements, dismissAnnouncement } from '../services/feedbackService';
import { useLogger } from '../hooks/useLogger.js';

const typeConfig = {
  info: {
    bg: 'bg-blue-600',
    icon: Info,
  },
  success: {
    bg: 'bg-green-600',
    icon: Sparkles,
  },
  warning: {
    bg: 'bg-amber-500',
    icon: AlertTriangle,
  },
  feature: {
    bg: 'bg-purple-600',
    icon: Sparkles,
  },
  maintenance: {
    bg: 'bg-gray-700',
    icon: Wrench,
  },
};

export function AnnouncementBanner({ onHeightChange }) {
  const logger = useLogger('AnnouncementBanner');
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load announcements on mount
  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const priority = await getPriorityAnnouncements();
        setAnnouncements(priority);
      } catch (error) {
        logger.error('Failed to load announcements', { error: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadAnnouncements();
  }, [logger]);

  // Auto-rotate if multiple announcements
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 8000); // Rotate every 8 seconds

    return () => clearInterval(interval);
  }, [announcements.length]);

  // Notify parent of height changes
  useEffect(() => {
    onHeightChange?.(isVisible && announcements.length > 0 ? 40 : 0);
  }, [isVisible, announcements.length, onHeightChange]);

  const handleDismiss = useCallback(async (announcement) => {
    if (!announcement.dismissible) return;

    try {
      await dismissAnnouncement(announcement.id);
      setAnnouncements(prev => prev.filter(a => a.id !== announcement.id));
    } catch (error) {
      logger.error('Failed to dismiss announcement', { announcementId: announcement.id, error: error.message });
    }
  }, [logger]);

  const handleCtaClick = useCallback((announcement) => {
    if (announcement.ctaUrl) {
      if (announcement.ctaUrl.startsWith('http')) {
        window.open(announcement.ctaUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = announcement.ctaUrl;
      }
    }
  }, []);

  // Don't render if loading, no announcements, or hidden
  if (isLoading || announcements.length === 0 || !isVisible) {
    return null;
  }

  const current = announcements[currentIndex];
  if (!current) return null;

  const config = typeConfig[current.type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`
        relative py-2 px-4 text-white text-sm
        ${config.bg}
        animate-fade-in
      `}
      role="alert"
    >
      <div className="flex items-center justify-center gap-3 max-w-7xl mx-auto">
        {/* Icon */}
        <Icon className="w-4 h-4 flex-shrink-0" />

        {/* Content */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {current.title && (
            <span className="font-semibold">{current.title}</span>
          )}
          <span className="text-white/90">{current.message}</span>
        </div>

        {/* CTA Button */}
        {current.ctaText && (
          <button
            onClick={() => handleCtaClick(current)}
            className="
              flex items-center gap-1
              font-medium underline underline-offset-2
              hover:no-underline
              transition-all duration-100
              flex-shrink-0
            "
          >
            {current.ctaText}
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Pagination dots */}
        {announcements.length > 1 && (
          <div className="flex gap-1 ml-2">
            {announcements.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-200
                  ${idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'}
                `}
                aria-label={`Go to announcement ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {current.dismissible && (
        <button
          onClick={() => handleDismiss(current)}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            p-1 rounded
            hover:bg-white/10
            transition-colors duration-100
          "
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default AnnouncementBanner;
