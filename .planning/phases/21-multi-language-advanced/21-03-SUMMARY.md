---
phase: 21
plan: 03
subsystem: translation-workflow
tags: [dashboard, bulk-actions, ai-translation, claude, ui]
depends_on:
  requires: ["21-01"]
  provides: ["translation-dashboard-ui", "ai-translation-suggestions", "bulk-status-updates"]
  affects: ["21-04"]
tech-stack:
  added: []
  patterns: ["slide-over-panel", "bulk-selection", "ai-integration"]
key-files:
  created:
    - src/pages/TranslationDashboardPage.jsx
    - src/components/translations/TranslationFilters.jsx
    - src/components/translations/BulkActionsBar.jsx
    - src/components/translations/AiSuggestionPanel.jsx
    - _api-disabled/translations/suggest.js
  modified:
    - src/services/translationService.js
    - src/App.jsx
decisions:
  - id: dash-layout
    choice: "Scene-centric dashboard with language pills per row"
    context: "Dashboard organization"
  - id: ai-panel
    choice: "Slide-over panel with copy functionality (not direct apply)"
    context: "AI suggestions UX"
metrics:
  duration: "4min"
  completed: "2026-01-27"
---

# Phase 21 Plan 03: Translation Dashboard UI Summary

Translation dashboard with filtering, bulk actions, and AI-powered translation suggestions via Claude.

## What Was Built

### TranslationDashboardPage (308 lines)
- Scene-centric table view with language status visualization
- Status badges with icons (draft=Clock, review=AlertCircle, approved=Check)
- Language pills showing per-variant status with color coding
- Row selection with checkbox for bulk operations
- "Translate" button per scene to open AI panel
- Loading and empty states

### TranslationFilters Component
- Status dropdown: All/Draft/Review/Approved
- Language dropdown: All Languages + supported languages from languageService
- Filter changes trigger dashboard reload with updated RPC params

### BulkActionsBar Component
- Appears when scenes are selected
- Status dropdown to select target status
- "Update Status" button triggers bulkUpdateStatus RPC
- Loading state with spinner during update
- Toast notifications for success/error feedback

### AiSuggestionPanel Component
- Slide-over panel (480px, right side) following TemplatePreviewPanel pattern
- Language selector (excludes scene's current language)
- "Generate Suggestions" button calls Claude via API
- Displays original text -> translated text pairs
- Copy button per translation with checkmark feedback
- "Copy All" button for batch copying
- Help text explaining workflow (copy -> paste into variant -> edit)

### API Route: _api-disabled/translations/suggest.js
- POST endpoint expecting { sourceSceneId, targetLanguage }
- Fetches scene from Supabase using service role key
- Extracts translatable text from Polotno scene settings
- Calls Claude 3 Haiku for translation
- Returns { sourceLanguage, targetLanguage, translations, originalTexts }
- Handles markdown code blocks in Claude response

### Service Function: getAiTranslationSuggestion
- Added to translationService.js
- Calls /api/translations/suggest endpoint
- Logs requests and responses for debugging

### Route Wiring
- Added lazy import for TranslationDashboardPage
- Added 'translations' route to pages object

## Key Implementation Details

### Status Visualization
```javascript
const STATUS_CONFIG = {
  draft: { label: 'Draft', icon: Clock, color: 'text-gray-500 bg-gray-100' },
  review: { label: 'In Review', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
  approved: { label: 'Approved', icon: Check, color: 'text-green-600 bg-green-50' },
};
```

### Language Pills
Each variant displays as a colored pill with the language code and status icon.
Colors from languageService.getLanguageColor().

### AI Translation Flow
1. User clicks "Translate" on a scene row
2. Panel opens with language dropdown
3. User selects target language and clicks "Generate"
4. API extracts text from scene settings, calls Claude
5. Panel displays original/translated pairs
6. User copies translations and pastes into scene variant

## Commits

| Hash | Message |
|------|---------|
| 8c87dbd | feat(21-03): create TranslationDashboardPage and filter components |
| f60a8b5 | feat(21-03): create BulkActionsBar for bulk status updates |
| fdf0929 | feat(21-03): create AI suggestion panel and API route |
| 7173719 | feat(21-03): wire TranslationDashboardPage route |

## Files Changed

- `src/pages/TranslationDashboardPage.jsx` - Main dashboard page (created)
- `src/components/translations/TranslationFilters.jsx` - Filter controls (created)
- `src/components/translations/BulkActionsBar.jsx` - Bulk actions toolbar (created)
- `src/components/translations/AiSuggestionPanel.jsx` - AI panel component (created)
- `_api-disabled/translations/suggest.js` - Claude translation API (created)
- `src/services/translationService.js` - Added getAiTranslationSuggestion (modified)
- `src/App.jsx` - Added route and lazy import (modified)

## Deviations from Plan

None - plan executed exactly as written.

## Must-Haves Verification

| Artifact | Requirement | Status |
|----------|-------------|--------|
| TranslationDashboardPage.jsx | min_lines: 150 | 308 lines |
| BulkActionsBar.jsx | contains: bulkUpdateStatus | Verified |
| AiSuggestionPanel.jsx | contains: getAiTranslationSuggestion | Verified |
| _api-disabled/translations/suggest.js | contains: anthropic | Verified |

## Key Links Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| TranslationDashboardPage | translationService | fetchTranslationDashboard | Verified |
| BulkActionsBar | translationService | bulkUpdateStatus | Verified |
| AiSuggestionPanel | API route | fetch POST | Verified |

## Next Phase Readiness

Phase 21 Plan 04 can proceed - this plan provides:
- Translation dashboard accessible at /translations
- Bulk status update UI for workflow management
- AI translation panel for generating suggestions
- All service functions and API routes in place
