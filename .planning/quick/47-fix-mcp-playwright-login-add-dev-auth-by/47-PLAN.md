---
phase: quick-47
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/contexts/AuthContext.jsx
  - src/auth/LoginPage.jsx
autonomous: true
requirements: [DEV-AUTH-BYPASS]

must_haves:
  truths:
    - "When VITE_DEV_BYPASS_AUTH=true and DEV mode, app skips Supabase auth and immediately provides a fake authenticated session"
    - "The fake user object matches Supabase user shape (id, email, user_metadata, etc.)"
    - "LoginPage auto-redirects to /app when bypass is active"
    - "When VITE_DEV_BYPASS_AUTH is not set or false, auth works normally via Supabase"
    - "Bypass is double-gated: only works when both VITE_DEV_BYPASS_AUTH=true AND import.meta.env.DEV is true"
  artifacts:
    - path: "src/contexts/AuthContext.jsx"
      provides: "Dev auth bypass in AuthProvider initialization"
      contains: "VITE_DEV_BYPASS_AUTH"
    - path: "src/auth/LoginPage.jsx"
      provides: "Auto-redirect when bypass active"
      contains: "VITE_DEV_BYPASS_AUTH"
  key_links:
    - from: "src/contexts/AuthContext.jsx"
      to: "RequireAuth in AppRouter.jsx"
      via: "user state is set to mock user, so RequireAuth passes"
      pattern: "setUser.*DEV_MOCK_USER"
    - from: "src/auth/LoginPage.jsx"
      to: "/app route"
      via: "useEffect redirect when bypass detected"
      pattern: "navigate.*app"
---

<objective>
Add a dev auth bypass mode to skip Supabase authentication when VITE_DEV_BYPASS_AUTH=true is set in .env.local and the app is running in dev mode. This allows MCP Playwright browser automation and local development to work without Docker/Supabase running.

Purpose: MCP Playwright and local dev cannot authenticate against Supabase when it is not running. This bypass creates a fake authenticated session so the full app UI is accessible for testing and automation.

Output: Modified AuthContext.jsx with bypass logic, modified LoginPage.jsx with auto-redirect.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/contexts/AuthContext.jsx
@src/auth/LoginPage.jsx
@src/router/AppRouter.jsx
@.env.local

<interfaces>
<!-- Key types and contracts the executor needs. -->

From src/contexts/AuthContext.jsx (AuthProvider state shape):
```javascript
// The value exposed by AuthContext - bypass must satisfy all these fields:
const value = {
  user,                    // Supabase User object or null
  userProfile,             // { id, email, full_name, role, has_completed_onboarding, tenant_id } or null
  loading,                 // boolean - false when auth resolved
  authStatus,              // 'loading' | 'authenticated' | 'unauthenticated' | 'retrying' | 'error'
  retryCount,              // number
  lastError,               // string or null
  retryAuth,               // () => Promise<void>
  isRetrying,              // boolean
  hasAuthError,            // boolean
  isSuperAdmin,            // boolean
  isAdmin,                 // boolean
  isClient,                // boolean
  signUp, signIn, signOut, resetPassword, updatePassword, signInWithGoogle,
  resendVerificationEmail, refreshProfile,
};
```

From src/router/AppRouter.jsx (RequireAuth gate):
```javascript
// RequireAuth checks user and loading from useAuth()
// If loading=true -> spinner. If user=null -> redirect to /auth/login.
// Bypass must set user to truthy value and loading to false.
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth/login" replace />;
  return children;
}

// PublicRoute redirects to /app if user is set and not loading
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;
  return children;
}
```

From .env.local (test credentials to use as mock user):
```
TEST_USER_EMAIL=client@bizscreen.test
TEST_USER_PASSWORD=TestClient123!
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add dev auth bypass to AuthContext.jsx</name>
  <files>src/contexts/AuthContext.jsx</files>
  <action>
At the top of AuthContext.jsx, after imports, add a constant for detecting dev bypass mode:

```javascript
// Dev auth bypass: skip Supabase when VITE_DEV_BYPASS_AUTH=true in dev mode
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
```

Create a mock user object that matches the Supabase User shape. Place it right after DEV_AUTH_BYPASS:

```javascript
const DEV_MOCK_USER = DEV_AUTH_BYPASS ? {
  id: '00000000-0000-0000-0000-000000000000',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'client@bizscreen.test',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Dev Bypass User' },
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} : null;

const DEV_MOCK_PROFILE = DEV_AUTH_BYPASS ? {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'client@bizscreen.test',
  full_name: 'Dev Bypass User',
  role: 'client',
  has_completed_onboarding: true,
  tenant_id: '00000000-0000-0000-0000-000000000001',
} : null;
```

In the `useEffect` inside `AuthProvider` (the one that calls `initAuth()`), add a bypass check at the very start of the effect, BEFORE the `initAuth` function definition. This early-returns from the effect entirely:

```javascript
useEffect(() => {
  log.debug('Initializing auth');

  // DEV BYPASS: Skip all Supabase auth, use mock user immediately
  if (DEV_AUTH_BYPASS) {
    log.debug('DEV AUTH BYPASS ACTIVE — using mock user, skipping Supabase');
    setUser(DEV_MOCK_USER);
    setUserProfile(DEV_MOCK_PROFILE);
    setAuthStatus(AUTH_STATUS.AUTHENTICATED);
    setLoading(false);
    setRetryCount(0);
    setLastError(null);
    return () => {}; // No cleanup needed — no subscription created
  }

  // ... rest of existing initAuth logic unchanged ...
```

Also update the `signIn` method to handle bypass mode — when bypass is active, just set the mock user without calling Supabase:

No changes needed to signIn/signOut/etc. since LoginPage will redirect before those are called. The signOut method should still work (it will call supabase.auth.signOut which may fail but we don't care in bypass mode).

Add a console.warn at module level when bypass is active so it is obvious in the browser console:

```javascript
if (DEV_AUTH_BYPASS) {
  console.warn('[AuthContext] DEV AUTH BYPASS ACTIVE — using mock user, Supabase auth skipped');
}
```
  </action>
  <verify>Run `grep -n 'DEV_AUTH_BYPASS' src/contexts/AuthContext.jsx` and confirm the bypass constant, mock user, and early-return in useEffect are present. Run `npm run build 2>&1 | head -20` to confirm no build errors (note: build may warn about env vars but should not error on the bypass code itself). Alternatively run `npx vite build --mode development 2>&1 | tail -5` or just check syntax with a quick parse.</verify>
  <done>AuthContext.jsx contains: (1) DEV_AUTH_BYPASS constant gated on both DEV and VITE_DEV_BYPASS_AUTH, (2) DEV_MOCK_USER with realistic Supabase user shape, (3) DEV_MOCK_PROFILE with client role, (4) early-return in useEffect that sets mock user/profile and skips Supabase entirely, (5) console.warn at module level when bypass active.</done>
</task>

<task type="auto">
  <name>Task 2: Add auto-redirect on LoginPage when bypass active</name>
  <files>src/auth/LoginPage.jsx</files>
  <action>
In LoginPage.jsx, add a useEffect that detects dev bypass mode and auto-redirects to /app. This handles the case where someone navigates directly to /auth/login while bypass is active.

Add `useEffect` to the existing React import (it is not currently imported). Then add the bypass check:

```javascript
import { useState, useEffect } from 'react';
```

Inside the `LoginPage` component function, before the `handleSubmit` definition, add:

```javascript
// Dev bypass: auto-redirect to app when auth bypass is active
const devBypass = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
useEffect(() => {
  if (devBypass) {
    navigate('/app');
  }
}, [devBypass, navigate]);
```

NOTE: The PublicRoute wrapper in AppRouter.jsx will also redirect since it checks `!loading && user`. Once AuthContext sets the mock user (loading=false, user=DEV_MOCK_USER), PublicRoute will redirect to /app. So this useEffect is a belt-and-suspenders approach ensuring the redirect happens even if there is a timing edge case. Both mechanisms cooperate — PublicRoute checks auth context state, this useEffect checks the env var directly.

Do NOT add the VITE_DEV_BYPASS_AUTH=true to .env.local yet — the user will add it when they want to activate bypass mode. The feature is off by default.
  </action>
  <verify>Run `grep -n 'VITE_DEV_BYPASS_AUTH\|devBypass' src/auth/LoginPage.jsx` and confirm the bypass detection and useEffect redirect are present. Confirm `useEffect` is in the React import statement.</verify>
  <done>LoginPage.jsx contains: (1) useEffect added to React import, (2) devBypass const checking both DEV and VITE_DEV_BYPASS_AUTH, (3) useEffect that calls navigate('/app') when bypass is active. The login page will not render its form when bypass mode is on — it immediately navigates away.</done>
</task>

</tasks>

<verification>
After both tasks complete:

1. Check that the bypass is properly double-gated:
   - `grep 'import.meta.env.DEV' src/contexts/AuthContext.jsx` shows the DEV gate
   - `grep 'VITE_DEV_BYPASS_AUTH' src/contexts/AuthContext.jsx` shows the env var gate

2. Check the mock user shape has required fields:
   - `grep -A5 'DEV_MOCK_USER' src/contexts/AuthContext.jsx` shows id, email, user_metadata

3. Check that no production code paths are affected:
   - The bypass only activates when BOTH conditions are true (DEV mode AND env var set)
   - When bypass is inactive, all code paths are identical to before

4. Verify build does not break:
   - `npx vite build 2>&1 | tail -3` should succeed (bypass code is tree-shaken in production since import.meta.env.DEV is false)

5. To test the bypass manually:
   - Add `VITE_DEV_BYPASS_AUTH=true` to .env.local
   - Run `npm run dev`
   - Navigate to http://localhost:5173 — should auto-redirect to /app with mock user
   - Check browser console for "[AuthContext] DEV AUTH BYPASS ACTIVE" message
</verification>

<success_criteria>
- AuthContext provides a fake authenticated session when VITE_DEV_BYPASS_AUTH=true and DEV mode
- Mock user has realistic Supabase user shape (id, email, user_metadata, etc.)
- Mock profile has client role with has_completed_onboarding=true (skips onboarding flow)
- LoginPage auto-redirects to /app when bypass is active
- Bypass is completely inert when env var is not set or in production builds
- No existing auth behavior is changed when bypass is inactive
</success_criteria>

<output>
After completion, create `.planning/quick/47-fix-mcp-playwright-login-add-dev-auth-by/47-SUMMARY.md`
</output>
