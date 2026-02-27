# Deferred Items - Phase 083

## Out of Scope Pre-existing Issues

### LeftSidebar.jsx - Unused imports (pre-existing, not caused by 083-02)

- `'CloudFilePicker' is defined but never used` (line 23)
- `'Cloud' is defined but never used` (line 34)

These existed before phase 083-02 execution and are unrelated to the current audit task.
Action: Clean up in a future linting pass or when LeftSidebar is next touched.
