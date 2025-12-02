# BizScreen Copy Style Guide

A brief guide for writing consistent, user-friendly copy across the application.

## Tone

- **Friendly but professional** - Like a helpful colleague, not a robot
- **Calm and trustworthy** - Never alarming or condescending
- **Clear and concise** - Every word earns its place
- **Empowering** - Help users feel capable and in control

## Voice & Person

- **For tenant/user**: Second person ("you", "your screens", "your playlist")
- **For team members**: Third person when referring to others ("John added a screen")
- **For system messages**: First person plural sparingly ("We couldn't load...")

## Preferred Terminology

| Use This | Not This |
|----------|----------|
| screen | device, display, monitor (except in technical contexts) |
| playlist | loop, rotation, slideshow |
| layout | template layout, design |
| campaign | promotion, ad campaign |
| media | assets, files, content (when referring to uploaded items) |
| offline | disconnected, unavailable |
| pairing | connecting, linking (for screen setup) |

## Button Labels

- Use **action verbs** that describe the outcome
- Keep labels **2-3 words** maximum
- Be specific about what will happen

**Good examples:**
- "Add Screen"
- "Create Playlist"
- "Upload Media"
- "Assign Campaign"
- "Save Changes"

**Avoid:**
- "Submit"
- "OK"
- "Click Here"
- "Process"

## Success Messages

- Use **past tense** to confirm completion
- Include the **subject** when helpful
- Keep it brief

**Pattern:** `[Subject] [past tense verb]`

**Examples:**
- "Playlist saved"
- "Screen added successfully"
- "Changes published"
- "Media uploaded"

## Error Messages

Follow this three-part pattern:

1. **What happened** (short title)
2. **Why** (brief explanation, if known)
3. **What to do next** (action or suggestion)

**Pattern:**
```
Title: Something went wrong
Body: We couldn't [action] right now. [Reason if known].
CTA: Try again / Reload / Contact support
```

**Examples:**

```
Title: Couldn't save playlist
Body: There was a connection issue. Your changes are still here.
CTA: Try again
```

```
Title: Screen offline
Body: This screen hasn't connected in over 5 minutes.
CTA: Check connection
```

## Empty States

Help users understand what goes here and how to get started.

**Pattern:**
```
Title: You don't have any [items] yet
Subtitle: [Brief explanation of what this is for]
CTA: [Primary action to create first item]
```

**Examples:**

```
Title: You don't have any screens yet
Subtitle: Add a screen to start showing content on a TV or display.
CTA: Add Screen
```

```
Title: No playlists created
Subtitle: Playlists let you organize media into loops that play on your screens.
CTA: Create Playlist
```

## Tooltips & Helper Text

- **Maximum 1-2 short sentences**
- Explain the "why" or "what", not the "how"
- Don't repeat the label

**Good:** "Higher priority campaigns override lower ones when schedules overlap."
**Bad:** "Set the priority level for this campaign."

## Numbers & Formatting

- Use **numerals** for counts: "3 screens", "12 items"
- Use **words** for zero: "No screens" or "You don't have any..."
- Include **units**: "5 minutes", "2 GB", "30 seconds"

## Capitalization

- **Sentence case** for most UI text
- **Title Case** for page titles and navigation items
- **lowercase** for inline labels and helper text

## i18n Guidelines

- All user-facing strings go through `t('key.path', 'English fallback')`
- Organize keys by feature area: `dashboard.`, `screens.`, `playlists.`, etc.
- Use descriptive key names: `screens.emptyState.title`, not `screens.empty1`
- Keep fallback text identical to en.json value
