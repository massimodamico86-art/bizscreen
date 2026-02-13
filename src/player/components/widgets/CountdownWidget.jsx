// src/player/components/widgets/CountdownWidget.jsx
// Countdown timer widget for player scenes
// Supports oneTime and daily recurring modes with timezone-aware calculation
import { useState, useEffect, useRef } from 'react';
import { differenceInSeconds } from 'date-fns';
import { TZDate } from '@date-fns/tz';

/**
 * Unit labels by locale and style variant
 * Covers the 6 locales supported by the i18n system
 */
const UNIT_LABELS = {
  en: { short: ['D', 'H', 'M', 'S'], full: ['Days', 'Hours', 'Min', 'Sec'] },
  es: { short: ['D', 'H', 'M', 'S'], full: ['Días', 'Horas', 'Min', 'Seg'] },
  pt: { short: ['D', 'H', 'M', 'S'], full: ['Dias', 'Horas', 'Min', 'Seg'] },
  it: { short: ['G', 'O', 'M', 'S'], full: ['Giorni', 'Ore', 'Min', 'Sec'] },
  fr: { short: ['J', 'H', 'M', 'S'], full: ['Jours', 'Heures', 'Min', 'Sec'] },
  de: { short: ['T', 'S', 'M', 'S'], full: ['Tage', 'Std', 'Min', 'Sek'] },
};

/**
 * Calculate countdown remaining time (pure function for testability)
 * @param {string} mode - 'oneTime' or 'daily'
 * @param {string} targetDate - ISO date string for oneTime mode
 * @param {string} targetTime - 'HH:mm' for daily mode
 * @param {string} timezone - IANA timezone or 'device'
 * @param {Date} now - Current time
 * @returns {{ expired: boolean, days: number, hours: number, minutes: number, seconds: number }}
 */
export function calculateCountdown(mode, targetDate, targetTime, timezone, now) {
  const tz = timezone === 'device'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : timezone;

  let target;

  if (mode === 'daily') {
    const [h, m] = (targetTime || '17:00').split(':').map(Number);
    // Get today's date in the target timezone
    const todayInTz = new TZDate(now, tz);
    // Create today's target at the specified time in the target timezone
    target = new TZDate(
      todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate(),
      h, m, 0, 0, tz
    );
    // If target has passed, immediately reset to tomorrow (locked decision)
    if (differenceInSeconds(target, now) <= 0) {
      target = new TZDate(
        todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate() + 1,
        h, m, 0, 0, tz
      );
    }
  } else {
    // oneTime mode
    if (!targetDate) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    target = new TZDate(targetDate, tz);
  }

  const totalSeconds = differenceInSeconds(target, now);

  if (totalSeconds <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    expired: false,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * CountdownWidget - Displays a live-ticking countdown timer
 *
 * Supports two modes:
 * - oneTime: counts down to a specific date/time, auto-hides 60s after expiry
 * - daily: counts down to a daily recurring time, resets immediately at zero
 *
 * @param {Object} props - Widget props from design_json block.props
 */
export function CountdownWidget({ props = {} }) {
  const {
    mode = 'oneTime',
    targetDate,
    targetTime,
    timezone = 'device',
    label = '',
    locale = 'en',
    textColor = '#ffffff',
    showTargetDate = false,
    showUrgency = true,
    unitLabelStyle = 'short',
  } = props;

  const [now, setNow] = useState(new Date());
  const expiryTimestampRef = useRef(null);

  // 1-second tick loop (same pattern as ClockWidget)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time (pure calculation from current state)
  const remaining = calculateCountdown(mode, targetDate, targetTime, timezone, now);

  // Track expiry timestamp for oneTime auto-hide
  if (remaining.expired && mode === 'oneTime') {
    if (expiryTimestampRef.current === null) {
      expiryTimestampRef.current = Date.now();
    }
  } else {
    // Reset if not expired (e.g., props changed)
    expiryTimestampRef.current = null;
  }

  // Auto-hide after 60 seconds for expired oneTime countdowns
  if (
    mode === 'oneTime' &&
    remaining.expired &&
    expiryTimestampRef.current !== null &&
    Date.now() - expiryTimestampRef.current > 60000
  ) {
    return null;
  }

  // Resolve timezone for display formatting
  const resolvedTz = timezone === 'device'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : timezone;

  // Get unit labels for the configured locale (fall back to 'en')
  const localeLabels = UNIT_LABELS[locale] || UNIT_LABELS.en;
  const labels = localeLabels[unitLabelStyle] || localeLabels.short;

  // Check urgency threshold (under 1 hour = 3600 seconds)
  const totalRemainingSeconds =
    remaining.days * 86400 +
    remaining.hours * 3600 +
    remaining.minutes * 60 +
    remaining.seconds;
  const isUrgent = showUrgency && !remaining.expired && totalRemainingSeconds < 3600;

  // Segment values
  const segments = [
    { value: remaining.days, label: labels[0] },
    { value: remaining.hours, label: labels[1] },
    { value: remaining.minutes, label: labels[2] },
    { value: remaining.seconds, label: labels[3] },
  ];

  // Urgency background style
  const segmentBg = isUrgent
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(0, 0, 0, 0.3)';

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.25rem',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Optional label */}
      {label && (
        <div style={{
          color: textColor,
          fontSize: 'clamp(0.4rem, 1.2vw, 1rem)',
          textAlign: 'center',
          lineHeight: 1.2,
        }}>
          {label}
        </div>
      )}

      {/* Countdown segments */}
      <div style={{
        display: 'flex',
        gap: 'clamp(0.125rem, 0.5vw, 0.5rem)',
        alignItems: 'center',
      }}>
        {segments.map((seg, i) => (
          <div key={i} style={{
            background: segmentBg,
            borderRadius: 'clamp(0.125rem, 0.3vw, 0.375rem)',
            padding: 'clamp(0.125rem, 0.4vw, 0.5rem) clamp(0.2rem, 0.6vw, 0.75rem)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 'clamp(1rem, 3vw, 2.5rem)',
          }}>
            <div style={{
              color: textColor,
              fontSize: 'clamp(0.5rem, 2vw, 1.5rem)',
              fontWeight: '700',
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {String(seg.value).padStart(2, '0')}
            </div>
            <div style={{
              color: 'rgba(156, 163, 175, 1)',
              fontSize: 'clamp(0.2rem, 0.6vw, 0.5rem)',
              lineHeight: 1.2,
              marginTop: '0.05rem',
            }}>
              {seg.label}
            </div>
          </div>
        ))}
      </div>

      {/* Optional target date display */}
      {showTargetDate && !remaining.expired && (
        <div style={{
          color: 'rgba(156, 163, 175, 1)',
          fontSize: 'clamp(0.25rem, 0.7vw, 0.6rem)',
          textAlign: 'center',
          marginTop: '0.1rem',
        }}>
          {(() => {
            try {
              const targetDt = mode === 'daily'
                ? (() => {
                    const [h, m] = (targetTime || '17:00').split(':').map(Number);
                    const todayInTz = new TZDate(now, resolvedTz);
                    let t = new TZDate(
                      todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate(),
                      h, m, 0, 0, resolvedTz
                    );
                    if (differenceInSeconds(t, now) <= 0) {
                      t = new TZDate(
                        todayInTz.getFullYear(), todayInTz.getMonth(), todayInTz.getDate() + 1,
                        h, m, 0, 0, resolvedTz
                      );
                    }
                    return t;
                  })()
                : new TZDate(targetDate, resolvedTz);
              return new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: resolvedTz,
              }).format(targetDt);
            } catch {
              return '';
            }
          })()}
        </div>
      )}
    </div>
  );
}

export default CountdownWidget;
