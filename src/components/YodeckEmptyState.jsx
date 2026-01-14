/**
 * YodeckEmptyState Component
 *
 * A Yodeck-style empty state component with illustrations.
 * Used when there's no data to display (screens, schedules, media, etc.)
 *
 * @module components/YodeckEmptyState
 */

import { Monitor, Calendar, Image, Film, Layout, FolderOpen, Tv } from 'lucide-react';
import Button from '../design-system/components/Button';

// SVG illustrations matching Yodeck's style
const illustrations = {
  screens: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Monitor */}
      <rect x="40" y="20" width="120" height="80" rx="8" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="48" y="28" width="104" height="64" rx="4" fill="#fef3ed"/>
      {/* Screen stand */}
      <path d="M85 100 L100 120 L115 100" stroke="#e5e7eb" strokeWidth="2" fill="none"/>
      <rect x="75" y="118" width="50" height="6" rx="3" fill="#e5e7eb"/>
      {/* Plus icon */}
      <circle cx="100" cy="60" r="16" fill="#f26f21" fillOpacity="0.15"/>
      <path d="M100 52 L100 68 M92 60 L108 60" stroke="#f26f21" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  schedules: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Calendar base */}
      <rect x="40" y="30" width="120" height="100" rx="8" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      {/* Calendar header */}
      <rect x="40" y="30" width="120" height="24" rx="8" fill="#fef3ed"/>
      <circle cx="60" cy="42" r="4" fill="#f26f21" fillOpacity="0.5"/>
      <circle cx="80" cy="42" r="4" fill="#f26f21" fillOpacity="0.5"/>
      {/* Calendar grid */}
      <rect x="50" y="62" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="72" y="62" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="94" y="62" width="16" height="16" rx="2" fill="#f26f21" fillOpacity="0.2"/>
      <rect x="116" y="62" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="138" y="62" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="50" y="84" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="72" y="84" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="94" y="84" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="116" y="84" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="138" y="84" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="50" y="106" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="72" y="106" width="16" height="16" rx="2" fill="#e5e7eb"/>
      <rect x="94" y="106" width="16" height="16" rx="2" fill="#e5e7eb"/>
    </svg>
  ),
  media: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Image card 1 */}
      <rect x="30" y="40" width="60" height="50" rx="6" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      <circle cx="48" cy="58" r="8" fill="#fef3ed"/>
      <path d="M35 80 L50 68 L60 75 L75 60 L85 80" fill="#e5e7eb"/>
      {/* Image card 2 */}
      <rect x="70" y="50" width="60" height="50" rx="6" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="78" y="58" width="44" height="34" rx="4" fill="#fef3ed"/>
      {/* Play icon */}
      <circle cx="100" cy="75" r="10" fill="#f26f21" fillOpacity="0.2"/>
      <path d="M97 70 L105 75 L97 80Z" fill="#f26f21"/>
      {/* Image card 3 */}
      <rect x="110" y="40" width="60" height="50" rx="6" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      <circle cx="128" cy="58" r="8" fill="#fef3ed"/>
      <path d="M115 80 L130 68 L140 75 L155 60 L165 80" fill="#e5e7eb"/>
    </svg>
  ),
  playlists: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stack of cards */}
      <rect x="55" y="30" width="90" height="60" rx="6" fill="#e5e7eb"/>
      <rect x="50" y="40" width="100" height="60" rx="6" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      <rect x="45" y="50" width="110" height="60" rx="6" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
      {/* Playlist lines */}
      <rect x="55" y="62" width="50" height="4" rx="2" fill="#fef3ed"/>
      <rect x="55" y="72" width="70" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="55" y="82" width="40" height="4" rx="2" fill="#e5e7eb"/>
      <rect x="55" y="92" width="60" height="4" rx="2" fill="#e5e7eb"/>
      {/* Play button */}
      <circle cx="135" cy="82" r="14" fill="#f26f21" fillOpacity="0.15"/>
      <path d="M131 75 L143 82 L131 89Z" fill="#f26f21"/>
    </svg>
  ),
  layouts: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Main frame */}
      <rect x="40" y="25" width="120" height="90" rx="8" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
      {/* Grid layout */}
      <rect x="50" y="35" width="55" height="35" rx="4" fill="#fef3ed"/>
      <rect x="50" y="75" width="26" height="30" rx="4" fill="#e5e7eb"/>
      <rect x="80" y="75" width="26" height="30" rx="4" fill="#e5e7eb"/>
      <rect x="110" y="35" width="40" height="70" rx="4" fill="#f26f21" fillOpacity="0.15"/>
      {/* Plus icon in main area */}
      <path d="M130 65 L130 75 M125 70 L135 70" stroke="#f26f21" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  folders: (
    <svg className="w-48 h-40" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Folder back */}
      <path d="M45 50 L45 35 C45 32 47 30 50 30 L80 30 L90 40 L150 40 C153 40 155 42 155 45 L155 50" fill="#fef3ed"/>
      {/* Folder front */}
      <rect x="40" y="45" width="120" height="75" rx="6" fill="#f5f5f5" stroke="#e5e7eb" strokeWidth="2"/>
      {/* Items inside */}
      <rect x="55" y="60" width="30" height="25" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
      <rect x="95" y="60" width="30" height="25" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1"/>
      <rect x="75" y="90" width="30" height="25" rx="4" fill="#f26f21" fillOpacity="0.15" stroke="#f26f21" strokeOpacity="0.3" strokeWidth="1"/>
    </svg>
  ),
};

// Icon mapping for fallback
const iconMap = {
  screens: Monitor,
  schedules: Calendar,
  media: Image,
  playlists: Film,
  layouts: Layout,
  folders: FolderOpen,
};

export default function YodeckEmptyState({
  type = 'screens',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  showTourLink = false,
  tourLinkText = 'Take a tour',
  onTourClick,
  className = '',
}) {
  const illustration = illustrations[type] || illustrations.screens;
  const FallbackIcon = iconMap[type] || Monitor;

  // Default titles based on type
  const defaultTitles = {
    screens: 'No screens yet',
    schedules: 'No schedules yet',
    media: 'No media yet',
    playlists: 'No playlists yet',
    layouts: 'No layouts yet',
    folders: 'This folder is empty',
  };

  // Default descriptions based on type
  const defaultDescriptions = {
    screens: 'Add your first screen to start displaying content on your digital signage.',
    schedules: 'Create a schedule to automate when your content plays on screens.',
    media: 'Upload images, videos, or other media to use in your layouts and playlists.',
    playlists: 'Create a playlist to organize and sequence your content.',
    layouts: 'Design a custom layout to arrange multiple content zones on screen.',
    folders: 'Add items to this folder to keep your content organized.',
  };

  // Default action labels based on type
  const defaultActionLabels = {
    screens: 'Add Screen',
    schedules: 'Create Schedule',
    media: 'Upload Media',
    playlists: 'Create Playlist',
    layouts: 'Create Layout',
    folders: 'Add Item',
  };

  const displayTitle = title || defaultTitles[type];
  const displayDescription = description || defaultDescriptions[type];
  const displayActionLabel = actionLabel || defaultActionLabels[type];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-8 ${className}`}>
      {/* Illustration */}
      <div className="mb-6">
        {illustration}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-md mb-6">
        {displayDescription}
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-3">
        {onAction && (
          <Button onClick={onAction} variant="primary">
            {displayActionLabel}
          </Button>
        )}

        {onSecondaryAction && secondaryActionLabel && (
          <Button onClick={onSecondaryAction} variant="secondary">
            {secondaryActionLabel}
          </Button>
        )}

        {showTourLink && onTourClick && (
          <button
            onClick={onTourClick}
            className="text-sm text-[#f26f21] hover:text-[#e05a10] hover:underline transition-colors mt-2"
          >
            {tourLinkText}
          </button>
        )}
      </div>
    </div>
  );
}
