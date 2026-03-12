/**
 * Header Component
 *
 * Application header with breadcrumbs, notifications, user menu,
 * and Emergency Push functionality.
 */

import { useState, useEffect } from 'react';
import { ChevronRight, AlertTriangle, LogOut, Loader2 } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, Button } from '../../design-system';

import { useEmergencyOptional } from '../../contexts/EmergencyContext';
import {
  pushEmergencyContent,
  EMERGENCY_DURATIONS,
} from '../../services/emergencyService';
import { fetchPlaylists } from '../../services/playlistService';
import { fetchScenesForTenant } from '../../services/sceneService';
import { fetchMediaAssets } from '../../services/mediaService';
import NotificationBell from '../notifications/NotificationBell';
import AnnouncementCenter from '../AnnouncementCenter';
import ConnectionIndicator from './ConnectionIndicator';

/**
 * Breadcrumb configuration for all app routes.
 * - label: Display text for this page
 * - parent: Display text for parent breadcrumb (if hierarchical)
 * - parentPage: Page key to navigate to when clicking parent
 */
const BREADCRUMB_CONFIG = {
  // Top-level pages (Home > Page)
  dashboard: { label: 'Dashboard' },
  welcome: { label: 'Welcome' },
  screens: { label: 'Screens' },
  playlists: { label: 'Playlists' },
  layouts: { label: 'Layouts' },
  schedules: { label: 'Schedules' },
  scenes: { label: 'Scenes' },
  templates: { label: 'Templates' },
  'svg-templates': { label: 'Templates' },
  'template-marketplace': { label: 'Template Marketplace' },
  apps: { label: 'Apps' },
  'menu-boards': { label: 'Menu Boards' },
  'data-sources': { label: 'Data Sources' },
  'social-accounts': { label: 'Social Accounts' },

  // Media sub-pages (Home > Media > Filter)
  'media-all': { label: 'All Media', parent: 'Media', parentPage: 'media-all' },
  'media-images': { label: 'Images', parent: 'Media', parentPage: 'media-all' },
  'media-videos': { label: 'Videos', parent: 'Media', parentPage: 'media-all' },
  'media-audio': { label: 'Audio', parent: 'Media', parentPage: 'media-all' },
  'media-documents': { label: 'Documents', parent: 'Media', parentPage: 'media-all' },
  'media-webpages': { label: 'Web Pages', parent: 'Media', parentPage: 'media-all' },

  // Analytics & Monitoring
  analytics: { label: 'Analytics' },
  'analytics-dashboard': { label: 'Analytics Dashboard', parent: 'Analytics', parentPage: 'analytics' },
  'content-performance': { label: 'Content Performance', parent: 'Analytics', parentPage: 'analytics' },
  'proof-of-play': { label: 'Proof of Play', parent: 'Analytics', parentPage: 'analytics' },
  alerts: { label: 'Alerts' },
  'notification-settings': { label: 'Notification Settings' },

  // Content tools
  assistant: { label: 'Content Assistant' },
  'content-moderation': { label: 'Content Moderation' },
  'review-inbox': { label: 'Review Inbox', parent: 'Moderation', parentPage: 'content-moderation' },
  campaigns: { label: 'Campaigns' },
  'screen-groups': { label: 'Screen Groups', parent: 'Screens', parentPage: 'screens' },

  // Settings & Account
  settings: { label: 'Settings' },
  'account-plan': { label: 'Account & Plan', parent: 'Settings', parentPage: 'settings' },
  team: { label: 'Team', parent: 'Settings', parentPage: 'settings' },
  locations: { label: 'Locations' },
  developer: { label: 'Developer Settings', parent: 'Settings', parentPage: 'settings' },
  'white-label': { label: 'White Label', parent: 'Settings', parentPage: 'settings' },
  'enterprise-security': { label: 'Enterprise Security', parent: 'Settings', parentPage: 'settings' },
  translations: { label: 'Translations' },
  branding: { label: 'Branding', parent: 'Settings', parentPage: 'settings' },

  // Admin pages
  'admin-tenants': { label: 'Tenants', parent: 'Admin', parentPage: 'admin-tenants' },
  'admin-audit-logs': { label: 'Audit Logs', parent: 'Admin', parentPage: 'admin-tenants' },
  'admin-system-events': { label: 'System Events', parent: 'Admin', parentPage: 'admin-tenants' },
  'admin-templates': { label: 'Templates', parent: 'Admin', parentPage: 'admin-tenants' },
  'admin-test': { label: 'Admin Test', parent: 'Admin', parentPage: 'admin-tenants' },
  'tenant-admin': { label: 'Tenant Admin' },

  // Reseller pages
  'reseller-dashboard': { label: 'Reseller Dashboard' },
  'reseller-billing': { label: 'Reseller Billing', parent: 'Reseller', parentPage: 'reseller-dashboard' },

  // Tools & System
  'demo-tools': { label: 'Demo Tools' },
  'feature-flags': { label: 'Feature Flags' },
  'ops-console': { label: 'Ops Console' },
  status: { label: 'System Status' },
  security: { label: 'Security Dashboard' },
  usage: { label: 'Usage Dashboard' },
  help: { label: 'Help Center' },
  activity: { label: 'Activity Log' },
  clients: { label: 'Clients' },
  'device-diagnostics': { label: 'Device Diagnostics' },
  'service-quality': { label: 'Service Quality' },
};

/**
 * Dynamic breadcrumb patterns for parameterized routes.
 * Checked in order -- first match wins.
 */
const DYNAMIC_BREADCRUMBS = [
  { prefix: 'playlist-editor-', label: 'Edit Playlist', parent: 'Playlists', parentPage: 'playlists' },
  { prefix: 'layout-editor-', label: 'Edit Layout', parent: 'Layouts', parentPage: 'layouts' },
  { prefix: 'schedule-editor-', label: 'Edit Schedule', parent: 'Schedules', parentPage: 'schedules' },
  { prefix: 'campaign-editor-', label: 'Edit Campaign', parent: 'Campaigns', parentPage: 'campaigns' },
  { prefix: 'scene-editor-', label: 'Edit Scene', parent: 'Scenes', parentPage: 'scenes' },
  { prefix: 'scene-detail-', label: 'Scene Detail', parent: 'Scenes', parentPage: 'scenes' },
  { prefix: 'screen-group-detail-', label: 'Group Detail', parent: 'Screens', parentPage: 'screens' },
  { prefix: 'admin-tenant-', label: 'Tenant Details', parent: 'Admin', parentPage: 'admin-tenants' },
  { prefix: 'admin-template-', label: 'Edit Template', parent: 'Admin Templates', parentPage: 'admin-templates' },
  { prefix: 'yodeck-layout-preview-', label: 'Layout Preview', parent: 'Layouts', parentPage: 'layouts' },
  { prefix: 'yodeck-layout-', label: 'Layout Editor', parent: 'Layouts', parentPage: 'layouts' },
  { prefix: 'design-editor', label: 'Design Editor', parent: 'Templates', parentPage: 'templates' },
  { prefix: 'svg-editor', label: 'SVG Editor', parent: 'Scenes', parentPage: 'scenes' },
];

/**
 * Emergency Push Modal - Content selection for emergency override
 * @param root0
 * @param root0.open
 * @param root0.onClose
 * @param root0.showToast
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
 * @param root0
 * @param root0.currentPage
 * @param root0.setCurrentPage
 * @param root0.branding
 * @param root0.user
 * @param root0.userProfile
 * @param root0.handleSignOut
 * @param root0.showToast
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
    // Check static config first
    const staticConfig = BREADCRUMB_CONFIG[currentPage];
    if (staticConfig) {
      if (staticConfig.parent) {
        return (
          <>
            <button onClick={() => setCurrentPage(staticConfig.parentPage)} className="hover:text-gray-700">
              {staticConfig.parent}
            </button>
            <ChevronRight size={14} className="mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">{staticConfig.label}</span>
          </>
        );
      }
      return <span className="text-gray-900 font-medium">{staticConfig.label}</span>;
    }

    // Check dynamic patterns
    for (const pattern of DYNAMIC_BREADCRUMBS) {
      if (currentPage.startsWith(pattern.prefix)) {
        return (
          <>
            <button onClick={() => setCurrentPage(pattern.parentPage)} className="hover:text-gray-700">
              {pattern.parent}
            </button>
            <ChevronRight size={14} className="mx-2 text-gray-400" />
            <span className="text-gray-900 font-medium">{pattern.label}</span>
          </>
        );
      }
    }

    // Fallback: capitalize page name
    return (
      <span className="text-gray-900 font-medium capitalize">
        {currentPage.replace(/-/g, ' ')}
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

          {/* Connection Status */}
          <ConnectionIndicator />

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
