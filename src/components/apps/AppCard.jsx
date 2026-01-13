/**
 * AppCard Component
 *
 * Displays an app in the gallery grid with icon/logo, name, and optional badges.
 * Based on Yodeck's app card design.
 */

import { useState } from 'react';
import { Grid3X3 } from 'lucide-react';

export default function AppCard({ app, onClick, size = 'normal' }) {
  const Icon = app.icon || Grid3X3;
  const hasLogo = !!app.logoUrl;
  const [logoError, setLogoError] = useState(false);

  const sizeClasses = {
    small: 'pb-2',
    normal: 'pb-3',
    large: 'pb-4',
  };

  return (
    <button
      onClick={() => onClick?.(app)}
      className={`
        relative group w-full bg-white border border-gray-200 rounded-xl
        hover:border-[#f26f21] hover:shadow-md transition-all duration-200
        flex flex-col items-center text-center
        ${sizeClasses[size]}
      `}
    >
      {/* NEW badge */}
      {app.isNew && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#f26f21] text-white text-[10px] font-bold uppercase rounded">
          NEW
        </div>
      )}

      {/* BETA badge */}
      {app.isBeta && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold uppercase rounded">
          BETA
        </div>
      )}

      {/* Icon/Logo container - Yodeck style with prominent logo display */}
      <div className="w-full aspect-square flex items-center justify-center p-4">
        {/* Logo image */}
        {hasLogo && !logoError ? (
          <img
            src={app.logoUrl}
            alt={app.name}
            className="w-full h-full object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          /* Fallback icon with colored background */
          <div
            className={`
              w-14 h-14 rounded-xl flex items-center justify-center
              ${app.iconBgColor || 'bg-gray-100'}
            `}
          >
            <Icon
              size={size === 'small' ? 20 : size === 'large' ? 36 : 28}
              className={app.iconColor || 'text-gray-600'}
            />
          </div>
        )}
      </div>

      {/* App name */}
      <span className="text-sm font-medium text-gray-900 group-hover:text-[#f26f21] transition-colors line-clamp-2">
        {app.name}
      </span>
    </button>
  );
}

/**
 * AppCardSkeleton - Loading placeholder for AppCard
 */
export function AppCardSkeleton({ size = 'normal' }) {
  const sizeClasses = {
    small: 'p-3',
    normal: 'p-4',
    large: 'p-6',
  };

  const iconSizes = {
    small: 40,
    normal: 56,
    large: 72,
  };

  return (
    <div
      className={`
        w-full bg-white border border-gray-200 rounded-xl
        flex flex-col items-center animate-pulse
        ${sizeClasses[size]}
      `}
    >
      <div
        className="bg-gray-200 rounded-lg mb-3"
        style={{
          width: iconSizes[size],
          height: iconSizes[size],
        }}
      />
      <div className="h-4 w-20 bg-gray-200 rounded" />
    </div>
  );
}
