# BizScreen Security Audit Report

Phase 23 - Production Hardening Security Review

## API Route Security Audit

### Authentication Methods

| Route Pattern | Auth Method | Notes |
|--------------|-------------|-------|
| `/api/billing/*` | Supabase JWT | User session required |
| `/api/admin/*` | Supabase JWT + Role | Requires admin role |
| `/api/public/*` | API Token | Uses `biz_` prefixed tokens with scopes |
| `/api/screens/pair` | None (public) | Rate limited, validates pairing code |
| `/api/screens/heartbeat` | Device API Key | Screen-specific auth |
| `/api/health/*` | None (public) | Rate limited, no sensitive data |
| `/api/webhooks/dispatch` | Internal only | Cron job, no external access |

### Security Controls in Place

#### 1. Tenant Isolation

All database queries use Supabase RLS (Row Level Security) policies:

```sql
-- Example RLS policy (all tables follow this pattern)
CREATE POLICY "Users can only see their own tenant data"
ON playlists FOR SELECT
USING (owner_id = auth.uid());
```

**Verified Tables:**
- ✅ `playlists` - RLS enabled
- ✅ `playlist_items` - RLS enabled
- ✅ `layouts` - RLS enabled
- ✅ `layout_zones` - RLS enabled
- ✅ `media_assets` - RLS enabled
- ✅ `screens` - RLS enabled (via tv_devices)
- ✅ `campaigns` - RLS enabled
- ✅ `schedules` - RLS enabled
- ✅ `api_tokens` - RLS enabled
- ✅ `webhooks` - RLS enabled

#### 2. API Token Security

- Tokens are hashed with HMAC-SHA256 before storage
- Only hash is stored in database, raw token never persisted
- Tokens include scope restrictions (e.g., `apps:read`, `playlists:write`)
- Token validation via RPC function prevents timing attacks

```javascript
// Token format: biz_{64_hex_chars}
const raw = 'biz_abc123...';
const hash = hashToken(raw);  // SHA-256 hash stored in DB
```

#### 3. Rate Limiting

Rate limits configured in `api/lib/rateLimit.js`:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public endpoints | 60/min | 1 minute |
| Authenticated | 120/min | 1 minute |
| Telemetry | 300/min | 1 minute |
| Sensitive (login) | 10/15min | 15 minutes |
| Webhooks | 100/min | 1 minute |

#### 4. Input Validation

All API routes validate:
- Request method (GET, POST, etc.)
- Required parameters
- Parameter types and formats
- UUID format for IDs
- String length limits

Example:
```javascript
// Pairing code validation
const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
if (cleanCode.length !== 6) {
  return res.status(400).json({ error: 'Invalid pairing code format' });
}
```

#### 5. Security Headers

Configured in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### Sensitive Data Handling

#### 1. Secrets Never Logged

Logger sanitizes sensitive data:
- API keys (show only prefix)
- Passwords (never logged)
- JWTs (truncated in logs)
- Service role keys (never exposed)

#### 2. Error Messages

Production errors don't expose internals:
```javascript
const message = env === ENV_PRODUCTION && statusCode === 500
  ? 'Internal server error'
  : error.message || 'An error occurred';
```

#### 3. Environment Variable Security

Required variables validated at startup:
- `SUPABASE_SERVICE_ROLE_KEY` - Never exposed to client
- `STRIPE_SECRET_KEY` - Server-side only
- `STRIPE_WEBHOOK_SECRET` - Webhook verification
- `API_TOKEN_SECRET` - Token hashing

### Webhook Security

Stripe webhooks verified with signature:
```javascript
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### CORS Configuration

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, stripe-signature, x-request-id, x-device-id"
}
```

**Note:** Consider restricting `Access-Control-Allow-Origin` in production to specific domains.

### Database Security (Supabase)

1. **Connection Security**
   - SSL/TLS enforced
   - Connection pooling via Supavisor

2. **Row Level Security**
   - All tables have RLS enabled
   - Policies use `auth.uid()` for user context
   - Service role bypasses RLS (server-side only)

3. **Function Security**
   - SECURITY DEFINER functions for public player access
   - Proper parameter validation in RPCs
   - No SQL injection vectors

### Recommendations

#### High Priority

1. **Restrict CORS Origins**
   - Update `Access-Control-Allow-Origin` to allowed domains
   - Consider environment-specific CORS settings

2. **Add CSP Headers**
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'
   ```

3. **Enable Supabase PITR**
   - Point-in-Time Recovery for disaster recovery

#### Medium Priority

1. **API Token Rotation**
   - Implement token expiration
   - Add rotation endpoint

2. **Audit Logging**
   - Log all admin actions
   - Log API token usage

3. **Add HSTS Header**
   ```
   Strict-Transport-Security: max-age=31536000; includeSubDomains
   ```

#### Low Priority

1. **Implement CAPTCHA**
   - Add to pairing flow if abuse detected

2. **IP Allowlisting**
   - Option for enterprise customers

3. **Enhanced MFA**
   - TOTP support for admin accounts

### Compliance Considerations

- **GDPR**: User data export/delete via admin UI
- **CCPA**: Privacy policy with data practices
- **SOC 2**: Logging and access controls in place

### Testing Performed

1. ✅ JWT token validation
2. ✅ API token authentication
3. ✅ RLS policy enforcement
4. ✅ Rate limiting behavior
5. ✅ Error message sanitization
6. ✅ Input validation
7. ✅ CORS headers
8. ✅ Security headers

---

Last Updated: Phase 23 - Launch Readiness
Reviewed By: Automated Security Audit
