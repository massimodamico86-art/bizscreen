# Yodeck-Style Layout Editor

The Layout Editor provides a visual drag-and-drop interface for creating multi-element screen layouts. It supports text, images, widgets, and shapes with real-time preview and Cloudinary image hosting.

## Features

- **Visual Canvas**: Centered 16:9 canvas with dark grid overlay
- **Drag & Resize**: Move and resize elements with mouse
- **Smart Guides**: Snap-to-alignment when positioning elements
- **Element Types**: Text, Image, Widget (clock, date, weather, QR), Shape
- **Keyboard Shortcuts**: Full keyboard support for power users
- **Undo/Redo**: 50-step history for changes
- **Auto-Save**: Debounced saves (800ms) to Supabase
- **Image Editing**: Pixie editor integration with Cloudinary uploads

## Accessing the Editor

Navigate to a layout using the pattern: `/yodeck-layout-{layoutId}` or `/yodeck-layout-new` for a new layout.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected element |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` or `Cmd/Ctrl + Y` | Redo |
| `Cmd/Ctrl + S` | Save immediately |
| `Cmd/Ctrl + D` | Duplicate selected element |
| `Escape` | Deselect element |
| `Arrow Keys` | Nudge element position |
| `Shift + Arrow Keys` | Larger nudge |

## Element Types

### Text Elements
```javascript
{
  type: 'text',
  props: {
    text: 'Hello World',
    fontSize: 32,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    align: 'center',
    color: '#ffffff',
    backgroundColor: '#000000' // optional
  }
}
```

### Image Elements
```javascript
{
  type: 'image',
  props: {
    url: 'https://example.com/image.jpg',
    fit: 'cover', // 'cover' | 'contain' | 'fill'
    borderRadius: 8,
    opacity: 1
  }
}
```

### Widget Elements
```javascript
{
  type: 'widget',
  widgetType: 'clock', // 'clock' | 'date' | 'weather' | 'qr' | 'data'
  props: {
    textColor: '#ffffff',
    format: '12h'
  }
}
```

### Shape Elements
```javascript
{
  type: 'shape',
  props: {
    shapeType: 'rectangle', // 'rectangle' | 'circle' | 'line'
    fill: '#3b82f6',
    stroke: '#ffffff',
    strokeWidth: 2,
    borderRadius: 8,
    opacity: 1
  }
}
```

## Position System

All positions are expressed as fractions (0-1) of the canvas dimensions:

```javascript
position: {
  x: 0.1,      // 10% from left
  y: 0.2,      // 20% from top
  width: 0.3,  // 30% of canvas width
  height: 0.1  // 10% of canvas height
}
```

## Database Schema

The layouts table stores layout data:

```sql
layouts (
  id UUID,
  owner_id UUID,
  name TEXT,
  description TEXT,
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  background_color TEXT,
  background_image TEXT,
  aspect_ratio TEXT DEFAULT '16:9',
  data JSONB, -- stores elements array
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## API / Hooks

### useLayout Hook

```javascript
import { useLayout } from '../hooks/useLayout';

const {
  layout,           // Current layout data
  isLoading,        // Loading state
  error,            // Error message
  isSaving,         // Save in progress
  hasUnsavedChanges,
  saveLayout,       // Debounced save
  saveLayoutNow,    // Immediate save
  updateLayout,     // Update layout fields
  updateElement,    // Update single element
  addElement,       // Add new element
  deleteElement,    // Delete element
  duplicateElement, // Duplicate element
} = useLayout(layoutId, {
  debounceMs: 800,
  onSaveSuccess: (msg) => showToast({ type: 'success', message: msg }),
  onSaveError: (msg) => showToast({ type: 'error', message: msg }),
});
```

### Cloudinary Service

```javascript
import { uploadBase64ToCloudinary } from '../services/cloudinaryService';

const result = await uploadBase64ToCloudinary(dataUrl, {
  folder: 'bizscreen/layouts',
});
// result.url - Cloudinary URL
// result.optimizedUrl - Auto-optimized URL
```

## Environment Variables

Required for Cloudinary integration:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-preset
```

## Layout Templates Gallery

The Layouts page includes a template gallery for discovering and using pre-built layouts.

### Navigation

Click **Layouts** in the sidebar to access:
- **My Layouts** tab: View and manage your custom layouts
- **Discover Templates** tab: Browse global templates by category and orientation

### Using a Template

1. Navigate to **Layouts → Discover Templates**
2. Filter by category (e.g., "Retail", "Hospitality") or orientation (16:9, 9:16, square)
3. Click **Use this template** on any template card
4. The template is cloned to your layouts and the editor opens automatically

### Template Categories

- **General** - All-purpose layouts
- **Retail** - Sales, promotions, product displays
- **Hospitality** - Restaurants, hotels, cafes
- **Corporate** - Office, lobby, meeting rooms
- **Events** - Announcements, countdowns
- **Information** - Directories, wayfinding

## Template Database Schema

```sql
layout_templates (
  id UUID PRIMARY KEY,
  tenant_id UUID,              -- NULL for global templates
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'General',
  orientation TEXT DEFAULT '16_9',  -- '16_9' | '9_16' | 'square'
  thumbnail_url TEXT,
  background_color TEXT DEFAULT '#1a1a2e',
  background_image_url TEXT,
  data JSONB DEFAULT '{"elements": []}',
  width INTEGER DEFAULT 1920,
  height INTEGER DEFAULT 1080,
  use_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### RLS Policies

- **Global templates** (`tenant_id IS NULL`): Readable by all authenticated users
- **Tenant templates** (`tenant_id IS NOT NULL`): Only readable by that tenant

## Template Service

```javascript
import {
  fetchLayoutTemplates,
  cloneTemplateToLayout
} from '../services/layoutTemplateService';

// Fetch templates with filters
const templates = await fetchLayoutTemplates({
  category: 'Retail',
  orientation: '16_9',
  search: 'sale',
  limit: 20,
});

// Clone template to user's layouts
const newLayout = await cloneTemplateToLayout({
  templateId: 'template-uuid',
  ownerId: 'user-uuid',
  name: 'My Custom Layout', // optional
});
```

## useLayoutTemplates Hook

```javascript
import { useLayoutTemplates } from '../hooks/useLayoutTemplates';

const {
  templates,          // Array of layout templates
  categories,         // Available categories
  isLoading,          // Loading state
  error,              // Error message
  hasMore,            // More templates available
  filters,            // Current filter state
  setFilters,         // Update filters
  fetchMore,          // Load more templates
  cloneTemplate,      // Clone template to user layouts
  refresh,            // Refresh template list
} = useLayoutTemplates({
  category: null,
  orientation: null,
  search: '',
});

// Clone a template
const handleUseTemplate = async (template) => {
  const layout = await cloneTemplate(template.id);
  navigate(`yodeck-layout-${layout.id}`);
};
```

## Media Library Integration

The Layout Editor integrates with the Media Library for unified asset management.

### Media Tab in Layout Editor

The left sidebar's **Media** tab shows all available media assets with:
- **Search**: Find assets by name
- **Type Filter**: Images, Videos, Audio
- **Orientation Filter**: Landscape, Portrait, Square
- **Global Assets**: Shared assets (marked with GLOBAL badge) available to all tenants
- **Insert to Canvas**: Click any asset to insert it at the canvas center

### Inserting Media

```javascript
// When user clicks an asset in the sidebar
handleInsertMedia(asset) {
  // For images/videos, creates element with:
  // - Aspect-aware dimensions
  // - mediaId reference for tracking
  // - Centered position on canvas
}
```

### MediaDetailModal

Click any media asset to view its details:
- Large preview (image/video/audio player)
- Metadata: URL, dimensions, file size, created date
- Edit mode: name, description, tags
- Actions: Delete, Replace File, Edit in Pixie (images)

### Global vs Tenant Media

| Type | `owner_id` | Visibility | Edit/Delete |
|------|------------|------------|-------------|
| Global | `NULL` | All tenants | Super admin only |
| Tenant | User UUID | Owner only | Owner & admins |

### useMedia Hook

```javascript
import { useMedia } from '../hooks/useMedia';

const {
  assets,           // Array of media assets
  isLoading,        // Loading state
  error,            // Error message
  hasMore,          // More assets available
  total,            // Total asset count
  filters,          // Current filter state
  setFilters,       // Update filters
  fetchMore,        // Load more assets
  refresh,          // Refresh list
  createAsset,      // Create new asset
  updateAsset,      // Update asset metadata
  deleteAsset,      // Soft delete asset
  cloneAsset,       // Clone global to tenant
  selectedIds,      // Multi-select state
  bulkDelete,       // Bulk delete selected
} = useMedia({
  type: null,          // 'image' | 'video' | 'audio' | null
  orientation: null,   // 'landscape' | 'portrait' | 'square' | null
  search: '',
  includeGlobal: true,
  pageSize: 24,
});
```

### Media Database Schema

```sql
media_assets (
  id UUID PRIMARY KEY,
  owner_id UUID,          -- NULL for global assets
  name TEXT NOT NULL,
  type TEXT NOT NULL,     -- 'image' | 'video' | 'audio' | 'document' | 'web_page'
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  public_id TEXT,         -- Cloudinary public ID
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  duration NUMERIC,
  mime_type TEXT,
  orientation TEXT,       -- Auto-calculated: 'landscape' | 'portrait' | 'square'
  tags TEXT[],
  deleted_at TIMESTAMPTZ, -- Soft delete timestamp
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Media RPCs

```sql
-- Clone a global asset to tenant
SELECT clone_media_to_tenant(
  p_media_id UUID,
  p_new_owner_id UUID,
  p_new_name TEXT DEFAULT NULL
) RETURNS UUID;

-- Soft delete (sets deleted_at)
SELECT soft_delete_media(p_media_id UUID) RETURNS BOOLEAN;

-- Restore soft-deleted asset
SELECT restore_deleted_media(p_media_id UUID) RETURNS BOOLEAN;
```

## Migrations

- `084_layout_editor_data.sql` - Adds `data` JSONB column to layouts
- `085_seed_layout_templates.sql` - (Legacy) Creates example layouts
- `086_layout_templates.sql` - Creates `layout_templates` table with RLS, adds `template_id` FK to layouts
- `087_seed_layout_templates.sql` - Seeds global layout templates
- `088_media_library_enhancements.sql` - Adds Cloudinary public_id, orientation, soft delete, global assets support

## File Structure

```
src/
├── components/
│   ├── layout-editor/
│   │   ├── index.js              # Exports
│   │   ├── types.js              # Type definitions & helpers
│   │   ├── LayoutEditorCanvas.jsx # Main canvas with drag/resize
│   │   ├── LayoutElementRenderer.jsx # Element rendering
│   │   ├── LayoutPropertiesPanel.jsx # Right sidebar
│   │   ├── LeftSidebar.jsx       # Add element sidebar + media integration
│   │   ├── TopToolbar.jsx        # Toolbar with actions
│   │   └── PixieEditorModal.jsx  # Image editor modal
│   └── media/
│       ├── index.js              # Exports
│       └── MediaDetailModal.jsx  # Asset detail/edit modal
├── hooks/
│   ├── useLayout.js          # Supabase CRUD hook for layouts
│   ├── useLayoutTemplates.js # Template gallery hook
│   └── useMedia.js           # Media assets CRUD with filters
├── pages/
│   ├── LayoutEditor/
│   │   ├── index.js
│   │   └── YodeckLayoutEditorPage.jsx
│   ├── LayoutTemplates/
│   │   ├── index.js
│   │   └── LayoutTemplatesPage.jsx # Gallery page with tabs
│   └── MediaLibraryPage.jsx      # Full media management page
└── services/
    ├── cloudinaryService.js      # Image upload service
    ├── layoutTemplateService.js  # Template CRUD operations
    └── mediaService.js           # Media CRUD operations

supabase/migrations/
├── 084_layout_editor_data.sql
├── 085_seed_layout_templates.sql
├── 086_layout_templates.sql
├── 087_seed_layout_templates.sql
└── 088_media_library_enhancements.sql
```
