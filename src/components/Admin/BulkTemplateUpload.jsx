/**
 * Bulk Template Upload Component
 *
 * Allows admin to upload multiple SVG templates at once,
 * auto-tag them using AI, and save to database.
 */

import { useState, useCallback } from 'react';
import { autoTagSvg } from '../../services/autoTaggingService';
import { createTemplate } from '../../services/marketplaceService';
import { useLogger } from '../../hooks/useLogger.js';

// File status states
const STATUS = {
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  READY: 'ready',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
};

export default function BulkTemplateUpload({ onComplete, onCancel }) {
  const logger = useLogger('BulkTemplateUpload');
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer?.files || [])
      .filter(f => f.name.endsWith('.svg'));

    addFiles(droppedFiles);
  }, []);

  // Handle file select
  const handleFileSelect = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files || [])
      .filter(f => f.name.endsWith('.svg'));
    addFiles(selectedFiles);
    e.target.value = ''; // Reset input
  }, []);

  // Parse SVG dimensions to determine orientation
  const parseSvgDimensions = (svgContent) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const svg = doc.querySelector('svg');

      if (!svg) return { width: 1920, height: 1080, orientation: 'landscape' };

      // Try to get dimensions from width/height attributes
      let width = parseFloat(svg.getAttribute('width'));
      let height = parseFloat(svg.getAttribute('height'));

      // If not found, try viewBox
      if (!width || !height) {
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/\s+|,/).map(Number);
          if (parts.length >= 4) {
            width = parts[2];
            height = parts[3];
          }
        }
      }

      // Default if still not found
      if (!width || !height) {
        return { width: 1920, height: 1080, orientation: 'landscape' };
      }

      const orientation = height > width ? 'portrait' : 'landscape';
      return { width, height, orientation };
    } catch (err) {
      logger.warn('Could not parse SVG dimensions', { error: err.message });
      return { width: 1920, height: 1080, orientation: 'landscape' };
    }
  };

  // Add files to list
  const addFiles = async (newFiles) => {
    const fileEntries = await Promise.all(
      newFiles.map(async (file) => {
        const content = await file.text();
        const dimensions = parseSvgDimensions(content);
        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name.replace('.svg', ''),
          content,
          status: STATUS.PENDING,
          tags: [],
          category: '',
          description: '',
          error: null,
          ...dimensions, // Add width, height, orientation
        };
      })
    );

    setFiles(prev => [...prev, ...fileEntries]);
  };

  // Remove file from list
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Update file data
  const updateFile = (id, updates) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  // Auto-tag all pending files
  const handleAutoTagAll = async () => {
    setIsProcessing(true);

    const pendingFiles = files.filter(f => f.status === STATUS.PENDING || f.status === STATUS.ERROR);

    for (const fileEntry of pendingFiles) {
      updateFile(fileEntry.id, { status: STATUS.ANALYZING });

      try {
        const result = await autoTagSvg(fileEntry.content, {
          useAI: true,
          fallbackToRules: true,
        });

        updateFile(fileEntry.id, {
          status: STATUS.READY,
          tags: result.tags || [],
          category: result.category || 'general',
          description: result.description || '',
          confidence: result.confidence,
          source: result.source,
        });
      } catch (err) {
        updateFile(fileEntry.id, {
          status: STATUS.ERROR,
          error: err.message,
        });
      }

      // Small delay between API calls
      await new Promise(r => setTimeout(r, 300));
    }

    setIsProcessing(false);
  };

  // Convert SVG content to data URL for storage
  const svgToDataUrl = (svgContent) => {
    const encoded = btoa(unescape(encodeURIComponent(svgContent)));
    return `data:image/svg+xml;base64,${encoded}`;
  };

  // Save all ready templates
  const handleSaveAll = async () => {
    setIsSaving(true);

    const readyFiles = files.filter(f => f.status === STATUS.READY);

    for (const fileEntry of readyFiles) {
      updateFile(fileEntry.id, { status: STATUS.SAVING });

      try {
        // Convert SVG content to data URL for storage
        const svgDataUrl = fileEntry.content ? svgToDataUrl(fileEntry.content) : null;

        await createTemplate({
          name: fileEntry.name,
          description: fileEntry.description,
          tags: fileEntry.tags,
          industry: fileEntry.category,
          templateType: 'scene',
          license: 'free',
          isActive: true,
          thumbnailUrl: svgDataUrl, // Store SVG as data URL
          previewUrl: svgDataUrl,   // Same for preview
          metadata: {
            svgContent: fileEntry.content, // Store original SVG for editing
            orientation: fileEntry.orientation,
            width: fileEntry.width,
            height: fileEntry.height,
          },
        });

        updateFile(fileEntry.id, { status: STATUS.SAVED });
      } catch (err) {
        updateFile(fileEntry.id, {
          status: STATUS.ERROR,
          error: err.message,
        });
      }
    }

    setIsSaving(false);

    // Check if all saved
    const allSaved = files.every(f => f.status === STATUS.SAVED);
    if (allSaved && onComplete) {
      onComplete();
    }
  };

  // Get stats
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === STATUS.PENDING).length,
    analyzing: files.filter(f => f.status === STATUS.ANALYZING).length,
    ready: files.filter(f => f.status === STATUS.READY).length,
    saved: files.filter(f => f.status === STATUS.SAVED).length,
    error: files.filter(f => f.status === STATUS.ERROR).length,
  };

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bulk Template Upload</h2>
          <p className="text-sm text-gray-500">Upload multiple SVG files and auto-tag them with AI</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div className="p-6">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop SVG files here
          </p>
          <p className="text-sm text-gray-500 mb-4">or</p>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer">
            <Upload size={18} />
            Choose Files
            <input
              type="file"
              accept=".svg"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>

        {/* Stats Bar */}
        {files.length > 0 && (
          <div className="mt-4 flex items-center gap-4 text-sm">
            <span className="text-gray-600">{stats.total} files</span>
            {stats.pending > 0 && (
              <span className="text-yellow-600">{stats.pending} pending</span>
            )}
            {stats.analyzing > 0 && (
              <span className="text-blue-600">{stats.analyzing} analyzing</span>
            )}
            {stats.ready > 0 && (
              <span className="text-green-600">{stats.ready} ready</span>
            )}
            {stats.saved > 0 && (
              <span className="text-purple-600">{stats.saved} saved</span>
            )}
            {stats.error > 0 && (
              <span className="text-red-600">{stats.error} errors</span>
            )}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
            {files.map((fileEntry) => (
              <div
                key={fileEntry.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  fileEntry.status === STATUS.ERROR
                    ? 'border-red-200 bg-red-50'
                    : fileEntry.status === STATUS.SAVED
                    ? 'border-green-200 bg-green-50'
                    : fileEntry.status === STATUS.READY
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {fileEntry.status === STATUS.PENDING && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <Upload size={16} className="text-gray-500" />
                    </div>
                  )}
                  {fileEntry.status === STATUS.ANALYZING && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Loader2 size={16} className="text-blue-600 animate-spin" />
                    </div>
                  )}
                  {fileEntry.status === STATUS.READY && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Sparkles size={16} className="text-blue-600" />
                    </div>
                  )}
                  {fileEntry.status === STATUS.SAVING && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Loader2 size={16} className="text-purple-600 animate-spin" />
                    </div>
                  )}
                  {fileEntry.status === STATUS.SAVED && (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check size={16} className="text-green-600" />
                    </div>
                  )}
                  {fileEntry.status === STATUS.ERROR && (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertCircle size={16} className="text-red-600" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{fileEntry.name}</p>
                  {fileEntry.status === STATUS.READY && (
                    <p className="text-xs text-gray-500 truncate">
                      {fileEntry.category} | {fileEntry.tags.slice(0, 5).join(', ')}
                      {fileEntry.tags.length > 5 && ` +${fileEntry.tags.length - 5} more`}
                    </p>
                  )}
                  {fileEntry.status === STATUS.ERROR && (
                    <p className="text-xs text-red-600">{fileEntry.error}</p>
                  )}
                  {fileEntry.status === STATUS.ANALYZING && (
                    <p className="text-xs text-blue-600">Analyzing with AI...</p>
                  )}
                </div>

                {/* Edit Tags (for ready items) */}
                {fileEntry.status === STATUS.READY && (
                  <input
                    type="text"
                    value={fileEntry.tags.join(', ')}
                    onChange={(e) => updateFile(fileEntry.id, {
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-48 px-2 py-1 text-xs border border-gray-300 rounded"
                    placeholder="Edit tags..."
                  />
                )}

                {/* Remove Button */}
                {fileEntry.status !== STATUS.SAVED && (
                  <button
                    onClick={() => removeFile(fileEntry.id)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {files.length > 0 && (
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between rounded-b-lg">
          <button
            onClick={() => setFiles([])}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>

          <div className="flex items-center gap-3">
            {/* Auto-Tag Button */}
            {stats.pending > 0 && (
              <button
                onClick={handleAutoTagAll}
                disabled={isProcessing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing {stats.analyzing}/{stats.pending + stats.analyzing}...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Auto-Tag All ({stats.pending})
                  </>
                )}
              </button>
            )}

            {/* Save Button */}
            {stats.ready > 0 && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save All ({stats.ready})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
