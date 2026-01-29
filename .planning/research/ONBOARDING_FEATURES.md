# Feature Landscape: Digital Signage Onboarding

**Domain:** Digital Signage SaaS Onboarding
**Researched:** 2026-01-28
**Focus:** Unified onboarding flow for BizScreen
**Confidence:** MEDIUM (WebSearch unavailable; based on competitor analysis, existing codebase, and domain knowledge)

## Executive Summary

Digital signage onboarding differs from typical SaaS onboarding because success requires **hardware pairing**. Users must not only understand the software but also physically connect a display device. The "aha moment" for digital signage is **seeing your content on a real screen**, not just creating content in a dashboard.

**Current BizScreen state:** Three disconnected flows that create confusion:
1. **WelcomeModal** - Choice (demo vs starter pack) + business type + creation
2. **OnboardingWizard** - 6-step checklist (logo, media, playlist, screen, pairing)
3. **WelcomeTour** - 6-step feature introduction

**Problem:** These flows overlap, compete for attention, and don't guide users to the real goal: content displaying on a screen.

**Recommended approach:** Single progressive flow focused on "first screen displaying content" as the activation milestone. Merge the best elements of existing flows while eliminating redundancy.

---

## Table Stakes

Features users expect in any digital signage SaaS onboarding. Missing = product feels incomplete or confusing.

| Feature | Why Expected | Complexity | BizScreen Status |
|---------|--------------|------------|------------------|
| **Quick start with sample content** | Users want to see value before investing time | LOW | EXISTS (demo workspace) |
| **Screen pairing guidance** | Hardware connection is not intuitive | MEDIUM | PARTIAL (OTP shown, no guidance) |
| **Industry-specific templates** | Reduces "blank canvas" paralysis | LOW | EXISTS (starter packs) |
| **Progress indication** | Users need to know how far along they are | LOW | EXISTS (multiple uncoordinated) |
| **Skip option** | Power users want to explore independently | LOW | EXISTS |
| **Empty state guidance** | Every page should guide toward action | LOW | EXISTS (Yodeck pattern) |
| **Device registration instructions** | Clear OTP entry process | LOW | EXISTS (but isolated) |
| **Content preview before publish** | Users need confidence before going live | MEDIUM | PARTIAL (preview exists) |

### Critical Gap: Unified Flow

The single biggest table stakes gap is **flow unification**. Competitors present ONE onboarding experience:

**Yodeck pattern (observed):**
1. Sign up + business type selection
2. Dashboard shows "Add your first screen" CTA
3. Screen pairing wizard with OTP
4. Demo content auto-assigned
5. Contextual help throughout

**ScreenCloud pattern (domain knowledge):**
1. Sign up with trial
2. Guided screen setup in first 5 minutes
3. Content library with templates
4. Push to screen flow

**BizScreen current state:**
- WelcomeModal appears on first login
- OnboardingWizard is disconnected (must be explicitly opened)
- WelcomeTour is a separate system
- OTP screen exists but isn't integrated into onboarding

---

## Differentiators

Features that set BizScreen apart from competitors. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Demo screen without hardware** | Let users preview content in browser before buying a player | LOW | Exists but not integrated into onboarding |
| **Instant industry starter pack** | One-click setup with industry-matched templates, playlists, and layouts | MEDIUM | EXISTS (apply_pack_template RPC) |
| **First content to screen in <5 min** | Marketing promise backed by optimized flow | MEDIUM | Requires flow redesign |
| **Screen pairing QR code** | Scan QR from player app instead of typing OTP | LOW | Player already supports this |
| **Live content confirmation** | Show "Content is now playing" with screenshot proof | MEDIUM | Player screenshot exists |
| **Guided template customization** | Wizard for replacing placeholder content | MEDIUM | Builds on Polotno editor |
| **Mobile-friendly pairing** | Pair screen from phone while at TV | LOW | Responsive dashboard exists |
| **Contextual video tutorials** | <30 sec videos at key friction points | LOW | External hosting, embed in modals |
| **Workspace templates** | Save entire workspace state as template for new accounts | HIGH | For franchise/multi-location |
| **AI content suggestions** | Suggest content based on industry and time of day | HIGH | Future feature |

### Key Differentiator Opportunity: "Content Live in 5 Minutes"

No competitor explicitly promises time-to-value. BizScreen could differentiate with:
1. Starter pack applied in <30 seconds
2. Demo screen created automatically
3. Content visible in browser immediately
4. Hardware pairing as optional "upgrade" step

This inverts the typical flow: show value BEFORE requiring hardware.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in digital signage onboarding.

| Anti-Feature | Why Avoid | Alternative |
|--------------|-----------|-------------|
| **Mandatory multi-step wizard** | Friction increases abandonment; power users resent it | Progressive disclosure with skip option at every step |
| **Separate onboarding for each feature** | Creates confusion about what's "required" | Single unified flow with optional deep-dives |
| **Hardware-required activation** | Users without screens can't experience value | Demo screen in browser before hardware |
| **Complex business configuration upfront** | Locations, groups, etc. are premature | Defer to post-activation settings |
| **Multiple overlapping modals** | Current BizScreen problem; creates cognitive overload | ONE onboarding system, not three |
| **Video-only tutorials** | Inaccessible, not searchable, high skip rate | Text + images with optional video |
| **Email-based onboarding sequences** | Ignored in inbox; value is in-app | In-app guidance with optional email summary |
| **Gamification (badges, points)** | Feels patronizing for B2B users | Simple progress indication |
| **Forced template selection** | Some users want to start from scratch | "Start from template" vs "Start blank" |
| **Lengthy forms during signup** | Increases abandonment | Minimal signup, collect details progressively |

### Critical Anti-Pattern: Current Multi-Flow Design

BizScreen's current three-flow design is the primary anti-pattern to fix:

**Problem 1: WelcomeModal vs OnboardingWizard**
- WelcomeModal: Quick demo vs Starter pack (good)
- OnboardingWizard: 6-step checklist (redundant)
- Both track progress separately (confusing)

**Problem 2: WelcomeTour Redundancy**
- 6 steps explaining features that users haven't used yet
- No connection to actual task completion
- Shown in addition to other flows

**Problem 3: No Hardware Integration**
- OTP pairing screen exists but isn't connected to onboarding progress
- Users complete "onboarding" without ever pairing a screen
- True activation metric (content on screen) isn't tracked

---

## Feature Dependencies

How onboarding features depend on existing BizScreen capabilities.

### Content Pipeline Dependencies

```
Template Selection → Starter Pack Application → Demo Screen Creation → Content Display
                                                        ↓
                                                 OTP Screen Pairing
```

| Step | Depends On | Status |
|------|------------|--------|
| Industry selection | `business_type` on profile | EXISTS |
| Starter pack apply | `apply_pack_template` RPC | EXISTS |
| Demo workspace | Demo user creation flow | EXISTS |
| OTP generation | `generatePairingCode` function | EXISTS |
| Content resolution | Player content service | EXISTS |
| Screenshot capture | Player screenshot feature | EXISTS |

### Database Dependencies

| Table/Column | Purpose | Status |
|--------------|---------|--------|
| `onboarding_progress` | Track step completion | EXISTS |
| `profiles.business_type` | Industry for templates | EXISTS |
| `tv_devices.is_paired` | Pairing status | EXISTS |
| `tv_devices.last_seen` | Confirm device online | EXISTS |
| `onboarding_progress.starter_pack_applied` | Track pack usage | EXISTS |

### Missing: Unified Activation Tracking

No single table tracks the TRUE activation event: "first content displayed on real screen."

**Proposed:** Add to `onboarding_progress`:
- `first_content_displayed_at` - timestamp of first real playback
- `first_screenshot_at` - timestamp of first successful screenshot
- `activation_method` - 'demo' | 'hardware' | 'both'

---

## Recommended Unified Flow

Based on research, the optimal onboarding flow for BizScreen:

### Phase 1: Immediate Value (0-60 seconds)

1. **Welcome + Choice** (WelcomeModal choice step - keep)
   - "Quick Demo" vs "Business Starter Pack"
   - Skip option visible

2. **Industry Selection** (WelcomeModal businessType step - keep)
   - Only if "Starter Pack" chosen
   - 5 industry options + "Other"

3. **Pack Application** (WelcomeModal creating step - enhance)
   - Show progress: "Creating your workspace..."
   - Result: Playlists + Layouts created
   - CTA: "See it in action" (not "Go to Dashboard")

### Phase 2: Demo Experience (60-180 seconds)

4. **Demo Screen Preview** (NEW - merge demo concept)
   - Browser-based preview of content
   - Shows what will display on screen
   - "This is how your screen will look"

5. **Template Customization Prompt** (NEW - optional)
   - "Want to customize this template?"
   - Opens Polotno editor OR continues to pairing
   - Skip: "I'll customize later"

### Phase 3: Hardware Activation (optional, 3-10 minutes)

6. **Screen Pairing** (enhance existing OTP flow)
   - "Ready to connect a real screen?"
   - OTP code with QR option
   - Instructions for player app download
   - Skip: "I'll connect a screen later"

7. **Live Confirmation** (NEW - key differentiator)
   - Poll for device pairing
   - Show screenshot from real device
   - "Your content is now live!"

### What to Remove/Merge

| Current Component | Action |
|-------------------|--------|
| WelcomeModal | KEEP - becomes flow orchestrator |
| OnboardingWizard | REMOVE - redundant with enhanced WelcomeModal |
| WelcomeTour | CONVERT to contextual tooltips on first visit to each page |
| OTP PairPage | INTEGRATE into WelcomeModal Phase 3 |

---

## Success Metrics

Onboarding success should be measured by:

| Metric | Target | Current Tracking |
|--------|--------|------------------|
| Time to first content created | <2 min | NOT TRACKED |
| Time to first screen paired | <10 min | NOT TRACKED |
| Starter pack application rate | >60% | PARTIAL (flag exists) |
| Demo screen usage | >30% | NOT TRACKED |
| Onboarding completion rate | >70% | EXISTS (is_complete) |
| Onboarding skip rate | <30% | EXISTS (skipped_at) |
| First-week retention | >50% | NOT TRACKED |
| Hardware activation rate | >40% | PARTIAL (is_paired) |

### Activation Funnel

```
Sign Up → Welcome Modal → Pack/Demo Applied → Content Viewed → Screen Paired → Content Live
   100%        95%             80%               70%             40%            35%
```

Target: Increase "Content Live" from estimated 35% to 50%.

---

## Competitor Analysis Summary

Based on Yodeck capture analysis and domain knowledge:

### Yodeck Onboarding (from captured UI)

**Strengths observed:**
- Clean empty states with single CTA per page
- "Add Screen" is prominent on Screens page
- Demo content available immediately
- Pairing flow is straightforward

**Patterns to adopt:**
- Single CTA per empty state
- Tour link at bottom of empty states ("View the Screens tour")
- Progress indication subtle, not modal-heavy

### ScreenCloud (domain knowledge)

**Strengths:**
- Trial-first approach (14 days, no CC)
- Screen setup is first guided action
- Content library browsable before pairing

**Patterns to adopt:**
- "Setup your first screen" as primary onboarding action
- Hardware pairing as main flow, not afterthought

### Xibo (domain knowledge)

**Strengths:**
- Open source allows deep customization
- Multi-CMS architecture for enterprise

**Anti-patterns to avoid:**
- Complex initial configuration
- Technical terminology in onboarding

---

## Implementation Priority

For onboarding polish milestone:

### P0: Must Have (Flow Unification)

1. **Remove OnboardingWizard** - redundant with WelcomeModal
2. **Convert WelcomeTour** - to contextual first-visit tooltips
3. **Integrate OTP flow** - into WelcomeModal as optional Phase 3
4. **Add demo preview step** - show content in browser before hardware

### P1: Should Have (Experience Enhancement)

5. **Live confirmation screen** - "Content is now playing" with screenshot
6. **Template customization prompt** - guided editor entry
7. **Activation tracking** - new database columns for true activation

### P2: Nice to Have (Polish)

8. **Video tutorials** - at key friction points
9. **Mobile-optimized pairing** - for at-TV setup
10. **Contextual help** - per-page guidance

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Table stakes | HIGH | Derived from existing codebase and Yodeck capture |
| Differentiators | MEDIUM | Domain knowledge without WebSearch verification |
| Anti-features | HIGH | Based on current BizScreen fragmentation analysis |
| Competitor patterns | MEDIUM | Yodeck capture + domain knowledge, no live verification |
| Success metrics | LOW | Industry benchmarks not verified via WebSearch |
| Implementation priority | HIGH | Based on current code analysis |

---

## Sources

- `/Users/massimodamico/bizscreen/docs/yodeck-ui-reference.md` - Captured Yodeck UI patterns
- `/Users/massimodamico/bizscreen/yodeck-capture/capture/screens/` - Yodeck screenshots
- `/Users/massimodamico/bizscreen/src/pages/dashboard/WelcomeModal.jsx` - Current welcome flow
- `/Users/massimodamico/bizscreen/src/components/OnboardingWizard.jsx` - Current wizard
- `/Users/massimodamico/bizscreen/src/components/onboarding/WelcomeTour.jsx` - Current tour
- `/Users/massimodamico/bizscreen/src/services/onboardingService.js` - Progress tracking
- Domain knowledge of ScreenCloud, Xibo, OptiSigns onboarding patterns

---

## Key Takeaway for Roadmap

**The primary problem is fragmentation, not missing features.** BizScreen already has most onboarding components; they're just disconnected. The milestone should focus on:

1. **Consolidation** - One flow, not three
2. **Integration** - Connect OTP pairing to onboarding progress
3. **Activation focus** - Track and celebrate "content on screen" moment
4. **Removal** - Delete OnboardingWizard, convert WelcomeTour

This is primarily a **refactoring and integration** effort, not a feature development effort.
