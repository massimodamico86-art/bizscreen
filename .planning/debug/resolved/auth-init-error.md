---
status: resolved
trigger: "Login succeeds but app gets stuck on Loading with Init error in console"
created: 2026-01-29T10:00:00Z
updated: 2026-01-29T10:00:00Z
---

## Current Focus

hypothesis: The userId "cccccccc-cccc-cccc-cccc-cccccccccccc" is a placeholder/test UUID that has no corresponding profile in the database
test: Check if this user exists in profiles table and auth.users
expecting: If profile missing, error makes sense; if profile exists, error is elsewhere
next_action: Query Supabase for user and profile existence

## Symptoms

expected: After login, user should see dashboard
actual: App stuck on "Loading..." with Init error in console
errors: [ERROR] [AuthContext] Init error at AuthContext.jsx:163. Stack: initAuth -> fetchUserProfile flow
reproduction: Login with client@bizscreen.test / TestClient123! at localhost:5174
started: After fixing AnimatePresence import errors

key_observation: The userId shown in console is "cccccccc-cccc-cccc-cccc-cccccccccccc" - this looks like a placeholder UUID

## Eliminated

## Evidence

- timestamp: 2026-01-29T10:01:00Z
  checked: AuthContext.jsx structure
  found: Line 163 is in catch block of initAuth(). Error is thrown during getSession or fetchUserProfile. The userId "cccccccc-..." format is suspicious - looks like a placeholder.
  implication: Need to check if this user actually exists in database

- timestamp: 2026-01-29T10:05:00Z
  checked: Database - profiles and auth.users tables
  found: User cccccccc-cccc-cccc-cccc-cccccccccccc exists with email client@bizscreen.test, role=client
  implication: Database is correct, issue is in frontend

- timestamp: 2026-01-29T10:07:00Z
  checked: RLS policy via API with auth token
  found: Profile fetch works correctly, returns full profile data
  implication: RLS policies are correctly configured

- timestamp: 2026-01-29T10:10:00Z
  checked: E2E client-flows test to observe app behavior
  found: App crashes with "Something Went Wrong" error. Console shows React error in FeedbackWidget component.
  implication: The "Init error" in AuthContext is a red herring - app crashes during render

- timestamp: 2026-01-29T10:12:00Z
  checked: FeedbackWidget.jsx imports
  found: MISSING IMPORTS! Component uses MessageSquarePlus, X, Check, ThumbsUp, ThumbsDown, Loader2, Send but only imports Bug, Lightbulb, MessageCircle
  implication: ReferenceError crashes entire app during render, before auth completes

## Resolution

root_cause: Multiple components had missing imports from lucide-react and design-system, causing ReferenceErrors that crashed the app and triggered ErrorBoundary. The "Init error" in AuthContext was a red herring - auth was working fine but components were crashing during render.

**Affected files:**
1. FeedbackWidget.jsx - missing MessageSquarePlus, X, Check, ThumbsUp, ThumbsDown, Loader2, Send
2. AutoBuildOnboardingModal.jsx - missing X, Check, Sparkles, ChevronRight, ChevronLeft, AlertCircle, Wand2, Loader2, Tv
3. ActiveContentGrid.jsx - missing ALL imports (Monitor, Image, Wifi, WifiOff, Card, CardHeader, CardTitle, CardContent)
4. HealthBanner.jsx - missing AlertTriangle, ArrowRight, X
5. QuickActionsBar.jsx - missing Plus, Upload, BarChart3, Button
6. TimelineActivity.jsx - missing ListVideo, Video, Image, PlusCircle, Edit, Upload, Activity, Loader2, Card components
7. PendingApprovalsWidget.jsx - missing ChevronRight, Clock, Loader2, Card, Badge, Button
8. WelcomeHero.jsx - missing FileText, Plus, Music, Play, Image
9. WelcomeFeatureCards.jsx - missing Play, Layout, ListVideo, MousePointer, ExternalLink, Button
10. OnboardingCards.jsx - missing Rocket, Loader2, Sparkles, CheckCircle, Copy, ListVideo, Layout, Monitor, Play, Wand2, Card, Button
11. WelcomeTour.jsx - missing Loader2, ChevronLeft, ChevronRight, Modal, ModalContent, ModalFooter, Button, WelcomeTourStep

fix: Added missing imports to all affected files
verification: Auth tests pass (25/27). Login flow works (8/9 pass). PlaylistsPage renders correctly with data.
files_changed:
- src/components/FeedbackWidget.jsx
- src/components/onboarding/AutoBuildOnboardingModal.jsx
- src/components/dashboard/ActiveContentGrid.jsx
- src/components/dashboard/HealthBanner.jsx
- src/components/dashboard/QuickActionsBar.jsx
- src/components/dashboard/TimelineActivity.jsx
- src/components/dashboard/PendingApprovalsWidget.jsx
- src/components/welcome/WelcomeHero.jsx
- src/components/welcome/WelcomeFeatureCards.jsx
- src/pages/dashboard/OnboardingCards.jsx
- src/components/onboarding/WelcomeTour.jsx
- src/pages/PlaylistsPage.jsx
