---
phase: quick-82
plan: 82
type: execute
wave: 1
depends_on: []
files_modified:
  - src/App.jsx
  - src/pages/PlaylistEditorPage.jsx
  - src/pages/components/PlaylistEditorComponents.jsx
  - src/layouts/Layout1.jsx
  - src/layouts/Layout2.jsx
  - src/layouts/Layout3.jsx
  - src/layouts/Layout4.jsx
autonomous: true
requirements: [BUG-Q76-01, BUG-Q79-01, BUG-Q79-02, BUG-Q63-01]

must_haves:
  truths:
    - "Create Scene button on ScenesPage opens the IndustrySelectionModal"
    - "Playlist editor toolbar has a Share/Preview Links button that opens PreviewLinksModal"
    - "Preview link 'open in new tab' anchor has a valid URL href, not [object Object]"
    - "TV layouts substitute {{first-name}} and {{last-name}} placeholders with guest data"
  artifacts:
    - path: "src/App.jsx"
      provides: "onShowAutoBuild prop wired to ScenesPage"
      contains: "onShowAutoBuild"
    - path: "src/pages/PlaylistEditorPage.jsx"
      provides: "Share button in editor header toolbar"
      contains: "setShowPreviewModal"
    - path: "src/pages/components/PlaylistEditorComponents.jsx"
      provides: "Fixed formatPreviewLink usage"
      contains: "link.url"
    - path: "src/layouts/Layout1.jsx"
      provides: "Placeholder substitution in welcomeGreeting"
      contains: "replacePlaceholders"
  key_links:
    - from: "src/App.jsx"
      to: "src/pages/ScenesPage.jsx"
      via: "onShowAutoBuild prop"
      pattern: "onShowAutoBuild.*setShowIndustryModal"
    - from: "src/pages/PlaylistEditorPage.jsx"
      to: "src/pages/components/PlaylistEditorComponents.jsx"
      via: "showPreviewModal state"
      pattern: "setShowPreviewModal\\(true\\)"
---

<objective>
Fix 4 known bugs discovered during QA walkthroughs: BUG-Q76-01 (Create Scene button non-functional), BUG-Q79-01 (missing Share button in playlist editor), BUG-Q79-02 (broken preview link href), and BUG-Q63-01 (raw placeholders on TV layouts).

Purpose: Close all open bugs from QA walkthrough phases 63, 76, and 79.
Output: All 4 bugs fixed, build passes.
</objective>

<execution_context>
@/Users/massimodamico/.claude/get-shit-done/workflows/execute-plan.md
@/Users/massimodamico/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/BUGS.md

<interfaces>
<!-- ScenesPage expects onShowAutoBuild prop -->
From src/pages/ScenesPage.jsx line 268:
```jsx
export default function ScenesPage({ onNavigate, onShowToast, onShowAutoBuild })
```

ScenesPage.handleCreateScene (lines 345-349):
```jsx
function handleCreateScene() {
  if (onShowAutoBuild) {
    onShowAutoBuild();
  }
}
```

<!-- App.jsx currently renders ScenesPage WITHOUT onShowAutoBuild (line 630) -->
```jsx
'scenes': <ScenesPage onShowToast={showToast} onNavigate={setCurrentPage} />
```

<!-- IndustrySelectionModal signature -->
From src/components/onboarding/IndustrySelectionModal.jsx:
```jsx
export function IndustrySelectionModal({ isOpen, onClose, onSelect, currentIndustry })
```
Exported from: src/components/onboarding/index.js

<!-- PlaylistEditorPage header toolbar area (lines 263-354) -->
Settings button and Done button are in `<div className="flex items-center gap-2">` at line 263.
showPreviewModal and setShowPreviewModal already destructured at lines 92-93.
PreviewLinksModal already rendered at line 746.

<!-- PlaylistEditorComponents.jsx line 485 - broken href -->
```jsx
<a href={formatPreviewLink(link.token)} target="_blank" ...>
```
formatPreviewLink returns an object, not a string. link.url contains the actual URL.

<!-- Layout1-4 all render welcomeGreeting raw -->
```jsx
welcomeGreeting = "Welcome!"  // default
// ...
<h1>{welcomeGreeting}</h1>  // renders "Welcome {{first-name}} {{last-name}}!" literally
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire Create Scene button and fix playlist preview link bugs</name>
  <files>src/App.jsx, src/pages/PlaylistEditorPage.jsx, src/pages/components/PlaylistEditorComponents.jsx</files>
  <action>
**BUG-Q76-01 — Wire onShowAutoBuild in App.jsx:**

1. In App.jsx, add state: `const [showIndustryModal, setShowIndustryModal] = useState(false);`
2. Import IndustrySelectionModal: `import { IndustrySelectionModal } from './components/onboarding';`
3. On line 630, add the missing prop to ScenesPage:
   ```jsx
   'scenes': <ScenesPage onShowToast={showToast} onNavigate={setCurrentPage} onShowAutoBuild={() => setShowIndustryModal(true)} />
   ```
4. Render IndustrySelectionModal somewhere near the other modals in App.jsx's return JSX:
   ```jsx
   <IndustrySelectionModal
     isOpen={showIndustryModal}
     onClose={() => setShowIndustryModal(false)}
     onSelect={(industry) => {
       setShowIndustryModal(false);
       showToast(`Selected industry: ${industry}`, 'success');
     }}
   />
   ```

**BUG-Q79-01 — Add Share button to playlist editor toolbar:**

1. In PlaylistEditorPage.jsx, add `Share2` (or `Link`) to the lucide-react import.
2. In the header toolbar div (line 263, `<div className="flex items-center gap-2">`), add a Share button BEFORE the Settings button:
   ```jsx
   <button
     onClick={() => setShowPreviewModal(true)}
     className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
     title="Share preview link"
   >
     <Share2 size={18} />
   </button>
   ```

**BUG-Q79-02 — Fix formatPreviewLink misuse:**

1. In PlaylistEditorComponents.jsx line 485, change:
   ```jsx
   <a href={formatPreviewLink(link.token)} ...>
   ```
   to:
   ```jsx
   <a href={link.url || `/preview/${link.token}`} ...>
   ```
   This uses the full URL from the link object, with a fallback to construct the path from the token.
  </action>
  <verify>
    <automated>cd /Users/massimodamico/bizscreen && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - ScenesPage receives onShowAutoBuild prop that opens IndustrySelectionModal
    - Playlist editor toolbar has a Share button that sets showPreviewModal(true)
    - Preview link anchor uses link.url (or /preview/${link.token}) instead of formatPreviewLink(link.token)
    - Build succeeds with no errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Add placeholder substitution to TV layout components</name>
  <files>src/layouts/Layout1.jsx, src/layouts/Layout2.jsx, src/layouts/Layout3.jsx, src/layouts/Layout4.jsx</files>
  <action>
**BUG-Q63-01 — Replace raw {{first-name}} {{last-name}} placeholders with guest data:**

The 4 TV layout components (Layout1-4) receive `welcomeGreeting` as a prop and render it directly. When the greeting contains `{{first-name}}` or `{{last-name}}`, these appear literally on the TV screen.

1. Create a shared helper function (add at the top of each Layout file, or better, create a small utility). Since these are simple layout components, add a local helper in each file to keep changes minimal:

   ```jsx
   function replacePlaceholders(text, guestData) {
     if (!text) return text;
     let result = text;
     const firstName = guestData?.firstName || guestData?.first_name || '';
     const lastName = guestData?.lastName || guestData?.last_name || '';
     result = result.replace(/\{\{first-name\}\}/gi, firstName);
     result = result.replace(/\{\{last-name\}\}/gi, lastName);
     return result;
   }
   ```

2. Each Layout component (Layout1-4) receives props via destructuring. Add `guestData` to the destructured props (with default `{}`).

3. Replace the raw `{welcomeGreeting}` render with `{replacePlaceholders(welcomeGreeting, guestData)}` in each Layout component:
   - Layout1.jsx line 130
   - Layout2.jsx line 119
   - Layout3.jsx lines 129-130
   - Layout4.jsx line 131

4. Also apply substitution to `welcomeMessage` in each layout (it may also contain placeholders):
   - Layout1.jsx line 132 area
   - Layout2.jsx line 121 area
   - Layout3.jsx line 132 area
   - Layout4.jsx line 133 area

Note: The Listings feature is legacy and not in main sidebar navigation. The guestData prop will be undefined when no guest is checked in, which means placeholders will be replaced with empty strings -- this is acceptable behavior (showing "Welcome !" instead of "Welcome {{first-name}} {{last-name}}!"). The WelcomeMessageForm.jsx tip text (line 61) that explains the placeholder syntax should NOT be modified -- it correctly documents how placeholders work.
  </action>
  <verify>
    <automated>cd /Users/massimodamico/bizscreen && npx vite build 2>&1 | tail -5</automated>
  </verify>
  <done>
    - All 4 Layout components (Layout1-4) apply replacePlaceholders to welcomeGreeting and welcomeMessage
    - Placeholders {{first-name}} and {{last-name}} are substituted with guestData values
    - When guestData is absent, placeholders are replaced with empty strings (no raw mustache syntax shown)
    - Build succeeds
  </done>
</task>

</tasks>

<verification>
- `npx vite build` completes without errors
- grep confirms onShowAutoBuild is passed to ScenesPage in App.jsx
- grep confirms Share2/Link icon button exists in PlaylistEditorPage.jsx calling setShowPreviewModal
- grep confirms formatPreviewLink(link.token) no longer used as href in PlaylistEditorComponents.jsx
- grep confirms replacePlaceholders is used in all 4 Layout files
</verification>

<success_criteria>
- All 4 bugs (BUG-Q76-01, BUG-Q79-01, BUG-Q79-02, BUG-Q63-01) are fixed
- Build passes cleanly
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/quick/82-fix-known-bugs-bug-q76-01-bug-q79-01-bug/82-SUMMARY.md`
</output>
