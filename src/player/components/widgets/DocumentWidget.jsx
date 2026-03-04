/**
 * DocumentWidget
 *
 * Player widget that displays pre-converted document page images with
 * auto-advance and crossfade transitions. Renders standard <img> tags
 * for universal WebOS/Tizen smart TV compatibility.
 *
 * Pages are pre-converted PNG images stored in media_assets.config_json.convertedPages.
 * The widget reads directly from Supabase to avoid circular dependencies in the player bundle.
 */

import { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../../../supabase';

/**
 * @param {Object} params
 * @param {Object} params.props - Widget props from registry defaultProps
 * @param {string} [params.props.mediaId] - Media asset ID containing converted pages
 * @param {number} [params.props.pageIntervalSeconds=10] - Seconds between page advances
 * @param {boolean} [params.props.loop=true] - Loop back to first page after last
 * @param {string} [params.props.transition='crossfade'] - Transition type between pages
 */
export function DocumentWidget({ props = {} }) {
  const {
    mediaId,
    pageIntervalSeconds = 10,
    loop = true,
  } = props;

  const [pages, setPages] = useState([]);
  const [conversionStatus, setConversionStatus] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [prevPage, setPrevPage] = useState(0);
  const intervalRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Load pages from media asset config_json
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    if (!mediaId) {
      setPages([]);
      setConversionStatus(null);
      setCurrentPage(0);
      setPrevPage(0);
      return;
    }

    async function loadPages() {
      const { data, error } = await supabase
        .from('media_assets')
        .select('config_json')
        .eq('id', mediaId)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setPages([]);
        setConversionStatus('error');
        return;
      }

      const config = data.config_json || {};
      const converted = config.convertedPages || [];
      const status = config.conversionStatus || (converted.length > 0 ? 'complete' : 'pending');

      setConversionStatus(status);
      setPages(converted);
      setCurrentPage(0);
      setPrevPage(0);
    }

    loadPages();

    return () => { cancelled = true; };
  }, [mediaId]);

  // ---------------------------------------------------------------------------
  // Auto-advance interval
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (pages.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentPage((prev) => {
        setPrevPage(prev);
        const next = prev + 1;
        if (next >= pages.length) {
          if (loop) return 0;
          // Stop at the last page
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          return prev;
        }
        return next;
      });
    }, pageIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pages.length, pageIntervalSeconds, loop]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const containerStyle = {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
  };

  // Empty state: no document selected
  if (!mediaId || (pages.length === 0 && conversionStatus !== 'pending')) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <FileText style={{ width: 48, height: 48, color: '#6b7280' }} />
        <span style={{ color: '#6b7280', fontSize: 14 }}>No document selected</span>
      </div>
    );
  }

  // Converting state: document is being processed
  if (conversionStatus === 'pending') {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid #374151',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <span style={{ color: '#9ca3af', fontSize: 14 }}>Converting document...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Page images with crossfade
  const imgStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transition: 'opacity 500ms ease',
  };

  return (
    <div style={containerStyle}>
      {/* Previous page (fading out) */}
      {prevPage !== currentPage && (
        <img
          key={`prev-${prevPage}`}
          src={pages[prevPage]}
          alt={`Page ${prevPage + 1}`}
          style={{ ...imgStyle, opacity: 0 }}
        />
      )}

      {/* Current page (visible) */}
      <img
        key={`current-${currentPage}`}
        src={pages[currentPage]}
        alt={`Page ${currentPage + 1}`}
        style={{ ...imgStyle, opacity: 1 }}
      />

      {/* Page indicator badge */}
      {pages.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            color: '#ffffff',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 12,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {currentPage + 1} / {pages.length}
        </div>
      )}
    </div>
  );
}
