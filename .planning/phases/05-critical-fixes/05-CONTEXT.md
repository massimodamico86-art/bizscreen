# Phase 5: Critical Fixes - Context

**Created:** 2026-01-22
**Phase Goal:** Incomplete features work end-to-end without "not implemented" errors

## Scope Discovery

During phase discussion, exploration revealed:

| Requirement | Original Status | Actual Status |
|-------------|-----------------|---------------|
| FIX-01: Schedule conflict detection | Pending | ✅ Already Complete |
| FIX-02: Save layout as template | Pending | ❌ Stubbed - needs implementation |
| FIX-03: Timezone validation | Pending | ✅ Already Complete |
| FIX-04: Storage quota enforcement | Pending | ✅ Already Complete |
| FIX-05: Email notifications via Resend | Pending | ⚠️ Stubbed - needs implementation |

**Adjusted Scope:** Only FIX-02 and FIX-05 require implementation work.

## Decisions

### FIX-02: Save Layout as Template

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Placement | Both toolbar and context menu | Toolbar for current layout in editor, context menu for any layout in list |
| Metadata Capture | Name + category + tags | Full metadata for library organization and discoverability |
| Media Handling | Reference originals | No duplication - storage efficient, single source of truth |
| Thumbnail | Auto-generate placeholder | Use layout preview screenshot or default placeholder |

**Implementation Notes:**
- `createTemplateFromLayout()` in layoutTemplateService.js currently throws "not implemented"
- Reverse function `cloneTemplateToLayout()` already works - can use as reference
- Need to add "Save as Template" button to LayoutEditorPage toolbar
- Need to add "Save as Template" option to layout context menu in LayoutsPage
- Modal dialog to capture: name, category (dropdown), tags (multi-select/input)

### FIX-03: Timezone Validation

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Validation Approach | Current is sufficient | Implicit validation via toLocaleTimeString catches invalid timezones |
| DST Handling | Automatic (existing) | JS Date handles DST transitions automatically |

**Finding:** Current implementation already meets success criteria:
- Timezone stored in schedule record
- Used for schedule preview calculations
- `isInQuietHours()` validates timezone via toLocaleTimeString
- No additional work required

### FIX-05: Email Notifications via Resend

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Provider | Resend API directly | Simple, good DX, as specified in requirements |
| Email Scope | Alert notifications only | Focus on existing alert system - device offline, content errors |
| Email Format | HTML branded | Styled with BizScreen logo, colors, clear CTAs |
| API Key Storage | Environment variable | VITE_RESEND_API_KEY in .env - standard approach |

**Implementation Notes:**
- `sendEmailNotification()` in notificationDispatcherService.js is stubbed
- Queue/dispatch framework already works
- Need to integrate Resend SDK
- Need to create HTML email template for alerts
- From address: noreply@bizscreen.com (or domain-appropriate)

## Gray Areas Resolved

1. **Template categories** - Will use existing category system from templates table
2. **Template visibility** - User-created templates are private to tenant by default
3. **Email rate limiting** - Rely on Resend's built-in rate limits initially
4. **Email retry** - Mark as failed after single attempt, batch retry later

## Files to Modify

### FIX-02
- `src/services/layoutTemplateService.js` - Implement createTemplateFromLayout()
- `src/pages/LayoutEditorPage.jsx` - Add "Save as Template" toolbar button
- `src/pages/LayoutsPage.jsx` - Add context menu option
- New: `src/components/templates/SaveAsTemplateModal.jsx` - Dialog for metadata

### FIX-05
- `src/services/notificationDispatcherService.js` - Implement sendEmailNotification() with Resend
- `src/services/emailService.js` - New file for Resend integration
- `src/templates/email/alert.html` - HTML email template (or React Email component)
- `.env.example` - Document VITE_RESEND_API_KEY

## Success Criteria (Revised)

1. ~~Schedule editor shows conflict warning~~ ✅ Already working
2. User can click "Save as Template" on a layout and find it in template library
3. ~~Timezone selector validates IANA format~~ ✅ Already working
4. ~~Media upload shows warning at 80% storage quota~~ ✅ Already working
5. Email notifications send via Resend provider (not stub)

## Dependencies

- Resend account and API key required for FIX-05
- No database migrations needed (templates table exists)

---
*Context captured: 2026-01-22*
