---
phase: 165-campaign-scheduling-ui
reviewed: 2026-04-11T12:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/pages/CampaignEditorPage.jsx
  - tests/e2e/campaigns.spec.js
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 165: Code Review Report

**Reviewed:** 2026-04-11T12:00:00Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the CampaignEditorPage component (1500+ lines) and its companion E2E test file. The component implements dayparting presets, campaign analytics, approval workflow, and preview link management. The code is generally well-structured with proper error handling on most async operations. However, there are several bugs related to state management and missing React dependency arrays, as well as a date boundary bug in the dayparting preset configuration.

## Warnings

### WR-01: Late Night preset uses 23:59 instead of 00:00, creating a 1-minute gap

**File:** `src/pages/CampaignEditorPage.jsx:81`
**Issue:** The `late_night` preset sets `endTime: '23:59'`, which means playback stops at 23:59 instead of midnight (00:00). This creates a 1-minute gap where no content plays. Additionally, using `00:00` on the same date would mean "start of today" rather than "end of today," so the end date would need to be the next day -- but the current code on line 219 reuses the same date portion for `end_at`, meaning the campaign would end at 23:59 regardless.
**Fix:** If the intent is truly "until midnight," consider using `23:59:59` to minimize the gap, or document the 1-minute gap as intentional. Alternatively, set end time to `00:00` and advance the end date by one day in `handlePresetSelect`.

### WR-02: handlePresetSelect calls handleChange twice, triggering two re-renders with stale closure

**File:** `src/pages/CampaignEditorPage.jsx:220-221`
**Issue:** `handlePresetSelect` calls `handleChange('start_at', ...)` then `handleChange('end_at', ...)`. Each call to `handleChange` invokes `setCampaign(prev => ...)` which is fine for batching, but `setHasChanges(true)` is called redundantly. More importantly, the two `setCampaign` calls each use `prev =>` correctly, but this pattern is fragile if `handleChange` is ever refactored to not use the functional updater form.
**Fix:** Consider batching both field changes into a single state update:
```jsx
setCampaign(prev => ({
  ...prev,
  start_at: existingStart + 'T' + preset.startTime,
  end_at: existingEnd + 'T' + preset.endTime,
}));
setHasChanges(true);
```

### WR-03: Missing dependency in useEffect for loadCampaign and loadPickerData

**File:** `src/pages/CampaignEditorPage.jsx:137-142`
**Issue:** The `useEffect` on line 137 references `loadCampaign` and `loadPickerData` which are defined inside the component, but they are not listed in the dependency array `[campaignId]`. While this works because `campaignId` is the meaningful trigger, React's rules of hooks require all referenced values in the dependency array. With React strict mode or future React versions, this could cause stale closure bugs. The `loadCampaign` function closes over `campaignId`, `showToast`, and `navigate` -- if any of these change without `campaignId` changing, the effect will use stale references.
**Fix:** Either wrap `loadCampaign` and `loadPickerData` in `useCallback` with proper dependencies, or inline the logic within the effect. For pragmatic purposes, adding an eslint-disable comment acknowledging the intentional omission would also suffice.

### WR-04: Stat card "Impressions" maps to unique_screens field, likely incorrect

**File:** `src/pages/CampaignEditorPage.jsx:843`
**Issue:** The "Impressions" stat card displays `campaignStats?.unique_screens ?? 0`, but "Impressions" and "unique screens" are semantically different metrics. Impressions typically refers to total view counts, not unique screen counts. This is likely a data mapping bug that will confuse users.
**Fix:** Either rename the stat card label to "Unique Screens" to match the data, or map it to an impressions field if one exists in the stats response:
```jsx
<StatCard
  title="Unique Screens"
  value={campaignStats?.unique_screens ?? 0}
  icon={<Monitor className="w-5 h-5" />}
/>
```

## Info

### IN-01: Multiple console.error calls left in production code

**File:** `src/pages/CampaignEditorPage.jsx:153,171,195,250,266,288,298,315,329,346,360,399,427,443,456,482,497`
**Issue:** There are 17 `console.error` calls throughout the file. While these are useful for debugging, they should ideally use a structured logging utility that can be disabled in production builds.
**Fix:** Replace with a project-wide logger if one exists, or leave as-is if the project convention is to use `console.error` for error reporting.

### IN-02: Unused lucide-react imports

**File:** `src/pages/CampaignEditorPage.jsx:22-24`
**Issue:** The `Megaphone` (line 23) import from lucide-react does not appear to be used anywhere in the component's JSX.
**Fix:** Remove unused import:
```jsx
// Remove: Megaphone
```

### IN-03: E2E test relies on waitForTimeout instead of deterministic waits

**File:** `tests/e2e/campaigns.spec.js:14,24,118`
**Issue:** `page.waitForTimeout(1500)` and `page.waitForTimeout(2000)` are used for navigation settling. These fixed delays can cause flaky tests on slower CI environments or unnecessary slowness on fast machines.
**Fix:** Replace with `waitForSelector` or `waitForLoadState('networkidle')` where possible:
```js
await page.waitForLoadState('networkidle');
```

---

_Reviewed: 2026-04-11T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
