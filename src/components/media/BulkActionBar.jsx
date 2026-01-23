/**
 * Bulk Action Bar (US-157)
 *
 * Floating action bar that appears when media items are selected.
 * Provides bulk operations: delete, move, tag, download, add to playlist.
 */

import { useState } from 'react';
import {
  Trash2,
  FolderInput,
  Tag,
  Download,
  ListPlus,
  X,
  CheckSquare,
  Square,
  Loader2,
} from 'lucide-react';
import { Button } from '../../design-system';

export function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onTag,
  onDownload,
  onAddToPlaylist,
  isDeleting = false,
  isMoving = false,
  isTagging = false,
  isDownloading = false,
  isAddingToPlaylist = false,
}) {
  if (selectedCount === 0) return null;

  const isAnyLoading = isDeleting || isMoving || isTagging || isDownloading || isAddingToPlaylist;
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-blue-500">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
        </div>

        {/* Select/Deselect all */}
        <div className="flex items-center gap-1">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-100 hover:text-white hover:bg-blue-500 rounded transition-colors"
            disabled={isAnyLoading}
          >
            {allSelected ? (
              <>
                <Square size={16} />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <CheckSquare size={16} />
                <span>Select All ({totalCount})</span>
              </>
            )}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 pl-2 border-l border-blue-500">
          {/* Add to Playlist */}
          <button
            onClick={onAddToPlaylist}
            disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
            title="Add to Playlist"
          >
            {isAddingToPlaylist ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ListPlus size={16} />
            )}
            <span className="hidden sm:inline">Add to Playlist</span>
          </button>

          {/* Move to Folder */}
          <button
            onClick={onMove}
            disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
            title="Move to Folder"
          >
            {isMoving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FolderInput size={16} />
            )}
            <span className="hidden sm:inline">Move</span>
          </button>

          {/* Add Tags */}
          <button
            onClick={onTag}
            disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
            title="Add Tags"
          >
            {isTagging ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Tag size={16} />
            )}
            <span className="hidden sm:inline">Tag</span>
          </button>

          {/* Download */}
          <button
            onClick={onDownload}
            disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
            title="Download"
          >
            {isDownloading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            disabled={isAnyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 rounded transition-colors disabled:opacity-50"
            title="Delete"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onDeselectAll}
          className="ml-2 p-1.5 hover:bg-blue-500 rounded transition-colors"
          title="Clear selection"
          disabled={isAnyLoading}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default BulkActionBar;
