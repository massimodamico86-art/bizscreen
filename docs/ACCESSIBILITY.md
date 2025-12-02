# Accessibility Guidelines

BizScreen follows WCAG 2.1 Level AA standards for accessibility.

## Skip to Content Link

A skip-to-content link is the first focusable element on every page. It allows keyboard users to bypass navigation and jump directly to the main content.

**Behavior:**
- Hidden by default (positioned off-screen)
- Appears when focused via Tab key
- Activating the link (Enter) moves focus to `<main id="main-content">`
- Styled with a visible focus indicator

**Implementation:**
```jsx
<a href="#main-content" className="skip-link">
  {t('accessibility.skipToContent')}
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

**CSS (index.css):**
```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  /* Appears at top: 1rem when focused */
}
.skip-link:focus {
  top: 1rem;
}
```

## Semantic Landmarks

Use HTML5 semantic elements to structure pages:

| Element | Purpose | Usage |
|---------|---------|-------|
| `<header>` | Page/section header | Top navigation bar |
| `<nav>` | Navigation links | Sidebar, navbar menus |
| `<main>` | Primary content | Main content area (one per page) |
| `<aside>` | Sidebar content | Sidebar navigation panel |
| `<footer>` | Page/section footer | Copyright, links |

**Requirements:**
- Each page must have exactly one `<main>` element
- The `<main>` must have `id="main-content"` for skip link target
- Use `<nav>` with appropriate `aria-label` for multiple nav regions

## Keyboard Focus

All interactive elements must have visible focus indicators.

**Global focus style (index.css):**
```css
:focus-visible {
  outline: 2px solid rgb(var(--color-border-focus));
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

**Focus Order:**
1. Skip link (first Tab stop)
2. Header/navigation
3. Sidebar navigation (if present)
4. Main content interactive elements
5. Footer links

## Button Accessibility

All buttons should:
- Have descriptive text or `aria-label` for icon-only buttons
- Be focusable (no `tabindex="-1"` unless intentional)
- Show clear focus-visible state
- Use `<button>` element (not `<div>` with click handler)

```jsx
// Good - icon button with aria-label
<button
  onClick={handleClose}
  aria-label="Close dialog"
  className="focus-visible:ring-2"
>
  <X aria-hidden="true" />
</button>
```

## Form Accessibility

Form fields must:
- Have associated `<label>` elements or `aria-label`
- Use `aria-describedby` for help text or errors
- Announce validation errors

```jsx
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-describedby="email-error"
/>
{error && <p id="email-error" role="alert">{error}</p>}
```

## Internationalization

Accessibility strings are translated in all supported locales:

| Locale | Skip Link Text |
|--------|---------------|
| en | Skip to main content |
| es | Saltar al contenido principal |
| pt | Pular para o conteúdo principal |
| fr | Aller au contenu principal |
| de | Zum Hauptinhalt springen |
| it | Vai al contenuto principale |

## Testing

**Manual keyboard testing:**
1. Tab through the page - all interactive elements should be reachable
2. Focus should be visible on all interactive elements
3. Skip link should appear first and function correctly
4. Enter/Space should activate buttons and links

**Screen reader testing:**
- VoiceOver (macOS): Cmd + F5
- NVDA (Windows): Free download
- Verify landmarks are announced
- Verify form labels are read
