# Phase 32: Screen Pairing Integration - Research

**Researched:** 2026-01-31
**Domain:** Screen pairing UI within unified onboarding flow
**Confidence:** HIGH

## Summary

This research investigates how to implement the ScreenPairingStep component for Phase 32, replacing the placeholder from Phase 31 with a real pairing UI. The codebase already has comprehensive screen pairing infrastructure (OTP generation, QR code rendering, device polling) that we can leverage. The primary technical challenges are: integrating QR code display within a modal, implementing real-time pairing detection, and adding confetti celebration animation on successful pairing.

The existing codebase has `qrcode.react` (v1.5.4) installed and actively used across the application. For confetti celebration, the `canvas-confetti` library is the recommended standard (lightweight, well-maintained, supports `prefers-reduced-motion`). The polling pattern from `PairPage.jsx` demonstrates the exact mechanism needed for detecting when a device pairs.

**Primary recommendation:** Leverage existing `createScreen`, `QRCodeSVG`, and polling pattern from `PairPage.jsx`, add `canvas-confetti` for celebration, and wire into the unified onboarding flow via the established component API (`isOpen`, `onComplete`, `onClose`).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | ^1.5.4 | QR code rendering | Already installed, used in PairingScreen.jsx, QRCodeWidget.jsx, EditorCanvas.jsx |
| canvas-confetti | ^1.9.x | Celebration animation | Lightweight (~3KB), supports reduced motion, no React wrapper needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | existing | Modal animations | Already used by UnifiedOnboardingController for step transitions |
| lucide-react | existing | Icons (Monitor, CheckCircle, etc.) | Consistent with design system |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| canvas-confetti | react-confetti | react-confetti adds React wrapper overhead; canvas-confetti is simpler, smaller |
| canvas-confetti | react-canvas-confetti | Adds unnecessary wrapper; vanilla canvas-confetti works fine in React |
| qrcode.react | qrcode (data URL) | Already have qrcode.react; QRCodeSVG is crisp at any size |

**Installation:**
```bash
npm install canvas-confetti
```

## Architecture Patterns

### Recommended Component Structure
```
src/components/onboarding/
  ScreenPairingStep.jsx        # MODIFY: Replace placeholder with real implementation
  PairingSuccessView.jsx       # NEW: Success state with confetti (optional, can inline)
```

### Pattern 1: Polling for Pairing Detection
**What:** Use `setInterval` to poll Supabase for `is_paired` status on the created screen
**When to use:** Detecting when a TV device claims the OTP code
**Example:**
```javascript
// Source: src/player/components/PairPage.jsx (lines 53-80)
useEffect(() => {
  if (!screenId) return;

  const pollInterval = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('tv_devices')
        .select('id, is_paired, device_name')
        .eq('id', screenId)
        .eq('is_paired', true)
        .single();

      if (data && !error) {
        clearInterval(pollInterval);
        setPairedDevice(data);
        triggerConfetti();
        // Small delay to show celebration before transitioning
        setTimeout(() => onComplete?.(), 2000);
      }
    } catch (err) {
      // Ignore errors, keep polling
    }
  }, 3000); // 3 second interval

  return () => clearInterval(pollInterval);
}, [screenId, onComplete]);
```

### Pattern 2: QR Code Display in Modal
**What:** Use `QRCodeSVG` with appropriate sizing for modal context
**When to use:** Primary pairing method display
**Example:**
```javascript
// Source: src/player/components/PairingScreen.jsx (lines 111-118)
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG
  value={pairingUrl}
  size={200}          // Larger for primary prominence
  level="M"           // Error correction level
  fgColor="#0f172a"   // Dark foreground
  bgColor="#ffffff"   // White background
  style={{ display: 'block' }}
/>
```

### Pattern 3: Canvas Confetti Integration
**What:** Imperative confetti burst on successful pairing
**When to use:** Celebration moment after device pairs
**Example:**
```javascript
// Source: canvas-confetti npm documentation
import confetti from 'canvas-confetti';

function triggerConfetti() {
  // Respect reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}
```

### Pattern 4: OTP Code Formatting
**What:** Grouped digit display for readability (ABC 123)
**When to use:** OTP display as secondary/fallback method
**Example:**
```javascript
// Format: ABC 123 (grouped)
function formatOtp(code) {
  if (!code || code.length !== 6) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

// Display with monospace, large, letter-spaced
<code className="text-3xl font-mono font-bold tracking-widest">
  {formatOtp(otpCode)}
</code>
```

### Anti-Patterns to Avoid
- **Polling too frequently:** 3-second intervals are sufficient; faster creates unnecessary load
- **Not cleaning up intervals:** Always return cleanup function from useEffect
- **Blocking main thread with confetti:** canvas-confetti is async by default, safe
- **Forgetting reduced motion:** Always check `prefers-reduced-motion` before animations

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom canvas QR renderer | `qrcode.react` QRCodeSVG | Error correction, sizing, already tested |
| OTP code generation | Random string generator | `screenService.createScreen()` | Uses crypto.getRandomValues, excludes confusing chars |
| Confetti animation | CSS particle system | `canvas-confetti` | GPU-accelerated, respects prefers-reduced-motion |
| Pairing detection | WebSocket subscription | Polling with setInterval | Simpler, existing pattern proven, realtime not needed |

**Key insight:** The codebase already has all the building blocks. `screenService.createScreen()` generates OTP, `qrcode.react` renders QR, polling pattern from `PairPage.jsx` detects pairing. Phase 32 is assembly, not creation.

## Common Pitfalls

### Pitfall 1: OTP Expiry Handling
**What goes wrong:** OTP codes expire after 15 minutes (migration 033), user may see stale code
**Why it happens:** Screen created at step start, user takes too long to pair
**How to avoid:** Show subtle expiry countdown timer; offer "Generate new code" button
**Warning signs:** Pairing fails with "expired" error after long wait

### Pitfall 2: Multiple Screen Creation on Retry
**What goes wrong:** User clicks "try again" and creates duplicate screens
**Why it happens:** Each attempt calls `createScreen()` without checking for existing unpaired screen
**How to avoid:** Check for existing unpaired screen first, reuse if found, or regenerate OTP for existing screen
**Warning signs:** Multiple "Onboarding Screen" entries in screens list

### Pitfall 3: Confetti Not Visible in Modal
**What goes wrong:** Confetti particles appear behind modal overlay
**Why it happens:** canvas-confetti creates canvas at z-index: 9999 but modal overlay may be higher
**How to avoid:** Use `confetti({ zIndex: 10001 })` to ensure visibility above modal
**Warning signs:** Celebration triggers but particles not visible

### Pitfall 4: Skip Creates Orphaned Screen
**What goes wrong:** User clicks "Skip for now", screen was created but never paired
**Why it happens:** Screen created at step start, skip exits without cleanup
**How to avoid:** Don't create screen until user explicitly wants to pair, OR accept orphan screens as fine (they can pair later)
**Warning signs:** Unpaired screens accumulate in database

### Pitfall 5: QR Code URL Mismatch
**What goes wrong:** QR code points to wrong domain in production vs development
**Why it happens:** Hardcoded origin or incorrect environment variable
**How to avoid:** Use `window.location.origin` for dynamic URL construction (pattern from PairingScreen.jsx)
**Warning signs:** QR scan leads to wrong site or 404

## Code Examples

Verified patterns from official sources:

### Screen Creation with OTP
```javascript
// Source: src/services/screenService.js (lines 229-263)
export async function createScreen({ name }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User must be authenticated');

  const otpCode = generateOtpCode();

  const { data, error } = await supabase
    .from('tv_devices')
    .insert({
      owner_id: user.id,
      device_name: name,
      otp_code: otpCode
    })
    .select(`
      *,
      assigned_playlist:playlists(id, name),
      assigned_layout:layouts(id, name),
      assigned_schedule:schedules(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}
```

### QR Code for Pairing URL
```javascript
// Source: src/player/components/PairingScreen.jsx (lines 47-50)
const pairingUrl = useMemo(() => {
  const origin = window.location.origin;
  return `${origin}/pair/${deviceId}`;
}, [deviceId]);
```

### Unified Onboarding Step Component API
```javascript
// Source: src/components/onboarding/UnifiedOnboardingController.jsx (lines 204-221)
// Every step receives these props:
const componentProps = {
  isOpen: true,      // Always true when rendered
  onClose: handleSkip,  // Skip confirmation flow
};

// For screen_pairing specifically:
if (state?.currentStep === 'screen_pairing') {
  componentProps.onComplete = handleStepComplete;
}
```

### Canvas Confetti with Reduced Motion Check
```javascript
// Source: canvas-confetti documentation (https://github.com/catdad/canvas-confetti)
import confetti from 'canvas-confetti';

function celebrate() {
  // canvas-confetti has built-in disableForReducedMotion option
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    disableForReducedMotion: true,  // Respects user preference
    zIndex: 10001  // Above modal
  });
}
```

### Skip Creates Dashboard Reminder
```javascript
// Pattern: Store skip state and show reminder card on dashboard
// Source: Conceptual based on OnboardingBanner.jsx pattern

// In ScreenPairingStep - when skipping:
const handleSkip = async () => {
  // Mark step as skipped in onboarding_progress
  // The dashboard can then check for skipped screen_pairing
  // and show a reminder card
  await advanceOnboardingStep('screen_pairing'); // Still advances
  onComplete?.();
};

// In DashboardPage - check for reminder:
// If screen_pairing_completed_at is null but step passed,
// show "Connect your first screen" card
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling every 1s | Polling every 3s | v2 | Reduces server load, still responsive |
| react-qrcode | qrcode.react | v1 | Better SVG support, cleaner API |
| Custom confetti CSS | canvas-confetti | 2024 | GPU acceleration, reduced motion support |

**Deprecated/outdated:**
- `WelcomeModal` quick demo flow: Being replaced by unified onboarding (Phase 31+)
- Direct localStorage tracking: Moved to database `onboarding_progress` table

## Open Questions

Things that couldn't be fully resolved:

1. **Dashboard Reminder Card Implementation**
   - What we know: OnboardingBanner.jsx exists for resume prompts
   - What's unclear: Exact design/copy for "finish pairing" card
   - Recommendation: Create new `ScreenPairingReminderCard` component, or extend OnboardingCards.jsx

2. **Screen Name Generation**
   - What we know: `createScreen({ name })` requires a name
   - What's unclear: Auto-generate "My First Screen" or prompt user?
   - Recommendation: Auto-generate "Onboarding Screen" (user can rename later)

3. **QR Code vs OTP Prominence**
   - What we know: User decided QR is primary, OTP is fallback
   - What's unclear: Exact layout ratio
   - Recommendation: QR code gets ~60% of visual space, OTP below with "Can't scan?" label

## Sources

### Primary (HIGH confidence)
- src/services/screenService.js - OTP generation, screen creation, pairing functions
- src/player/components/PairingScreen.jsx - QR code display pattern
- src/player/components/PairPage.jsx - Polling for pairing detection
- src/components/onboarding/UnifiedOnboardingController.jsx - Step component integration pattern
- supabase/migrations/139_unified_onboarding_state.sql - Onboarding progress schema
- supabase/migrations/033_mobile_player_pairing.sql - OTP expiry, is_paired flag

### Secondary (MEDIUM confidence)
- [canvas-confetti npm](https://www.npmjs.com/package/canvas-confetti) - Confetti library documentation
- [qrcode.react](https://www.npmjs.com/package/qrcode.react) - QR code React component

### Tertiary (LOW confidence)
- WebSearch for confetti libraries - General ecosystem survey, validated with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed/used in codebase except canvas-confetti
- Architecture: HIGH - Patterns directly extracted from existing working code
- Pitfalls: MEDIUM - Derived from code analysis and common patterns, some speculative

**Research date:** 2026-01-31
**Valid until:** 2026-03-01 (60 days - stable domain, no major changes expected)
