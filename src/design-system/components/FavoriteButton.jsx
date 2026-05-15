import { Heart } from 'lucide-react';
import { useState } from 'react';

/**
 * FavoriteButton — heart icon with optimistic state.
 *
 * The caller passes isFavorited (current truth) and onToggle(nextValue) —
 * this component owns the in-flight optimistic state. On error from onToggle,
 * the optimistic flip is reverted and onError?.(err) fires so the caller can
 * surface a toast.
 *
 * Accessibility: <button type="button"> with aria-pressed reflecting the
 * displayed (optimistic) state and aria-label switching between
 * "Add to favorites" / "Remove from favorites" per UI-SPEC.
 *
 * Touch target: 48x48px tap area (icon 20px + invisible padding) per UI-SPEC
 * §Spacing — min-h-12 min-w-12 p-[14px]. Note: 14px arithmetic value reaches
 * 48px (20 + 28); implementation-specific, not a reusable spacing token.
 *
 * Colors: filled brand-500 + fill-current when favorited; outline gray-400
 * otherwise. Transition: color only (no scale on desktop) per UI-SPEC
 * §Animation Contracts.
 */
export default function FavoriteButton({
  isFavorited,
  onToggle,
  onError,
  size = 20,
  className = '',
}) {
  const [optimistic, setOptimistic] = useState(isFavorited);
  const [busy, setBusy] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();   // prevent card onSelect from firing
    if (busy) return;
    const next = !optimistic;
    setOptimistic(next);   // optimistic flip BEFORE await (Pattern 5)
    setBusy(true);
    try {
      await onToggle(next);
    } catch (err) {
      setOptimistic(!next);  // revert on error
      onError?.(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? 'Remove from favorites' : 'Add to favorites'}
      onClick={handleClick}
      disabled={busy}
      className={`min-h-12 min-w-12 p-[14px] rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-colors duration-150 ease-out ${
        busy ? 'opacity-50 pointer-events-none' : ''
      } ${className}`.trim()}
    >
      <Heart
        size={size}
        fill={optimistic ? 'currentColor' : 'none'}
        className={optimistic ? 'text-brand-500' : 'text-gray-400'}
      />
    </button>
  );
}
