# Quick Task 63: Guest Name / Dynamic Placeholder Review

**Date:** 2026-03-05
**Reviewer:** Automated (Playwright MCP + code review)

## Summary

Reviewed all dynamic name and placeholder rendering across the app:
1. **WelcomePage greeting** (auth-based `userName`) -- WORKING CORRECTLY
2. **Listings TV Preview** (`{{first-name}}`/`{{last-name}}` template placeholders) -- BUG FOUND
3. **Edge cases** (missing name, special characters, maxLength) -- ACCEPTABLE

---

## Bugs Found

### BUG-Q63-01: Raw `{{first-name}} {{last-name}}` placeholders render on TV layouts (Severity: Medium)

**Component:** `src/layouts/Layout1.jsx`, `Layout2.jsx`, `Layout3.jsx`, `Layout4.jsx`
**Related files:**
- `src/components/listings/TVPreviewModal.jsx` (line 84: `guestData = null`)
- `src/components/listings/WelcomeMessageForm.jsx` (promises substitution in pro-tip)
- `src/legacy/data/mockData.js` (welcomeGreeting contains raw `{{first-name}} {{last-name}}`)

**Description:**
The WelcomeMessageForm tells users that `{{first-name}}` and `{{last-name}}` "will be replaced with guest's first name and last name respectively from the Guest List." However, **no substitution logic exists anywhere in the codebase**. The raw template syntax renders as-is on all four TV layout components.

**Evidence from code:**
1. `TVPreviewModal.jsx` line 84: `const guestData = null;` -- guest data is hardcoded to null
2. All four Layout components accept `_guest` (underscore-prefixed = intentionally unused)
3. `welcomeGreeting` is passed directly from listing data to `<h1>{welcomeGreeting}</h1>` with no transformation
4. No `replace()`, regex, or template interpolation logic exists between the form input and layout rendering
5. Mock data has: `welcomeGreeting: 'Welcome {{first-name}} {{last-name}}!'`

**Expected:** When a guest is checked in, `{{first-name}}` and `{{last-name}}` should be replaced with the guest's actual name from the guest list.

**Actual:** Raw `{{first-name}} {{last-name}}` text appears on the TV screen as literal characters.

**Impact:** This is a legacy hospitality feature (Listings). The feature is not exposed in the main sidebar navigation -- it exists as a legacy page. The bug affects the TV display for any listing that uses the welcome greeting with name placeholders.

**Fix suggestion:** Add a `resolveGreeting(greeting, guest)` helper that performs `greeting.replace('{{first-name}}', guest?.firstName || '').replace('{{last-name}}', guest?.lastName || '')` and call it in `TVPreviewModal` or in each Layout component before rendering.

---

## Verified Working

### WelcomePage Greeting (No Bug)

**Component:** `src/pages/WelcomePage.jsx`, `src/components/welcome/WelcomeHero.jsx`

**Test result:** Greeting renders as `"Hi, Dev Bypass User,"` using the mock user's `full_name` from dev auth bypass.

**Fallback chain verified (code review):**
1. `user?.user_metadata?.full_name` -- used when available
2. `user?.email?.split('@')[0]` -- email prefix fallback
3. `'there'` -- final default
4. `WelcomeHero` also has default param `userName = 'there'` as safety net

**Edge cases:**
- Null/undefined user: handled via optional chaining, falls through to `'there'`
- Special characters in name: React auto-escapes JSX interpolation, no XSS risk
- Very long names: No explicit truncation, but CSS `break-words` prevents layout overflow

---

## Notes

### WelcomeMessageForm Field Constraints
- `welcomeGreeting` maxLength: 3940 characters (excessive for a greeting -- could be reduced to ~200)
- `welcomeMessage` maxLength: 700 characters (reasonable)
- Both are frontend-only constraints (no server-side validation visible)

### Console Errors
All console errors during testing were expected Supabase connection errors (no backend running locally). No errors were related to dynamic content rendering or placeholder logic.

### Listings Page Accessibility
The Listings feature is a legacy page not exposed in the sidebar navigation. The `listings` route in `App.jsx` redirects to `LocationsPage`. The actual `ListingsPage` component and its TV preview functionality exist in the codebase but are not directly navigable from the main UI.
