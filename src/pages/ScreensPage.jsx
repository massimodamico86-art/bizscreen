/**
 * ScreensPage.jsx
 * Screen management page for TV device pairing, assignment, and control.
 *
 * This is the primary view for managing digital signage screens. It provides:
 * - Screen listing with filtering and search
 * - OTP-based TV pairing (create screen → show code → TV enters code)
 * - Playlist/Layout/Schedule assignment to screens
 * - Device commands (reboot, reload, clear cache, kiosk mode)
 * - Screen analytics and status monitoring
 *
 * Data management extracted to useScreensData hook for:
 * - Screen data, picker data, limits
 * - Realtime subscription for status updates
 * - Device commands and screen CRUD
 *
 * Sub-components (defined in this file):
 * - DemoPairingBanner: Shows pairing hint for demo screens
 * - LimitWarningBanner: Shows plan limit warning
 * - NoScreensState: Empty state when no screens exist
 * - PromoCards: Promotional cards in empty state
 * - ScreenRow: Table row for each screen
 * - ScreenActionMenu: Context menu for screen actions
 * - AddScreenModal: Modal to create new screen
 * - LimitReachedModal: Modal when screen limit hit
 * - AnalyticsModal: Screen playback analytics
 * - ScreensErrorState: Error UI with retry
 * - KioskModeModal: Configure kiosk mode
 * - EditScreenModal: Edit screen details
 *
 * @see useScreensData for data management
 * @see screenService.js for API operations
 * @see ScreenDetailDrawer.jsx for detailed screen view
 */
import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Monitor,
  MoreVertical,
  Trash2,
  Edit,
  RefreshCw,
  Play,
  Copy,
  Calendar,
  Loader2,
  CheckCircle,
  Info,
  ExternalLink,
  AlertTriangle,
  Zap,
  MapPin,
  BarChart3,
  Clock,
  TrendingUp,
  Image,
  Users,
  Power,
  RotateCcw,
  HardDrive,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { isScreenOnline, formatLastSeen } from '../services/screenService';
import { hasReachedLimit, formatLimitDisplay } from '../services/limitsService';
import { formatDuration, getUptimeColor, DATE_RANGES } from '../services/analyticsService';
import ScreenDetailDrawer from '../components/ScreenDetailDrawer';
import YodeckEmptyState from '../components/YodeckEmptyState';
import { PlayerStatusBadge, getPlayerStatus } from '../components/screens/PlayerStatusBadge';
import { ScreensFooterCards } from '../components/screens/ScreensFooterCards';
import { InsertContentModal } from '../components/modals/InsertContentModal';
import { useScreensData } from './hooks';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { FormField, Input, Select, Switch } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter } from '../design-system';
import { Alert, Banner } from '../design-system';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Demo pairing hint banner
const DemoPairingBanner = ({ screen, onCopy }) => {
  if (!screen?.otp_code) return null;

  return (
    <Banner
      variant="info"
      icon={<Info size={20} />}
      title="Ready to pair your TV?"
      onDismiss={null}
    >
      <p className="text-sm text-gray-600 mb-3">
        On your TV browser, open{' '}
        <code className="bg-blue-100 px-2 py-0.5 rounded text-blue-800 font-mono text-sm">
          {window.location.origin}/player
        </code>{' '}
        and enter the pairing code below.
      </p>
      <Inline gap="md">
        <div className="bg-white rounded-lg px-4 py-2 border border-blue-200 inline-flex items-center gap-3">
          <code className="text-2xl font-mono font-bold tracking-widest text-gray-900">
            {screen.otp_code}
          </code>
          <button
            onClick={() => onCopy(screen.otp_code)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Copy code"
          >
            <Copy size={16} className="text-gray-500" />
          </button>
        </div>
        <Button
          as="a"
          href="/player"
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
        >
          <ExternalLink size={16} />
          Open Player
        </Button>
      </Inline>
    </Banner>
  );
};

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => {
  if (!limits) return null;

  const maxScreens = limits.maxScreens ?? 0;
  const planName = limits.planName || 'current';

  return (
    <Banner
      variant="warning"
      icon={<AlertTriangle size={20} />}
      title="Screen limit reached"
      action={
        <Button variant="secondary" size="sm" onClick={onUpgrade}>
          <Zap size={16} />
          Upgrade
        </Button>
      }
    >
      You've reached the maximum of {maxScreens} screen{maxScreens !== 1 ? 's' : ''} for your {planName} plan.
      Upgrade to add more screens.
    </Banner>
  );
};

// Empty state for no screens
const NoScreensState = ({ onAddScreen }) => (
  <Card variant="outlined" className="p-6">
    <YodeckEmptyState
      type="screens"
      title="No Screens Connected"
      description="Add a screen to get a pairing code. Enter the code on your TV or display, then assign a playlist, layout, or schedule to start playing content."
      actionLabel="Add Your First Screen"
      onAction={onAddScreen}
      showTourLink={true}
      tourLinkText="Learn how to pair a TV"
      onTourClick={() => window.open('https://docs.bizscreen.io/screens', '_blank')}
    />
  </Card>
);

// Promo cards for empty state
const PromoCards = () => (
  <Grid cols={3} gap="md" className="mt-8">
    <Card className="p-6 bg-orange-50 border-orange-200">
      <h3 className="font-bold text-gray-900 mb-2">Get free Players</h3>
      <Badge variant="warning" size="sm">RECOMMENDED</Badge>
      <p className="text-gray-600 text-sm mt-3">
        Get all BizScreen Players for <strong>free</strong>, by subscribing to an Annual Plan.
      </p>
      <Button variant="secondary" className="mt-4">Upgrade Now</Button>
    </Card>

    <Card className="p-6">
      <h3 className="font-bold text-gray-900 mb-2">Purchase a Player</h3>
      <p className="text-gray-600 text-sm mt-3">
        Buy a BizScreen Player for $79 and use BizScreen for free with 1 screen.
      </p>
      <Button variant="secondary" className="mt-4">Buy a Player</Button>
    </Card>

    <Card className="p-6 bg-gray-900 text-white border-gray-900">
      <h3 className="font-bold mb-2">Connect your own Players</h3>
      <p className="text-gray-300 text-sm mt-3">
        Use your own Players with BizScreen. Select "Add Screen" to connect a new Player.
      </p>
      <div className="flex gap-2 mt-4 flex-wrap text-2xl">
        <span>TV</span>
        <span>PC</span>
        <span>Web</span>
      </div>
    </Card>
  </Grid>
);

// Screen table row
const ScreenRow = ({
  screen,
  actionMenuId,
  onActionMenuToggle,
  onEdit,
  onViewDetails,
  onViewAnalytics,
  onDeviceCommand,
  onOpenKiosk,
  onDelete,
  onOpenContentPicker,
  commandingDevice,
  isSelected = false,
  onToggleSelection,
}) => {
  if (!screen) return null;

  const playerStatus = getPlayerStatus(screen);
  const deviceName = screen.device_name || 'Unnamed Screen';

  const getContentDisplay = () => {
    if (screen.assigned_playlist?.name) return screen.assigned_playlist.name;
    if (screen.assigned_layout?.name) return screen.assigned_layout.name;
    return 'No Content Assigned';
  };

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
      <td className="px-4 py-4 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection?.(screen.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-4">
        <Inline gap="sm" align="center">
          <div className={`w-10 h-10 rounded flex items-center justify-center ${
            playerStatus === 'online' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Monitor size={20} className={playerStatus === 'online' ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <span className="font-medium text-gray-900">{deviceName}</span>
            {screen.model && <p className="text-xs text-gray-500">{screen.model}</p>}
          </div>
        </Inline>
      </td>
      <td className="px-4 py-4">
        <PlayerStatusBadge status={playerStatus} />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center justify-center">
          {screen.device_info?.platform ? (
            <span className="text-sm text-gray-600 capitalize">{screen.device_info.platform}</span>
          ) : (
            <Monitor size={18} className="text-gray-400" />
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-gray-600 font-mono">{screen.id?.slice(0, 8) || '-'}</span>
      </td>
      <td className="px-4 py-4">
        <button
          onClick={() => onOpenContentPicker?.(screen)}
          className={`text-sm hover:underline ${
            screen.assigned_playlist_id || screen.assigned_layout_id ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {getContentDisplay()}
        </button>
      </td>
      <td className="px-4 py-4">
        <span className="text-sm text-gray-600">
          {screen.working_hours?.enabled
            ? `${screen.working_hours.start || '09:00'} - ${screen.working_hours.end || '18:00'}`
            : 'Global Working Hours'}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="relative">
          <button
            onClick={() => onActionMenuToggle(screen.id)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical size={18} className="text-gray-400" />
          </button>
          {actionMenuId === screen.id && (
            <ScreenActionMenu
              screen={screen}
              commandingDevice={commandingDevice}
              onClose={() => onActionMenuToggle(null)}
              onEdit={() => { onActionMenuToggle(null); onEdit(screen); }}
              onViewDetails={() => { onActionMenuToggle(null); onViewDetails(screen); }}
              onViewAnalytics={() => { onActionMenuToggle(null); onViewAnalytics(screen); }}
              onDeviceCommand={(cmd) => { onActionMenuToggle(null); onDeviceCommand(screen.id, cmd, deviceName); }}
              onOpenKiosk={() => { onActionMenuToggle(null); onOpenKiosk(screen); }}
              onDelete={() => { onActionMenuToggle(null); onDelete(screen.id); }}
            />
          )}
        </div>
      </td>
    </tr>
  );
};

// Screen action menu dropdown
const ScreenActionMenu = ({
  screen,
  commandingDevice,
  onClose,
  onEdit,
  onViewDetails,
  onViewAnalytics,
  onDeviceCommand,
  onOpenKiosk,
  onDelete,
}) => (
  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
    <button onClick={onEdit} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
      <Edit size={14} />
      Edit screen
    </button>
    <button onClick={onViewDetails} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
      <Eye size={14} className="text-indigo-500" />
      View Details
    </button>
    <button onClick={onViewAnalytics} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
      <BarChart3 size={14} className="text-blue-500" />
      View Analytics
    </button>

    <hr className="my-1 border-gray-100" />
    <div className="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">Device Commands</div>

    <button
      onClick={() => onDeviceCommand('reload')}
      disabled={commandingDevice?.id === screen.id}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
    >
      {commandingDevice?.id === screen.id && commandingDevice?.command === 'reload' ? (
        <Loader2 size={14} className="animate-spin text-green-500" />
      ) : (
        <RefreshCw size={14} className="text-green-500" />
      )}
      Reload Content
    </button>

    <button
      onClick={() => onDeviceCommand('reboot')}
      disabled={commandingDevice?.id === screen.id}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
    >
      {commandingDevice?.id === screen.id && commandingDevice?.command === 'reboot' ? (
        <Loader2 size={14} className="animate-spin text-orange-500" />
      ) : (
        <Power size={14} className="text-orange-500" />
      )}
      Reboot Player
    </button>

    <button
      onClick={() => onDeviceCommand('clear_cache')}
      disabled={commandingDevice?.id === screen.id}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
    >
      {commandingDevice?.id === screen.id && commandingDevice?.command === 'clear_cache' ? (
        <Loader2 size={14} className="animate-spin text-blue-500" />
      ) : (
        <HardDrive size={14} className="text-blue-500" />
      )}
      Clear Cache
    </button>

    <button onClick={onOpenKiosk} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
      {screen.kiosk_mode_enabled ? (
        <Unlock size={14} className="text-purple-500" />
      ) : (
        <Lock size={14} className="text-purple-500" />
      )}
      {screen.kiosk_mode_enabled ? 'Disable Kiosk Mode' : 'Enable Kiosk Mode'}
    </button>

    <button
      onClick={() => onDeviceCommand('reset')}
      disabled={commandingDevice?.id === screen.id}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-yellow-600 disabled:opacity-50"
    >
      {commandingDevice?.id === screen.id && commandingDevice?.command === 'reset' ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <RotateCcw size={14} />
      )}
      Reset Device
    </button>

    <hr className="my-1 border-gray-100" />
    <button onClick={onDelete} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600">
      <Trash2 size={14} />
      Delete
    </button>
  </div>
);

// Add Screen Modal
const AddScreenModal = ({ open, onClose, onSubmit, creating, createdScreen, showToast }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader>
        <ModalTitle>Add Screen</ModalTitle>
      </ModalHeader>
      <ModalContent>
        {!createdScreen ? (
          <form onSubmit={handleSubmit} id="add-screen-form">
            <Stack gap="md">
              <p className="text-gray-600 text-sm">
                Create a new screen and use the generated pairing code on your TV player to connect it.
              </p>
              <FormField label="Screen Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Lobby TV, Conference Room Display"
                  autoFocus
                />
              </FormField>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-sm mb-2">What happens next:</h3>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>A unique pairing code will be generated</li>
                  <li>Enter this code on your TV player app</li>
                  <li>Your screen will appear online once connected</li>
                </ol>
              </div>
            </Stack>
          </form>
        ) : (
          <Stack gap="lg" className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Screen Created Successfully!</h3>
              <p className="text-gray-600 text-sm">
                Use this pairing code on your TV player to connect <strong>{createdScreen.device_name}</strong>
              </p>
            </div>
            <div className="bg-gray-100 rounded-lg p-6">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pairing Code</p>
              <Inline gap="sm" justify="center" align="center">
                <code className="text-4xl font-mono font-bold tracking-widest text-gray-900">
                  {createdScreen.otp_code}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdScreen.otp_code);
                    showToast?.('Code copied to clipboard');
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Copy code"
                >
                  <Copy size={20} className="text-gray-500" />
                </button>
              </Inline>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-left">
              <h4 className="font-medium text-orange-800 text-sm mb-2">How to connect:</h4>
              <ol className="list-decimal list-inside text-sm text-orange-700 space-y-1">
                <li>Open the BizScreen Player app on your TV</li>
                <li>Select "Connect to Account"</li>
                <li>Enter the pairing code shown above</li>
                <li>Your screen will start displaying content</li>
              </ol>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-left border border-blue-100">
              <h4 className="font-medium text-blue-800 text-sm mb-2">What's next?</h4>
              <p className="text-sm text-blue-700">
                Once connected, assign a <strong>playlist</strong>, <strong>layout</strong>, or <strong>schedule</strong> to this screen.
              </p>
            </div>
          </Stack>
        )}
      </ModalContent>
      <ModalFooter>
        {!createdScreen ? (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button type="submit" form="add-screen-form" disabled={creating || !name.trim()} loading={creating}>
              <Plus size={18} />
              Create Screen
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} className="w-full">Done - View Screen</Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

// Limit Reached Modal
const LimitReachedModal = ({ open, onClose, limits, screenCount }) => {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalContent className="text-center">
        <div className="w-16 h-16 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Screen Limit Reached</h3>
        <p className="text-gray-600 mb-6">
          You've used {formatLimitDisplay(limits?.maxScreens, screenCount)} screens on your {limits?.planName} plan.
          Upgrade to add more screens and unlock additional features.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-medium text-gray-900 mb-2">Upgrade to get:</h4>
          <Stack gap="xs">
            <Inline gap="sm" align="center">
              <Monitor className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600">More screens for your displays</span>
            </Inline>
            <Inline gap="sm" align="center">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Higher media and playlist limits</span>
            </Inline>
            <Inline gap="sm" align="center">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-gray-600">Priority support and more features</span>
            </Inline>
          </Stack>
        </div>
        <Inline gap="sm" className="w-full">
          <Button variant="ghost" onClick={onClose} className="flex-1">Maybe Later</Button>
          <Button onClick={() => { onClose(); window.location.hash = '#account-plan'; }} className="flex-1">
            <Zap size={16} />
            View Plans
          </Button>
        </Inline>
      </ModalContent>
    </Modal>
  );
};

// Analytics Modal
const AnalyticsModal = ({ screen, data, loading, range, onRangeChange, onClose }) => {
  if (!screen) return null;

  return (
    <Modal open={!!screen} onClose={onClose} size="lg">
      <ModalHeader>
        <Inline gap="sm" align="center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BarChart3 size={20} className="text-blue-600" />
          </div>
          <div>
            <ModalTitle>{screen.device_name} Analytics</ModalTitle>
            <ModalDescription>Performance and playback statistics</ModalDescription>
          </div>
        </Inline>
      </ModalHeader>
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {Object.entries(DATE_RANGES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <ModalContent>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : data ? (
          <Stack gap="md">
            <Grid cols={3} gap="sm">
              <div className="bg-gray-50 rounded-lg p-4">
                <Inline gap="xs" align="center" className="mb-1">
                  <TrendingUp size={14} className="text-green-600" />
                  <span className="text-xs text-gray-500">Uptime</span>
                </Inline>
                <p className={`text-2xl font-bold ${getUptimeColor(data.uptime?.uptime_percent || 0)}`}>
                  {(data.uptime?.uptime_percent || 0).toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <Inline gap="xs" align="center" className="mb-1">
                  <Clock size={14} className="text-purple-600" />
                  <span className="text-xs text-gray-500">Playback</span>
                </Inline>
                <p className="text-2xl font-bold text-gray-900">
                  {formatDuration(data.playback?.total_playback_seconds || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <Inline gap="xs" align="center" className="mb-1">
                  <Play size={14} className="text-orange-600" />
                  <span className="text-xs text-gray-500">Events</span>
                </Inline>
                <p className="text-2xl font-bold text-gray-900">{data.playback?.total_events || 0}</p>
              </div>
            </Grid>
            <Card variant="outlined">
              <CardHeader className="py-2">
                <Inline gap="xs" align="center">
                  <Image size={14} className="text-blue-600" />
                  <CardTitle className="text-sm">Top Media Items</CardTitle>
                </Inline>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {data.topMedia?.length > 0 ? (
                    data.topMedia.map((media, idx) => (
                      <div key={media.media_id} className="px-4 py-2 flex items-center justify-between">
                        <Inline gap="sm" align="center">
                          <span className="text-gray-400 text-sm w-5">{idx + 1}.</span>
                          <span className="text-sm text-gray-900">{media.media_name}</span>
                          <Badge variant="neutral" size="sm">{media.media_type}</Badge>
                        </Inline>
                        <span className="text-sm font-medium text-gray-700">
                          {formatDuration(media.total_playback_seconds)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">No playback data available</div>
                  )}
                </div>
              </CardContent>
            </Card>
            {data.dailyActivity?.length > 0 && (
              <Card variant="outlined" className="p-4">
                <Inline gap="xs" align="center" className="mb-3">
                  <BarChart3 size={14} className="text-blue-600" />
                  <span className="font-medium text-gray-900 text-sm">Daily Activity</span>
                </Inline>
                <div className="flex items-end gap-1 h-16">
                  {data.dailyActivity.map((day, idx) => {
                    const maxSeconds = Math.max(...data.dailyActivity.map(d => d.playback_seconds || 0));
                    const height = maxSeconds > 0 ? ((day.playback_seconds || 0) / maxSeconds) * 100 : 0;
                    return (
                      <div
                        key={day.day || idx}
                        className="flex-1 bg-blue-200 rounded-t hover:bg-blue-400 transition-colors"
                        style={{ height: `${Math.max(height, 4)}%` }}
                        title={`${new Date(day.day).toLocaleDateString()}: ${formatDuration(day.playback_seconds)}`}
                      />
                    );
                  })}
                </div>
                <Inline justify="between" className="text-xs text-gray-400 mt-1">
                  <span>{new Date(data.dailyActivity[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span>{new Date(data.dailyActivity[data.dailyActivity.length - 1].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </Inline>
              </Card>
            )}
          </Stack>
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-500">No analytics data available</div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} className="w-full">Close</Button>
      </ModalFooter>
    </Modal>
  );
};

// Screens Error State
const ScreensErrorState = ({ error, onRetry, t }) => {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {t('screens.errorTitle', "Couldn't load screens")}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('screens.errorDescription', "We're having trouble loading your screens. This might be a temporary issue.")}
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4 font-mono">{error}</p>}
          <Button onClick={handleRetry} disabled={retrying} variant="secondary">
            {retrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.retrying', 'Retrying...')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {t('common.tryAgain', 'Try Again')}
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Edit Screen Modal
const EditScreenModal = ({ screen, locations, screenGroups, playlists, layouts, onClose, onSubmit, saving }) => {
  const [name, setName] = useState(screen?.device_name || '');
  const [locationId, setLocationId] = useState(screen?.location_id || '');
  const [groupId, setGroupId] = useState(screen?.screen_group_id || '');
  const [playlistId, setPlaylistId] = useState(screen?.assigned_playlist_id || '');
  const [layoutId, setLayoutId] = useState(screen?.assigned_layout_id || '');

  useEffect(() => {
    if (screen) {
      setName(screen.device_name || '');
      setLocationId(screen.location_id || '');
      setGroupId(screen.screen_group_id || '');
      setPlaylistId(screen.assigned_playlist_id || '');
      setLayoutId(screen.assigned_layout_id || '');
    }
  }, [screen]);

  if (!screen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: screen.id,
      name: name.trim(),
      locationId: locationId || null,
      groupId: groupId || null,
      playlistId: playlistId || null,
      layoutId: layoutId || null,
    });
  };

  return (
    <Modal open={!!screen} onClose={onClose} size="md">
      <ModalHeader>
        <Inline gap="sm" align="center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Edit size={20} className="text-blue-600" />
          </div>
          <div>
            <ModalTitle>Edit Screen</ModalTitle>
            <ModalDescription>{screen.device_name}</ModalDescription>
          </div>
        </Inline>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <Stack gap="md">
            <FormField label="Screen Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Lobby TV" />
            </FormField>
            <FormField label="Location">
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">No location</option>
                {(locations || []).map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Screen Group">
              <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">No group</option>
                {(screenGroups || []).map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </Select>
            </FormField>
            <hr className="border-gray-200" />
            <h4 className="font-medium text-gray-900">Content Assignment</h4>
            <p className="text-sm text-gray-500 -mt-2">Assign a playlist or layout to display on this screen.</p>
            <FormField label="Playlist">
              <Select
                value={playlistId}
                onChange={(e) => {
                  setPlaylistId(e.target.value);
                  if (e.target.value) setLayoutId('');
                }}
              >
                <option value="">No playlist</option>
                {(playlists || []).map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Layout">
              <Select
                value={layoutId}
                onChange={(e) => {
                  setLayoutId(e.target.value);
                  if (e.target.value) setPlaylistId('');
                }}
              >
                <option value="">No layout</option>
                {(layouts || []).map((layout) => (
                  <option key={layout.id} value={layout.id}>{layout.name}</option>
                ))}
              </Select>
            </FormField>
            {screen.otp_code && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pairing Code</p>
                <code className="text-xl font-mono font-bold tracking-widest text-gray-900">{screen.otp_code}</code>
              </div>
            )}
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || saving} loading={saving}>Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// Kiosk Mode Modal
const KioskModeModal = ({ screen, onClose, onSubmit }) => {
  const [enabled, setEnabled] = useState(screen?.kiosk_mode_enabled || false);
  const [password, setPassword] = useState('');

  if (!screen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(screen.id, enabled, password || null);
  };

  return (
    <Modal open={!!screen} onClose={onClose} size="sm">
      <ModalHeader>
        <Inline gap="sm" align="center">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Lock size={20} className="text-purple-600" />
          </div>
          <div>
            <ModalTitle>Kiosk Mode</ModalTitle>
            <ModalDescription>{screen.device_name}</ModalDescription>
          </div>
        </Inline>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <Stack gap="md">
            <Alert variant="info">
              <p className="font-medium mb-1">What is Kiosk Mode?</p>
              <p className="text-sm">
                Kiosk mode locks the player in fullscreen and prevents users from exiting without a password.
                Perfect for public displays or unattended screens.
              </p>
            </Alert>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-gray-900">Enable Kiosk Mode</span>
                <p className="text-sm text-gray-500">Lock the player in fullscreen</p>
              </div>
              <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            </div>
            {enabled && (
              <FormField label="Exit Password (optional)" hint="Press Escape on the player to enter the exit password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                />
              </FormField>
            )}
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">
            {enabled ? (
              <>
                <Lock size={16} />
                Enable Kiosk
              </>
            ) : (
              <>
                <Unlock size={16} />
                Disable Kiosk
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const ScreensPage = ({ showToast }) => {
  const { t } = useTranslation();
  const [actionMenuId, setActionMenuId] = useState(null);

  // Use the extracted hook for all data management
  const {
    screens,
    playlists,
    layouts,
    schedules,
    locations,
    screenGroups,
    limits,
    loading,
    error,
    search,
    setSearch,
    locationFilter,
    setLocationFilter,
    groupFilter,
    setGroupFilter,
    filteredScreens,
    onlineCount,
    offlineCount,
    demoScreen,
    showAddModal,
    setShowAddModal,
    showLimitModal,
    setShowLimitModal,
    editingScreen,
    setEditingScreen,
    savingEdit,
    creatingScreen,
    createdScreen,
    analyticsScreen,
    analyticsData,
    analyticsLoading,
    analyticsRange,
    showKioskModal,
    setShowKioskModal,
    detailScreen,
    setDetailScreen,
    showContentPicker,
    contentPickerScreen,
    commandingDevice,
    selectedScreenIds,
    bulkAssigning,
    toggleScreenSelection,
    toggleSelectAll,
    handleBulkAssignSchedule,
    clearSelection,
    loadData,
    handleCreateScreen,
    handleUpdateScreen,
    handleDeleteScreen,
    handleAssignPlaylist,
    handleAssignLayout,
    handleDeviceCommand,
    handleSetKioskMode,
    handleLoadAnalytics,
    closeAnalyticsModal,
    handleCopyOTP,
    closeAddModal,
    handleOpenContentPicker,
    closeContentPicker,
  } = useScreensData({ showToast });

  const limitReached = limits ? hasReachedLimit(limits.maxScreens, screens.length) : false;

  const handleAddScreen = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleContentSelected = async (content, contentType) => {
    if (!contentPickerScreen) return;

    if (contentType === 'playlists') {
      await handleAssignPlaylist(contentPickerScreen.id, content.id);
    } else if (contentType === 'layouts') {
      await handleAssignLayout(contentPickerScreen.id, content.id);
    } else if (contentType === 'media') {
      showToast?.('To display media, add it to a playlist first');
    } else if (contentType === 'apps') {
      showToast?.('To display apps, add them to a playlist or layout first');
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={t('screens.title', 'Screens')}
        description={
          <>
            {screens.length} {screens.length !== 1 ? t('screens.screens', 'screens') : t('screens.screen', 'screen')} -{' '}
            <span className="text-green-600">{onlineCount} {t('screens.online', 'online')}</span> -{' '}
            <span className="text-gray-400">{offlineCount} {t('screens.offline', 'offline')}</span>
          </>
        }
        actions={
          <Button onClick={handleAddScreen}>
            <Plus size={18} />
            {t('screens.addScreen', 'Add Screen')}
          </Button>
        }
      />

      <PageContent>
        <Stack gap="lg">
          {demoScreen && !isScreenOnline(demoScreen) && (
            <DemoPairingBanner screen={demoScreen} onCopy={handleCopyOTP} />
          )}

          {limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {screens.length === 0 && !loading && !error && (
            <>
              <NoScreensState onAddScreen={handleAddScreen} />
              <PromoCards />
            </>
          )}

          {screens.length > 0 && (
            <Inline gap="md" wrap className="items-center">
              <div className="flex-1 relative min-w-[200px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('screens.searchPlaceholder', 'Search screens...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-md pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                />
              </div>

              {locations.length > 0 && (
                <Inline gap="xs" align="center">
                  <MapPin size={16} className="text-gray-400" />
                  <select
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="all">All Locations</option>
                    <option value="unassigned">Unassigned</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </Inline>
              )}

              {screenGroups.length > 0 && (
                <Inline gap="xs" align="center">
                  <Users size={16} className="text-gray-400" />
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
                    <option value="all">All Groups</option>
                    <option value="unassigned">Unassigned</option>
                    {screenGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </Inline>
              )}

              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw size={16} />
                {t('common.refresh', 'Refresh')}
              </Button>
            </Inline>
          )}

          {error && !loading && screens.length === 0 && (
            <ScreensErrorState error={error} onRetry={loadData} t={t} />
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !error && screens.length > 0 && (
            <Card variant="outlined">
              {selectedScreenIds.size > 0 && (
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedScreenIds.size} screen{selectedScreenIds.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    <select
                      onChange={(e) => { if (e.target.value) handleBulkAssignSchedule(e.target.value); }}
                      disabled={bulkAssigning}
                      className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Assign Schedule...</option>
                      {schedules.map(schedule => (
                        <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                      ))}
                    </select>
                    {bulkAssigning && <Loader2 size={14} className="animate-spin text-blue-500" />}
                  </div>
                  <button onClick={clearSelection} className="ml-auto text-sm text-blue-600 hover:text-blue-800">
                    Clear selection
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedScreenIds.size === filteredScreens.length && filteredScreens.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Player Status</th>
                      <th className="px-4 py-3 font-medium">Player Type</th>
                      <th className="px-4 py-3 font-medium">ID</th>
                      <th className="px-4 py-3 font-medium">Screen Content</th>
                      <th className="px-4 py-3 font-medium">Working Hours</th>
                      <th className="px-4 py-3 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScreens.map((screen) => (
                      <ScreenRow
                        key={screen.id}
                        screen={screen}
                        actionMenuId={actionMenuId}
                        onActionMenuToggle={setActionMenuId}
                        onEdit={setEditingScreen}
                        onViewDetails={setDetailScreen}
                        onViewAnalytics={handleLoadAnalytics}
                        onDeviceCommand={handleDeviceCommand}
                        onOpenKiosk={setShowKioskModal}
                        onDelete={handleDeleteScreen}
                        onOpenContentPicker={handleOpenContentPicker}
                        commandingDevice={commandingDevice}
                        isSelected={selectedScreenIds.has(screen.id)}
                        onToggleSelection={toggleScreenSelection}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Stack>
      </PageContent>

      <AddScreenModal
        open={showAddModal}
        onClose={closeAddModal}
        onSubmit={handleCreateScreen}
        creating={creatingScreen}
        createdScreen={createdScreen}
        showToast={showToast}
      />

      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limits={limits}
        screenCount={screens.length}
      />

      <AnalyticsModal
        screen={analyticsScreen}
        data={analyticsData}
        loading={analyticsLoading}
        range={analyticsRange}
        onRangeChange={(range) => handleLoadAnalytics(analyticsScreen, range)}
        onClose={closeAnalyticsModal}
      />

      <KioskModeModal
        screen={showKioskModal}
        onClose={() => setShowKioskModal(null)}
        onSubmit={handleSetKioskMode}
      />

      <EditScreenModal
        screen={editingScreen}
        locations={locations}
        screenGroups={screenGroups}
        playlists={playlists}
        layouts={layouts}
        onClose={() => setEditingScreen(null)}
        onSubmit={handleUpdateScreen}
        saving={savingEdit}
      />

      {detailScreen && (
        <ScreenDetailDrawer
          screen={detailScreen}
          onClose={() => setDetailScreen(null)}
          showToast={showToast}
        />
      )}

      <InsertContentModal
        open={showContentPicker}
        onClose={closeContentPicker}
        onSelect={handleContentSelected}
        initialTab="playlists"
        title={`Assign Content to ${contentPickerScreen?.device_name || 'Screen'}`}
        allowedTabs={['playlists', 'layouts']}
      />

      <ScreensFooterCards
        onUpgrade={() => window.location.hash = '#account-plan'}
        onBuyPlayer={() => window.open('https://bizscreen.io/players', '_blank')}
        onAddScreen={() => setShowAddModal(true)}
      />
    </PageLayout>
  );
};

export default ScreensPage;
