---
phase: 111-documents-and-calendar
plan: 01
subsystem: media, database
tags: [pdf, office, document-conversion, supabase-edge-function, gotenberg, storage]

# Dependency graph
requires:
  - phase: 109-content-model
    provides: media_assets table with config_json JSONB column
provides:
  - Extended getMediaTypeFromMime() recognizing 7 document MIME types
  - documentService.js for upload-then-convert workflow with async polling
  - doc-converter Supabase Edge Function with JWT auth and Gotenberg integration
  - calendar_event_cache and calendar_oauth_tokens database tables
affects: [111-02-document-viewer-ui, 111-03-calendar-oauth, 111-04-calendar-widget]

# Tech tracking
tech-stack:
  added: [gotenberg]
  patterns: [async-conversion-polling, config_json-status-tracking, shared-migration]

key-files:
  created:
    - supabase/migrations/164_document_conversion_calendar_cache.sql
    - src/services/documentService.js
    - supabase/functions/doc-converter/index.ts
  modified:
    - src/services/mediaService.js

key-decisions:
  - "PDF stored as single convertedPages entry (page splitting via magick-wasm deferred as TODO)"
  - "Office conversion via Gotenberg LibreOffice API with graceful error on unavailability"
  - "Removed legacy text/ MIME type catch-all from getMediaTypeFromMime (plain text not a document type)"
  - "Shared migration 164 creates calendar tables for Plans 03/04 alongside document conversion prep"
  - "pollConversionStatus uses exponential backoff starting at 2s, capped at 15s, max 30 attempts"

patterns-established:
  - "Async conversion pattern: upload -> create record with pending status -> invoke Edge Function -> poll config_json"
  - "Shared migration pattern: multiple features in one migration when deploying together"

requirements-completed: [DOC-01, DOC-02, DOC-03, DOC-06]

# Metrics
duration: 3min
completed: 2026-03-04
---

# Phase 111 Plan 01: Document Upload and Server-Side Conversion Summary

**Document upload pipeline with 7 MIME types, async doc-converter Edge Function via Gotenberg, and shared calendar tables migration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-04T21:45:04Z
- **Completed:** 2026-03-04T21:48:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Database migration 164 with calendar_event_cache and calendar_oauth_tokens tables, RLS, indexes, and grants
- Extended getMediaTypeFromMime() to recognize all 7 document MIME types (PDF + 6 Office formats)
- Created documentService.js with uploadDocument, getConversionStatus, pollConversionStatus, isDocumentMimeType, DOCUMENT_MIME_TYPES
- Created doc-converter Edge Function with JWT auth, CORS, Gotenberg integration for Office files, and PDF passthrough

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for calendar_event_cache and calendar_oauth_tokens tables** - `a40b98a` (feat)
2. **Task 2: Document service layer, MIME type extension, and doc-converter Edge Function** - `8e6d2e6` (feat)

## Files Created/Modified
- `supabase/migrations/164_document_conversion_calendar_cache.sql` - Calendar cache and OAuth tokens tables with RLS, indexes, grants
- `src/services/mediaService.js` - Extended getMediaTypeFromMime() for 7 document MIME types
- `src/services/documentService.js` - Document upload, conversion status polling, MIME validation
- `supabase/functions/doc-converter/index.ts` - PDF/Office conversion Edge Function with JWT auth

## Decisions Made
- PDF stored as single convertedPages entry; per-page PNG splitting via magick-wasm noted as TODO for future enhancement
- Office files converted via Gotenberg's LibreOffice API; graceful error handling when Gotenberg is unavailable
- Removed legacy `text/` MIME type catch-all from getMediaTypeFromMime -- plain text is not a document type in this context
- Shared migration 164 creates both calendar tables (for Plans 03/04) and document metadata uses existing config_json
- pollConversionStatus uses exponential backoff (2s initial, 15s cap, 30 max attempts)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build failure: `src/components/listings/TVPreviewModal.jsx` references missing `../tv-layouts/ScaledStage`. Not caused by phase 111 changes. Logged to deferred-items.md.

## User Setup Required
None - no external service configuration required. Gotenberg URL defaults to localhost:3000 and is configurable via GOTENBERG_URL env var in production.

## Next Phase Readiness
- Document service ready for Plan 02 (Document Viewer UI) to build the preview/viewer component
- Calendar tables ready for Plans 03/04 (Calendar OAuth and Widget)
- config_json conversion tracking pattern established for UI polling integration

---
*Phase: 111-documents-and-calendar*
*Completed: 2026-03-04*
