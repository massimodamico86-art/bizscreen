# Phase 5: Critical Fixes - Research

**Researched:** 2026-01-22
**Domain:** Feature completion - Template service and Email notifications
**Confidence:** HIGH

## Summary

This phase implements two remaining stubbed features: FIX-02 (Save Layout as Template) and FIX-05 (Email notifications via Resend). The discovery phase confirmed that FIX-01, FIX-03, and FIX-04 are already complete.

FIX-02 requires implementing the `createTemplateFromLayout()` function in the existing `layoutTemplateService.js` and adding UI entry points (toolbar button in LayoutEditorPage, context menu not currently implemented in LayoutsPage). The reverse function `cloneTemplateToLayout()` already works and provides the data mapping pattern to follow.

FIX-05 requires integrating the Resend email API into the existing `notificationDispatcherService.js` which already has a stubbed `sendEmailNotification()` function. The notification queue infrastructure is already in place.

**Primary recommendation:** Follow existing service patterns closely. Use the design-system Modal components for SaveAsTemplateModal. Use Resend's Node.js SDK for email integration with HTML templates.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.80.0 | Database operations | Already in use throughout codebase |
| resend | latest | Email sending | Specified in requirements, simple API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.548.0 | Icons | Used throughout - Save, Layout icons |
| framer-motion | ^12.23.24 | Modal animations | Design system uses for Modal |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend SDK | Direct fetch to API | SDK provides cleaner interface, types |
| HTML string templates | React Email | HTML strings simpler for alert emails |

**Installation:**
```bash
npm install resend
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── layoutTemplateService.js    # Add createTemplateFromLayout()
│   ├── notificationDispatcherService.js  # Modify sendEmailNotification()
│   └── emailService.js             # NEW: Resend integration
├── components/
│   └── templates/
│       └── SaveAsTemplateModal.jsx # NEW: Modal for saving as template
├── templates/
│   └── email/
│       └── alert.html              # NEW: HTML email template
└── pages/
    ├── LayoutEditorPage.jsx        # Add "Save as Template" button
    └── LayoutsPage.jsx             # Context menu not yet implemented
```

### Pattern 1: Service Function Pattern
**What:** All services follow the same async/await pattern with error logging
**When to use:** Any new service functions
**Example:**
```javascript
// Source: src/services/layoutTemplateService.js (existing pattern)
export async function createTemplateFromLayout(layoutId, options = {}) {
  const logger = createScopedLogger('layoutTemplateService');
  try {
    // 1. Fetch source layout
    const { data: layout, error: fetchError } = await supabase
      .from('layouts')
      .select('*')
      .eq('id', layoutId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Map fields to template schema
    const templateData = {
      tenant_id: layout.owner_id, // User's tenant
      name: options.name || `${layout.name} Template`,
      description: options.description || layout.description,
      category: options.category || 'General',
      orientation: mapAspectRatioToOrientation(layout.aspect_ratio),
      // ... more fields
    };

    // 3. Insert and return
    const { data, error } = await supabase
      .from('layout_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Failed to create template from layout', { layoutId, error });
    throw error;
  }
}
```

### Pattern 2: Modal Component Pattern
**What:** Design system Modal with ModalHeader, ModalContent, ModalFooter
**When to use:** SaveAsTemplateModal
**Example:**
```jsx
// Source: src/design-system/components/Modal.jsx pattern
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
} from '../../design-system';

export function SaveAsTemplateModal({ isOpen, onClose, onSave, layout }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Save as Template</ModalTitle>
      </ModalHeader>
      <ModalContent>
        {/* Form fields */}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Template</Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Pattern 3: Resend Email Integration
**What:** Dedicated email service wrapping Resend SDK
**When to use:** Email notification sending
**Example:**
```javascript
// Source: Resend official documentation
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY);

export async function sendAlertEmail({ to, subject, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'BizScreen Alerts <alerts@bizscreen.com>',
      to,
      subject,
      html,
    });

    if (error) throw error;
    return { success: true, messageId: data.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### Anti-Patterns to Avoid
- **Direct Supabase in components:** Services should handle all DB operations
- **Inline HTML templates:** Keep email templates in separate files
- **Synchronous email sending:** Queue emails, don't block UI
- **Exposing API keys client-side:** Use VITE_ prefix but be aware this exposes to browser

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom overlay | design-system Modal | Focus trap, animations, accessibility |
| Form validation | Manual checks | FormField error prop | Consistent error display |
| Email sending | fetch() to SMTP | Resend SDK | Deliverability, tracking, templates |
| Date formatting | Manual string ops | date-fns | Already in deps, handles edge cases |

**Key insight:** The codebase has comprehensive design-system components. Always check there first before building custom UI.

## Common Pitfalls

### Pitfall 1: Client-side API Key Exposure
**What goes wrong:** VITE_ prefixed env vars are bundled into client code
**Why it happens:** Resend API key would be visible in browser DevTools
**How to avoid:** For MVP, accept this limitation with rate limiting on Resend. For production, emails should be sent server-side via Supabase Edge Functions.
**Warning signs:** API key visible in Network tab or bundle

### Pitfall 2: Layout Data Field Mismatch
**What goes wrong:** layouts table has `data JSONB` but older layouts may have zones in layout_zones table
**Why it happens:** Two different layout storage approaches exist in codebase
**How to avoid:** Check both layout.data and query layout_zones table
**Warning signs:** Template created but appears empty when used

### Pitfall 3: Template Category Mismatch
**What goes wrong:** Creating template with category that doesn't match SIDEBAR_CATEGORIES
**Why it happens:** Categories are defined in UI but not validated at database level
**How to avoid:** Use dropdown with predefined categories from SIDEBAR_CATEGORIES in LayoutsPage
**Warning signs:** Templates don't appear in expected category filters

### Pitfall 4: Missing Tenant ID
**What goes wrong:** Templates created without tenant_id become global
**Why it happens:** tenant_id is nullable in layout_templates (NULL = global)
**How to avoid:** Always set tenant_id from user's profile for user-created templates
**Warning signs:** User's templates visible to all tenants

### Pitfall 5: Email Not Actually Sending
**What goes wrong:** Email appears queued but never sent
**Why it happens:** Current sendEmailNotification() only marks DB record, doesn't send
**How to avoid:** Replace stub with actual Resend API call
**Warning signs:** email_sent_at set but no email received

## Code Examples

Verified patterns from existing codebase:

### Fetching Layout with Zones
```javascript
// Source: src/services/layoutService.js
export async function fetchLayoutWithZones(layoutId) {
  const { data, error } = await supabase
    .from('layouts')
    .select(`
      *,
      layout_zones (*)
    `)
    .eq('id', layoutId)
    .single();

  if (error) throw error;
  return data;
}
```

### Design System Form Fields
```jsx
// Source: src/design-system/components/FormElements.jsx pattern
import { FormField, Input, Select } from '../../design-system';

<FormField label="Template Name" required>
  <Input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="My Template"
  />
</FormField>

<FormField label="Category">
  <Select
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
  />
</FormField>
```

### HTML Email Template Structure
```html
<!-- Source: Standard HTML email pattern -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 24px;">
        <!-- Logo -->
        <img src="https://bizscreen.com/logo.png" alt="BizScreen" height="32">

        <!-- Alert Content -->
        <h1 style="color: #111; font-size: 24px; margin: 24px 0 16px;">{{title}}</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">{{message}}</p>

        <!-- CTA Button -->
        <a href="{{actionUrl}}" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 24px 0;">
          View Details
        </a>
      </td>
    </tr>
  </table>
</body>
</html>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stub functions | Implement fully | This phase | Features work end-to-end |
| Console.log | createScopedLogger | Phase 4 | Use structured logging |

**Deprecated/outdated:**
- Raw `console.log` - Use `createScopedLogger()` from Phase 4

## Data Schema Reference

### layout_templates Table
```sql
-- Source: supabase/migrations/086_layout_templates.sql
CREATE TABLE public.layout_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,           -- NULL = global, set for user templates
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  orientation TEXT NOT NULL DEFAULT '16_9',  -- 16_9, 9_16, square
  thumbnail_url TEXT,
  background_color TEXT DEFAULT '#1a1a2e',
  background_image_url TEXT,
  data JSONB DEFAULT '{"elements": []}'::jsonb,
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  use_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Aspect Ratio to Orientation Mapping
```javascript
// From cloneTemplateToLayoutFallback
const orientationMap = {
  '16:9': '16_9',
  '9:16': '9_16',
  '1:1': 'square',
};
```

### Resend API Reference
```javascript
// Source: https://resend.com/docs/api-reference/emails/send-email
// POST https://api.resend.com/emails

// Required parameters:
{
  from: 'Name <email@domain.com>',  // Sender
  to: ['recipient@email.com'],       // Max 50 recipients
  subject: 'Subject line'
}

// Optional parameters:
{
  html: '<p>HTML content</p>',      // or text: 'Plain text'
  cc: [],
  bcc: [],
  replyTo: 'reply@email.com',
  headers: {},
  attachments: []                    // Max 40MB total
}

// Response:
{ id: 'uuid-message-id' }
```

## Open Questions

Things that couldn't be fully resolved:

1. **Thumbnail Generation**
   - What we know: CONTEXT.md says "auto-generate placeholder"
   - What's unclear: Whether to use html2canvas or just a default image
   - Recommendation: Start with default placeholder image, add screenshot later

2. **Email Domain Verification**
   - What we know: Resend requires verified domain for production
   - What's unclear: What domain BizScreen uses (bizscreen.com?)
   - Recommendation: Use Resend's test domain initially, document production setup

3. **Context Menu in LayoutsPage**
   - What we know: CONTEXT.md mentions "context menu option"
   - What's unclear: LayoutsPage (91 lines) seems minimal, may not have context menu yet
   - Recommendation: Add to LayoutEditorPage toolbar first, defer context menu

## Implementation Checklist

### FIX-02: Save Layout as Template
- [ ] Implement `createTemplateFromLayout()` in layoutTemplateService.js
- [ ] Create SaveAsTemplateModal.jsx component
- [ ] Add "Save as Template" button to LayoutEditorPage toolbar
- [ ] Handle form: name, category, description
- [ ] Map layout data to template format correctly
- [ ] Set tenant_id for user templates
- [ ] Test template appears in library after save

### FIX-05: Email Notifications via Resend
- [ ] Install resend package
- [ ] Create emailService.js with Resend integration
- [ ] Create HTML email template for alerts
- [ ] Modify sendEmailNotification() to actually send
- [ ] Add VITE_RESEND_API_KEY to .env.example
- [ ] Test email delivery with real Resend account

## Sources

### Primary (HIGH confidence)
- src/services/layoutTemplateService.js - Existing service with stub function
- src/services/notificationDispatcherService.js - Existing stub for email
- supabase/migrations/086_layout_templates.sql - Table schema
- src/design-system/components/Modal.jsx - Modal component patterns
- src/design-system/components/FormElements.jsx - Form component patterns

### Secondary (MEDIUM confidence)
- https://resend.com/docs/api-reference/emails/send-email - Official Resend API docs
- https://resend.com/nodejs - Resend Node.js SDK guide
- https://github.com/resend/resend-node - Resend SDK GitHub

### Tertiary (LOW confidence)
- None required - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing project dependencies + Resend (specified in requirements)
- Architecture: HIGH - Following existing service and component patterns
- Pitfalls: HIGH - Based on analysis of existing codebase inconsistencies

**Research date:** 2026-01-22
**Valid until:** 60 days (stable patterns, no fast-moving dependencies)
