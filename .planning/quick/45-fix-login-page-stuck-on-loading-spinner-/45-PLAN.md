---
phase: 45-fix-login-page-stuck-on-loading-spinner
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/router/AppRouter.jsx
autonomous: true
requirements: [FIX-LOGIN-SPINNER]

must_haves:
  truths:
    - "Login page renders the login form immediately even when Supabase is unreachable"
    - "Signup page renders the signup form immediately even when Supabase is unreachable"
    - "Homepage renders immediately even when Supabase is unreachable"
    - "Authenticated users are still redirected away from public/auth pages to /app"
    - "AuthRetryBanner still shows retry status overlay on top of rendered forms"
  artifacts:
    - path: "src/router/AppRouter.jsx"
      provides: "PublicRoute that does not block on auth loading"
      contains: "!loading.*user.*Navigate"
  key_links:
    - from: "src/router/AppRouter.jsx (PublicRoute)"
      to: "src/contexts/AuthContext.jsx (loading, user)"
      via: "useAuth hook"
      pattern: "useAuth.*loading"
---

<objective>
Fix login/signup/reset-password pages getting stuck on an infinite loading spinner when Supabase connection times out.

Purpose: When Supabase is unreachable, the `PublicRoute` wrapper blocks rendering while `loading` remains `true` during retry cycles. Auth pages should render their forms immediately — the auth loading state is irrelevant for pages that don't require authentication.

Output: Updated `PublicRoute` component that renders children during auth loading instead of blocking with a spinner.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/router/AppRouter.jsx
@src/contexts/AuthContext.jsx
@src/components/AuthRetryBanner.jsx

<interfaces>
<!-- From src/contexts/AuthContext.jsx -->
```javascript
// useAuth() returns:
const value = {
  user,              // null | User object
  loading,           // boolean - true during initial auth check + retries
  authStatus,        // 'loading' | 'authenticated' | 'unauthenticated' | 'retrying' | 'error'
  isRetrying,        // boolean - true when retrying after timeout
  hasAuthError,      // boolean - true when all retries exhausted
  retryCount,        // number
  lastError,         // string | null
  retryAuth,         // () => Promise<void> - manual retry
  // ...auth actions
};
```

<!-- From src/router/AppRouter.jsx -->
```javascript
// CURRENT (broken) PublicRoute — blocks on loading:
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LoadingSpinner />;  // BUG: blocks login form during timeout retries
  }
  if (user) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

// Used by: /auth/login, /auth/signup, / (homepage)
// NOT used by: /auth/reset-password, /auth/update-password, /auth/callback, /auth/accept-invite
```
</interfaces>

**Root cause analysis:**
1. `AuthProvider` sets `loading = true` on init and keeps it `true` during retry cycles (line 246: `return;` without `setLoading(false)`)
2. `PublicRoute` checks `if (loading) return <LoadingSpinner />` — this blocks login/signup/homepage rendering
3. `loading` only becomes `false` when auth succeeds OR all retries exhaust (up to ~40 seconds with exponential backoff)
4. During this entire period, the login form is invisible — user sees spinner + "Connection issue. Retrying..." banner
5. The `AuthRetryBanner` renders correctly at the top but the form beneath is replaced by a spinner

**Fix strategy:** `PublicRoute` should render children immediately. It only needs to redirect authenticated users. During `loading`, we don't know if the user is authenticated, so we should optimistically show the public page. If auth eventually resolves with a user, the redirect will happen then.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix PublicRoute to not block on auth loading</name>
  <files>src/router/AppRouter.jsx</files>
  <action>
Modify the `PublicRoute` component (lines 64-77) to stop blocking on the `loading` state. The component should:

1. Remove the `if (loading) return <LoadingSpinner />` block entirely
2. Only redirect when we have a definitive authenticated user: `if (!loading && user)`
3. In all other cases (loading, no user, error), render children immediately

The updated logic should be:

```javascript
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  // Only redirect if auth has resolved AND user is authenticated
  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  // While loading or unauthenticated, show the page content
  // (login form, signup form, homepage, etc.)
  return children;
}
```

This means:
- When Supabase is unreachable: `loading=true`, `user=null` -> renders children (login form appears immediately)
- When auth resolves with no user: `loading=false`, `user=null` -> renders children (login form)
- When auth resolves with user: `loading=false`, `user=User` -> redirects to /app
- The AuthRetryBanner (rendered at AppRouter level, line 97) continues to show the retry/error status overlay independently

Do NOT modify `RequireAuth` — protected routes should still block on loading (they need auth to render).
Do NOT modify `AuthContext.jsx` — the retry logic is correct; only the consumer behavior is wrong.
Do NOT modify any auth page components — they are fine as-is.
  </action>
  <verify>
Run the dev server and verify:
1. `npm run build` succeeds without errors
2. Grep the updated PublicRoute to confirm loading no longer blocks: `grep -A 10 'function PublicRoute' src/router/AppRouter.jsx`
  </verify>
  <done>
- PublicRoute renders children during auth loading instead of showing spinner
- Authenticated users still redirect to /app after auth resolves
- Build passes with no errors
- Only src/router/AppRouter.jsx modified (minimal, targeted fix)
  </done>
</task>

</tasks>

<verification>
1. `npm run build` — confirms no compilation errors
2. Review the PublicRoute change to confirm:
   - No `<LoadingSpinner />` return for loading state
   - Redirect only when `!loading && user` (definitive auth)
   - Children rendered in all other cases
3. The AuthRetryBanner at the AppRouter level will continue to overlay retry status on top of the now-visible forms
</verification>

<success_criteria>
- Login page at /auth/login shows the login form immediately on page load, even when Supabase is unreachable
- Signup page at /auth/signup shows the signup form immediately on page load
- Homepage at / shows marketing content immediately on page load
- When Supabase is unreachable, the AuthRetryBanner shows at top while forms are visible underneath
- When auth eventually resolves with a logged-in user, PublicRoute redirects to /app
- Build succeeds, no regressions to protected routes (RequireAuth unchanged)
</success_criteria>

<output>
After completion, create `.planning/quick/45-fix-login-page-stuck-on-loading-spinner-/45-SUMMARY.md`
</output>
