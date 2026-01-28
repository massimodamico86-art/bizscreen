---
type: quick
id: 001-fix-login-error-after-credentials
wave: 1
autonomous: true
files_modified:
  - src/components/security/MfaVerification.jsx
---

<objective>
Fix login error that occurs after entering credentials.

Purpose: User reports login fails with an error after entering username and password. Investigation reveals the MfaVerification component is missing required imports (Key, Shield, AlertCircle, Loader2 from lucide-react, and Button from design system), which causes a runtime error when the login flow triggers MFA verification.

Output: Working login flow where MFA verification (if required) renders correctly without missing component errors.
</objective>

<context>
@src/auth/LoginPage.jsx - The login page that uses authService.signIn() and checks isMfaRequired()
@src/components/security/MfaVerification.jsx - Missing imports for Key, Shield, AlertCircle, Loader2, Button
@src/services/authService.js - signIn function with lockout checking (works correctly)
@src/services/mfaService.js - isMfaRequired() check (works correctly)
</context>

<root_cause>
The `MfaVerification.jsx` component references these components but does not import them:
- `Key` (lucide-react)
- `Shield` (lucide-react)
- `AlertCircle` (lucide-react)
- `Loader2` (lucide-react)
- `Button` (design-system/Button)

When a user with MFA enabled logs in, LoginPage.jsx calls `isMfaRequired()`, gets `true`, and attempts to render `MfaVerification`. At that point, React throws a reference error because these components are undefined.
</root_cause>

<tasks>

<task type="auto">
  <name>Task 1: Add missing imports to MfaVerification component</name>
  <files>src/components/security/MfaVerification.jsx</files>
  <action>
Add the missing imports to MfaVerification.jsx:

1. Add lucide-react imports:
```javascript
import { Key, Shield, AlertCircle, Loader2 } from 'lucide-react';
```

2. Add Button import from design-system:
```javascript
import { Button } from '../design-system/Button';
```

Place these imports after the existing useState and service imports.
  </action>
  <verify>
Run ESLint to confirm no undefined variable errors:
```bash
npx eslint src/components/security/MfaVerification.jsx
```

Start dev server and navigate to /auth/login - should load without console errors.
  </verify>
  <done>MfaVerification component has all required imports and renders without errors.</done>
</task>

<task type="auto">
  <name>Task 2: Verify login flow works end-to-end</name>
  <files>None (verification only)</files>
  <action>
Test the complete login flow:

1. Start the dev server: `npm run dev`
2. Navigate to /auth/login
3. Enter test credentials
4. Confirm no errors in browser console during login attempt
5. If MFA is enabled for test account, verify MFA verification screen renders correctly
6. If MFA is not enabled, verify redirect to /app works

If Supabase returns auth errors (wrong credentials), that's expected behavior - verify the error message displays correctly in the red error box.
  </action>
  <verify>
Browser console shows no React errors about undefined components.
Login page displays and submits without crashing.
Error messages (if any) are auth-related, not component rendering errors.
  </verify>
  <done>Login flow completes without component rendering errors. Any errors shown are legitimate auth errors (invalid credentials, etc.).</done>
</task>

</tasks>

<verification>
- [ ] `npx eslint src/components/security/MfaVerification.jsx` shows no errors (warnings OK)
- [ ] Dev server starts without build errors
- [ ] /auth/login page loads without console errors
- [ ] Entering credentials and submitting does not crash with undefined component error
</verification>

<success_criteria>
- MfaVerification.jsx has all required imports
- Login flow works without React reference errors
- User can attempt login and see appropriate success/error feedback
</success_criteria>

<output>
After completion, update this plan with resolution notes or create a brief summary in the same directory.
</output>
