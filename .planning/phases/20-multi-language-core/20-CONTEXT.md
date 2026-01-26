# Phase 20: Multi-Language Core - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Create language variants of content (scenes) and assign display languages to devices. System falls back to default language when translation is missing. Users can switch between language versions when editing in CMS, and content cards display language indicator badges.

Note: Translation workflow, AI suggestions, bulk assignment, and group inheritance belong in Phase 21.

</domain>

<decisions>
## Implementation Decisions

### Variant creation flow
- "Add Language" button approach — explicit action on scene card or detail view
- User picks from a fixed list of common languages (English, Spanish, French, German, etc.)
- Not a duplicate-and-tag workflow — intentional language variant creation

### Language switcher UX
- Dropdown selector in editor (not tabs or side-by-side)
- Compact and scales well as more languages are added
- Switching changes which language version is being edited

### Device language assignment
- Language set in device settings page (individual device)
- Default language for new devices: English
- Fallback behavior: Show English (default language) when translation missing — no blank screens

### Language indicator badges
- Language code chips showing all available languages (e.g., [EN] [ES] [FR])
- Displayed on content cards (scenes, layouts) to indicate translation availability

### Claude's Discretion
- Data model: Separate scenes linked by group ID vs embedded versions within one scene
- Initial variant state: Copy of original vs blank scene
- Dropdown display format: Flag + name, code + name, or name only
- Dropdown position in editor
- Unsaved changes behavior when switching languages
- Badge position on content cards
- Whether to hide badge when only default language exists
- Visual style for language chips

</decisions>

<specifics>
## Specific Ideas

No specific product references mentioned — open to standard approaches that align with the existing BizScreen UI patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-multi-language-core*
*Context gathered: 2026-01-26*
