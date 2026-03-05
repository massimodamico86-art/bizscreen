---
phase: 51-fix-bug-05-templates-layouts-pages-use-t
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/pages/LayoutsPage.jsx
  - src/pages/SvgTemplateGalleryPage.jsx
  - src/pages/TemplatesPage.jsx
autonomous: true
requirements: [BUG-05]
must_haves:
  truths:
    - "Layouts page uses orange/brand colors for all interactive elements, gradients, and accents"
    - "SVG Template Gallery page uses orange/brand colors for all interactive elements, gradients, and accents"
    - "Templates page uses orange/brand colors for active filter states and accent elements"
    - "All three pages look visually consistent with the rest of the app"
  artifacts:
    - path: "src/pages/LayoutsPage.jsx"
      provides: "Layouts gallery with brand-consistent colors"
      contains: "brand-500"
    - path: "src/pages/SvgTemplateGalleryPage.jsx"
      provides: "SVG template gallery with brand-consistent colors"
      contains: "brand-500"
    - path: "src/pages/TemplatesPage.jsx"
      provides: "Templates page with brand-consistent colors"
      contains: "brand-500"
  key_links:
    - from: "All three pages"
      to: "tailwind.config.js brand colors"
      via: "Tailwind class usage"
      pattern: "brand-[0-9]00"
---

<objective>
Fix BUG-05: Replace teal/emerald/green accent colors on Templates, Layouts, and SVG Template Gallery pages with the app's standard orange brand colors (brand-500: #F26F26).

Purpose: These three pages use a completely different teal/green color scheme that looks like a separate app. Aligning them with the brand-* palette from tailwind.config.js restores visual consistency.

Output: Three updated page files with all teal/emerald/green accent colors replaced by brand-* equivalents.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@tailwind.config.js — brand color palette (brand-50 through brand-900, primary is brand-500: #F26F26)
@BUGS.md — BUG-05 description

The app's standard theme uses:
- Primary buttons: `bg-brand-500 hover:bg-brand-600` or `bg-orange-500 hover:bg-orange-600`
- Focus rings: `focus:ring-brand-500/30 focus:border-brand-500` or `focus:ring-orange-500`
- Active/selected states: `border-brand-500 bg-brand-50 text-brand-700`
- Gradients: `from-amber-600 to-orange-500` or `from-brand-500 to-brand-600`
- Light backgrounds: `bg-brand-50`, `bg-brand-100`
- Text accents: `text-brand-600`, `text-brand-700`
- Hover card borders: `hover:border-brand-400`
- Spinners/loaders: `text-orange-500` or `text-brand-500`

Color mapping for replacements:
| From (teal/emerald/green) | To (brand/orange) |
|---------------------------|-------------------|
| teal-50, emerald-50 | brand-50 |
| teal-100, emerald-100 | brand-100 |
| teal-300, emerald-300 | brand-300 |
| teal-400, emerald-400 | brand-400 |
| teal-500, emerald-500 | brand-500 |
| teal-600, emerald-600 | brand-600 |
| teal-700, emerald-700 | brand-700 |
| green-100 | brand-100 |
| green-400 | brand-400 |
| green-500 | brand-500 |
| green-600 | brand-600 |
| from-teal-50 to-emerald-100 | from-brand-50 to-brand-100 |
| from-emerald-50 to-teal-100 | from-brand-50 to-brand-100 |
| from-teal-500 to-emerald-500 | from-brand-500 to-brand-600 |
| from-emerald-500 to-teal-500 | from-brand-500 to-brand-600 |

IMPORTANT: Do NOT change semantic green colors that indicate success/completion states (e.g., green checkmarks for "completed" status). Only change accent/brand colors.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace teal/emerald colors in LayoutsPage.jsx</name>
  <files>src/pages/LayoutsPage.jsx</files>
  <action>
Replace all teal and emerald color classes with brand equivalents throughout LayoutsPage.jsx. This file has ~50 instances of teal/emerald usage covering:

1. Card hover borders: `hover:border-teal-400` -> `hover:border-brand-400`
2. Gradient backgrounds on placeholder images: `from-teal-50 to-emerald-100` -> `from-brand-50 to-brand-100`
3. Icon colors in placeholders: `text-teal-300` -> `text-brand-300`
4. Links/text accents: `text-teal-600 hover:text-teal-700` -> `text-brand-600 hover:text-brand-700`
5. Search focus ring: `focus:ring-teal-500/30 focus:border-teal-500` -> `focus:ring-brand-500/30 focus:border-brand-500`
6. Primary buttons: `bg-teal-500 hover:bg-teal-600` -> `bg-brand-500 hover:bg-brand-600`
7. Active filter states: `border-teal-500 bg-teal-50 text-teal-700` -> `border-brand-500 bg-brand-50 text-brand-700`
8. Category active text: `bg-teal-50 text-teal-700 font-medium` -> `bg-brand-50 text-brand-700 font-medium`
9. Header gradient: `from-teal-500 to-emerald-500` -> `from-brand-500 to-brand-600`
10. Spinner: `text-teal-500` -> `text-brand-500`

NOTE: Leave the existing `from-amber-600 to-orange-500` gradient on line ~707 as-is (it is already correct).

Use find-and-replace for each pattern. Verify no teal or emerald classes remain after replacement.
  </action>
  <verify>
    <automated>grep -c "teal\|emerald" src/pages/LayoutsPage.jsx | grep -q "^0$" && echo "PASS: No teal/emerald in LayoutsPage" || echo "FAIL: teal/emerald still present"</automated>
  </verify>
  <done>LayoutsPage.jsx contains zero teal/emerald color classes. All accent colors use brand-* palette.</done>
</task>

<task type="auto">
  <name>Task 2: Replace emerald/teal colors in SvgTemplateGalleryPage.jsx</name>
  <files>src/pages/SvgTemplateGalleryPage.jsx</files>
  <action>
Replace all emerald and teal color classes with brand equivalents throughout SvgTemplateGalleryPage.jsx. This file has ~30 instances covering:

1. Active orientation filter: `bg-emerald-500 text-white` -> `bg-brand-500 text-white`
2. "Show all" links: `text-emerald-500 hover:text-emerald-600` -> `text-brand-500 hover:text-brand-600`
3. Card hover borders: `hover:border-emerald-400` -> `hover:border-brand-400`
4. Placeholder gradients: `from-emerald-50 to-teal-100` -> `from-brand-50 to-brand-100`
5. Placeholder icons: `text-emerald-300` -> `text-brand-300`
6. Link accents: `text-emerald-600 hover:text-emerald-700` -> `text-brand-600 hover:text-brand-700`
7. Header gradient: `from-emerald-500 to-teal-500` -> `from-brand-500 to-brand-600`
8. Active category text: `text-emerald-600 font-medium` -> `text-brand-600 font-medium`
9. Primary buttons: `bg-emerald-500 hover:bg-emerald-600` -> `bg-brand-500 hover:bg-brand-600`
10. Active tab/filter borders: `border-emerald-500 bg-emerald-50 text-emerald-700` -> `border-brand-500 bg-brand-50 text-brand-700`
11. Tags: `bg-emerald-100 text-emerald-700` -> `bg-brand-100 text-brand-700`
12. Tag close button hover: `hover:text-emerald-900` -> `hover:text-brand-900`

Use find-and-replace for each pattern. Verify no emerald or teal classes remain.
  </action>
  <verify>
    <automated>grep -c "teal\|emerald" src/pages/SvgTemplateGalleryPage.jsx | grep -q "^0$" && echo "PASS: No teal/emerald in SvgTemplateGalleryPage" || echo "FAIL: teal/emerald still present"</automated>
  </verify>
  <done>SvgTemplateGalleryPage.jsx contains zero teal/emerald color classes. All accent colors use brand-* palette.</done>
</task>

<task type="auto">
  <name>Task 3: Replace green accent colors in TemplatesPage.jsx</name>
  <files>src/pages/TemplatesPage.jsx</files>
  <action>
Replace green accent/brand colors in TemplatesPage.jsx (5 instances). These are UI accent colors, NOT semantic success indicators:

1. Line ~589: `focus-visible:ring-green-500` -> `focus-visible:ring-brand-500`
2. Line ~591: `bg-green-600 text-white` (active filter state) -> `bg-brand-600 text-white`
3. Line ~652: `text-green-600` (package icon accent) -> `text-brand-600`
4. Lines ~827-828: `bg-green-100` and `text-green-600` (check icon in success/CTA area) -> `bg-brand-100` and `text-brand-600`

These are all used for filter buttons, accent icons, and CTA elements - not for success/completion semantics. The Check icon on line 828 is part of a feature highlight card, not a completion indicator.
  </action>
  <verify>
    <automated>grep -n "green-[3-9]00" src/pages/TemplatesPage.jsx | grep -v "// status\|// success\|// semantic" | wc -l | xargs -I{} test {} -eq 0 && echo "PASS" || echo "Check remaining green classes"; grep -c "green-[3-9]00" src/pages/TemplatesPage.jsx</automated>
  </verify>
  <done>TemplatesPage.jsx green accent colors replaced with brand-* equivalents. No green-* classes used for UI accents.</done>
</task>

</tasks>

<verification>
Run after all tasks complete:

```bash
# 1. Verify no teal/emerald/green accent colors remain in the three files
echo "=== Checking LayoutsPage ===" && grep -c "teal\|emerald" src/pages/LayoutsPage.jsx
echo "=== Checking SvgTemplateGalleryPage ===" && grep -c "teal\|emerald" src/pages/SvgTemplateGalleryPage.jsx
echo "=== Checking TemplatesPage green ===" && grep -c "green-[3-6]00" src/pages/TemplatesPage.jsx

# 2. Verify brand colors are now used
echo "=== Brand usage LayoutsPage ===" && grep -c "brand-" src/pages/LayoutsPage.jsx
echo "=== Brand usage SvgTemplateGalleryPage ===" && grep -c "brand-" src/pages/SvgTemplateGalleryPage.jsx
echo "=== Brand usage TemplatesPage ===" && grep -c "brand-" src/pages/TemplatesPage.jsx

# 3. Verify app builds without errors
npm run build 2>&1 | tail -5
```

All three checks should show 0 remaining teal/emerald/green accent classes, positive brand-* usage counts, and successful build.
</verification>

<success_criteria>
- Zero teal/emerald classes in LayoutsPage.jsx and SvgTemplateGalleryPage.jsx
- Zero green accent classes in TemplatesPage.jsx (only semantic green if any)
- All three pages use brand-* palette consistently
- App builds without errors
- BUG-05 from BUGS.md is resolved
</success_criteria>

<output>
After completion, create `.planning/quick/51-fix-bug-05-templates-layouts-pages-use-t/51-SUMMARY.md`
</output>
