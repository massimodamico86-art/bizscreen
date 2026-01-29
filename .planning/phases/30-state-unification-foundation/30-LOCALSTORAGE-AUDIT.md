# localStorage/sessionStorage Audit for Onboarding

**Purpose:** Document all client-side storage keys related to onboarding for Phase 34 cleanup.

**Audit Date:** 2026-01-29
**Plan:** 30-02

---

## Onboarding-Related Keys

### localStorage Keys

| Key | File(s) | Purpose | Database Equivalent | Removal Status |
|-----|---------|---------|---------------------|----------------|
| `bizscreen_welcome_modal_shown` | src/pages/DashboardPage.jsx | Tracks if WelcomeModal has been shown to prevent re-display | `onboarding_progress.starter_pack_applied` or `current_unified_step` | REMOVE in Phase 34 |
| `lastDemoOtp` | src/services/demoContentService.js, src/player/components/PairPage.jsx | Stores OTP for demo screen to hint during pairing | N/A (demo flow convenience) | REVIEW - Keep if demo flow persists |

### sessionStorage Keys

| Key | File(s) | Purpose | Database Equivalent | Removal Status |
|-----|---------|---------|---------------------|----------------|
| `onboarding_banner_dismissed` | src/components/onboarding/OnboardingBanner.jsx | Tracks banner dismissal per session | N/A (session-only intentionally) | KEEP (per-session is correct behavior) |

---

## Non-Onboarding Keys (Reference)

These keys are NOT targeted for removal - they serve legitimate purposes outside onboarding.

### Player Storage Keys (src/player/)

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `player_screen_id` | ViewPage.jsx, PairPage.jsx, hooks | Identifies paired screen on player device | KEEP (player identity) |
| `player_playlist_id` | ViewPage.jsx, hooks | Tracks current playlist assignment | KEEP (player state) |
| `player_content_hash` | ViewPage.jsx, usePlayerContent.js, PairPage.jsx | Change detection for content updates | KEEP (player optimization) |
| `player_kiosk_mode` | useKioskMode.js | Kiosk mode enabled state | KEEP (player feature) |
| `player_kiosk_password` | ViewPage.jsx, useKioskMode.js | Kiosk exit password hash | KEEP (player security) |
| `player_last_activity` | (defined but usage TBD) | Last activity timestamp | KEEP (player state) |
| `player_device_id` | PairingScreen.jsx, PairPage.jsx | Unique device identifier for QR pairing | KEEP (player identity) |
| `kiosk_password_hash` | playerService.js | Legacy kiosk password storage | KEEP (player security) |
| `kiosk_device_pin_hash` | playerService.js | Device-specific PIN hash | KEEP (player security) |
| `kiosk_master_pin_hash` | playerService.js | Master PIN hash | KEEP (player security) |

### TV Mode Storage (src/TV.jsx)

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `tv_otp` | TV.jsx | Persists OTP for TV mode reconnection | KEEP (TV feature) |

### Authentication/Integration Storage

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `canva_access_token` | canvaService.js | Canva OAuth access token | KEEP (integration) |
| `canva_refresh_token` | canvaService.js | Canva OAuth refresh token | KEEP (integration) |
| `canva_token_expiry` | canvaService.js | Token expiration timestamp | KEEP (integration) |

### Session/User State Storage

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `bizscreen_session_id` | sessionService.js | Active session identifier | KEEP (session tracking) |
| `bizscreen_locale` | localeService.js, I18nContext.jsx | User's preferred locale | KEEP (UX preference) |
| `bizscreen_cookie_consent` | consentService.js | Cookie consent preferences | KEEP (legal compliance) |
| `bizscreen_dismissed_announcements` | feedbackService.js | IDs of dismissed announcements | KEEP (UX preference) |

### Feature/Experiment Storage

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `bizscreen_feature_flags` | featureFlagService.js | Cached feature flags | KEEP (performance) |
| `bizscreen_experiment_variants` | experimentService.js | Cached A/B test variants | KEEP (experimentation) |

### Admin/Tenant Storage

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `bizscreen_impersonated_client` | tenantService.js | Admin client impersonation ID | KEEP (admin feature) |
| `bizscreen_impersonated_client_info` | tenantService.js | Impersonated client metadata | KEEP (admin feature) |

### Analytics/Tracking Storage

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `playback_events_offline_queue` | playbackTrackingService.js | Offline playback events queue | KEEP (analytics resilience) |

---

## sessionStorage Keys (Non-Onboarding)

| Key | File(s) | Purpose | Removal Status |
|-----|---------|---------|----------------|
| `canva_code_verifier` | canvaService.js | PKCE code verifier for OAuth | KEEP (security - session-scoped intentionally) |
| `canva_oauth_state` | canvaService.js | OAuth state parameter | KEEP (security - session-scoped intentionally) |
| `pendingTemplate` | SvgTemplateGalleryPage.jsx, SvgEditorPage.jsx | Template data for editor navigation | KEEP (cross-page state) |
| `webvitals_session` | webVitalsService.js | Web Vitals session identifier | KEEP (analytics) |
| `app_data_cache_*` | AppRenderer.jsx | Dynamic app data caching | KEEP (performance) |

---

## Removal Recommendations

### Phase 34 Actions

#### 1. Remove `bizscreen_welcome_modal_shown`

**Location:** src/pages/DashboardPage.jsx

**Current Usage:**
```javascript
const WELCOME_MODAL_KEY = 'bizscreen_welcome_modal_shown';
// Line 143
if (firstRunData.isFirstRun && !localStorage.getItem(WELCOME_MODAL_KEY)) {
  setShowWelcomeModal(true);
}
// Line 223
localStorage.setItem(WELCOME_MODAL_KEY, 'true');
```

**Replacement Logic:**
After Phase 31 (Unified Controller), replace with:
```javascript
// Use unified state instead of localStorage
const { currentStep, isComplete } = getUnifiedOnboardingState();
if (currentStep === 'welcome' && !isComplete) {
  setShowWelcomeModal(true);
}
```

**Files to Modify:**
- src/pages/DashboardPage.jsx (delete WELCOME_MODAL_KEY constant, replace getItem/setItem calls)

**Migration:**
- No migration needed - database is source of truth after Phase 31
- localStorage value will be orphaned but harmless

#### 2. Review `lastDemoOtp`

**Location:** src/services/demoContentService.js, src/player/components/PairPage.jsx

**Current Usage:**
```javascript
// demoContentService.js line 321
localStorage.setItem('lastDemoOtp', screen.otp_code);

// PairPage.jsx line 47-50
const storedDemoOtp = localStorage.getItem('lastDemoOtp');
if (storedDemoOtp) {
  setDemoOtp(storedDemoOtp);
}
```

**Decision Needed:**
- If demo workspace creation remains part of unified flow: KEEP
- If demo flow is removed/simplified: REMOVE

**Recommendation:** KEEP for v2.2, review in future cleanup phase

### Keys to Keep

| Key | Reason |
|-----|--------|
| `onboarding_banner_dismissed` | Session-only is intentional - banner should reappear on new session |
| All `player_*` keys | Required for player device identity and state |
| All `bizscreen_*` keys | Required for app functionality (locale, consent, sessions) |
| All `canva_*` keys | Required for Canva integration |

---

## Migration Path

### For users with existing localStorage state:

**Scenario:** User has `bizscreen_welcome_modal_shown = 'true'` from pre-v2.2

**Phase 34 Behavior:**
1. Unified controller checks database for onboarding state
2. If `onboarding_progress.starter_pack_applied = true` OR `current_unified_step = 'complete'`:
   - Skip welcome modal (database is truth)
3. If database shows incomplete but localStorage has shown:
   - Trust database (user may need to complete onboarding)
   - localStorage value is orphaned, not read

**No active migration required:**
- Database state takes precedence
- localStorage values can remain (no cleanup script needed)
- Values will be naturally cleaned when users clear browser storage

### Cleanup Verification (Phase 34)

After Phase 34 removal, verify:
```bash
# Should return no results for WELCOME_MODAL_KEY
grep -r "WELCOME_MODAL_KEY\|bizscreen_welcome_modal_shown" src/

# Should return only the one remaining usage if keeping demo flow
grep -r "lastDemoOtp" src/
```

---

## Summary

| Category | Keys Found | Action |
|----------|------------|--------|
| Onboarding (localStorage) | 2 | 1 REMOVE, 1 REVIEW |
| Onboarding (sessionStorage) | 1 | KEEP |
| Player/Device | 10 | KEEP ALL |
| User Preferences | 4 | KEEP ALL |
| Integrations | 3 | KEEP ALL |
| Analytics | 2 | KEEP ALL |
| Admin | 2 | KEEP ALL |
| Editor State | 1 | KEEP |

**Total localStorage keys:** 24
**Total sessionStorage keys:** 5
**Keys to remove in Phase 34:** 1 (`bizscreen_welcome_modal_shown`)
**Keys to review:** 1 (`lastDemoOtp`)
