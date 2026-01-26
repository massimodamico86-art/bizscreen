/**
 * @file MediaLibraryPage.jsx
 * @description Media Library page for managing images, videos, audio, documents, and web pages.
 *
 * Features:
 * - Grid and list view modes for media assets
 * - File uploads via drag-drop and modal (S3-powered)
 * - Web page URL addition for embedding external content
 * - Search filtering across all media
 * - Delete with usage check (warns if media is in use)
 * - Plan-based media limits with upgrade prompts
 * - Bulk selection and bulk actions
 * - Folder navigation and organization
 *
 * State Management:
 * - Uses useMediaLibrary hook for all state and actions
 *
 * @see {@link ./hooks/useMediaLibrary.js} - Media library hook
 * @see {@link ./components/MediaLibraryComponents.jsx} - Extracted sub-components
 * @see {@link ../services/mediaService.js} - Media CRUD operations
 */
import { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  Image,
  Video,
  Music,
  FileText,
  Globe,
  Folder,
  Loader2,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import { useMediaLibrary } from './hooks';
import {
  MediaDetailModal,
  BulkActionBar,
  StorageUsageInline,
  DropZoneOverlay,
  MediaPreviewPopover,
  useMediaPreview,
} from '../components/media';
import YodeckAddMediaModal from '../components/media/YodeckAddMediaModal';

// Design system imports
import {
  PageLayout,
  PageContent,
  Stack,
  Grid,
  Inline,
} from '../design-system';
import { Button } from '../design-system';
import { Card } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../design-system';
import { Banner } from '../design-system';
import { EmptyState } from '../design-system';
import YodeckEmptyState from '../components/YodeckEmptyState';

// Extracted sub-components
import {
  MEDIA_TYPE_LABELS,
  LimitWarningBanner,
  MediaListRow,
  MediaGridCard,
  FolderGridCard,
  FolderBreadcrumbs,
  DeleteConfirmModal,
  LimitReachedModal,
  FolderCreateModal,
  MoveToFolderModal,
  AddToPlaylistModal,
  SetToScreenModal,
  EmergencyDurationModal,
} from './components/MediaLibraryComponents';

// Filter options for sidebar
const TYPE_FILTER_OPTIONS = [
  { id: null, label: 'All Types', icon: Grid3X3 },
  { id: 'image', label: 'Images', icon: Image },
  { id: 'video', label: 'Videos', icon: Video },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'document', label: 'Documents', icon: FileText },
  { id: 'web_page', label: 'Web Pages', icon: Globe },
];

const ORIENTATION_FILTER_OPTIONS = [
  { id: null, label: 'All Orientations' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'square', label: 'Square' },
];

const ITEMS_PER_PAGE_OPTIONS = [12, 20, 40, 60];

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

const MediaLibraryPage = ({ showToast, filter = null }) => {
  useAuth(); // Ensure user is authenticated
  const { t } = useTranslation();

  // Use the media library hook
  const {
    // Folder navigation
    folders,
    foldersLoading,
    folderPath,
    currentFolderId,
    handleNavigateFolder,
    handleCreateFolder,

    // Upload
    isUploading,
    uploadProgress,
    openFilePicker,
    renderFileInput,

    // Media data
    mediaAssets,
    filteredAssets,
    loading,
    error,
    limits,
    limitReached,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,

    // Filter/search
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    orientationFilter,
    setOrientationFilter,
    viewMode,
    setViewMode,
    hasActiveFilters,
    clearAllFilters,

    // Bulk selection
    selectedIds,
    toggleSelection,
    selectAll,
    deselectAll,
    isBulkDeleting,
    isBulkDownloading,
    isBulkAddingToPlaylist,

    // Modal state
    showAddMediaModal,
    setShowAddMediaModal,
    showDetailModal,
    showMoveModal,
    showAddToPlaylistModal,
    showPushToScreenModal,
    showFolderModal,
    setShowFolderModal,
    showLimitModal,
    setShowLimitModal,
    showBulkPlaylistModal,
    setShowBulkPlaylistModal,

    // Modal data
    selectedAsset,
    deleteConfirm,
    setDeleteConfirm,
    mediaToMove,
    playlists,
    screens,

    // Folder modal state
    newFolderName,
    setNewFolderName,
    creatingFolder,
    movingMedia,
    deletingForce,
    addingToPlaylist,
    settingToScreen,

    // Drag state
    draggingMedia,
    dragOverIndex,
    dragOverFolderId,

    // Actions
    fetchAssets,
    handleUpdateAsset,
    handleDelete,
    handleDeleteConfirm,
    handleDeleteFromDetail,
    handleDuplicateAsset,
    handleMoveConfirm,
    handleConfirmAddToPlaylist,
    handleCreateNewPlaylist,
    handleConfirmPushToScreen,

    // Bulk actions
    handleBulkDelete,
    handleBulkDownload,
    handleBulkAddToPlaylist,
    handleBulkMove,
    openBulkPlaylistModal,

    // Drag handlers
    handleDragStart,
    handleDragEnd,
    handleDragOverMedia,
    handleDragOverFolder,
    handleDragLeaveFolder,
    handleReorderMedia,
    handleDropOnFolder,

    // Upload handlers
    saveWebPage,

    // UI handlers
    handleSelectAsset,
    handleOpenDetail,
    handleCloseDetail,
    handleAddMedia,
    closeUploadModal,
    closeFolderModal,
    closeMoveModal,
    closePlaylistModal,
    closeScreenModal,
  } = useMediaLibrary({ showToast, filter });

  // Action menu state (kept local for simplicity)
  const [actionMenuId, setActionMenuId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDropZone, setShowDropZone] = useState(false);

  // Emergency push state
  const [emergencyPushTarget, setEmergencyPushTarget] = useState(null);

  // Media preview popover hook
  const {
    isVisible: isPreviewVisible,
    asset: previewAsset,
    anchorRect: previewAnchorRect,
    showPreview,
    hidePreview,
  } = useMediaPreview(300);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPageTitle = () => {
    if (!filter) return t('media.allMedia', 'All Media');
    return MEDIA_TYPE_LABELS[filter] + 's';
  };

  // Calculate pagination indices for display
  const startIndex = (currentPage - 1) * itemsPerPage;

  return (
    <PageLayout>
      {/* Page header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
            <StorageUsageInline className="hidden md:flex" />
          </div>
          <Inline gap="sm" className="items-center">
            <Button size="sm" icon={<Plus size={16} />} onClick={handleAddMedia} className="bg-[#f26f21] hover:bg-[#e05e10] text-white">
              Add Media
            </Button>
            <Button variant="ghost" size="sm">
              Tags
            </Button>
            <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setShowFolderModal(true)}>
              Add folder
            </Button>
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 ${showFilters ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
                title="Filter"
              >
                <Filter size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <Grid3X3 size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
              >
                <List size={18} className="text-gray-600" />
              </button>
            </div>
          </Inline>
        </div>
      </div>

      <PageContent>
        <Stack gap="lg">
          {/* Error Banner */}
          {error && !loading && (
            <Banner
              variant="error"
              icon={<AlertTriangle size={20} />}
              title="Failed to load media"
              action={
                <Button variant="secondary" size="sm" onClick={() => fetchAssets()}>
                  Retry
                </Button>
              }
            >
              {error}
            </Banner>
          )}

          {/* Limit Warning Banner */}
          {!error && limitReached && (
            <LimitWarningBanner limits={limits} onUpgrade={() => setShowLimitModal(true)} />
          )}

          {/* Breadcrumbs */}
          {currentFolderId && (
            <div className="flex items-center justify-between">
              <FolderBreadcrumbs folderPath={folderPath} onNavigate={handleNavigateFolder} />
              <Button variant="ghost" size="sm" onClick={() => handleNavigateFolder(null)}>
                <Home size={16} />
                Back to Root
              </Button>
            </div>
          )}

          {/* Empty States */}
          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && !currentFolderId && (
            <Card className="p-6">
              <YodeckEmptyState
                type="media"
                title="No Media Yet"
                description="BizScreen Media range from images to PDFs, YouTube links or web pages. Add some to get started, and then use them to create playlists and layouts."
                actionLabel="Upload Media"
                onAction={handleAddMedia}
                secondaryActionLabel="Add Web Page"
                onSecondaryAction={() => {
                  setShowAddMediaModal(true);
                }}
                showTourLink={true}
                tourLinkText="Take the media tour"
                onTourClick={() => window.open('https://docs.bizscreen.io/media', '_blank')}
              />
            </Card>
          )}

          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && currentFolderId && !filter && (
            <Card className="p-6">
              <YodeckEmptyState
                type="folder"
                title="This Folder is Empty"
                description="Add media or create subfolders to organize your content."
                actionLabel="Upload Media"
                onAction={handleAddMedia}
                secondaryActionLabel="Create Subfolder"
                onSecondaryAction={() => setShowFolderModal(true)}
              />
            </Card>
          )}

          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && currentFolderId && filter && (
            <Card className="p-6">
              <EmptyState
                icon={<Folder size={48} className="text-gray-300" />}
                title={`No ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter}s in this folder`}
                description={`This folder doesn't contain any ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter} files.`}
              />
            </Card>
          )}

          {folders.length === 0 && mediaAssets.length === 0 && !loading && !error && !currentFolderId && filter && (
            <Card className="p-6">
              <EmptyState
                icon={<Image size={48} className="text-gray-300" />}
                title={`No ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter}s yet`}
                description={`Upload ${MEDIA_TYPE_LABELS[filter]?.toLowerCase() || filter} files to see them here.`}
                action={
                  <Button onClick={handleAddMedia}>
                    <Plus size={16} className="mr-2" />
                    Add {MEDIA_TYPE_LABELS[filter] || 'Media'}
                  </Button>
                }
              />
            </Card>
          )}

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21] bg-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <Card variant="outlined" className="p-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    File Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TYPE_FILTER_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id || 'all'}
                          onClick={() => setTypeFilter(option.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            typeFilter === option.id
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Icon size={14} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                    Orientation
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ORIENTATION_FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.id || 'all'}
                        onClick={() => setOrientationFilter(option.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          orientationFilter === option.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                      <X size={14} />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Content */}
          {error ? null : loading || foldersLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredAssets.length === 0 && folders.length === 0 && search ? (
            <EmptyState
              icon={<Search size={48} className="text-gray-300" />}
              title="No media found"
              description={`No media matching "${search}"`}
            />
          ) : viewMode === 'list' ? (
            <Stack gap="md">
              {folders.length > 0 && !search && (
                <Card variant="outlined">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Folders ({folders.length})</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {folders.map((folder) => {
                      const folderId = folder.folder_id || folder.id;
                      const folderName = folder.folder_name || folder.name;
                      return (
                        <div
                          key={folderId}
                          onClick={() => handleNavigateFolder(folderId)}
                          className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <Folder size={20} className="text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{folderName}</span>
                            <p className="text-sm text-gray-500">
                              {folder.media_count || 0} item{(folder.media_count || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {filteredAssets.length > 0 && (
                <Card variant="outlined">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
                          <th className="p-4 w-8">
                            <input type="checkbox" className="rounded border-gray-300" />
                          </th>
                          <th className="p-4 font-medium">Name</th>
                          <th className="p-4 font-medium">Media Type</th>
                          <th className="p-4 font-medium">Modified</th>
                          <th className="p-4 font-medium">Tags</th>
                          <th className="p-4 font-medium w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssets.map((asset) => (
                          <MediaListRow
                            key={asset.id}
                            asset={asset}
                            actionMenuId={actionMenuId}
                            onActionMenuToggle={setActionMenuId}
                            onDelete={handleDelete}
                            onDuplicate={handleDuplicateAsset}
                            onPushEmergency={setEmergencyPushTarget}
                            formatDate={formatDate}
                            onClick={handleSelectAsset}
                            onDoubleClick={handleOpenDetail}
                            isSelected={selectedAsset?.id === asset.id}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </Stack>
          ) : (
            <Stack gap="md">
              {folders.length > 0 && !search && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-3">Folders ({folders.length})</p>
                  <Grid cols={5} gap="md" className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {folders.map((folder) => {
                      const folderId = folder.folder_id || folder.id;
                      return (
                        <FolderGridCard
                          key={folderId}
                          folder={folder}
                          onClick={handleNavigateFolder}
                          onDragOver={handleDragOverFolder}
                          onDragLeave={handleDragLeaveFolder}
                          onDrop={handleDropOnFolder}
                          isDragOver={dragOverFolderId === folderId}
                        />
                      );
                    })}
                  </Grid>
                </div>
              )}

              {filteredAssets.length > 0 && (
                <div>
                  {folders.length > 0 && !search && (
                    <p className="text-sm font-medium text-gray-500 mb-3">Media ({filteredAssets.length})</p>
                  )}
                  <Grid cols={5} gap="md" className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {filteredAssets.map((asset, index) => (
                      <MediaGridCard
                        key={asset.id}
                        asset={asset}
                        index={index}
                        formatDate={formatDate}
                        onClick={handleSelectAsset}
                        onDoubleClick={handleOpenDetail}
                        isSelected={selectedAsset?.id === asset.id}
                        isBulkSelected={selectedIds.has(asset.id)}
                        onToggleSelect={toggleSelection}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOverMedia}
                        onDrop={handleReorderMedia}
                        isDragging={draggingMedia?.id === asset.id}
                        isDragOver={dragOverIndex === index && draggingMedia?.id !== asset.id}
                        onShowPreview={showPreview}
                        onHidePreview={hidePreview}
                      />
                    ))}
                  </Grid>
                </div>
              )}
            </Stack>
          )}

          {/* Pagination */}
          {!error && filteredAssets.length > 0 && totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{Math.min(startIndex + filteredAssets.length, totalCount)} of {totalCount} items
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >
                  <ChevronsLeft size={18} className="text-gray-600" />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#f26f21] text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next page"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >
                  <ChevronsRight size={18} className="text-gray-600" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f26f21] focus:border-[#f26f21]"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Stack>
      </PageContent>

      {/* Hidden file input for S3 uploads */}
      {renderFileInput()}

      {/* Modals */}
      <YodeckAddMediaModal
        open={showAddMediaModal}
        onClose={closeUploadModal}
        onAddWebPage={async (url, name) => {
          await saveWebPage({ preventDefault: () => {}, target: { url, name } });
        }}
        openFilePicker={openFilePicker}
        showToast={showToast}
        uploading={isUploading}
        uploadProgress={uploadProgress}
      />

      <DeleteConfirmModal
        deleteConfirm={deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deletingForce}
      />

      <LimitReachedModal
        open={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        limits={limits}
        mediaCount={mediaAssets.length}
      />

      <FolderCreateModal
        open={showFolderModal}
        onClose={closeFolderModal}
        folderName={newFolderName}
        setFolderName={setNewFolderName}
        onCreate={handleCreateFolder}
        creating={creatingFolder}
      />

      <MoveToFolderModal
        open={showMoveModal}
        onClose={closeMoveModal}
        mediaName={mediaToMove?.name}
        folders={folders}
        onMove={handleMoveConfirm}
        moving={movingMedia}
      />

      <AddToPlaylistModal
        open={showAddToPlaylistModal}
        onClose={closePlaylistModal}
        mediaName={selectedAsset?.name}
        playlists={playlists}
        onAdd={handleConfirmAddToPlaylist}
        adding={addingToPlaylist}
        onCreateNew={handleCreateNewPlaylist}
      />

      <SetToScreenModal
        open={showPushToScreenModal}
        onClose={closeScreenModal}
        mediaName={selectedAsset?.name}
        screens={screens}
        onSet={handleConfirmPushToScreen}
        setting={settingToScreen}
      />

      <MediaDetailModal
        open={showDetailModal}
        onClose={handleCloseDetail}
        asset={selectedAsset}
        onUpdate={handleUpdateAsset}
        onDelete={handleDeleteFromDetail}
        isGlobal={selectedAsset && !selectedAsset.owner_id}
        showToast={showToast}
      />

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={filteredAssets.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onDelete={handleBulkDelete}
        onMove={handleBulkMove}
        onDownload={handleBulkDownload}
        onAddToPlaylist={openBulkPlaylistModal}
        isDeleting={isBulkDeleting}
        isDownloading={isBulkDownloading}
        isAddingToPlaylist={isBulkAddingToPlaylist}
      />

      <Modal isOpen={showBulkPlaylistModal} onClose={() => setShowBulkPlaylistModal(false)} size="md">
        <ModalHeader>
          <ModalTitle>Add to Playlist</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-sm text-gray-500 mb-4">
            Select a playlist to add {selectedIds.size} item(s) to:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {playlists.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No playlists found. Create one first.</p>
            ) : (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handleBulkAddToPlaylist(playlist.id)}
                  disabled={isBulkAddingToPlaylist}
                  className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-gray-900">{playlist.name}</div>
                  {playlist.description && (
                    <div className="text-sm text-gray-500 truncate">{playlist.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowBulkPlaylistModal(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <DropZoneOverlay
        isVisible={showDropZone}
        onClose={() => setShowDropZone(false)}
        onDrop={() => {
          setShowDropZone(false);
          handleAddMedia();
        }}
        targetFolder={currentFolderId ? folderPath?.[folderPath.length - 1]?.name : null}
      />

      <MediaPreviewPopover
        asset={previewAsset}
        isVisible={isPreviewVisible}
        anchorRect={previewAnchorRect}
        onClose={hidePreview}
      />

      <EmergencyDurationModal
        open={!!emergencyPushTarget}
        onClose={() => setEmergencyPushTarget(null)}
        contentType="media"
        contentId={emergencyPushTarget?.id}
        contentName={emergencyPushTarget?.name}
        showToast={showToast}
      />
    </PageLayout>
  );
};

export default MediaLibraryPage;
