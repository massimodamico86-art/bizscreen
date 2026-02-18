// src/player/components/widgets/MenuBoardWidget.jsx
// Menu board widget for rendering restaurant/cafe menus on player screens
// Supports themed rendering, auto-pagination, dietary badges, and Supabase Realtime updates

import { useState, useEffect, useRef, useCallback } from 'react';
import { getMenuBoard, subscribeToMenuBoard, formatMenuPrice, DIETARY_TAGS } from '../../../services/menuBoardService';
import { SyncStatusIndicator } from './SyncStatusIndicator.jsx';
import { useWidgetData } from '../../hooks/useWidgetData.js';

// ============================================================================
// THEME PRESETS
// ============================================================================

const THEMES = {
  dark: {
    bg: '#1a1a2e',
    headerBg: '#16213e',
    text: '#ffffff',
    accent: '#f59e0b',
    itemBg: '#1a1a2e',
    altItemBg: '#16213e',
  },
  light: {
    bg: '#ffffff',
    headerBg: '#f8f9fa',
    text: '#1f2937',
    accent: '#f59e0b',
    itemBg: '#ffffff',
    altItemBg: '#f8f9fa',
  },
};

const ITEMS_PER_PAGE = 8;

// ============================================================================
// DIETARY BADGE (inline player-specific component)
// ============================================================================

function DietaryBadge({ tag }) {
  const info = DIETARY_TAGS.find(t => t.key === tag);
  if (!info) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 'clamp(0.45rem, 1vw, 0.6rem)', fontWeight: 700,
      color: '#fff', backgroundColor: info.color,
      borderRadius: '2px', padding: '0 3px', lineHeight: 1.4, marginLeft: '3px',
    }}>
      {info.emoji}
    </span>
  );
}

// ============================================================================
// MENU BOARD WIDGET
// ============================================================================

/**
 * MenuBoardWidget - Renders themed menu boards on player screens
 *
 * @param {Object} props - Widget props
 * @param {string} props.menuBoardId - Menu board UUID (required)
 * @param {string} [props.theme] - Theme preset: 'dark', 'light', or 'custom' (default 'dark')
 * @param {string} [props.textColor] - Custom text color (default '#ffffff')
 * @param {string} [props.accentColor] - Custom accent color (default '#f59e0b')
 * @param {boolean} [props.showImages] - Show item images (default true)
 * @param {boolean} [props.showDescriptions] - Show item descriptions (default true)
 * @param {number} [props.pageIntervalSeconds] - Page rotation interval (default 10)
 * @param {string} [props.currencyCode] - Currency override; falls back to board's currency_code
 */
export function MenuBoardWidget({ props = {} }) {
  const {
    menuBoardId,
    theme = 'dark',
    textColor = '#ffffff',
    accentColor = '#f59e0b',
    showImages = true,
    showDescriptions = true,
    pageIntervalSeconds = 10,
    currencyCode,
  } = props;

  // Realtime refresh trigger -- increment to force useWidgetData re-fetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Pagination state (dual-page pattern from DataTableWidget)
  const [currentPage, setCurrentPage] = useState(0);
  const [displayedPage, setDisplayedPage] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const isFirstRender = useRef(true);
  const prevItemCount = useRef(0);

  // ------------------------------------------------------------------
  // Data Fetching via orchestrator
  // ------------------------------------------------------------------
  const sourceKey = menuBoardId ? `menu-board:${menuBoardId}:${refreshTrigger}` : null;
  const fetchFn = useCallback(async () => {
    return await getMenuBoard(menuBoardId);
  }, [menuBoardId]);

  const { data: boardData, lastFetchedAt } = useWidgetData(
    sourceKey,
    fetchFn,
    5 * 60 * 1000, // 5 minutes -- realtime handles live updates
  );

  // ------------------------------------------------------------------
  // Realtime Subscription
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!menuBoardId) return;

    const subscription = subscribeToMenuBoard(menuBoardId, () => {
      // Any change triggers a full re-fetch via refreshTrigger
      setRefreshTrigger(prev => prev + 1);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [menuBoardId]);

  // ------------------------------------------------------------------
  // Compute display items (flatten categories + items)
  // ------------------------------------------------------------------
  const categories = boardData?.menu_categories || [];
  const displayItems = [];

  for (const cat of categories) {
    if (cat.is_visible === false) continue;
    // Add category header entry
    displayItems.push({ type: 'category', id: cat.id, name: cat.name, description: cat.description });
    // Add visible items
    const items = cat.menu_items || [];
    for (const item of items) {
      if (item.is_available === false) continue;
      displayItems.push({ type: 'item', ...item, categoryId: cat.id });
    }
  }

  // ------------------------------------------------------------------
  // Pagination
  // ------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(displayItems.length / ITEMS_PER_PAGE));

  // Reset page when item count changes
  useEffect(() => {
    if (displayItems.length !== prevItemCount.current) {
      prevItemCount.current = displayItems.length;
      setCurrentPage(0);
    }
  }, [displayItems.length]);

  // Clamp currentPage to valid range
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [currentPage, totalPages]);

  // Pagination timer
  useEffect(() => {
    if (totalPages <= 1 || !pageIntervalSeconds) return;

    const interval = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, pageIntervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [totalPages, pageIntervalSeconds]);

  // Fade transition when page changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayedPage(currentPage);
      return;
    }
    setOpacity(0);
    const timeout = setTimeout(() => {
      setDisplayedPage(currentPage);
      setOpacity(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentPage]);

  // ------------------------------------------------------------------
  // Theme resolution
  // ------------------------------------------------------------------
  const resolvedTheme = theme === 'custom'
    ? {
        bg: '#1a1a2e',
        headerBg: '#16213e',
        text: textColor,
        accent: accentColor,
        itemBg: '#1a1a2e',
        altItemBg: '#16213e',
      }
    : THEMES[theme] || THEMES.dark;

  // Currency: widget prop overrides board setting
  const effectiveCurrency = currencyCode || boardData?.currency_code || 'USD';
  const priceColumns = boardData?.price_columns || [{ key: 'default', label: 'Price' }];
  const fontFamily = boardData?.font_family || 'system-ui, sans-serif';

  // ------------------------------------------------------------------
  // Edge cases
  // ------------------------------------------------------------------
  if (!menuBoardId) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
      }}>
        No menu board configured
      </div>
    );
  }

  if (boardData && categories.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily, color: resolvedTheme.text, fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
        backgroundColor: resolvedTheme.bg, opacity: 0.6,
      }}>
        Menu is empty
      </div>
    );
  }

  if (boardData && displayItems.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily, color: resolvedTheme.text, fontSize: 'clamp(0.8rem, 2vw, 1.2rem)',
        backgroundColor: resolvedTheme.bg, opacity: 0.6,
      }}>
        No items available
      </div>
    );
  }

  // Still loading
  if (!boardData) {
    return null;
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const pageItems = displayItems.slice(
    displayedPage * ITEMS_PER_PAGE,
    (displayedPage + 1) * ITEMS_PER_PAGE,
  );

  let itemRowIndex = 0;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          fontFamily,
          backgroundColor: resolvedTheme.bg,
          padding: 'clamp(0.5rem, 1.5vw, 1rem)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Page content with fade transition */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: 'clamp(0.15rem, 0.4vw, 0.3rem)',
          opacity,
          transition: 'opacity 0.3s ease-in-out',
        }}>
          {pageItems.map((entry) => {
            if (entry.type === 'category') {
              return (
                <div
                  key={`cat-${entry.id}`}
                  style={{
                    borderLeft: `4px solid ${resolvedTheme.accent}`,
                    paddingLeft: 'clamp(0.4rem, 1vw, 0.75rem)',
                    paddingTop: 'clamp(0.2rem, 0.5vw, 0.4rem)',
                    paddingBottom: 'clamp(0.15rem, 0.3vw, 0.25rem)',
                    backgroundColor: resolvedTheme.headerBg,
                  }}
                >
                  <div style={{
                    fontSize: 'clamp(0.8rem, 2.2vw, 1.3rem)',
                    fontWeight: 700,
                    color: resolvedTheme.accent,
                    lineHeight: 1.3,
                  }}>
                    {entry.name}
                  </div>
                  {entry.description && (
                    <div style={{
                      fontSize: 'clamp(0.5rem, 1.2vw, 0.75rem)',
                      color: resolvedTheme.text,
                      opacity: 0.6,
                      lineHeight: 1.3,
                      marginTop: '2px',
                    }}>
                      {entry.description}
                    </div>
                  )}
                </div>
              );
            }

            // Item row
            const rowIdx = itemRowIndex++;
            const isAlt = rowIdx % 2 === 1;
            const itemBg = isAlt ? resolvedTheme.altItemBg : resolvedTheme.itemBg;

            return (
              <div
                key={`item-${entry.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: itemBg,
                  padding: 'clamp(0.25rem, 0.6vw, 0.5rem) clamp(0.3rem, 0.8vw, 0.6rem)',
                  gap: 'clamp(0.3rem, 0.8vw, 0.6rem)',
                  borderRadius: '2px',
                  flex: '0 0 auto',
                }}
              >
                {/* Item image */}
                {showImages && entry.image_url && (
                  <img
                    src={entry.image_url}
                    alt=""
                    style={{
                      width: 'clamp(32px, 4vw, 48px)',
                      height: 'clamp(32px, 4vw, 48px)',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                {/* Name, dietary badges, description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 'clamp(0.6rem, 1.8vw, 1rem)',
                      fontWeight: 600,
                      color: resolvedTheme.text,
                      lineHeight: 1.3,
                    }}>
                      {entry.name}
                    </span>
                    {entry.dietary_tags?.map(tag => (
                      <DietaryBadge key={tag} tag={tag} />
                    ))}
                  </div>
                  {showDescriptions && entry.description && (
                    <div style={{
                      fontSize: 'clamp(0.45rem, 1.1vw, 0.7rem)',
                      color: resolvedTheme.text,
                      opacity: 0.7,
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.description}
                    </div>
                  )}
                </div>

                {/* Prices */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 'clamp(0.4rem, 1vw, 0.8rem)',
                  flexShrink: 0,
                  alignItems: 'center',
                }}>
                  {priceColumns.map(col => {
                    const priceVal = entry.prices?.[col.key];
                    const formatted = formatMenuPrice(priceVal, effectiveCurrency);
                    if (!formatted) return null;
                    return (
                      <div key={col.key} style={{ textAlign: 'right' }}>
                        {priceColumns.length > 1 && (
                          <div style={{
                            fontSize: 'clamp(0.35rem, 0.8vw, 0.5rem)',
                            color: resolvedTheme.text,
                            opacity: 0.5,
                            lineHeight: 1.2,
                          }}>
                            {col.label}
                          </div>
                        )}
                        <div style={{
                          fontSize: 'clamp(0.6rem, 1.8vw, 1rem)',
                          fontWeight: 700,
                          color: resolvedTheme.accent,
                          lineHeight: 1.3,
                          whiteSpace: 'nowrap',
                        }}>
                          {formatted}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Page indicator dots */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            padding: 'clamp(0.2rem, 0.5vw, 0.4rem) 0',
            flexShrink: 0,
          }}>
            {Array.from({ length: totalPages }, (_, i) => (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: i === currentPage ? resolvedTheme.accent : `${resolvedTheme.text}33`,
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sync status indicator */}
      <SyncStatusIndicator lastRefreshedAt={lastFetchedAt} />
    </div>
  );
}

export default MenuBoardWidget;
