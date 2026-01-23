/**
 * AnnouncementCenter Component
 *
 * Bell icon that shows a dropdown panel with all active announcements.
 * Displays a badge count for unread announcements.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, ChevronRight, Sparkles, AlertTriangle, Wrench, Info, CheckCircle } from 'lucide-react';
import { getActiveAnnouncements, dismissAnnouncement } from '../services/feedbackService';
import { useLogger } from '../hooks/useLogger.js';

const typeConfig = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Info,
    iconColor: 'text-blue-500',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  feature: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: Sparkles,
    iconColor: 'text-purple-500',
  },
  maintenance: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: Wrench,
    iconColor: 'text-gray-500',
  },
};

export function AnnouncementCenter() {
  const logger = useLogger('AnnouncementCenter');
  const [announcements, setAnnouncements] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Load announcements
  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const all = await getActiveAnnouncements();
        // Filter out priority announcements (those are shown in banner)
        setAnnouncements(all.filter(a => !a.priority));
      } catch (error) {
        logger.error('Failed to load announcements', { error: error.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadAnnouncements();
  }, [logger]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleDismiss = useCallback(async (announcement, e) => {
    e.stopPropagation();
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
    setIsOpen(false);
  }, []);

  // Get panel position
  const getPanelPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    };
  };

  const unreadCount = announcements.length;

  return (
    <>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative p-2 rounded-lg transition-colors duration-100
          ${isOpen
            ? 'bg-gray-100 text-gray-900'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }
        `}
        aria-label={`Announcements${unreadCount > 0 ? ` (${unreadCount} new)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="
            absolute -top-1 -right-1
            min-w-[18px] h-[18px] px-1
            flex items-center justify-center
            text-[10px] font-semibold text-white
            bg-red-500 rounded-full
          ">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && createPortal(
        <div
          ref={panelRef}
          style={getPanelPosition()}
          className="
            fixed z-dropdown
            w-80 sm:w-96 max-h-[70vh]
            bg-white rounded-xl shadow-lg border border-gray-200
            flex flex-col
            animate-scale-in origin-top-right
          "
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Announcements</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Loading...
              </div>
            ) : announcements.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No announcements</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {announcements.map(announcement => {
                  const config = typeConfig[announcement.type] || typeConfig.info;
                  const Icon = config.icon;

                  return (
                    <div
                      key={announcement.id}
                      className={`
                        p-4 hover:bg-gray-50 transition-colors duration-100
                        ${config.bg}
                      `}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 ${config.iconColor}`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {announcement.title && (
                            <h4 className="font-medium text-gray-900 text-sm">
                              {announcement.title}
                            </h4>
                          )}
                          <p className="text-sm text-gray-600 mt-0.5">
                            {announcement.message}
                          </p>

                          {/* CTA */}
                          {announcement.ctaText && (
                            <button
                              onClick={() => handleCtaClick(announcement)}
                              className="
                                mt-2 text-sm font-medium text-blue-600
                                hover:text-blue-700
                                flex items-center gap-1
                              "
                            >
                              {announcement.ctaText}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Dismiss */}
                        {announcement.dismissible && (
                          <button
                            onClick={(e) => handleDismiss(announcement, e)}
                            className="
                              flex-shrink-0 p-1 text-gray-400
                              hover:text-gray-600 hover:bg-white/50 rounded
                            "
                            aria-label="Dismiss"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default AnnouncementCenter;
