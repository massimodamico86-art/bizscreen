---
phase: 11
plan: 07
subsystem: ui-compliance
tags: [gdpr, react, export-download, deletion-ui, user-settings]

dependency-graph:
  requires:
    - 11-03  # Export Processing RPC (downloadExportAsFile depends on export_data)
  provides:
    - DataPrivacySettings with export download capability
    - Enhanced deletion grace period banner
    - Export status display (processing, completed, expired)
  affects:
    - 11-08  # Testing will verify UI functionality

tech-stack:
  patterns:
    - Handler-based React UI pattern
    - Blob download for JSON exports
    - Conditional status rendering

file-tracking:
  key-files:
    modified:
      - src/components/compliance/DataPrivacySettings.jsx

decisions:
  - id: download-via-service
    choice: Use downloadExportAsFile from gdprService (not external file_url)
    reason: Export data stored in database, retrieved via service function

metrics:
  duration: ~8 minutes
  completed: 2026-01-24
---

# Phase 11 Plan 07: Export Download UI Summary

Updated DataPrivacySettings component with export download capability, expiration handling, and enhanced deletion grace period banner with read-only mode messaging.

## What Was Built

### Task 1: Import and Download Handler
- Added `downloadExportAsFile` import from gdprService
- Created `handleDownloadExport` async function that:
  - Retrieves export data by request ID
  - Triggers browser file download via Blob
  - Shows success/error toast notifications
  - Manages loading state during operation

### Task 2: Export Status Display Update
- Replaced external file_url link with Download button
- Added expiration date display (`Available until {date}`)
- Added expired status section with message: "Your previous export has expired. Request a new export to download your data."
- Loading spinner shown on download button during operation

### Task 3: Enhanced Deletion Grace Period Banner
- More prominent layout with AlertTriangle icon and structured content
- Clear heading: "Account Scheduled for Deletion"
- Emphasized scheduled deletion date
- Days remaining countdown
- Read-only mode notice: "During the grace period, your account is in read-only mode. You can view your data but cannot make changes."
- Renamed cancel button: "Cancel Deletion & Keep Account"

## Key Changes

```jsx
// New handler for completed export download
const handleDownloadExport = async () => {
  if (!exportStatus?.id) return;
  setExportLoading(true);
  try {
    await downloadExportAsFile(exportStatus.id);
    showToast?.('Your data export has been downloaded');
  } catch (error) {
    showToast?.(error.message || 'Failed to download export', 'error');
  } finally {
    setExportLoading(false);
  }
};

// Status display now uses button instead of link
<Button onClick={handleDownloadExport} disabled={exportLoading}>
  {exportLoading ? <Loader2 /> : <Download />}
  Download Export
</Button>
```

## Commits

| Commit | Description |
|--------|-------------|
| 8ccb1bb | feat(11-07): add export download handler to DataPrivacySettings |
| d91d9c6 | feat(11-07): update export status display with download button |
| 5e613f7 | feat(11-07): enhance deletion grace period banner |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] downloadExportAsFile imported from gdprService
- [x] handleDownloadExport function added
- [x] Completed export shows download button (not external link)
- [x] Expiration date displayed for completed exports
- [x] Expired status shows message to request new export
- [x] Deletion grace period banner enhanced with read-only message
- [x] Cancel deletion button has clear "Keep Account" label
- [x] All loading states handled properly

## Integration Notes

### With 11-03 (Export Processing RPC)
The `downloadExportAsFile` service function calls `getExportData(requestId)` which:
1. Fetches the `export_data` JSONB column from `data_export_requests`
2. Validates status is 'completed' and not expired
3. Creates a Blob and triggers browser download

### Export Status Flow
1. User requests full export -> status = 'processing'
2. Background job processes -> status = 'completed', export_data populated
3. User clicks Download button -> handleDownloadExport -> downloadExportAsFile
4. After 7 days -> status = 'expired' (shown with expired message)

## Next Phase Readiness

Ready for 11-08 (Testing and Verification):
- UI component fully functional with all GDPR states
- Export download integrated with service layer
- Deletion UI provides clear grace period messaging
