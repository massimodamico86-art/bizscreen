# Enterprise Single Sign-On (SSO)

This guide covers configuring Single Sign-On for BizScreen tenants.

## Overview

BizScreen supports:
- **OpenID Connect (OIDC)** - For modern IdPs like Okta, Auth0, Azure AD
- **SAML 2.0** - For enterprise identity providers

## Requirements

- Pro or Enterprise subscription plan
- Identity provider with OIDC or SAML support
- Admin access to both BizScreen and your IdP

## OIDC Configuration

### Step 1: Create Application in IdP

**Okta Example:**
1. Go to Applications → Create App Integration
2. Select OIDC - OpenID Connect
3. Select Web Application
4. Set redirect URI: `https://your-domain.com/api/sso/callback`

**Azure AD Example:**
1. Go to Azure Portal → App Registrations → New Registration
2. Set redirect URI as Web: `https://your-domain.com/api/sso/callback`
3. Create a client secret

### Step 2: Get Configuration Values

You'll need:
- **Issuer URL**: Your IdP's issuer (e.g., `https://your-org.okta.com`)
- **Client ID**: OAuth client identifier
- **Client Secret**: OAuth client secret

### Step 3: Configure in BizScreen

1. Go to **Settings → Enterprise → Single Sign-On**
2. Select **OpenID Connect**
3. Enter provider name (e.g., "Okta")
4. Enter Issuer URL
5. Click **Auto-discover** to fetch endpoints automatically
6. Enter Client ID and Client Secret
7. Click **Save Configuration**
8. Toggle **Enable SSO**

### Auto-Discovery

If your IdP supports OpenID Connect Discovery, BizScreen will automatically fetch:
- Authorization endpoint
- Token endpoint
- UserInfo endpoint
- JWKS URI

Just enter the issuer URL and click "Auto-discover".

## SAML 2.0 Configuration

### Step 1: Get BizScreen Metadata

BizScreen SAML metadata:
- Entity ID: `https://your-domain.com`
- ACS URL: `https://your-domain.com/api/sso/callback`

### Step 2: Configure IdP

Add BizScreen as a service provider in your IdP:
1. Upload or enter the Entity ID
2. Set the ACS (Assertion Consumer Service) URL
3. Configure attribute mappings

### Step 3: Configure in BizScreen

1. Go to **Settings → Enterprise → Single Sign-On**
2. Select **SAML 2.0**
3. Enter your IdP's metadata URL
4. Or paste the metadata XML
5. Click **Save Configuration**
6. Toggle **Enable SSO**

## User Provisioning

### Auto-Create Users

When enabled, users authenticating via SSO for the first time are automatically created with:
- Email from IdP
- Name from IdP attributes
- Default role (configurable: viewer, editor, admin)

### Attribute Mapping

Default attribute mappings:
```json
{
  "email": "email",
  "name": "name",
  "given_name": "given_name",
  "family_name": "family_name"
}
```

Customize in your IdP to match BizScreen expectations.

## SSO Enforcement

### SSO-Only Mode

When **Enforce SSO** is enabled:
- Local password login is disabled
- Users must authenticate through the IdP
- Existing sessions remain valid until expiry

**Warning**: Test SSO thoroughly before enabling enforcement to avoid lockout.

### Fallback Access

Super admins can always log in via password for emergency access.

## Login Flow

### User Experience

1. User visits login page
2. Enters email address
3. System detects SSO is configured for their tenant
4. User clicks "Sign in with [Provider Name]"
5. Redirected to IdP for authentication
6. After successful auth, redirected back to BizScreen
7. Session created automatically

### API Flow

```
POST /api/sso/initiate
{
  "tenant_id": "uuid",
  "email": "user@example.com"  // Optional, for domain-based SSO
}

Response:
{
  "success": true,
  "redirect_url": "https://idp.example.com/authorize?...",
  "provider_name": "Okta",
  "provider_type": "oidc"
}
```

## Troubleshooting

### "Invalid or expired SSO session"

SSO sessions expire after 10 minutes. Start the flow again.

### "Email not provided by identity provider"

Ensure your IdP is configured to send the email claim:
- OIDC: Include `email` scope
- SAML: Map email attribute

### "Failed to exchange authorization code"

Check:
- Client secret is correct
- Redirect URI matches exactly
- Token endpoint is accessible

### User Not Created

If auto-create is disabled, users must be pre-provisioned:
- Via SCIM provisioning
- Manually in team settings
- Via admin API

### SSO Lockout Recovery

If SSO misconfiguration locks you out:
1. Contact support for emergency access
2. Super admin can access via direct login
3. Disable SSO via API or database

## Security Best Practices

1. **Use HTTPS** - All SSO endpoints require HTTPS
2. **Rotate Secrets** - Regularly rotate client secrets
3. **Limit Auto-Create** - Consider disabling for sensitive environments
4. **Audit Logs** - Monitor SSO login activity
5. **Test First** - Always test before enabling enforcement

## API Reference

### SSO Initiate
```
POST /api/sso/initiate
Authorization: (none required)

Body:
{
  "tenant_id": "uuid",
  "email": "user@example.com"
}

Response:
{
  "redirect_url": "https://...",
  "provider_name": "...",
  "provider_type": "oidc|saml"
}
```

### SSO Callback
```
GET /api/sso/callback
Query params (OIDC):
  - code: Authorization code
  - state: CSRF token

Query params (SAML):
  - SAMLResponse: Base64-encoded assertion

Redirects to dashboard on success, login on failure
```

## Database Schema

```sql
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('oidc', 'saml')),
  name TEXT,
  issuer TEXT,
  client_id TEXT,
  client_secret TEXT,
  authorization_endpoint TEXT,
  token_endpoint TEXT,
  userinfo_endpoint TEXT,
  metadata_url TEXT,
  default_role TEXT,
  auto_create_users BOOLEAN,
  is_enabled BOOLEAN,
  enforce_sso BOOLEAN,
  attribute_mapping JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Support

For enterprise SSO setup assistance, contact support with:
- Your identity provider name
- Any error messages
- Screenshot of IdP configuration
