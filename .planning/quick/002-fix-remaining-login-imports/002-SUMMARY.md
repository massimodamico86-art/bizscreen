---
task: 002-fix-remaining-login-imports
type: quick
status: complete
completed: 2026-01-28
duration: 4m 19s
commits: 5
files_modified: 10
---

# Quick Task 002: Fix Remaining Login Imports

**One-liner:** Restored missing lucide-react icons, AuthLayout, and component imports across 10 auth/security files

## What Was Done

Fixed all missing imports in auth-related and security files that were accidentally removed during v2.1 tech debt cleanup. These missing imports would cause runtime errors when components tried to use undefined functions/components.

### Task 1: Fix auth page imports (76224ec)
- **SignupPage.jsx**: Added Link, lucide icons (User, Building2, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle), AuthLayout, Seo, PasswordStrengthIndicator
- **ResetPasswordPage.jsx**: Added Link, lucide icons (Mail, Loader2, CheckCircle, ArrowLeft), AuthLayout
- **UpdatePasswordPage.jsx**: Added Link, lucide icons (Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle), AuthLayout, PasswordStrengthIndicator

### Task 2: Fix AcceptInvitePage and AuthCallbackPage (2093d06)
- **AcceptInvitePage.jsx**: Added Link, lucide icons (Loader2, AlertCircle, CheckCircle, Users, LogIn, ArrowRight), AuthLayout
- **AuthCallbackPage.jsx**: Added lucide icons (Loader2, CheckCircle, AlertCircle), AuthLayout

### Task 3: Fix security component imports (44cf0de)
- **TwoFactorSetup.jsx**: Added lucide icons (Loader2, Shield, ShieldCheck, ShieldOff, AlertCircle, Key, Check, Copy), Button from design-system
- **PasswordStrengthIndicator.jsx**: Added lucide icons (Loader2, AlertTriangle, Check, X)
- **LoginHistory.jsx**: Added lucide icons (Loader2, History, AlertCircle, CheckCircle, XCircle, Shield, Smartphone, Tablet, Monitor, MapPin), Button from design-system
- **SessionManagement.jsx**: Added lucide icons (Loader2, Shield, AlertCircle, Smartphone, Tablet, Monitor, Clock, MapPin, LogOut), Button from design-system

### Task 4: Fix App.jsx imports (6679129, 29bcc3e)
- Added lucide icons: ChevronDown, UserCheck, X, HelpCircle, Menu
- Added EmergencyProvider from EmergencyContext
- Added LoginPage, EmergencyBanner, AnnouncementBanner, Header, MobileNav
- Added Toast, FeedbackWidget, AutoBuildOnboardingModal
- Added FeatureGate, FeatureUpgradePrompt
- Corrected paths: EmergencyBanner (campaigns/), Header (layout/), MobileNav (layout/)

## Commits

| Hash | Description |
|------|-------------|
| 76224ec | fix(002): restore missing imports to auth pages |
| 2093d06 | fix(002): restore missing imports to AcceptInvitePage and AuthCallbackPage |
| 44cf0de | fix(002): restore missing imports to security components |
| 6679129 | fix(002): restore missing imports to App.jsx |
| 29bcc3e | fix(002): correct import paths in App.jsx |

## Files Modified

1. src/auth/SignupPage.jsx
2. src/auth/ResetPasswordPage.jsx
3. src/auth/UpdatePasswordPage.jsx
4. src/auth/AcceptInvitePage.jsx
5. src/auth/AuthCallbackPage.jsx
6. src/components/security/TwoFactorSetup.jsx
7. src/components/security/PasswordStrengthIndicator.jsx
8. src/components/security/LoginHistory.jsx
9. src/components/security/SessionManagement.jsx
10. src/App.jsx

## Verification

- All 10 files pass ESLint with no "is not defined" errors
- No import-related linting warnings
- All component/icon references now have corresponding imports

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- Build fails due to a separate preexisting issue in DashboardPage.jsx (WelcomeModal export) - not related to this task
- Some preexisting "logger is not defined" warnings exist in other files - not in scope for this task
