# Deferred Items - Phase 113

## Pre-existing Build Failure

**File:** `src/components/listings/TVPreviewModal.jsx`
**Issue:** `Could not resolve "../tv-layouts/ScaledStage"` - missing module reference
**Discovered during:** Phase 113 Plan 01, Task 2 verification
**Impact:** Full `npm run build` fails. Not caused by any Phase 113 changes.
**Action needed:** Fix or remove the broken import in TVPreviewModal.jsx
