import { useCallback } from 'react';


import { usePlaylistEditor } from './hooks';



const FILTER_TABS = [
  { key: '', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'document', label: 'Docs' },
  { key: 'web_page', label: 'Web' },
  { key: 'app', label: 'Apps' },
  { key: 'my_designs', label: 'My Designs' },
];

const PlaylistEditorPage = ({ playlistId, showToast, onNavigate }) => {
  // Use the custom hook for all playlist editor state and logic
  const {
    // Playlist state
    playlist,
    items,
    loading,
    saving,

    // Media library state
    mediaAssets,
    mediaSearch,
    setMediaSearch,
    mediaFilter,
    setMediaFilter,
    currentFolderId,
    folders,
    folderPath,
    loadingFolders,
    visibleMediaItems,
    mediaScrollRef,
    ITEMS_PER_ROW,
    ITEM_HEIGHT,

    // Preview/playback state
    previewItem,
    setPreviewItem,
    isPlaying,
    currentPlayIndex,
    setCurrentPlayIndex,
    timelineRef,

    // AI state
    showAiModal,
    setShowAiModal,
    aiGenerating,
    aiSlideCount,
    setAiSlideCount,
    aiSuggestion,
    setAiSuggestion,
    aiApplying,

    // Approval state
    showApprovalModal,
    setShowApprovalModal,
    approvalMessage,
    setApprovalMessage,
    submittingApproval,

    // Preview links state
    showPreviewModal,
    setShowPreviewModal,
    previewLinks,
    loadingPreviewLinks,
    creatingPreviewLink,
    selectedExpiry,
    setSelectedExpiry,
    allowComments,
    setAllowComments,
    copiedLinkId,

    // Drag state
    dragSourceIndex,
    dragOverIndex,
    isDraggingFromLibrary,
    lastDragOverIndexRef,

    // Template state
    showTemplateModal,
    setShowTemplateModal,
    templateName,
    setTemplateName,
    templateDescription,
    setTemplateDescription,
    savingTemplate,

    // Actions
    navigateToFolder,
    handleMediaScroll,
    handleAddItem,
    handleRemoveItem,
    handleUpdateDuration,
    handleTimelineDragStart,
    handleTimelineDragEnd,
    handleTimelineDragOver,
    handleTimelineDrop,
    handleTimelineDropFromLibrary,
    handleTimelineDragOverContainer,
    handleTimelineDragLeave,
    handleGenerateAiSlides,
    handleApplyAiSlides,
    handleRequestApproval,
    handleCreatePreviewLink,
    handleRevokePreviewLink,
    handleCopyLink,
    handleSaveAsTemplate,
    getEffectiveDuration,
    getTotalDuration,
    startPlayback,
    stopPlayback,
    skipToNext,
    skipToPrev,
  } = usePlaylistEditor(playlistId, { showToast });

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Playlist not found</p>
        <Button variant="outline" className="mt-4" onClick={() => onNavigate?.('playlists')}>
          Back to Playlists
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Editor header with save status */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-900">{playlist?.name || 'Untitled Playlist'}</h1>
          {saving ? (
            <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Saving...
            </span>
          ) : (
            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Check size={12} />
              All changes saved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => onNavigate?.('playlists')}
          >
            Done
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Library Panel */}
        <div className="w-[280px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search library..."
                value={mediaSearch}
                onChange={(e) => setMediaSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Folder navigation breadcrumbs */}
          <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-1 text-xs overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateToFolder(null)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0 ${
                  currentFolderId === null ? 'text-orange-600 font-medium' : 'text-gray-600'
                }`}
              >
                <Home size={12} />
                <span>Root</span>
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center flex-shrink-0">
                  <ChevronRight size={12} className="text-gray-400 mx-0.5" />
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className={`px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors truncate max-w-[80px] ${
                      index === folderPath.length - 1 ? 'text-orange-600 font-medium' : 'text-gray-600'
                    }`}
                    title={folder.name}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Folders list */}
          {folders.length > 0 && (
            <div className="border-b border-gray-200 max-h-[120px] overflow-y-auto">
              <div className="p-1.5 space-y-0.5">
                {folders.map((folder) => (
                  <button
                    key={folder.folder_id}
                    onClick={() => navigateToFolder(folder.folder_id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-orange-50 rounded transition-colors group"
                  >
                    <FolderOpen size={16} className="text-orange-500 flex-shrink-0" />
                    <span className="truncate flex-1 text-gray-700 group-hover:text-orange-600">
                      {folder.folder_name}
                    </span>
                    {folder.media_count > 0 && (
                      <span className="text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                        {folder.media_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter tabs - horizontally scrollable */}
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setMediaFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex-shrink-0 ${
                    mediaFilter === tab.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item count */}
          <div className="px-2 py-1.5 text-xs text-gray-500 border-b border-gray-100 flex items-center justify-between">
            <span>{mediaAssets.length} items</span>
            {currentFolderId && (
              <button
                onClick={() => navigateToFolder(null)}
                className="text-orange-500 hover:text-orange-600 text-xs"
              >
                View all
              </button>
            )}
          </div>

          {/* Media grid with virtual scrolling */}
          <div
            ref={mediaScrollRef}
            className="flex-1 overflow-y-auto p-2"
            onScroll={handleMediaScroll}
          >
            {mediaAssets.length === 0 && folders.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                {loadingFolders ? 'Loading...' : 'No media found'}
              </div>
            ) : mediaAssets.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Folder size={32} className="mx-auto mb-2 text-gray-300" />
                <p>This folder is empty</p>
                <p className="text-xs mt-1">Drag media here or browse subfolders</p>
              </div>
            ) : (
              <div
                className="relative"
                style={{
                  height: `${Math.ceil(mediaAssets.length / ITEMS_PER_ROW) * ITEM_HEIGHT}px`,
                }}
              >
                <div
                  className="absolute left-0 right-0 grid grid-cols-2 gap-2"
                  style={{
                    top: `${Math.floor(visibleMediaItems.length > 0 ? 0 : 0) * ITEM_HEIGHT}px`,
                  }}
                >
                  {visibleMediaItems.map(media => (
                    <LibraryMediaItem
                      key={media.id}
                      media={media}
                      countInPlaylist={items.filter(i => i.item_id === media.id).length}
                      onAdd={handleAddItem}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Preview area with playlist info */}
        <div className="flex-1 flex flex-col p-3 bg-gray-100 overflow-hidden">
          {/* Main preview content */}
          <div className="flex-1 flex gap-3 min-h-0">
            {/* Large TV Preview */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* TV Frame */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-2xl">
                  <div className="aspect-video bg-gray-900 rounded-xl shadow-2xl overflow-hidden relative ring-4 ring-gray-800">
                    {previewItem ? (
                      // App content - render the actual app component
                      previewItem.media?.type === 'app' ? (
                        (() => {
                          const appType = previewItem.media?.config_json?.appType;
                          const config = previewItem.media?.config_json || {};
                          if (appType === 'weather') {
                            return <WeatherWall config={config} />;
                          }
                          // Unknown app type - show placeholder
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
                              <Grid3X3 size={48} className="mb-3 opacity-60" />
                              <p className="text-lg font-medium">{previewItem.media?.name || 'App'}</p>
                              <p className="text-sm opacity-60 capitalize">{appType || 'Unknown'} App</p>
                            </div>
                          );
                        })()
                      ) : previewItem.media?.thumbnail_url || previewItem.media?.url ? (
                        <img
                          src={previewItem.media.thumbnail_url || previewItem.media.url}
                          alt={previewItem.media.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play size={64} className="text-gray-600" />
                        </div>
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center mb-3">
                          <Play size={32} className="text-gray-600 ml-1" />
                        </div>
                        <p className="text-base">Select an item to preview</p>
                        <p className="text-xs text-gray-600 mt-1">or click Play to start</p>
                      </div>
                    )}
                    {/* Playing indicator */}
                    {isPlaying && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        PLAYING
                      </div>
                    )}
                    {/* Item counter overlay */}
                    {previewItem && items.length > 0 && (
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        {(items.findIndex(i => i.id === previewItem.id) + 1) || 1} / {items.length}
                      </div>
                    )}
                  </div>
                  {/* TV Stand decoration */}
                  <div className="flex justify-center">
                    <div className="w-24 h-2 bg-gray-800 rounded-b-lg" />
                  </div>
                </div>
              </div>

              {/* Playback controls - centered below TV */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  onClick={skipToPrev}
                  disabled={items.length === 0}
                  className="p-2.5 text-gray-600 hover:bg-white hover:shadow rounded-full transition-all disabled:opacity-40"
                >
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={isPlaying ? stopPlayback : startPlayback}
                  disabled={items.length === 0}
                  className="p-4 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-40 disabled:hover:bg-orange-500"
                >
                  {isPlaying ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
                </button>
                <button
                  onClick={skipToNext}
                  disabled={items.length === 0}
                  className="p-2.5 text-gray-600 hover:bg-white hover:shadow rounded-full transition-all disabled:opacity-40"
                >
                  <SkipForward size={22} />
                </button>
              </div>

              {/* Current item info */}
              {previewItem && (
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-800">{previewItem.media?.name}</p>
                  <p className="text-xs text-gray-500">
                    Duration: {getEffectiveDuration(previewItem)}s
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline strip */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {/* Timeline header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
          <span className="text-xs text-gray-600 font-medium">
            {items.length} items &bull; {formatDuration(getTotalDuration())}
          </span>
          <button
            onClick={() => setShowApprovalModal(true)}
            className="text-gray-500 hover:text-orange-600 text-xs flex items-center gap-1 transition-colors"
          >
            <Send size={12} />
            Request Approval
          </button>
        </div>

        {/* Timeline items */}
        <div
          ref={timelineRef}
          className={`flex items-center px-3 py-2 overflow-x-auto transition-colors ${
            isDraggingFromLibrary ? 'bg-orange-50 ring-2 ring-orange-300 ring-inset' : 'bg-gray-50'
          }`}
          onDragOver={handleTimelineDragOverContainer}
          onDragLeave={handleTimelineDragLeave}
          onDrop={(e) => handleTimelineDropFromLibrary(e, items.length)}
        >
          {items.map((item, index) => (
            <div
              key={item.id}
              onClick={() => {
                setPreviewItem(item);
                setCurrentPlayIndex(index);
              }}
              className={`cursor-pointer relative ${
                previewItem?.id === item.id && dragSourceIndex === null ? 'ring-2 ring-orange-500 ring-offset-1 rounded' : ''
              } ${isPlaying && currentPlayIndex === index ? 'ring-2 ring-green-500 ring-offset-1 rounded' : ''}`}
            >
              <PlaylistStripItem
                item={item}
                index={index}
                onRemove={handleRemoveItem}
                onUpdateDuration={handleUpdateDuration}
                getEffectiveDuration={getEffectiveDuration}
                onDragStart={handleTimelineDragStart}
                onDragEnd={handleTimelineDragEnd}
                onDragOver={handleTimelineDragOver}
                onDrop={handleTimelineDrop}
                isDragOver={dragOverIndex === index}
                isDragging={dragSourceIndex === index}
              />
              {/* Playing indicator on timeline */}
              {isPlaying && currentPlayIndex === index && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-medium z-10">
                  NOW
                </div>
              )}
            </div>
          ))}
          {/* Drop zone at the end */}
          <div className="flex items-center">
            {/* Drop indicator line for end position */}
            <div
              className={`h-[92px] rounded-full ${
                dragOverIndex === items.length ? 'w-1 bg-orange-500 mx-1' : 'w-0'
              }`}
              style={{
                transition: 'width 100ms ease-out, margin 100ms ease-out',
                willChange: dragOverIndex === items.length ? 'width, margin' : 'auto'
              }}
            />
            <div
              className={`flex-shrink-0 w-[70px] h-[92px] border border-dashed rounded-lg flex items-center justify-center cursor-pointer ${
                isDraggingFromLibrary || dragSourceIndex !== null
                  ? 'border-orange-500 bg-orange-100 border-2'
                  : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
              }`}
              style={{ transition: 'border-color 150ms, background-color 150ms' }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragSourceIndex !== null && lastDragOverIndexRef.current !== items.length) {
                  lastDragOverIndexRef.current = items.length;
                }
              }}
              onDragLeave={() => {
                if (lastDragOverIndexRef.current === items.length) {
                  lastDragOverIndexRef.current = null;
                }
              }}
              onDrop={(e) => { e.stopPropagation(); handleTimelineDropFromLibrary(e, items.length); }}
            >
              <Plus size={18} className={isDraggingFromLibrary || dragSourceIndex !== null ? 'text-orange-500' : 'text-gray-400'} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggest Modal */}
      <AiSuggestModal
        showAiModal={showAiModal}
        setShowAiModal={setShowAiModal}
        aiGenerating={aiGenerating}
        aiSlideCount={aiSlideCount}
        setAiSlideCount={setAiSlideCount}
        aiSuggestion={aiSuggestion}
        setAiSuggestion={setAiSuggestion}
        aiApplying={aiApplying}
        handleGenerateAiSlides={handleGenerateAiSlides}
        handleApplyAiSlides={handleApplyAiSlides}
      />

      {/* Approval Modal */}
      <ApprovalModal
        showApprovalModal={showApprovalModal}
        setShowApprovalModal={setShowApprovalModal}
        approvalMessage={approvalMessage}
        setApprovalMessage={setApprovalMessage}
        submittingApproval={submittingApproval}
        handleRequestApproval={handleRequestApproval}
      />

      {/* Preview Links Modal */}
      <PreviewLinksModal
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
        previewLinks={previewLinks}
        loadingPreviewLinks={loadingPreviewLinks}
        creatingPreviewLink={creatingPreviewLink}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
        allowComments={allowComments}
        setAllowComments={setAllowComments}
        copiedLinkId={copiedLinkId}
        handleCreatePreviewLink={handleCreatePreviewLink}
        handleRevokePreviewLink={handleRevokePreviewLink}
        handleCopyLink={handleCopyLink}
      />

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        showTemplateModal={showTemplateModal}
        setShowTemplateModal={setShowTemplateModal}
        templateName={templateName}
        setTemplateName={setTemplateName}
        templateDescription={templateDescription}
        setTemplateDescription={setTemplateDescription}
        savingTemplate={savingTemplate}
        handleSaveAsTemplate={handleSaveAsTemplate}
        items={items}
        formatDuration={formatDuration}
        getTotalDuration={getTotalDuration}
      />
    </div>
  );
};

export default PlaylistEditorPage;
