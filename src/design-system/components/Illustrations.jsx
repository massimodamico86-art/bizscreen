/**
 * Empty State Illustrations
 *
 * Minimalist SVG illustrations for empty states.
 * Keep these simple, lightweight, and consistent with the design system.
 */

// Base illustration wrapper with animation
export function IllustrationWrapper({ children, className = '', size = 120 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`text-gray-300 ${className}`}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * Empty playlist illustration
 */
export function PlaylistIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Playlist icon */}
      <rect x="35" y="35" width="50" height="50" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <line x1="45" y1="50" x2="75" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="45" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="45" y1="70" x2="65" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Play symbol */}
      <circle cx="80" cy="80" r="15" fill="white" stroke="currentColor" strokeWidth="2" />
      <path d="M76 74 L86 80 L76 86 Z" fill="currentColor" />
    </IllustrationWrapper>
  );
}

/**
 * Empty screens/monitors illustration
 */
export function ScreensIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Monitor */}
      <rect x="30" y="30" width="60" height="45" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="35" y="35" width="50" height="35" rx="2" fill="currentColor" opacity="0.15" />
      {/* Stand */}
      <rect x="50" y="75" width="20" height="5" fill="currentColor" opacity="0.3" />
      <rect x="45" y="80" width="30" height="4" rx="2" fill="currentColor" opacity="0.3" />
      {/* Signal waves */}
      <path d="M75 45 Q80 42 85 45" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M78 40 Q85 35 92 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
    </IllustrationWrapper>
  );
}

/**
 * Empty media/images illustration
 */
export function MediaIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Image frame */}
      <rect x="30" y="35" width="60" height="50" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Mountain landscape */}
      <path d="M30 75 L50 55 L65 70 L75 60 L90 75 L90 85 L30 85 Z" fill="currentColor" opacity="0.15" />
      {/* Sun */}
      <circle cx="75" cy="48" r="8" fill="currentColor" opacity="0.3" />
      {/* Plus icon */}
      <circle cx="85" cy="75" r="12" fill="white" stroke="currentColor" strokeWidth="2" />
      <line x1="85" y1="70" x2="85" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="80" y1="75" x2="90" y2="75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IllustrationWrapper>
  );
}

/**
 * Empty campaigns illustration
 */
export function CampaignsIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Megaphone */}
      <path
        d="M35 55 L55 45 L55 75 L35 65 Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        opacity="0.15"
      />
      <rect x="28" y="53" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Sound waves */}
      <path d="M60 50 Q70 45 70 60 Q70 75 60 70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M68 45 Q82 38 82 60 Q82 82 68 75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Target */}
      <circle cx="85" cy="75" r="12" stroke="currentColor" strokeWidth="2" fill="white" />
      <circle cx="85" cy="75" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="85" cy="75" r="2" fill="currentColor" />
    </IllustrationWrapper>
  );
}

/**
 * Empty templates illustration
 */
export function TemplatesIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Stacked templates */}
      <rect x="40" y="30" width="45" height="55" rx="4" stroke="currentColor" strokeWidth="2" fill="white" />
      <rect x="35" y="35" width="45" height="55" rx="4" stroke="currentColor" strokeWidth="2" fill="white" />
      <rect x="30" y="40" width="45" height="55" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Template content lines */}
      <line x1="38" y1="52" x2="68" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="62" x2="60" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <line x1="38" y1="72" x2="55" y2="72" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      {/* Grid pattern hint */}
      <rect x="38" y="80" width="10" height="8" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="52" y="80" width="10" height="8" rx="1" fill="currentColor" opacity="0.2" />
    </IllustrationWrapper>
  );
}

/**
 * Empty search results illustration
 */
export function SearchIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Magnifying glass */}
      <circle cx="52" cy="52" r="20" stroke="currentColor" strokeWidth="3" fill="none" />
      <line x1="66" y1="66" x2="85" y2="85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Question mark */}
      <text x="45" y="58" fontSize="20" fill="currentColor" opacity="0.5" fontWeight="600">?</text>
    </IllustrationWrapper>
  );
}

/**
 * Empty notifications illustration
 */
export function NotificationsIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Bell */}
      <path
        d="M60 30 C45 30 35 45 35 55 L35 70 L30 75 L90 75 L85 70 L85 55 C85 45 75 30 60 30"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Bell clapper */}
      <path d="M52 75 Q60 85 68 75" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Zzz */}
      <text x="75" y="40" fontSize="12" fill="currentColor" opacity="0.5" fontWeight="600">z</text>
      <text x="82" y="35" fontSize="10" fill="currentColor" opacity="0.4" fontWeight="600">z</text>
    </IllustrationWrapper>
  );
}

/**
 * Generic empty state illustration
 */
export function EmptyBoxIllustration({ size = 120, className = '' }) {
  return (
    <IllustrationWrapper size={size} className={className}>
      {/* Background circle */}
      <circle cx="60" cy="60" r="50" fill="currentColor" opacity="0.1" />
      {/* Open box */}
      <path d="M25 50 L60 35 L95 50 L60 65 Z" stroke="currentColor" strokeWidth="2" fill="white" />
      <path d="M25 50 L25 75 L60 90 L60 65" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.1" />
      <path d="M95 50 L95 75 L60 90 L60 65" stroke="currentColor" strokeWidth="2" fill="currentColor" opacity="0.15" />
      {/* Box flaps */}
      <path d="M25 50 L40 35 L60 50" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M95 50 L80 35 L60 50" stroke="currentColor" strokeWidth="2" fill="none" />
    </IllustrationWrapper>
  );
}

// Export all illustrations
export default {
  PlaylistIllustration,
  ScreensIllustration,
  MediaIllustration,
  CampaignsIllustration,
  TemplatesIllustration,
  SearchIllustration,
  NotificationsIllustration,
  EmptyBoxIllustration,
};
