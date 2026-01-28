/**
 * Header Component
 *
 * Application header with breadcrumbs, notifications, user menu,
 * and Emergency Push functionality.
 */

import { useState, useEffect } from 'react';


import { useEmergencyOptional } from '../../contexts/EmergencyContext';
import {
  pushEmergencyContent,
  EMERGENCY_DURATIONS,
} from '../../services/emergencyService';
import { fetchPlaylists } from '../../services/playlistService';
import { fetchScenesForTenant } from '../../services/sceneService';
import { fetchMediaAssets } from '../../services/mediaService';

/**
 * Emergency Push Modal - Content selection for emergency override
 */
function EmergencyPushModal({ open, onClose, showToast }) {
  const [contentType, setContentType] = useState('scene');
  const [contentId, setContentId] = useState('');
  const [duration, setDuration] = useState(EMERGENCY_DURATIONS[0].value);
  const [pushing, setPushing] = useState(false);

  // Content options
  const [scenes, setScenes] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);

  // Load content when type changes
  useEffect(() => {
    if (!open) return;

    const loadContent = async () => {
      setLoadingContent(true);
      setContentId('');
      try {
        if (contentType === 'scene') {
          // Get current user's tenant ID from auth context via scenes
          const result = await fetchScenesForTenant(null, { page: 1, pageSize: 100 });
          setScenes(result.data || []);
        } else if (contentType === 'playlist') {
          const data = await fetchPlaylists({ limit: 100 });
          setPlaylists(data || []);
        } else if (contentType === 'media') {
          const result = await fetchMediaAssets({ page: 1, pageSize: 100 });
          setMedia(result.data || []);
        }
      } catch (err) {
        console.error('Failed to load content:', err);
      } finally {
        setLoadingContent(false);
      }
    };

    loadContent();
  }, [contentType, open]);

  // Get content options based on selected type
  const getContentOptions = () => {
    if (contentType === 'scene') return scenes;
    if (contentType === 'playlist') return playlists;
    if (contentType === 'media') return media;
    return [];
  };

  const handlePush = async () => {
    if (!contentId) return;

    setPushing(true);
    try {
      await pushEmergencyContent(contentType, contentId, duration);
      showToast?.('Emergency content pushed to all screens', 'success');
      onClose();
    } catch (err) {
      console.error('Failed to push emergency:', err);
      showToast?.('Failed to push emergency content: ' + err.message, 'error');
    } finally {
      setPushing(false);
    }
  };

  const handleClose = () => {
    if (!pushing) {
      setContentType('scene');
      setContentId('');
      setDuration(EMERGENCY_DURATIONS[0].value);
      onClose();
    }
  };

  const contentOptions = getContentOptions();

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} />
          Push Emergency Content
        </ModalTitle>
      </ModalHeader>
      <ModalContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Push content to all screens immediately. This overrides all schedules and campaigns.
          </p>

          {/* Content Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content Type
            </label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              disabled={pushing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="scene">Scene</option>
              <option value="playlist">Playlist</option>
              <option value="media">Media</option>
            </select>
          </div>

          {/* Content Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Content
            </label>
            {loadingContent ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : contentOptions.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                No {contentType}s found. Create one first.
              </p>
            ) : (
              <select
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                disabled={pushing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select a {contentType}...</option>
                {contentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Duration Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <select
              value={duration ?? ''}
              onChange={(e) => setDuration(e.target.value === '' ? null : parseInt(e.target.value, 10))}
              disabled={pushing}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {EMERGENCY_DURATIONS.map((opt) => (
                <option key={opt.label} value={opt.value ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={pushing}>
          Cancel
        </Button>
        <Button
          onClick={handlePush}
          disabled={!contentId || pushing}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {pushing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Pushing...
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Push Emergency
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Header Component
 */
export default function Header({
  currentPage,
  setCurrentPage,
  branding,
  user,
  userProfile,
  handleSignOut,
  showToast,
}) {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  // Optionally access emergency context (returns null if outside provider)
  const emergencyContext = useEmergencyOptional();
  const isEmergencyActive = emergencyContext?.isActive ?? false;

  // Get breadcrumb based on current page
  const getBreadcrumb = () => {
    if (currentPage.startsWith('playlist-editor-')) {
      return (
        <>
          <button onClick={() => setCurrentPage('playlists')} className="hover:text-gray-700">
            Playlists
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Edit Playlist</span>
        </>
      );
    }
    if (currentPage.startsWith('layout-editor-')) {
      return (
        <>
          <button onClick={() => setCurrentPage('layouts')} className="hover:text-gray-700">
            Layouts
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Edit Layout</span>
        </>
      );
    }
    if (currentPage.startsWith('schedule-editor-')) {
      return (
        <>
          <button onClick={() => setCurrentPage('schedules')} className="hover:text-gray-700">
            Schedules
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Edit Schedule</span>
        </>
      );
    }
    if (currentPage.startsWith('scene-editor-') || currentPage.startsWith('scene-detail-')) {
      return (
        <>
          <button onClick={() => setCurrentPage('scenes')} className="hover:text-gray-700">
            Scenes
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Edit Scene</span>
        </>
      );
    }
    if (currentPage.startsWith('admin-tenant-')) {
      return (
        <>
          <button onClick={() => setCurrentPage('admin')} className="hover:text-gray-700">
            Admin
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          <span className="text-gray-900 font-medium">Tenant Details</span>
        </>
      );
    }
    return (
      <span className="text-gray-900 font-medium capitalize">
        {currentPage.replace(/-/g, ' ').replace(/^media /, '')}
      </span>
    );
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm text-gray-500">
          <button onClick={() => setCurrentPage('dashboard')} className="hover:text-gray-700">
            Home
          </button>
          <ChevronRight size={14} className="mx-2 text-gray-400" />
          {getBreadcrumb()}
        </nav>

        {/* Right side - Emergency, Notifications & User Menu */}
        <div className="flex items-center gap-4">
          {/* Emergency Push Button */}
          {emergencyContext && !isEmergencyActive && (
            <button
              onClick={() => setShowEmergencyModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              title="Push Emergency Content"
            >
              <AlertTriangle size={16} />
              <span className="hidden md:inline">Emergency</span>
            </button>
          )}

          {/* Emergency Active Badge */}
          {isEmergencyActive && (
            <span className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded-full animate-pulse">
              <AlertTriangle size={12} />
              EMERGENCY
            </span>
          )}

          {/* Notification Bell */}
          <NotificationBell onNavigate={setCurrentPage} />

          {/* Announcement Center */}
          <AnnouncementCenter />

          {/* User Menu */}
          <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
              style={{ backgroundColor: branding?.primaryColor || '#f26f21' }}
            >
              {(userProfile?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Push Modal */}
      <EmergencyPushModal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        showToast={showToast}
      />
    </>
  );
}
