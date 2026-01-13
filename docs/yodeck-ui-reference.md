# Yodeck UI Reference Guide

> Reference documentation based on captured Yodeck UI (December 2025).
> Use this as inspiration for BizScreen's design system - DO NOT copy code verbatim.

## Table of Contents
1. [Design Tokens](#design-tokens)
2. [Layout Patterns](#layout-patterns)
3. [Component Patterns](#component-patterns)
4. [Empty States](#empty-states)
5. [BizScreen Mapping](#bizscreen-mapping)

---

## Design Tokens

### Colors

| Token | Yodeck Value | BizScreen Equivalent | Usage |
|-------|--------------|---------------------|-------|
| Primary Brand | `#F26F26` | `brand.500` | Buttons, links, active states |
| Primary Hover | `#DE580D` | `brand.600` | Button hover, link hover |
| Background | `#FFFFFF` | `white` | Cards, sidebar |
| Page Background | `#F5F7FA` | `gray.50` | Page canvas |
| Text Primary | `#1a1a1a` | `gray.900` | Headings |
| Text Secondary | `#666666` | `gray.500` | Descriptions |
| Border | `#E5E7EB` | `gray.200` | Card borders |
| Success (Online) | `#1BB783` | `emerald.500` | Online status |
| Error (Offline) | `#D35954` | `red.500` | Offline status |
| Warning | `#F0AD4E` | `amber.500` | Warnings |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page Title | Open Sans | 24px | 600 (semibold) |
| Card Title | Open Sans | 16px | 500 (medium) |
| Body Text | Open Sans | 14px | 400 (regular) |
| Small/Caption | Open Sans | 12px | 400 (regular) |
| Button | Open Sans | 14px | 500 (medium) |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing |
| sm | 8px | Icon gaps |
| md | 16px | Default padding |
| lg | 24px | Section spacing |
| xl | 32px | Page margins |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 4px | Inputs, small buttons |
| md | 8px | Cards, modals |
| lg | 12px | Large cards |
| xl | 16px | Hero cards |
| full | 9999px | Pills, badges |

### Shadows

```css
/* Card shadow - subtle */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

/* Elevated shadow - dropdowns, modals */
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

/* Focus ring */
box-shadow: 0 0 0 3px rgba(242, 111, 38, 0.3);
```

---

## Layout Patterns

### App Shell Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [Logo]              Header          [Bell] [User] [Actions] │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Sidebar   │              Main Content Area                 │
│            │                                                │
│  - Welcome │   ┌─────────────────────────────────────────┐  │
│  - Dash    │   │  Page Title                     [CTA]   │  │
│  - Media ▾ │   └─────────────────────────────────────────┘  │
│  - Apps    │                                                │
│  - Lists   │   Content here...                              │
│  - Layouts │                                                │
│  - Sched   │                                                │
│  - Screens │                                                │
│            │                                                │
│ [KnowHub]  │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### Sidebar Specs
- **Width**: 210px expanded, 60px collapsed
- **Background**: White (`#FFFFFF`)
- **Logo**: Top-left, 32px height
- **Nav items**: 44px height, 16px horizontal padding
- **Active state**: Orange text, 3px left border (orange)
- **Hover state**: Light gray background (`#F5F7FA`)
- **Collapse toggle**: Top-right arrow icon

### Header Specs
- **Height**: 64px
- **Background**: White with bottom border
- **Page title**: Left-aligned, 24px, semibold
- **Actions**: Right-aligned with 16px gap

---

## Component Patterns

### Buttons

#### Primary Button (CTA)
```jsx
// Yodeck style
<button className="
  bg-[#F26F26] hover:bg-[#DE580D]
  text-white font-medium
  px-6 py-2.5
  rounded-lg
  transition-colors
">
  Add Screen
</button>
```

#### Secondary Button
```jsx
<button className="
  bg-white hover:bg-gray-50
  text-gray-700
  border border-gray-200 hover:border-gray-300
  px-4 py-2
  rounded-lg
">
  Cancel
</button>
```

#### Ghost/Text Button
```jsx
<button className="
  text-[#F26F26] hover:text-[#DE580D]
  font-medium
">
  Learn more →
</button>
```

### Cards

#### Standard Card
```jsx
<div className="
  bg-white
  border border-gray-200
  rounded-xl
  p-5
  shadow-sm
">
  {/* content */}
</div>
```

#### Welcome/Hero Card (Orange Banner)
```jsx
<div className="
  bg-[#F26F26]
  text-white
  rounded-xl
  p-6
">
  <h2 className="text-xl font-semibold">Hi, {userName}</h2>
  <p className="opacity-90 mt-1">A fresh Dashboard greets you today!</p>
</div>
```

### Tabs

#### Pill Tabs (Layouts page)
```jsx
<div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
  <button className="px-4 py-2 rounded-md bg-white shadow-sm">
    My Layouts
  </button>
  <button className="px-4 py-2 rounded-md text-gray-600">
    Discover Templates
  </button>
</div>
```

### Filter Chips

```jsx
<div className="flex gap-2">
  <button className="
    px-4 py-1.5 rounded-full
    bg-gray-900 text-white  // active
    text-sm font-medium
  ">
    For You
  </button>
  <button className="
    px-4 py-1.5 rounded-full
    bg-white border border-gray-200
    text-gray-700
    text-sm
    hover:border-gray-300
  ">
    Social
  </button>
</div>
```

### Search Bar

```jsx
<div className="relative">
  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
  <input
    type="text"
    placeholder="Search templates (e.g. menu, welcome)"
    className="
      w-full pl-11 pr-4 py-3
      bg-white
      border border-gray-200
      rounded-full
      text-sm
      focus:outline-none focus:ring-2 focus:ring-[#F26F26]/30 focus:border-[#F26F26]
    "
  />
</div>
```

### Status Badge (Pill)

```jsx
<span className="
  inline-flex items-center gap-1.5
  px-3 py-1.5 rounded-full
  bg-emerald-50 text-emerald-700
  text-xs font-medium
">
  <span className="w-2 h-2 rounded-full bg-emerald-500" />
  Online
</span>
```

---

## Empty States

### Pattern Structure
All Yodeck empty states follow this exact structure:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│        You don't have any [Items].              │  ← Large title
│                                                 │
│           ┌───────────────────┐                 │
│           │                   │                 │
│           │   Illustration    │                 │  ← Custom illustration
│           │                   │                 │
│           └───────────────────┘                 │
│                                                 │
│    [Items] are [description of feature].        │  ← Description
│    Add one and start creating!                  │
│                                                 │
│           ┌─────────────────┐                   │
│           │   Add [Item]    │                   │  ← Orange CTA
│           └─────────────────┘                   │
│                                                 │
│    Do you want to view the [Items] tour?        │  ← Tour link
│                                                 │
└─────────────────────────────────────────────────┘
```

### Empty State Examples by Page

| Page | Title | Description | CTA |
|------|-------|-------------|-----|
| Screens | "You don't have any Screens." | "Your Yodeck Screens are paired with physical devices, through a unique registration code." | "Add Screen" |
| Playlists | "You don't have any Playlists." | "Playlists are sequences of media, apps or layouts, looping constantly on your screen, like a slideshow." | "Add Playlist" |
| Schedules | "You don't have any Schedules." | "Create Schedules to determine exactly when your content goes live with events, just like managing a calendar." | "Add Schedule" |
| Apps | "You don't have any Apps." | "Integrate real-time updates, social media feeds, custom dashboards and so much more with Yodeck Apps." | "Browse Apps" |

### Illustration Style
- Light, line-art style with subtle fills
- Muted colors (light blue/gray backgrounds)
- Device mockups showing the feature in action
- Consistent sizing (~200-300px width)

---

## BizScreen Mapping

### Color Variables (Tailwind)

```js
// tailwind.config.js
colors: {
  brand: {
    50: '#FFF7F0',
    100: '#FFEDE0',
    200: '#FFD4B8',
    300: '#FFB080',
    400: '#FF8C48',
    500: '#F26F26',  // Primary
    600: '#DE580D',  // Hover
    700: '#B84A0A',
    800: '#923B08',
    900: '#6B2C06',
  }
}
```

### Component Naming Convention

| Yodeck | BizScreen | Notes |
|--------|-----------|-------|
| n/a | `<AppShell>` | Main layout wrapper |
| n/a | `<Sidebar>` | Navigation sidebar |
| n/a | `<PageHeader>` | Page title + actions |
| n/a | `<EmptyState>` | Empty content placeholder |
| n/a | `<FilterChips>` | Horizontal filter buttons |
| n/a | `<TemplateCard>` | Layout/template preview |
| n/a | `<StatusBadge>` | Online/offline indicator |

### Improvements Over Yodeck

1. **Accessibility**: All components include proper ARIA labels and keyboard navigation
2. **Responsive**: Mobile-first design with collapsible sidebar
3. **Dark Mode Ready**: CSS variables support theme switching
4. **TypeScript**: Full type definitions for all components
5. **Animation**: Smooth transitions using Framer Motion

---

## Reference Files

The following captured files were used to create this documentation:

| File | Description |
|------|-------------|
| `capture/screens/dashboard.png` | Dashboard layout, cards, sidebar |
| `capture/screens/screens.png` | Empty state pattern |
| `capture/screens/playlists.png` | Empty state pattern |
| `capture/screens/layouts.png` | Template gallery, tabs, filters |
| `capture/screens/apps.png` | Empty state pattern |
| `capture/screens/schedules.png` | Empty state pattern |
| `capture/css/branding-colors-branded.css` | Brand color variables |
| `capture/css/styles_*.css` | Component styles |
