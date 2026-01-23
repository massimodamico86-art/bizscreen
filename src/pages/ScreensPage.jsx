/**
 * ScreensPage.jsx
 * Screen management page for TV device pairing, assignment, and control.
 *
 * This is the primary view for managing digital signage screens. It provides:
 * - Screen listing with filtering and search
 * - OTP-based TV pairing (create screen -> show code -> TV enters code)
 * - Playlist/Layout/Schedule assignment to screens
 * - Device commands (reboot, reload, clear cache, kiosk mode)
 * - Screen analytics and status monitoring
 *
 * Data management extracted to useScreensData hook for:
 * - Screen data, picker data, limits
 * - Realtime subscription for status updates
 * - Device commands and screen CRUD
 *
 * UI components extracted to ./components/ScreensComponents.jsx for:
 * - Utility components: DemoPairingBanner, LimitWarningBanner, NoScreensState, PromoCards, ScreensErrorState
 * - UI components: ScreenRow, ScreenActionMenu
 * - Modals: AddScreenModal, LimitReachedModal, AnalyticsModal, EditScreenModal, KioskModeModal
 *
 * @see useScreensData for data management
 * @see screenService.js for API operations
 * @see ScreenDetailDrawer.jsx for detailed screen view
 */
import { useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Calendar,
  Loader2,
  MapPin,
  Users,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { isScreenOnline } from '../services/screenService';
import { hasReachedLimit } from '../services/limitsService';
import ScreenDetailDrawer from '../components/ScreenDetailDrawer';
import { ScreensFooterCards } from '../components/screens/ScreensFooterCards';
import { InsertContentModal } from '../components/modals/InsertContentModal';
import { useScreensData } from './hooks';

// Extracted components
import {
  DemoPairingBanner,
  LimitWarningBanner,
  NoScreensState,
  PromoCards,
  ScreenRow,
  AddScreenModal,
  LimitReachedModal,
  AnalyticsModal,
  ScreensErrorState,
  EditScreenModal,
  KioskModeModal,
} from './components/ScreensComponents';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card } from '../design-system';

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
