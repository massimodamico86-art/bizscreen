---
status: partial
phase: 167-social-feed-moderation-ui
source: [167-VERIFICATION.md]
started: 2026-04-13T00:00:00Z
updated: 2026-04-13T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Navigate to social-moderation page and confirm page renders correctly for a logged-in client user
expected: Sidebar shows 'Social Moderation' link; clicking it shows the moderation queue page with heading 'Social Feed Moderation'
result: [pending]

### 2. Approve an item from a tenant account that has seeded social_feeds rows and verify it disappears from the list
expected: After clicking Approve, the item is removed optimistically and the action is persisted to social_feed_moderation with approved=true
result: [pending]

### 3. Reject an item and verify it disappears from the queue
expected: After clicking Reject, the item is removed optimistically and the action is persisted with approved=false
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
