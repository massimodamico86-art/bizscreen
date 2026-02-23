---
status: complete
phase: 77-content-media-features
source: [77-01-SUMMARY.md, 77-02-SUMMARY.md]
started: 2026-02-22T20:00:00Z
updated: 2026-02-22T20:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Video Upload in Carousel
expected: In a listing's carousel media manager, clicking the video upload button opens the Cloudinary upload widget. Uploading an mp4 or webm file under 2 minutes adds the video to the carousel. Uploading a non-mp4/webm file or a video over 2 minutes shows a validation error.
result: pass

### 2. Video Mute Toggle
expected: Each video in the carousel has a mute/unmute toggle. Clicking it switches the icon between muted and unmuted states and persists the setting.
result: pass

### 3. Add Upcoming Event
expected: In the Property Details modal, clicking "Add Event" shows an inline form with title, date, start time, and end time fields. Submitting the form adds the event to the list in chronological order.
result: pass

### 4. Edit and Delete Event
expected: Clicking edit on an existing event replaces the event row with an inline edit form pre-filled with current values. Saving updates the event. Clicking delete removes the event from the list.
result: pass

### 5. Past Events Auto-Hide
expected: Events with dates in the past are automatically hidden from the events list. Only upcoming/future events are displayed.
result: pass

### 6. Graphics Library in Layout Editor
expected: In the layout editor, the Elements tab (left sidebar) has a "Graphics" section showing a browsable library with category filter pills, a search bar, a 3-column thumbnail grid, and clicking a graphic inserts it into the layout.
result: pass

### 7. Play Count Timeline for Media and Playlists
expected: On the content analytics detail page, media and playlist content types now show a play count timeline chart (previously only scenes had this). The chart displays play counts over time.
result: pass

### 8. Playlist Appearances Card for Media
expected: On the content analytics page for a media item, a "Playlist Appearances" card shows which playlists include that media item, with a per-playlist breakdown.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
