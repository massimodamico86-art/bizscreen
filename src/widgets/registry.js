/**
 * Widget Registry
 *
 * Central registry for all widget types. Every rendering path, properties panel,
 * and factory function consumes this registry instead of maintaining its own
 * widget type switch/map.
 *
 * To add a new widget type: add ONE entry here. All rendering paths, editor UIs,
 * and factory functions will pick it up automatically.
 *
 * IMPORTANT: This module imports FROM widget components but is never imported BY them.
 * Widget components receive props from parents -- they never look up the registry.
 *
 * @module widgets/registry
 */

import {
  Clock,
  Calendar,
  CloudSun,
  QrCode,
  Table2,
  Rss,
  Newspaper,
  Share2,
  Timer,
} from 'lucide-react';

import {
  ClockWidget,
  DateWidget,
  WeatherWidget,
  QRCodeWidget,
  DataTableWidget,
  RssTickerWidget,
  RssCardWidget,
  SocialFeedWidget,
  CountdownWidget,
} from '../player/components/widgets/index.js';

/**
 * WIDGET_REGISTRY
 *
 * Maps widget type keys to { component, icon, label, defaultProps }.
 * - component: The React component to render (receives { props, timezone })
 * - icon: lucide-react icon component for UI selectors
 * - label: Human-readable label for UI
 * - defaultProps: Default props for this widget type (shallow object)
 */
export const WIDGET_REGISTRY = {
  clock: {
    component: ClockWidget,
    icon: Clock,
    label: 'Clock',
    defaultProps: {
      textColor: '#ffffff',
      format: '12h',
      showSeconds: false,
      size: 'medium',
    },
  },

  date: {
    component: DateWidget,
    icon: Calendar,
    label: 'Date',
    defaultProps: {
      textColor: '#ffffff',
      format: 'short',
      size: 'medium',
    },
  },

  weather: {
    component: WeatherWidget,
    icon: CloudSun,
    label: 'Weather',
    defaultProps: {
      textColor: '#ffffff',
      location: 'Miami, FL',
      units: 'imperial',
      style: 'minimal',
      size: 'medium',
    },
  },

  qr: {
    component: QRCodeWidget,
    icon: QrCode,
    label: 'QR Code',
    defaultProps: {
      url: '',
      label: '',
      fgColor: '#000000',
      bgColor: '#ffffff',
      cornerRadius: 8,
      textColor: '#ffffff',
    },
  },

  'data-table': {
    component: DataTableWidget,
    icon: Table2,
    label: 'Data Table',
    defaultProps: {
      dataSourceId: '',
      textColor: '#ffffff',
      fontSize: 16,
    },
  },

  'rss-ticker': {
    component: RssTickerWidget,
    icon: Rss,
    label: 'RSS Ticker',
    defaultProps: {
      feedUrl: '',
      textColor: '#ffffff',
      speed: 'medium',
      scrollDirection: 'left',
    },
  },

  'rss-card': {
    component: RssCardWidget,
    icon: Newspaper,
    label: 'RSS Card',
    defaultProps: {
      feedUrl: '',
      textColor: '#ffffff',
      cardCount: 3,
    },
  },

  'social-feed': {
    component: SocialFeedWidget,
    icon: Share2,
    label: 'Social Feed',
    defaultProps: {
      platform: '',
      textColor: '#ffffff',
    },
  },

  countdown: {
    component: CountdownWidget,
    icon: Timer,
    label: 'Countdown',
    defaultProps: {
      textColor: '#ffffff',
      mode: 'oneTime',
      targetDate: '',
      targetTime: '17:00',
      timezone: 'device',
      label: '',
    },
  },

  // Legacy alias for backward compatibility -- 'data' maps to DataTableWidget
  data: {
    component: DataTableWidget,
    icon: Table2,
    label: 'Data',
    defaultProps: {
      dataSourceId: '',
      field: '',
      rowIndex: 0,
      textColor: '#ffffff',
      fontSize: 24,
    },
  },
};

/**
 * Get the React component for a widget type.
 * @param {string} widgetType - Widget type key (e.g. 'clock', 'date')
 * @returns {Function|null} React component or null if not found
 */
export function getWidgetComponent(widgetType) {
  return WIDGET_REGISTRY[widgetType]?.component || null;
}

/**
 * Get a shallow copy of default props for a widget type.
 * Returns empty object if the widget type is not registered.
 * @param {string} widgetType - Widget type key
 * @returns {Object} Shallow copy of default props
 */
export function getWidgetDefaults(widgetType) {
  const entry = WIDGET_REGISTRY[widgetType];
  return entry ? { ...entry.defaultProps } : {};
}

/**
 * Get array of widget types for UI selectors (type pickers, sidebar lists).
 * Excludes the 'data' legacy alias to avoid showing duplicate entries.
 * @returns {Array<{key: string, icon: Function, label: string}>}
 */
export function getWidgetTypes() {
  return Object.entries(WIDGET_REGISTRY)
    .filter(([key]) => key !== 'data') // exclude legacy alias
    .map(([key, entry]) => ({
      key,
      icon: entry.icon,
      label: entry.label,
    }));
}
