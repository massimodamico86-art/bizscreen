/**
 * CanvaDesignBrowser
 *
 * Modal for browsing and importing Canva designs into the media library.
 * Shows a grid of the user's Canva designs with import/re-import actions.
 * Requires the user to be connected via Canva OAuth first.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  ExternalLink,
  Image,
  Loader2,
  RefreshCw,
  Search,
  Unplug,
  X,
} from 'lucide-react';
import { Button } from '../../design-system';
import {
  checkCanvaConnection,
  startCanvaOAuth,
  listCanvaDesigns,
  importCanvaDesign,
  reimportCanvaDesign,
  disconnectCanva,
} from '../../services/canvaService';

/**
 * Format a date string to relative or short date
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * CanvaDesignBrowser modal component
 */
export default function CanvaDesignBrowser({ isOpen, onClose, onImport, showToast, existingCanvaAssets = [] }) {
  // Connection state
  const [connected, setConnected] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(true);

  // Design list state
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [continuation, setContinuation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce timer ref
  const debounceRef = useRef(null);

  // Build a map of canva_design_id -> asset for re-import detection
  const canvaAssetMap = useCallback(() => {
    const map = {};
    for (const asset of existingCanvaAssets) {
      const canvaId = asset.metadata?.canva_design_id;
      if (canvaId) {
        map[canvaId] = asset;
      }
    }
    return map;
  }, [existingCanvaAssets]);

  // Check connection on open
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const check = async () => {
      setCheckingConnection(true);
      const isConnected = await checkCanvaConnection();
      if (!cancelled) {
        setConnected(isConnected);
        setCheckingConnection(false);
      }
    };
    check();

    return () => { cancelled = true; };
  }, [isOpen]);

  // Fetch designs when connected
  const fetchDesigns = useCallback(async (query = '', cont = null) => {
    if (cont) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setDesigns([]);
    }

    try {
      const result = await listCanvaDesigns({
        query: query || undefined,
        continuation: cont || undefined,
        limit: 12,
      });

      if (cont) {
        setDesigns((prev) => [...prev, ...result.items]);
      } else {
        setDesigns(result.items);
      }
      setContinuation(result.continuation);
    } catch (err) {
      showToast?.({ type: 'error', message: err.message || 'Failed to load designs' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showToast]);

  // Load designs when connected
  useEffect(() => {
    if (connected && !checkingConnection) {
      fetchDesigns();
    }
  }, [connected, checkingConnection, fetchDesigns]);

  // Debounced search
  useEffect(() => {
    if (!connected) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchDesigns(searchQuery);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, connected, fetchDesigns]);

  // Handle import
  const handleImport = useCallback(async (design) => {
    const designId = design.id;
    setImporting((prev) => new Set(prev).add(designId));

    try {
      const assetMap = canvaAssetMap();
      const existingAsset = assetMap[designId];
      let asset;

      if (existingAsset) {
        asset = await reimportCanvaDesign(designId, existingAsset.id);
        showToast?.({ type: 'success', message: `"${design.title}" re-imported successfully` });
      } else {
        asset = await importCanvaDesign(designId, design.title);
        showToast?.({ type: 'success', message: `"${design.title}" imported to media library` });
      }

      onImport?.(asset);
    } catch (err) {
      showToast?.({ type: 'error', message: err.message || 'Failed to import design' });
    } finally {
      setImporting((prev) => {
        const next = new Set(prev);
        next.delete(designId);
        return next;
      });
    }
  }, [canvaAssetMap, onImport, showToast]);

  // Handle connect
  const handleConnect = useCallback(() => {
    startCanvaOAuth();
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectCanva();
      setConnected(false);
      setDesigns([]);
      showToast?.({ type: 'success', message: 'Disconnected from Canva' });
    } catch (_err) {
      showToast?.({ type: 'error', message: 'Failed to disconnect' });
    }
  }, [showToast]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (continuation) {
      fetchDesigns(searchQuery, continuation);
    }
  }, [continuation, searchQuery, fetchDesigns]);

  if (!isOpen) return null;

  const assetMap = canvaAssetMap();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7d2ae8] to-[#00c4cc] rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-6v4h4l-5 6z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import from Canva</h2>
              <p className="text-sm text-gray-400">Browse and import your Canva designs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <button
                onClick={handleDisconnect}
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
                title="Disconnect Canva"
              >
                <Unplug className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {checkingConnection ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#7d2ae8] animate-spin mb-4" />
              <p className="text-gray-400">Checking Canva connection...</p>
            </div>
          ) : !connected ? (
            /* Not connected - show connect prompt */
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-[#7d2ae8] to-[#00c4cc] rounded-2xl flex items-center justify-center mb-6">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-6v4h4l-5 6z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connect to Canva</h3>
              <p className="text-gray-400 text-center max-w-md mb-6">
                Connect your Canva account to browse your designs and import them directly into your media library.
              </p>
              <Button
                variant="primary"
                onClick={handleConnect}
                className="bg-[#7d2ae8] hover:bg-[#6b21d1]"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect to Canva
              </Button>
            </div>
          ) : (
            /* Connected - show designs */
            <>
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search your designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7d2ae8]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Designs grid */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#7d2ae8] animate-spin mb-4" />
                  <p className="text-gray-400">Loading your designs...</p>
                </div>
              ) : designs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Image className="w-12 h-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-1">No designs found</p>
                  {searchQuery && (
                    <p className="text-gray-500 text-sm">Try a different search term</p>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {designs.map((design) => {
                      const isImporting = importing.has(design.id);
                      const existingAsset = assetMap[design.id];
                      const isReimport = Boolean(existingAsset);

                      return (
                        <div
                          key={design.id}
                          className="group bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-[#7d2ae8]/50 transition-all"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-video relative bg-gray-900">
                            {design.thumbnail?.url ? (
                              <img
                                src={design.thumbnail.url}
                                alt={design.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="w-10 h-10 text-gray-600" />
                              </div>
                            )}

                            {/* Re-import badge */}
                            {isReimport && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                In Library
                              </div>
                            )}
                          </div>

                          {/* Info + action */}
                          <div className="p-3">
                            <h4 className="font-medium text-white text-sm truncate mb-1">
                              {design.title || 'Untitled Design'}
                            </h4>
                            <p className="text-xs text-gray-500 mb-3">
                              {formatDate(design.updated_at || design.created_at)}
                            </p>
                            <Button
                              variant={isReimport ? 'outline' : 'primary'}
                              size="sm"
                              className="w-full"
                              onClick={() => handleImport(design)}
                              disabled={isImporting}
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  {isReimport ? 'Re-importing...' : 'Importing...'}
                                </>
                              ) : (
                                <>
                                  {isReimport ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 mr-1" />
                                      Re-import
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4 mr-1" />
                                      Import
                                    </>
                                  )}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Load more */}
                  {continuation && (
                    <div className="flex justify-center mt-6">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More Designs'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
