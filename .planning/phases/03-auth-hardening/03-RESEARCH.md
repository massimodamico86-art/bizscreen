# Phase 3: Auth Hardening - Research

**Researched:** 2026-01-22
**Domain:** Authentication security, password policies, rate limiting
**Confidence:** HIGH

## Summary

This phase implements authentication hardening through password complexity enforcement and API rate limiting. The codebase already has substantial infrastructure in place: a comprehensive `passwordService.js` with validation logic, HIBP breach checking, and a `PasswordStrengthIndicator` component. Additionally, login attempt tracking exists in `login_attempts` table with lockout functionality.

The research identified two distinct implementation paths:
1. **Password Policy**: Leverage existing `passwordService.js` infrastructure but integrate it into auth flows (signup, update password) where it's currently bypassed (forms still use 6-char minimum)
2. **Rate Limiting**: Implement PostgreSQL-based rate limiting for high-frequency API endpoints using the existing login_attempts pattern as a model

**Primary recommendation:** Integrate the existing passwordService validation into all auth forms (SignupPage, UpdatePasswordPage) and add database-level rate limiting functions that can be called from services without requiring external dependencies like Upstash Redis.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.80.0 | Auth provider | Project's auth system |
| PostgreSQL functions | N/A | Server-side validation | Prevents client-side bypass |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| passwordService.js | Internal | Password validation | All password-related operations |
| PasswordStrengthIndicator | Internal | Real-time UI feedback | Signup, password update forms |
| HIBP API | External | Breach checking | Post-validation for security |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PostgreSQL rate limiting | Upstash Redis (@upstash/ratelimit) | Redis requires external service setup and costs; PostgreSQL works with existing infrastructure |
| Custom validation | Supabase dashboard password settings | Dashboard settings are server-side only; need client-side for UX |
| zxcvbn library | Current regex-based rules | zxcvbn adds 400KB bundle; current approach meets requirements |

**Installation:**
No new packages required. Existing infrastructure is sufficient.

## Architecture Patterns

### Existing Project Structure (Relevant Files)
```
src/
  auth/
    SignupPage.jsx           # Needs password validation integration
    UpdatePasswordPage.jsx   # Needs password validation integration
    LoginPage.jsx            # Already has lockout integration
  services/
    authService.js           # Core auth functions, has lockout integration
    passwordService.js       # COMPLETE - validation logic exists
  components/
    security/
      PasswordStrengthIndicator.jsx  # COMPLETE - UI component exists
supabase/
  migrations/
    103_login_attempt_lockout.sql    # Existing lockout infrastructure
```

### Pattern 1: Validation Layer Architecture
**What:** Client-side validation for UX, server-side enforcement for security
**When to use:** All password-setting operations
**Example:**
```javascript
// Source: Existing pattern from src/services/passwordService.js
import { validatePassword, validatePasswordFull } from './passwordService';

// In SignupPage.jsx - integrate before calling supabase.auth.signUp
const validation = validatePassword(password, email);
if (!validation.valid) {
  setError(validation.errors.join('. '));
  return;
}

// Optionally check breaches (async)
const fullValidation = await validatePasswordFull(password, email, true);
if (!fullValidation.valid) {
  setError(fullValidation.errors.join('. '));
  return;
}
```

### Pattern 2: Database Rate Limiting Function
**What:** PostgreSQL function to check and enforce rate limits
**When to use:** High-frequency API endpoints
**Example:**
```sql
-- Source: Adapted from existing login_attempts pattern in codebase
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,        -- user_id, IP, or composite
  p_action text,            -- 'media_upload', 'api_call', etc.
  p_max_requests integer,   -- e.g., 100
  p_window_minutes integer  -- e.g., 15
)
RETURNS jsonb AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz := now() - (p_window_minutes || ' minutes')::interval;
BEGIN
  -- Count recent requests
  SELECT COUNT(*) INTO v_count
  FROM api_rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > v_window_start;

  IF v_count >= p_max_requests THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'retry_after_seconds', EXTRACT(EPOCH FROM (
        (SELECT MIN(created_at) FROM api_rate_limits
         WHERE identifier = p_identifier AND action = p_action
         AND created_at > v_window_start) + (p_window_minutes || ' minutes')::interval - now()
      ))
    );
  END IF;

  -- Record this request
  INSERT INTO api_rate_limits (identifier, action, created_at)
  VALUES (p_identifier, p_action, now());

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count + 1,
    'remaining', p_max_requests - v_count - 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 3: Service-Level Rate Limit Integration
**What:** JavaScript service wrapper for rate limit checks
**When to use:** In service files before expensive operations
**Example:**
```javascript
// Source: Pattern for frontend services
export async function uploadMedia(file) {
  const userId = (await supabase.auth.getUser()).data?.user?.id;

  // Check rate limit before proceeding
  const { data: rateCheck } = await supabase.rpc('check_rate_limit', {
    p_identifier: userId,
    p_action: 'media_upload',
    p_max_requests: 50,
    p_window_minutes: 15
  });

  if (!rateCheck.allowed) {
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(rateCheck.retry_after_seconds / 60)} minutes.`);
  }

  // Proceed with upload...
}
```

### Anti-Patterns to Avoid
- **Client-only validation:** Never trust client-side validation alone; always validate server-side
- **Hardcoded limits in frontend:** Store rate limits in configuration or database
- **Blocking on rate limit check failure:** Fail open if rate limit check errors (log and continue)
- **Revealing limit details to attackers:** Use generic error messages, don't expose thresholds

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password strength checking | Custom regex rules | Existing `passwordService.js` | Already handles edge cases, sequential chars, common passwords |
| Breach checking | Custom API integration | Existing `checkPasswordBreach()` | Uses k-anonymity, handles errors gracefully |
| Password UI feedback | Custom strength meter | `PasswordStrengthIndicator` component | Complete with debounced breach check |
| Login lockout | New implementation | Existing `login_attempts` table + functions | Already integrated with authService |
| Sequential char detection | Regex patterns | `hasSequentialChars()` in passwordService | Checks keyboard patterns (qwerty, etc.) |

**Key insight:** The codebase already has 90% of password validation infrastructure. The gap is only integration into auth forms.

## Common Pitfalls

### Pitfall 1: Client-Server Validation Mismatch
**What goes wrong:** Client validates with stricter rules than Supabase accepts, or vice versa
**Why it happens:** Supabase dashboard has its own password settings that might differ from client code
**How to avoid:** Configure Supabase dashboard to match `passwordService.js` rules (8 char min, uppercase+lowercase+digit+symbol required)
**Warning signs:** Users can bypass validation by calling API directly

### Pitfall 2: Rate Limit Race Conditions
**What goes wrong:** Two requests check limit simultaneously, both proceed, both should have been blocked
**Why it happens:** Check and increment are separate operations
**How to avoid:** Use atomic operations or advisory locks in PostgreSQL
**Warning signs:** Limits exceeded by small amounts, inconsistent blocking

### Pitfall 3: Blocking Legitimate Users on External Service Failure
**What goes wrong:** HIBP API is down, users can't set any password
**Why it happens:** Not handling external service failures gracefully
**How to avoid:** Existing `checkPasswordBreach()` already fails open; maintain this pattern
**Warning signs:** User complaints during third-party outages

### Pitfall 4: Revealing Rate Limit Information
**What goes wrong:** Error messages reveal exact limits, enabling attackers to optimize abuse
**Why it happens:** Developer-friendly error messages
**How to avoid:** Use generic "Too many requests" message; only log details server-side
**Warning signs:** Error messages like "You have 3 requests remaining"

### Pitfall 5: Forgetting Password Update Flows
**What goes wrong:** Password validation enforced on signup but not on password reset/change
**Why it happens:** Multiple entry points for password setting
**How to avoid:** Audit all password-setting locations: SignupPage, UpdatePasswordPage, any admin password reset
**Warning signs:** Users setting weak passwords through reset flow

## Code Examples

Verified patterns from official sources and existing codebase:

### Password Validation Integration
```javascript
// Source: Existing passwordService.js API
import { validatePassword } from '../services/passwordService';

// Validate before submission
const handleSubmit = async (e) => {
  e.preventDefault();

  const validation = validatePassword(password, email);
  if (!validation.valid) {
    setError(validation.errors[0]); // Show first error
    return;
  }

  // Proceed with Supabase auth call...
};
```

### PasswordStrengthIndicator Usage
```jsx
// Source: Existing component in src/components/security/
import PasswordStrengthIndicator from '../components/security/PasswordStrengthIndicator';

<div>
  <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
  />
  <PasswordStrengthIndicator
    password={password}
    email={email}
    checkBreaches={true}
    showRequirements={true}
    onValidationChange={(result) => setIsPasswordValid(result.valid)}
  />
</div>
```

### Rate Limit Table Schema
```sql
-- Source: Adapted from existing login_attempts pattern
CREATE TABLE api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,       -- user_id or IP address
  action text NOT NULL,           -- 'media_upload', 'scene_create', etc.
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup
  ON api_rate_limits (identifier, action, created_at DESC);

-- Cleanup old records (call from cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS integer AS $$
DECLARE deleted int;
BEGIN
  DELETE FROM api_rate_limits
  WHERE created_at < now() - interval '1 day';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;
```

### HTTP 429 Response Pattern
```javascript
// Source: Standard HTTP practice + Supabase patterns
// In service function
if (!rateCheck.allowed) {
  const error = new Error('Too many requests. Please try again later.');
  error.code = 'RATE_LIMIT_EXCEEDED';
  error.retryAfter = rateCheck.retry_after_seconds;
  throw error;
}

// In component error handling
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  setError(`Too many requests. Please wait ${Math.ceil(error.retryAfter / 60)} minutes.`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 6-char passwords | 8+ with complexity | Industry standard | Prevents dictionary attacks |
| No breach checking | HIBP API integration | 2019+ | Blocks known compromised passwords |
| Fixed rate limits | Per-user + per-IP | Modern best practice | Fairness for legitimate users |
| Sliding window only | Fixed window (per requirements) | N/A | Simpler to reason about, specified in CONTEXT.md |

**Deprecated/outdated:**
- MD5/SHA1 password hashing: Supabase uses bcrypt (handled automatically)
- Global rate limits only: Modern approach is per-user with per-IP fallback

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Server-Side Enforcement**
   - What we know: Supabase dashboard has password policy settings that work server-side
   - What's unclear: Whether dashboard settings need to be configured to match client validation
   - Recommendation: Configure Supabase dashboard settings to match `passwordService.js` requirements as defense-in-depth

2. **Rate Limit Endpoint Selection**
   - What we know: Need to rate limit "high-frequency endpoints"
   - What's unclear: Exactly which endpoints are high-frequency in this application
   - Recommendation: Start with media upload, scene creation, and any AI-powered features

3. **Authenticated vs Anonymous Limits**
   - What we know: CONTEXT.md leaves this as Claude's discretion
   - What's unclear: Whether anonymous users (pre-login) need different limits
   - Recommendation: Give authenticated users higher limits (e.g., 2x) since they're accountable

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/services/passwordService.js` - Complete password validation implementation
- Existing codebase: `src/components/security/PasswordStrengthIndicator.jsx` - UI component
- Existing codebase: `supabase/migrations/103_login_attempt_lockout.sql` - Login lockout pattern
- [Supabase Password Security Docs](https://supabase.com/docs/guides/auth/password-security) - Configuration options

### Secondary (MEDIUM confidence)
- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) - Default auth limits
- [Neon Rate Limiting Guide](https://neon.com/guides/rate-limiting) - PostgreSQL rate limiting patterns
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3) - Breach checking reference

### Tertiary (LOW confidence)
- [Upstash Ratelimit Docs](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) - Alternative approach (not recommended for this project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase infrastructure
- Architecture: HIGH - Patterns already proven in codebase (login_attempts)
- Pitfalls: HIGH - Common security issues well-documented
- Rate limiting thresholds: MEDIUM - Specific numbers are discretionary

**Research date:** 2026-01-22
**Valid until:** 60 days (stable security patterns)

---

## Implementation Recommendations (Claude's Discretion Items)

Based on research and security best practices:

### Password Complexity
- **Special characters:** YES, require them (already in passwordService)
- **Common password blocklist:** YES, already implemented (top ~30 passwords)
- **Error message format:** Use checklist format with `PasswordStrengthIndicator` for real-time feedback

### Rate Limiting
- **Endpoints to rate limit:** media_upload (50/15min), scene_create (30/15min), ai_generation (20/15min)
- **Authenticated vs anonymous:** Authenticated users get 2x limits
- **Response format:** Include `Retry-After` header with seconds until reset
- **Dimension revelation:** Do NOT reveal whether IP or user triggered limit (security through obscurity)

### Lockout Behavior
- **Account lockout:** Already implemented (5 failures, 15 min lockout)
- **Warning messages:** Already showing remaining attempts when < 3 left
- **CAPTCHA:** Not recommended for this phase (adds complexity, login lockout is sufficient)
