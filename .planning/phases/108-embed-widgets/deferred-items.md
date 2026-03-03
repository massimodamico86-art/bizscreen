# Deferred Items - Phase 108

## Pre-existing Build Failure

**Found during:** 108-01 verification
**File:** `src/components/listings/TVPreviewModal.jsx`
**Issue:** Missing import `../tv-layouts/ScaledStage` causes `npm run build` to fail
**Impact:** Build fails after 2726 modules compile successfully. Not related to embed widgets.
**Resolution:** Fix the missing import in TVPreviewModal.jsx (outside phase 108 scope)
