# Phase 79: AI Designer - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can describe what they want in plain language and receive a complete, editable layout. The AI Designer lives inside the Layout Editor as a side panel. It accepts text prompts and optional image references, generates full scene designs with AI-generated visuals, and supports conversational refinement. This phase does NOT include scheduled generation, batch generation, or template marketplace features.

</domain>

<decisions>
## Implementation Decisions

### Prompt experience
- AI Designer panel lives inside the Layout Editor as a collapsible side panel
- Accepts both text prompts and image uploads (dual purpose: visual reference OR content to include)
- Image upload supports both use cases — user can upload a screenshot for style inspiration or actual content (logo, photo) to place into the layout
- Orientation selector in the panel — user picks landscape/portrait/custom before generating
- Optional "Use my brand" toggle — when on, pulls tenant brand colors, fonts, and logo into the generation

### Generation output
- Generates full scene designs — complete zones with text, images, backgrounds, and styling
- AI-generated visuals using image generation (not stock/placeholder) to match prompt context
- Output should be ready to use with minimal editing — not just wireframes or zone outlines

### Preview & refinement
- Conversational refinement — user can type follow-up prompts to iterate on the generated layout (e.g. "make the header bigger", "change the background color", "add a logo zone")
- AI adjusts the existing design based on follow-up instructions rather than regenerating from scratch

### Industry context
- No industry awareness — AI relies purely on the text prompt, ignores tenant industry setting
- Brand awareness is opt-in via the "Use my brand" toggle

### Claude's Discretion
- Panel UI details: example prompts, placeholder text, input size (single-line vs textarea)
- Whether this is a new panel or integrated with existing AI Suggestions panel
- Access gating (all users, plan-gated, or feature-flagged)
- Loading/feedback UX during generation (panel spinner vs canvas animation)
- Number of layout variations per prompt (one result vs multiple options)
- Layout model (zone-based vs freeform) based on existing architecture compatibility
- In-place update vs side-by-side comparison for refinements
- Undo behavior for AI changes
- Accept/apply flow (auto-applied vs explicit button)
- Prompt history tracking
- Image upload source (file picker only vs media library integration)
- Whether to reference existing user content (media library, playlists) during generation

</decisions>

<specifics>
## Specific Ideas

- User wants to be able to upload an image as either a visual reference ("make something like this") or as actual content to include in the layout — the AI should handle both cases intelligently
- Orientation selection is important — users need to generate for both landscape (16:9) and portrait (9:16) screen configurations
- Brand toggle gives users control: on-brand designs when they want consistency, generic designs when exploring new looks

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 79-ai-designer*
*Context gathered: 2026-02-22*
