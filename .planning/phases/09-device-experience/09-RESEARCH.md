# Phase 9: Device Experience - Research

**Researched:** 2026-01-23
**Domain:** Device pairing, kiosk mode, PIN authentication
**Confidence:** HIGH

## Summary

Phase 9 implements QR-based device pairing and emergency kiosk exit functionality. The codebase already has substantial infrastructure for device pairing (OTP codes, player service), kiosk mode (useKioskMode hook), and offline PIN validation (SHA-256 hashing in playerService). This phase extends these foundations to add QR code display on unpaired devices, a hidden 5-tap exit trigger, and tenant-level master PIN storage.

The primary technical challenges are:
1. **QR pairing flow** - Unpaired player must display QR encoding a pairing URL; admin scans and completes pairing; device auto-transitions
2. **Hidden exit trigger** - 100x100px tap zone in bottom-right, 5 taps within 2 seconds timeout, no visual feedback
3. **Offline PIN** - Device-level and tenant-level master PIN, stored locally as SHA-256 hash, works without network

**Primary recommendation:** Build on existing `useKioskMode` hook and `playerService` password hashing. Add new `useTapSequence` hook for the hidden trigger, extend QRCodeWidget for pairing display, and add `kiosk_pin_hash` column to both `tv_devices` and `profiles` tables.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | ^4.2.0 | QR code rendering | Already in use (QRCodeWidget) |
| Web Crypto API | Native | SHA-256 hashing | Already used in playerService |
| localStorage | Native | PIN hash storage | Existing pattern for kiosk password |
| Supabase | ^2.80.0 | Database/RPC functions | Backend for PIN sync |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React hooks | ^19.1.1 | State management | Custom hooks for tap sequence |
| date-fns | ^4.1.0 | Timeout/duration handling | Already in use |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SHA-256 (existing) | bcrypt | SHA-256 already implemented, bcrypt adds complexity for 4-digit PIN |
| localStorage | IndexedDB | localStorage simpler for small data, already used |

**Installation:**
No new dependencies required - all libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── player/
│   ├── hooks/
│   │   ├── useKioskMode.js       # Extend with PIN interface
│   │   ├── useTapSequence.js     # NEW: Hidden tap gesture detection
│   │   └── index.js              # Export new hook
│   ├── components/
│   │   ├── PairingScreen.jsx     # NEW: QR code + instructions display
│   │   └── PinEntry.jsx          # NEW: Numeric keypad modal
│   └── offlineService.js         # Extend with PIN caching
├── services/
│   └── playerService.js          # Extend kiosk PIN functions
└── Player.jsx                    # Integrate new components
```

### Pattern 1: Hidden Tap Sequence Detection
**What:** Custom hook tracking consecutive taps in a specific region
**When to use:** For security-sensitive hidden triggers
**Example:**
```typescript
// Source: Pattern derived from React gesture handling best practices
function useTapSequence({
  requiredTaps = 5,
  timeoutMs = 2000,
  onTrigger
}) {
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();

    // Reset if timeout exceeded
    if (now - lastTapTimeRef.current > timeoutMs) {
      tapCountRef.current = 0;
    }

    lastTapTimeRef.current = now;
    tapCountRef.current += 1;

    if (tapCountRef.current >= requiredTaps) {
      tapCountRef.current = 0;
      onTrigger?.();
    }
  }, [requiredTaps, timeoutMs, onTrigger]);

  return { handleTap };
}
```

### Pattern 2: Offline PIN Validation
**What:** SHA-256 hash comparison for offline authentication
**When to use:** When network-independent validation is required
**Example:**
```typescript
// Source: Existing playerService.js pattern
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validatePinOffline(inputPin, storedHash) {
  const inputHash = await hashPin(inputPin);
  return inputHash === storedHash;
}
```

### Pattern 3: QR Pairing URL Encoding
**What:** Encode pairing URL with device ID in QR code
**When to use:** For mobile-initiated device pairing
**Example:**
```typescript
// QR encodes a URL that opens the web app at pairing screen
const pairingUrl = `${window.location.origin}/pair/${deviceId}`;

// QRCodeSVG from qrcode.react
<QRCodeSVG
  value={pairingUrl}
  size={256}
  level="M"
  fgColor="#000000"
  bgColor="#ffffff"
/>
```

### Anti-Patterns to Avoid
- **Storing plaintext PIN:** Always hash before storage
- **Visible tap feedback:** Compromises security - no visual cue during 5-tap sequence
- **Synchronous hash validation:** Always use async crypto.subtle
- **Hardcoded PIN:** Always store per-tenant configurable PIN

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code rendering | Custom SVG generator | qrcode.react (QRCodeSVG) | Already integrated, handles error correction |
| Password hashing | Custom hash function | Web Crypto API (crypto.subtle) | Already implemented in playerService |
| Fullscreen management | Direct DOM calls | enterFullscreen/exitFullscreen from playerService | Handles browser prefixes |
| Kiosk mode state | New state management | useKioskMode hook | Already handles persistence, fullscreen |

**Key insight:** The codebase has substantial kiosk infrastructure. Extend, don't replace.

## Common Pitfalls

### Pitfall 1: Touch Event vs Click Event
**What goes wrong:** Using onClick instead of onTouchEnd on touch devices
**Why it happens:** Desktop-first development
**How to avoid:** Use both onClick and onTouchEnd, prevent double-firing
**Warning signs:** Tap not registering on mobile/TV touch screens

### Pitfall 2: QR Code URL Encoding
**What goes wrong:** Special characters in URL break QR scanning
**Why it happens:** Not URL-encoding parameters
**How to avoid:** Use encodeURIComponent for any dynamic URL parts
**Warning signs:** QR scans fail on certain device IDs

### Pitfall 3: PIN Timeout Race Condition
**What goes wrong:** Auto-timeout fires while user is entering PIN
**Why it happens:** Timer not reset on keypad interaction
**How to avoid:** Reset 30-second timeout on every key press
**Warning signs:** PIN entry closes unexpectedly

### Pitfall 4: Kiosk Re-entry After Exit
**What goes wrong:** Exiting kiosk leaves device in inconsistent state
**Why it happens:** Fullscreen exit but kiosk mode still enabled in localStorage
**How to avoid:** Clear both kioskMode localStorage AND exit fullscreen
**Warning signs:** Device immediately re-enters fullscreen

### Pitfall 5: Master PIN Sync Timing
**What goes wrong:** Device offline during PIN change never gets new PIN
**Why it happens:** No sync mechanism when device comes back online
**How to avoid:** Fetch tenant master PIN on each content refresh/heartbeat
**Warning signs:** Old PIN works indefinitely on devices that were offline

## Code Examples

Verified patterns from official sources:

### Existing QR Code Widget Usage
```typescript
// Source: src/player/components/widgets/QRCodeWidget.jsx
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG
  value={url}
  size={256}
  level={errorCorrection} // 'L' | 'M' | 'Q' | 'H'
  fgColor={qrFgColor}
  bgColor={qrBgColor}
  style={{
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
  }}
/>
```

### Existing Password Hash Functions
```typescript
// Source: src/services/playerService.js (lines 547-603)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function cacheKioskPasswordHash(password) {
  const hash = await hashPassword(password);
  localStorage.setItem('kiosk_password_hash', hash);
}

export async function validateKioskPasswordOffline(input, password) {
  const storedHash = localStorage.getItem('kiosk_password_hash');
  if (storedHash) {
    const inputHash = await hashPassword(input);
    return inputHash === storedHash;
  }
  return input === password; // Legacy fallback
}
```

### Existing Kiosk Mode Hook
```typescript
// Source: src/player/hooks/useKioskMode.js
const STORAGE_KEYS = {
  kioskMode: 'player_kiosk_mode',
  kioskPassword: 'player_kiosk_password',
};

// Hook manages:
// - kioskMode state (persisted to localStorage)
// - showKioskExit dialog state
// - Password input and validation
// - Fullscreen enter/exit
// - Escape key handler to show exit dialog
```

### Existing Screen Creation (OTP Flow)
```typescript
// Source: src/services/screenService.js (lines 211-259)
export function generateOtpCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars
  const randomValues = new Uint8Array(6);
  crypto.getRandomValues(randomValues);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(randomValues[i] % chars.length);
  }
  return code;
}

export async function createScreen({ name }) {
  const otpCode = generateOtpCode();
  const { data, error } = await supabase
    .from('tv_devices')
    .insert({
      owner_id: user.id,
      device_name: name,
      otp_code: otpCode
    })
    .select()
    .single();
  return data;
}
```

## Existing Codebase Analysis

### Current Pairing Flow
1. Admin creates screen in ScreensPage -> generates OTP code -> stored in `tv_devices.otp_code`
2. Admin shows OTP to field tech
3. Field tech opens `/player` on TV device
4. Device shows OTP input screen (Player.jsx PairingPage component)
5. Tech enters 6-digit OTP manually
6. Device calls `get_resolved_player_content_by_otp` RPC
7. Device stores `screenId` in localStorage and navigates to `/player/view`

### What Phase 9 Changes
1. **QR on unpaired device:** Instead of showing OTP input, unpaired device generates unique device ID and displays QR code encoding `{origin}/pair/{deviceId}`
2. **Admin scans:** Admin scans QR with phone camera -> opens web app at pairing route
3. **Admin selects screen:** Web app shows list of screens with "Create new" option
4. **Device auto-transitions:** Device polls for pairing completion, auto-navigates to content view

### Current Kiosk Exit Flow
1. Press Escape key while in kiosk mode
2. `useKioskMode` shows exit dialog
3. Enter password (stored in `localStorage.player_kiosk_password`)
4. Password validated (plaintext comparison or SHA-256 hash)
5. Kiosk mode disabled, fullscreen exited

### What Phase 9 Changes
1. **Hidden trigger:** Add 100x100px invisible tap zone in bottom-right corner
2. **5-tap sequence:** Track taps within 2-second timeout (no visual feedback)
3. **PIN entry:** Full-screen numeric keypad (0-9 grid, ATM-style)
4. **4-digit PIN:** Instead of arbitrary password
5. **Master PIN:** Tenant-level PIN from `profiles` table, synced to device

### Database Schema Changes Needed

```sql
-- Add device-level PIN storage
ALTER TABLE public.tv_devices
ADD COLUMN IF NOT EXISTS kiosk_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS kiosk_pin_set_at TIMESTAMPTZ;

-- Add tenant-level master PIN
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS master_kiosk_pin_hash TEXT,
ADD COLUMN IF NOT EXISTS master_kiosk_pin_set_at TIMESTAMPTZ;

-- Function to get master PIN hash for a device
CREATE OR REPLACE FUNCTION get_device_kiosk_pins(p_device_id UUID)
RETURNS JSONB AS $$
SELECT jsonb_build_object(
  'device_pin_hash', td.kiosk_pin_hash,
  'master_pin_hash', p.master_kiosk_pin_hash
)
FROM tv_devices td
JOIN profiles p ON p.id = td.owner_id
WHERE td.id = p_device_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

### Key Files to Modify

| File | Changes |
|------|---------|
| `src/Player.jsx` | Add QR pairing display, integrate tap trigger, PIN modal |
| `src/player/hooks/useKioskMode.js` | Add PIN validation, 30s timeout, wrong PIN handling |
| `src/player/hooks/useTapSequence.js` | **NEW:** Hidden tap gesture detection hook |
| `src/player/components/PairingScreen.jsx` | **NEW:** QR code + instructions layout |
| `src/player/components/PinEntry.jsx` | **NEW:** Full-screen numeric keypad |
| `src/services/playerService.js` | Add PIN hash functions |
| `src/services/screenService.js` | Add master PIN management functions |
| `src/pages/ScreensPage.jsx` | Add master PIN settings modal |
| `supabase/migrations/XXX_device_experience.sql` | **NEW:** PIN columns, RPC functions |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual OTP entry | QR code scan + auto-pair | Phase 9 | Better field tech UX |
| Escape key exit | Hidden tap + PIN | Phase 9 | More secure, no keyboard needed |
| Password-based exit | 4-digit PIN | Phase 9 | Simpler for field techs |
| Device-only PIN | Device + master PIN | Phase 9 | Admin can unlock any device |

**Deprecated/outdated:**
- `localStorage.player_kiosk_password` (plaintext) - replaced by hashed PIN
- Escape key as sole exit trigger - still works but hidden tap is primary

## Open Questions

Things that couldn't be fully resolved:

1. **Device ID Generation for Unpaired Devices**
   - What we know: Need unique ID before pairing to encode in QR
   - What's unclear: Use UUID? Use device fingerprint? Persist across browser clear?
   - Recommendation: Generate UUID on first load, store in localStorage, regenerate if cleared

2. **QR Refresh on Unpaired Screen**
   - What we know: Device ID should be stable
   - What's unclear: Should QR/URL have expiry? Should device ID rotate?
   - Recommendation: No expiry - URL is just a deep link, auth happens during pairing

3. **Master PIN Change Propagation**
   - What we know: Offline devices won't see PIN change immediately
   - What's unclear: Grace period for old PIN? Push notification of PIN change?
   - Recommendation: Cache both device PIN and master PIN on heartbeat; accept either

## Sources

### Primary (HIGH confidence)
- `src/player/hooks/useKioskMode.js` - Existing kiosk implementation
- `src/services/playerService.js` - Password hashing functions (lines 547-603)
- `src/player/components/widgets/QRCodeWidget.jsx` - QR rendering pattern
- `src/services/screenService.js` - OTP generation, screen creation
- `supabase/migrations/001_initial_schema.sql` - tv_devices schema
- `supabase/migrations/060_seed_test_data.sql` - owner_id pattern for tv_devices

### Secondary (MEDIUM confidence)
- `qrcode.react` npm documentation - QRCodeSVG API
- Web Crypto API MDN documentation - crypto.subtle.digest

### Tertiary (LOW confidence)
- React gesture handling patterns (various blog posts)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use
- Architecture: HIGH - Building on existing hooks and patterns
- Pitfalls: MEDIUM - Based on common React/touch development issues

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, no external API changes expected)
