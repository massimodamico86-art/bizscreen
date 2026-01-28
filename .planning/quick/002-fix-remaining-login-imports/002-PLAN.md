---
task: 002-fix-remaining-login-imports
type: quick
created: 2025-01-28
estimated_context: 25%
---

<objective>
Fix all missing imports in auth-related files that could cause login failures.

Purpose: The v2.1 tech debt cleanup accidentally removed needed imports from multiple auth and security files. These missing imports cause runtime errors when components try to use undefined functions/components.

Output: All auth-related files have correct imports and login flow works without errors.
</objective>

<context>
@src/auth/SignupPage.jsx
@src/auth/ResetPasswordPage.jsx
@src/auth/UpdatePasswordPage.jsx
@src/auth/AcceptInvitePage.jsx
@src/auth/AuthCallbackPage.jsx
@src/components/security/TwoFactorSetup.jsx
@src/components/security/PasswordStrengthIndicator.jsx
@src/components/security/LoginHistory.jsx
@src/components/security/SessionManagement.jsx
@src/App.jsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix auth page imports (SignupPage, ResetPasswordPage, UpdatePasswordPage)</name>
  <files>
    src/auth/SignupPage.jsx
    src/auth/ResetPasswordPage.jsx
    src/auth/UpdatePasswordPage.jsx
  </files>
  <action>
Add missing imports to each file:

**SignupPage.jsx** - Add these imports:
```javascript
import { Link } from 'react-router-dom';
import { User, Building2, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import Seo from '../components/Seo';
import PasswordStrengthIndicator from '../components/security/PasswordStrengthIndicator';
```

**ResetPasswordPage.jsx** - Add these imports:
```javascript
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import AuthLayout from './AuthLayout';
```

**UpdatePasswordPage.jsx** - Add these imports:
```javascript
import { Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import PasswordStrengthIndicator from '../components/security/PasswordStrengthIndicator';
```
  </action>
  <verify>Run `npm run lint -- src/auth/SignupPage.jsx src/auth/ResetPasswordPage.jsx src/auth/UpdatePasswordPage.jsx` - no "is not defined" errors</verify>
  <done>All three auth pages have complete imports with no undefined references</done>
</task>

<task type="auto">
  <name>Task 2: Fix AcceptInvitePage and AuthCallbackPage imports</name>
  <files>
    src/auth/AcceptInvitePage.jsx
    src/auth/AuthCallbackPage.jsx
  </files>
  <action>
Add missing imports to each file:

**AcceptInvitePage.jsx** - Add these imports:
```javascript
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, Users, LogIn, ArrowRight } from 'lucide-react';
import AuthLayout from './AuthLayout';
```

**AuthCallbackPage.jsx** - Add these imports:
```javascript
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
```
  </action>
  <verify>Run `npm run lint -- src/auth/AcceptInvitePage.jsx src/auth/AuthCallbackPage.jsx` - no "is not defined" errors</verify>
  <done>AcceptInvitePage and AuthCallbackPage have complete imports</done>
</task>

<task type="auto">
  <name>Task 3: Fix security component imports (TwoFactorSetup, PasswordStrengthIndicator, LoginHistory, SessionManagement)</name>
  <files>
    src/components/security/TwoFactorSetup.jsx
    src/components/security/PasswordStrengthIndicator.jsx
    src/components/security/LoginHistory.jsx
    src/components/security/SessionManagement.jsx
  </files>
  <action>
Add missing imports to each file:

**TwoFactorSetup.jsx** - Add these imports:
```javascript
import { Loader2, Shield, ShieldCheck, ShieldOff, AlertCircle, Key, Check, Copy } from 'lucide-react';
import { Button } from '../../design-system';
```

**PasswordStrengthIndicator.jsx** - Add these imports:
```javascript
import { Loader2, AlertTriangle, Check, X } from 'lucide-react';
```

**LoginHistory.jsx** - Add these imports:
```javascript
import { Loader2, History, AlertCircle, CheckCircle, XCircle, Shield, Smartphone, Tablet, Monitor, MapPin } from 'lucide-react';
import { Button } from '../../design-system';
```

**SessionManagement.jsx** - Add these imports:
```javascript
import { Loader2, Shield, AlertCircle, Smartphone, Tablet, Monitor, Clock, MapPin, LogOut } from 'lucide-react';
import { Button } from '../../design-system';
```
  </action>
  <verify>Run `npm run lint -- src/components/security/TwoFactorSetup.jsx src/components/security/PasswordStrengthIndicator.jsx src/components/security/LoginHistory.jsx src/components/security/SessionManagement.jsx` - no "is not defined" errors</verify>
  <done>All four security components have complete imports</done>
</task>

<task type="auto">
  <name>Task 4: Fix App.jsx imports</name>
  <files>src/App.jsx</files>
  <action>
Add missing imports to App.jsx. Check existing imports first and only add what's missing:

```javascript
// Components likely missing (verify each before adding):
import LoginPage from './auth/LoginPage';
import { EmergencyProvider } from './contexts/EmergencyContext';
import EmergencyBanner from './components/EmergencyBanner';
import AnnouncementBanner from './components/AnnouncementBanner';
import Header from './components/Header';
import MobileNav from './components/MobileNav';
import Toast from './components/Toast';
import FeedbackWidget from './components/FeedbackWidget';
import AutoBuildOnboardingModal from './components/onboarding/AutoBuildOnboardingModal';
import { FeatureGate, FeatureUpgradePrompt } from './components/FeatureGate';

// Lucide icons likely missing:
import { ChevronDown, UserCheck, X, HelpCircle, Menu } from 'lucide-react';
```

Note: Some may already be imported - check existing import block before adding duplicates.
  </action>
  <verify>Run `npm run lint -- src/App.jsx` - no "is not defined" errors</verify>
  <done>App.jsx has complete imports for all used components and icons</done>
</task>

</tasks>

<verification>
1. All files pass linting without "X is not defined" errors
2. App starts without import-related runtime errors: `npm run dev`
3. Login page renders correctly
4. After login, main app renders without component errors
</verification>

<success_criteria>
- All 10 files have correct imports
- No "is not defined" errors in linting
- Login flow works end-to-end
- No console errors related to undefined components
</success_criteria>
