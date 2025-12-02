import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Monitor,
  MoreVertical,
  Trash2,
  Edit,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings,
  Play,
  Copy,
  ListVideo,
  Layout,
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
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  fetchScreens as fetchScreensService,
  createScreen,
  deleteScreen,
  assignPlaylistToScreen,
  assignLayoutToScreen,
  assignScheduleToScreen,
  isScreenOnline,
  formatLastSeen,
  rebootDevice,
  reloadDeviceContent,
  clearDeviceCache,
  resetDevice,
  setDeviceKioskMode,
} from '../services/screenService';
import { fetchPlaylists } from '../services/playlistService';
import { fetchLayouts } from '../services/layoutService';
import { fetchSchedules } from '../services/scheduleService';
import {
  getEffectiveLimits,
  hasReachedLimit,
  formatLimitDisplay,
} from '../services/limitsService';
import { fetchLocations, assignScreenToLocation } from '../services/locationService';
import { getScreenAnalytics, formatDuration, getUptimeColor, DATE_RANGES } from '../services/analyticsService';
import { fetchScreenGroups } from '../services/screenGroupService';
import ScreenDetailDrawer from '../components/ScreenDetailDrawer';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button, IconButton } from '../design-system';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../design-system';
import { Badge, StatusBadge } from '../design-system';
import { FormField, Input, Select, Switch } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalContent, ModalFooter, ConfirmDialog } from '../design-system';
import { Alert, Banner } from '../design-system';
import { EmptyState } from '../design-system';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Demo pairing hint banner
const DemoPairingBanner = ({ screen, onCopy }) => (
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

// Limit warning banner
const LimitWarningBanner = ({ limits, onUpgrade }) => (
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
    You've reached the maximum of {limits?.maxScreens} screen{limits?.maxScreens !== 1 ? 's' : ''} for your {limits?.planName} plan.
    Upgrade to add more screens.
  </Banner>
);

// Empty state for no screens
const NoScreensState = ({ onAddScreen }) => (
  <Card variant="outlined" className="p-12 text-center">
    <div className="w-64 h-40 mx-auto mb-6 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
      <div className="text-center">
        <Monitor size={48} className="mx-auto text-gray-400 mb-2" />
        <div className="text-orange-500 font-bold text-lg">BizScreen</div>
      </div>
    </div>
    <h2 className="text-xl font-bold text-gray-900 mb-2">You don't have any Screens.</h2>
    <p className="text-gray-600 max-w-md mx-auto mb-6">
      Your BizScreen <strong>Screens</strong> are paired with your physical devices, through a unique registration code. Add one to get started, and push changes instantly.
    </p>
    <Button onClick={onAddScreen}>
      <Plus size={18} />
      Add Screen
    </Button>
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
        <span>🖥️</span>
        <span>📺</span>
        <span>🎮</span>
      </div>
    </Card>
  </Grid>
);

// Screen table row
const ScreenRow = ({
  screen,
  locations,
  screenGroups,
  playlists,
  layouts,
  schedules,
  assigningPlaylist,
  assigningLayout,
  assigningSchedule,
  onAssignLocation,
  onAssignPlaylist,
  onAssignLayout,
  onAssignSchedule,
  onCopyCode,
  actionMenuId,
  onActionMenuToggle,
  onEdit,
  onViewDetails,
  onViewAnalytics,
  onDeviceCommand,
  onOpenKiosk,
  onDelete,
  commandingDevice,
}) => {
  const online = isScreenOnline(screen);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Screen Name */}
      <td className="p-4">
        <Inline gap="sm" align="center">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            online ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Monitor size={20} className={online ? 'text-green-600' : 'text-gray-400'} />
          </div>
          <div>
            <span className="font-medium text-gray-900">{screen.device_name}</span>
            {screen.model && (
              <p className="text-xs text-gray-500">{screen.model}</p>
            )}
          </div>
        </Inline>
      </td>

      {/* Location */}
      <td className="p-4">
        <Inline gap="xs" align="center">
          <MapPin size={14} className="text-blue-500 shrink-0" />
          <select
            value={screen.location_id || ''}
            onChange={(e) => onAssignLocation(screen.id, e.target.value || null)}
            className="flex-1 max-w-[140px] px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Unassigned</option>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </Inline>
      </td>

      {/* Group */}
      <td className="p-4">
        {screen.screen_group_id ? (
          <Inline gap="xs" align="center">
            <Users size={14} className="text-indigo-500 shrink-0" />
            <span className="text-sm text-gray-900">
              {screenGroups.find(g => g.id === screen.screen_group_id)?.name || 'Unknown'}
            </span>
          </Inline>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </td>

      {/* Content (Playlist + Layout) */}
      <td className="p-4">
        <Stack gap="xs">
          {/* Playlist */}
          <Inline gap="xs" align="center">
            <ListVideo size={14} className="text-orange-500 shrink-0" />
            <select
              value={screen.assigned_playlist_id || ''}
              onChange={(e) => onAssignPlaylist(screen.id, e.target.value || null)}
              disabled={assigningPlaylist === screen.id}
              className={`flex-1 max-w-[160px] px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white ${
                assigningPlaylist === screen.id ? 'opacity-50' : ''
              }`}
            >
              <option value="">No playlist</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>{playlist.name}</option>
              ))}
            </select>
            {assigningPlaylist === screen.id && (
              <Loader2 size={12} className="animate-spin text-orange-500" />
            )}
          </Inline>
          {/* Layout */}
          <Inline gap="xs" align="center">
            <Layout size={14} className="text-purple-500 shrink-0" />
            <select
              value={screen.assigned_layout_id || ''}
              onChange={(e) => onAssignLayout(screen.id, e.target.value || null)}
              disabled={assigningLayout === screen.id}
              className={`flex-1 max-w-[160px] px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white ${
                assigningLayout === screen.id ? 'opacity-50' : ''
              }`}
            >
              <option value="">No layout</option>
              {layouts.map(layout => (
                <option key={layout.id} value={layout.id}>{layout.name}</option>
              ))}
            </select>
            {assigningLayout === screen.id && (
              <Loader2 size={12} className="animate-spin text-purple-500" />
            )}
          </Inline>
        </Stack>
      </td>

      {/* Schedule */}
      <td className="p-4">
        <Inline gap="xs" align="center">
          <Calendar size={14} className="text-teal-500 shrink-0" />
          <select
            value={screen.assigned_schedule_id || ''}
            onChange={(e) => onAssignSchedule(screen.id, e.target.value || null)}
            disabled={assigningSchedule === screen.id}
            className={`flex-1 max-w-[160px] px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white ${
              assigningSchedule === screen.id ? 'opacity-50' : ''
            }`}
          >
            <option value="">No schedule</option>
            {schedules.map(schedule => (
              <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
            ))}
          </select>
          {assigningSchedule === screen.id && (
            <Loader2 size={12} className="animate-spin text-teal-500" />
          )}
        </Inline>
      </td>

      {/* Status */}
      <td className="p-4">
        <StatusBadge status={online ? 'online' : 'offline'} />
      </td>

      {/* Pairing Code */}
      <td className="p-4">
        {screen.otp_code ? (
          <Inline gap="xs" align="center">
            <code className="px-2 py-1 bg-gray-100 rounded font-mono text-sm">
              {screen.otp_code}
            </code>
            <button
              onClick={() => onCopyCode(screen.otp_code)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Copy code"
            >
              <Copy size={14} className="text-gray-400" />
            </button>
          </Inline>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>

      {/* Last Seen */}
      <td className="p-4 text-gray-600 text-sm">
        {formatLastSeen(screen.last_seen)}
      </td>

      {/* Actions */}
      <td className="p-4">
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
              onDeviceCommand={(cmd) => { onActionMenuToggle(null); onDeviceCommand(screen.id, cmd, screen.device_name); }}
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
    <div className="px-4 py-1 text-xs text-gray-400 uppercase tracking-wide">
      Device Commands
    </div>

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
const AddScreenModal = ({ open, onClose, onSubmit, creating, createdScreen, onCopyCode, showToast }) => {
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
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Screen Created Successfully!
              </h3>
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
          </Stack>
        )}
      </ModalContent>

      <ModalFooter>
        {!createdScreen ? (
          <>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              form="add-screen-form"
              disabled={creating || !name.trim()}
              loading={creating}
            >
              <Plus size={18} />
              Create Screen
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} className="w-full">Done</Button>
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
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          <Button
            onClick={() => {
              onClose();
              window.location.hash = '#account-plan';
            }}
            className="flex-1"
          >
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
            {/* Summary Cards */}
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
                <p className="text-2xl font-bold text-gray-900">
                  {data.playback?.total_events || 0}
                </p>
              </div>
            </Grid>

            {/* Top Media */}
            <Card variant="outlined">
              <CardHeader className="py-2">
                <Inline gap="xs" align="center">
                  <Image size={14} className="text-blue-600" />
                  <CardTitle className="text-sm">Top Media Items</CardTitle>
                </Inline>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {data.topMedia && data.topMedia.length > 0 ? (
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
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No playback data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            {data.dailyActivity && data.dailyActivity.length > 0 && (
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
          <div className="flex items-center justify-center h-48 text-gray-500">
            No analytics data available
          </div>
        )}
      </ModalContent>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} className="w-full">Close</Button>
      </ModalFooter>
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
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
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
  const { user } = useAuth();
  const { t } = useTranslation();
  const [screens, setScreens] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [screenGroups, setScreenGroups] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [editingScreen, setEditingScreen] = useState(null);

  // Add screen modal state
  const [newScreenName, setNewScreenName] = useState('');
  const [creatingScreen, setCreatingScreen] = useState(false);
  const [createdScreen, setCreatedScreen] = useState(null);

  // Assignment loading states
  const [assigningPlaylist, setAssigningPlaylist] = useState(null);
  const [assigningLayout, setAssigningLayout] = useState(null);
  const [assigningSchedule, setAssigningSchedule] = useState(null);

  // Plan limits state
  const [limits, setLimits] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Analytics modal state
  const [analyticsScreen, setAnalyticsScreen] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState('7d');

  // Device command state
  const [commandingDevice, setCommandingDevice] = useState(null);
  const [showKioskModal, setShowKioskModal] = useState(null);

  // Screen detail drawer state
  const [detailScreen, setDetailScreen] = useState(null);

  // Fetch screens and playlists
  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('screens-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tv_devices',
      }, () => {
        loadScreens();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadScreens(),
      loadPlaylists(),
      loadLayouts(),
      loadSchedules(),
      loadLimits(),
      loadLocations(),
      loadScreenGroups(),
    ]);
    setLoading(false);
  };

  const loadScreenGroups = async () => {
    try {
      const result = await fetchScreenGroups();
      setScreenGroups(result || []);
    } catch (error) {
      console.error('Error fetching screen groups:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const result = await fetchLocations();
      setLocations(result.data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const loadLimits = async () => {
    try {
      const data = await getEffectiveLimits();
      setLimits(data);
    } catch (error) {
      console.error('Error fetching limits:', error);
    }
  };

  const loadScreens = async () => {
    try {
      const data = await fetchScreensService();
      setScreens(data || []);
    } catch (error) {
      console.error('Error fetching screens:', error);
      showToast?.('Error loading screens: ' + error.message, 'error');
    }
  };

  const loadPlaylists = async () => {
    try {
      const data = await fetchPlaylists();
      setPlaylists(data || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const loadLayouts = async () => {
    try {
      const data = await fetchLayouts();
      setLayouts(data || []);
    } catch (error) {
      console.error('Error fetching layouts:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const data = await fetchSchedules();
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const filteredScreens = screens.filter((screen) => {
    if (locationFilter !== 'all') {
      if (locationFilter === 'unassigned') {
        if (screen.location_id) return false;
      } else if (screen.location_id !== locationFilter) {
        return false;
      }
    }

    if (groupFilter !== 'all') {
      if (groupFilter === 'unassigned') {
        if (screen.screen_group_id) return false;
      } else if (screen.screen_group_id !== groupFilter) {
        return false;
      }
    }

    const searchLower = search.toLowerCase();
    return (
      screen.device_name?.toLowerCase().includes(searchLower) ||
      screen.assigned_playlist?.name?.toLowerCase().includes(searchLower) ||
      screen.assigned_layout?.name?.toLowerCase().includes(searchLower) ||
      screen.assigned_schedule?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleAssignLocation = async (screenId, locationId) => {
    try {
      await assignScreenToLocation(screenId, locationId || null);
      setScreens((prev) =>
        prev.map((s) => (s.id === screenId ? { ...s, location_id: locationId || null } : s))
      );
      showToast?.('Location updated');
    } catch (error) {
      console.error('Error assigning location:', error);
      showToast?.('Error updating location', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this screen?')) return;

    try {
      await deleteScreen(id);
      setScreens((prev) => prev.filter((s) => s.id !== id));
      showToast?.('Screen deleted successfully');
    } catch (error) {
      console.error('Error deleting screen:', error);
      showToast?.('Error deleting screen: ' + error.message, 'error');
    }
  };

  const handleCreateScreen = async (name) => {
    try {
      setCreatingScreen(true);
      const screen = await createScreen({ name });
      setCreatedScreen(screen);
      setScreens((prev) => [screen, ...prev]);
      showToast?.('Screen created successfully');
    } catch (error) {
      console.error('Error creating screen:', error);
      showToast?.('Error creating screen: ' + error.message, 'error');
    } finally {
      setCreatingScreen(false);
    }
  };

  const handleAssignPlaylist = async (screenId, playlistId) => {
    try {
      setAssigningPlaylist(screenId);
      await assignPlaylistToScreen(screenId, playlistId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const playlist = playlists.find((p) => p.id === playlistId);
            return {
              ...s,
              assigned_playlist_id: playlistId || null,
              assigned_playlist: playlist ? { id: playlist.id, name: playlist.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Playlist assigned successfully');
    } catch (error) {
      console.error('Error assigning playlist:', error);
      showToast?.('Error assigning playlist: ' + error.message, 'error');
    } finally {
      setAssigningPlaylist(null);
    }
  };

  const handleAssignLayout = async (screenId, layoutId) => {
    try {
      setAssigningLayout(screenId);
      await assignLayoutToScreen(screenId, layoutId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const layout = layouts.find((l) => l.id === layoutId);
            return {
              ...s,
              assigned_layout_id: layoutId || null,
              assigned_layout: layout ? { id: layout.id, name: layout.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Layout assigned successfully');
    } catch (error) {
      console.error('Error assigning layout:', error);
      showToast?.('Error assigning layout: ' + error.message, 'error');
    } finally {
      setAssigningLayout(null);
    }
  };

  const handleAssignSchedule = async (screenId, scheduleId) => {
    try {
      setAssigningSchedule(screenId);
      await assignScheduleToScreen(screenId, scheduleId || null);

      setScreens((prev) =>
        prev.map((s) => {
          if (s.id === screenId) {
            const schedule = schedules.find((sch) => sch.id === scheduleId);
            return {
              ...s,
              assigned_schedule_id: scheduleId || null,
              assigned_schedule: schedule ? { id: schedule.id, name: schedule.name } : null,
            };
          }
          return s;
        })
      );

      showToast?.('Schedule assigned successfully');
    } catch (error) {
      console.error('Error assigning schedule:', error);
      showToast?.('Error assigning schedule: ' + error.message, 'error');
    } finally {
      setAssigningSchedule(null);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewScreenName('');
    setCreatedScreen(null);
  };

  const loadScreenAnalytics = async (screen, range = '7d') => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsScreen(screen);
      setAnalyticsRange(range);
      const data = await getScreenAnalytics(screen.id, range);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading screen analytics:', error);
      showToast?.('Error loading analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const closeAnalyticsModal = () => {
    setAnalyticsScreen(null);
    setAnalyticsData(null);
  };

  const handleDeviceCommand = async (screenId, commandType, screenName) => {
    if (
      commandType === 'reset' &&
      !window.confirm(
        `Are you sure you want to reset "${screenName}"? This will clear all local data on the device.`
      )
    ) {
      return;
    }

    try {
      setCommandingDevice({ id: screenId, command: commandType });

      switch (commandType) {
        case 'reboot':
          await rebootDevice(screenId);
          showToast?.(`Reboot command sent to ${screenName}`);
          break;
        case 'reload':
          await reloadDeviceContent(screenId);
          showToast?.(`Reload command sent to ${screenName}`);
          break;
        case 'clear_cache':
          await clearDeviceCache(screenId);
          showToast?.(`Clear cache command sent to ${screenName}`);
          break;
        case 'reset':
          await resetDevice(screenId);
          showToast?.(`Reset command sent to ${screenName}`);
          break;
        default:
          throw new Error('Unknown command type');
      }
    } catch (error) {
      console.error(`Error sending ${commandType} command:`, error);
      showToast?.(`Error: ${error.message}`, 'error');
    } finally {
      setCommandingDevice(null);
    }
  };

  const handleKioskModeSubmit = async (screenId, enabled, password) => {
    try {
      await setDeviceKioskMode(screenId, enabled, password);
      showToast?.(enabled ? 'Kiosk mode enabled' : 'Kiosk mode disabled');
      setShowKioskModal(null);
    } catch (error) {
      console.error('Error setting kiosk mode:', error);
      showToast?.(`Error: ${error.message}`, 'error');
    }
  };

  const copyOtpCode = (code) => {
    navigator.clipboard.writeText(code);
    showToast?.('OTP code copied to clipboard');
  };

  const onlineCount = screens.filter(isScreenOnline).length;
  const offlineCount = screens.length - onlineCount;
  const limitReached = limits ? hasReachedLimit(limits.maxScreens, screens.length) : false;

  const handleAddScreen = () => {
    if (limitReached) {
      setShowLimitModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const demoScreen = useMemo(() => {
    if (screens.length === 1 && screens[0].device_name === 'Demo Screen') {
      return screens[0];
    }
    return null;
  }, [screens]);

  return (
    <PageLayout>
      <PageHeader
        title={t('screens.title', 'Screens')}
        description={
          <>
            {screens.length} {screens.length !== 1 ? t('screens.screens', 'screens') : t('screens.screen', 'screen')} •{' '}
            <span className="text-green-600">{onlineCount} {t('screens.online', 'online')}</span> •{' '}
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
          {/* Demo Screen Pairing Hint */}
          {demoScreen && !isScreenOnline(demoScreen) && (
            <DemoPairingBanner screen={demoScreen} onCopy={copyOtpCode} />
          )}

          {/* Limit Warning Banner */}
          {limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {/* Empty State */}
          {screens.length === 0 && !loading && (
            <>
              <NoScreensState onAddScreen={handleAddScreen} />
              <PromoCards />
            </>
          )}

          {/* Search & Filters */}
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

          {/* Screens Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : screens.length > 0 && (
            <Card variant="outlined">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="p-4 font-medium">Screen</th>
                      <th className="p-4 font-medium">Location</th>
                      <th className="p-4 font-medium">Group</th>
                      <th className="p-4 font-medium">Content</th>
                      <th className="p-4 font-medium">Schedule</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Pairing Code</th>
                      <th className="p-4 font-medium">Last Seen</th>
                      <th className="p-4 font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScreens.map((screen) => (
                      <ScreenRow
                        key={screen.id}
                        screen={screen}
                        locations={locations}
                        screenGroups={screenGroups}
                        playlists={playlists}
                        layouts={layouts}
                        schedules={schedules}
                        assigningPlaylist={assigningPlaylist}
                        assigningLayout={assigningLayout}
                        assigningSchedule={assigningSchedule}
                        onAssignLocation={handleAssignLocation}
                        onAssignPlaylist={handleAssignPlaylist}
                        onAssignLayout={handleAssignLayout}
                        onAssignSchedule={handleAssignSchedule}
                        onCopyCode={copyOtpCode}
                        actionMenuId={actionMenuId}
                        onActionMenuToggle={setActionMenuId}
                        onEdit={setEditingScreen}
                        onViewDetails={setDetailScreen}
                        onViewAnalytics={loadScreenAnalytics}
                        onDeviceCommand={handleDeviceCommand}
                        onOpenKiosk={setShowKioskModal}
                        onDelete={handleDelete}
                        commandingDevice={commandingDevice}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Stack>
      </PageContent>

      {/* Modals */}
      <AddScreenModal
        open={showAddModal}
        onClose={closeAddModal}
        onSubmit={handleCreateScreen}
        creating={creatingScreen}
        createdScreen={createdScreen}
        onCopyCode={copyOtpCode}
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
        onRangeChange={(range) => loadScreenAnalytics(analyticsScreen, range)}
        onClose={closeAnalyticsModal}
      />

      <KioskModeModal
        screen={showKioskModal}
        onClose={() => setShowKioskModal(null)}
        onSubmit={handleKioskModeSubmit}
      />

      {/* Screen Detail Drawer */}
      {detailScreen && (
        <ScreenDetailDrawer
          screen={detailScreen}
          onClose={() => setDetailScreen(null)}
          showToast={showToast}
        />
      )}
    </PageLayout>
  );
};

export default ScreensPage;
