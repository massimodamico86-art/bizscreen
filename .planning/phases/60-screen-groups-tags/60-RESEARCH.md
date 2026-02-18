# Phase 60: Screen Groups & Tags - Research

**Researched:** 2026-02-18
**Domain:** Screen group tagging, filtering, content push, and bulk operations
**Confidence:** HIGH

## Summary

Phase 60 adds tag management, tag-based filtering, playlist push-to-group, and bulk group operations to the existing Screen Groups feature. The codebase already has a solid foundation: the `screen_groups` table already has a `tags TEXT[]` column, a `screenGroupService.js` with full CRUD including tag support in create/update, and existing UI patterns for bulk actions (`BulkActionBar`), filter chips (`FilterChips`), and search (`SearchBar`). The existing `PublishSceneModal` demonstrates the publish-to-group pattern that can be adapted for playlists.

The main gaps to fill are: (1) a tag chip UI for adding/removing tags on individual groups, (2) a tag filter in the groups list page, (3) a "Push Playlist" action for groups, (4) checkbox-based bulk selection on the groups table with a bulk action bar, and (5) a GIN index on `screen_groups.tags` for efficient array matching.

**Primary recommendation:** Extend the existing `ScreenGroupsPage.jsx` and `screenGroupService.js` with tag chip UI, filter chips, bulk selection, and a PushPlaylistModal. Add a single migration for the GIN index. No new libraries needed.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GROUP-01 | User can add/remove tags on screen groups with tag chip UI | `screen_groups.tags TEXT[]` already exists; `updateScreenGroup` already handles `tags` field; `createScreenGroup` already accepts `tags` parameter; build a `TagChipInput` inline component following the existing `BulkActionBar` chip pattern |
| GROUP-02 | User can filter screen groups by tag in the groups list | `fetchScreenGroups` service exists; extend with Supabase `.contains()` for PostgreSQL `@>` array operator; use existing `FilterChips` design system component for tag filter UI |
| GROUP-03 | User can push a playlist to all screens in a group | Existing pattern: `publishSceneToGroup` RPC sets `active_scene_id` on group + all member devices; create analogous `pushPlaylistToGroup` RPC/service function that sets `assigned_playlist_id` on all `tv_devices` in the group; build `PushPlaylistModal` similar to `PublishSceneModal` |
| GROUP-04 | User can perform bulk actions on screen groups (delete, tag, assign content) | Existing pattern: `BulkActionBar` in media library with `selectedIds: Set`, `selectAll`/`deselectAll`, and action callbacks; replicate for screen groups table with checkbox column |
| GROUP-05 | Tag queries use GIN index for efficient array matching | No GIN index exists on `screen_groups.tags` yet; `svg_templates` already uses `CREATE INDEX ... USING GIN(tags)` as precedent (migration 094); create analogous migration |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.80.0 | Database queries, array filtering | Already in use; `.contains()` method maps to PostgreSQL `@>` operator for array matching |
| React | 18.x | UI components | Already in use |
| lucide-react | latest | Icons (Tag, X, Plus, etc.) | Already in use throughout codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| FilterChips (design system) | internal | Tag filter UI in list page | For the tag-based filter bar at top of groups list |
| SearchBar (design system) | internal | Name search | Already used in ScreenGroupsPage |
| BulkActionBar pattern | internal | Floating bulk actions | For multi-select group operations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom tag input | react-tag-input library | Unnecessary dependency; simple inline chip + input pattern sufficient for this use case |
| Supabase `.contains()` for tag filter | Client-side filtering | Works for small datasets but won't scale; server-side is correct for GROUP-05 |
| Custom bulk action bar | Headless UI Listbox | BulkActionBar pattern already proven in MediaLibraryPage |

**Installation:**
```bash
# No new packages needed - all dependencies already in project
```

## Architecture Patterns

### Existing File Structure (extend these files)
```
src/
├── pages/
│   ├── ScreenGroupsPage.jsx       # ADD: tag filter, bulk selection, push playlist action
│   └── ScreenGroupDetailPage.jsx   # ADD: tag chip management in header or settings tab
├── components/
│   └── screens/
│       ├── ScreenGroupSettingsTab.jsx  # ADD: tag management section
│       └── (NEW) PushPlaylistModal.jsx # NEW: playlist picker for group push
├── services/
│   └── screenGroupService.js       # ADD: tag query functions, pushPlaylistToGroup
├── design-system/
│   └── components/
│       ├── FilterChips.jsx         # REUSE: for tag filter bar
│       └── SearchBar.jsx           # REUSE: already used
└── supabase/
    └── migrations/
        └── (NEW) XXX_screen_group_tags_gin_index.sql  # NEW: GIN index
```

### Pattern 1: Tag Chip Input Component
**What:** Inline tag editor with chips for existing tags and an input to add new ones
**When to use:** In the group edit modal and group detail page for GROUP-01
**Example:**
```jsx
// Inline tag chip input - follows existing codebase patterns
function TagChipInput({ tags = [], onChange, placeholder = 'Add tag...' }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tag) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-blue-900">
            <X size={14} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] outline-none text-sm"
      />
    </div>
  );
}
```

### Pattern 2: Supabase Array Contains Filter
**What:** Use `.contains()` method for PostgreSQL `@>` array operator
**When to use:** For GROUP-02 tag filtering in `fetchScreenGroups`
**Example:**
```javascript
// Source: Supabase JS v2 docs - Array column filtering
// .contains() maps to PostgreSQL @> (array contains) operator
async function fetchScreenGroupsByTag(tag) {
  const { data, error } = await supabase
    .from('screen_groups')
    .select('*')
    .contains('tags', [tag])  // WHERE tags @> ARRAY['lobby']
    .order('name');

  if (error) throw error;
  return data;
}
```

### Pattern 3: Bulk Selection with BulkActionBar
**What:** Checkbox selection on table rows with floating action bar
**When to use:** For GROUP-04 bulk operations
**Example:**
```jsx
// Follows existing MediaLibraryPage pattern
const [selectedIds, setSelectedIds] = useState(new Set());

const toggleSelection = (id) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const selectAll = () => setSelectedIds(new Set(groups.map(g => g.id)));
const deselectAll = () => setSelectedIds(new Set());
```

### Pattern 4: Push Playlist to Group
**What:** Assign a playlist to all devices in a screen group
**When to use:** For GROUP-03 content push
**Example:**
```javascript
// Service function - follows bulkAssignScheduleToDevices pattern
export async function pushPlaylistToGroup(groupId, playlistId) {
  if (!groupId) throw new Error('Group ID is required');

  // Update all devices in the group
  const { data, error } = await supabase
    .from('tv_devices')
    .update({
      assigned_playlist_id: playlistId || null,
      needs_refresh: true,
      updated_at: new Date().toISOString()
    })
    .eq('screen_group_id', groupId)
    .select('id');

  if (error) throw error;
  return { devicesUpdated: data?.length || 0 };
}
```

### Anti-Patterns to Avoid
- **Client-side tag filtering:** Don't fetch all groups then filter in JS. Use Supabase `.contains()` to push filtering to PostgreSQL, especially with GIN index for GROUP-05.
- **Separate tags table:** Don't normalize tags into a separate `screen_group_tags` junction table. The `TEXT[]` column is already in place and GIN-indexed arrays are the standard PostgreSQL approach for tag-like data.
- **Custom checkbox state management:** Don't build custom selection state. Use the `Set`-based pattern already established in `useMediaLibrary.js`.
- **Playlist push via individual screen updates:** Don't loop over screens and call `assignPlaylistToScreen` one by one. Use a single Supabase update with `.eq('screen_group_id', groupId)` to batch the operation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tag filter chips | Custom filter buttons | `FilterChips` from design system | Already styled, handles overflow, matches app design |
| Bulk action floating bar | Custom positioned div | Follow `BulkActionBar` pattern from media library | Proven pattern with loading states, counts, disabled handling |
| Array contains query | Manual SQL or RPC | Supabase `.contains()` method | Maps directly to PostgreSQL `@>` with GIN index support |
| Search input | Custom input with icon | `SearchBar` from design system | Already handles clear, sizes, pill variant |
| Tag input UX (Enter, comma, Backspace) | Simple text input | Build a `TagChipInput` component with keyboard handling | Standard tag-input UX: Enter/comma to add, Backspace to remove last, chip display |

**Key insight:** The entire tagging infrastructure already exists in the database (`tags TEXT[]` column, service functions accepting tags). The work is purely UI: exposing tags in the group form, adding a filter to the list, and building the push/bulk features.

## Common Pitfalls

### Pitfall 1: Tag Normalization
**What goes wrong:** Tags like "Lobby", "lobby", "LOBBY" treated as different tags
**Why it happens:** No normalization on input
**How to avoid:** Always `.trim().toLowerCase()` tags before storing. Apply in both the `TagChipInput` component and the service layer.
**Warning signs:** Duplicate-looking tags appearing in filter chip list

### Pitfall 2: Empty Tags Array vs NULL
**What goes wrong:** Filtering breaks when `tags` is NULL instead of empty array `{}`
**Why it happens:** Default is `'{}'` but updates might set it to NULL
**How to avoid:** Always coalesce to empty array in service layer: `tags: tags || []`. The schema default is `'{}'` but explicit is safer.
**Warning signs:** `.contains()` query returning unexpected results

### Pitfall 3: Stale Group List After Bulk Operations
**What goes wrong:** User performs bulk delete/tag, but table still shows old data
**Why it happens:** Local state not refreshed after bulk operation
**How to avoid:** Call `loadData()` after any bulk operation completes. Or optimistically update local state by filtering/mapping the `groups` array.
**Warning signs:** User has to manually refresh page to see changes

### Pitfall 4: Playlist Push Without Confirmation
**What goes wrong:** User accidentally pushes playlist to a group with many screens, disrupting content
**Why it happens:** No confirmation step before the destructive action
**How to avoid:** Show a confirmation modal with device count: "This will update content on X screens in group Y. Continue?"
**Warning signs:** Customer complaints about unexpected content changes

### Pitfall 5: GIN Index on Small Tables
**What goes wrong:** GIN index adds write overhead for negligible read benefit on small tables
**Why it happens:** Over-optimizing prematurely
**How to avoid:** This is acceptable because: (a) GROUP-05 explicitly requires it, (b) `screen_groups` table has low write frequency, (c) GIN overhead is minimal for `TEXT[]`, (d) it's the standard PostgreSQL approach for array queries
**Warning signs:** Not applicable - GIN on TEXT[] is lightweight

## Code Examples

Verified patterns from the existing codebase:

### Existing Tag Display in Groups Table (already in ScreenGroupsPage.jsx)
```jsx
// Source: src/pages/ScreenGroupsPage.jsx lines 236-244
{group.tags?.length > 0 && (
  <div className="flex gap-1 mt-1">
    {group.tags.slice(0, 2).map(tag => (
      <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
        {tag}
      </span>
    ))}
  </div>
)}
```

### Existing BulkActionBar Pattern (from MediaLibraryPage)
```jsx
// Source: src/components/media/BulkActionBar.jsx
<BulkActionBar
  selectedCount={selectedIds.size}
  totalCount={groups.length}
  onSelectAll={selectAll}
  onDeselectAll={deselectAll}
  onDelete={handleBulkDelete}
  onTag={handleBulkTag}
  isDeleting={isDeleting}
  isTagging={isTagging}
/>
```

### Existing Selection Pattern (from useMediaLibrary.js)
```javascript
// Source: src/pages/hooks/useMediaLibrary.js lines 132-133
const [selectedIds, setSelectedIds] = useState(new Set());

// Toggle selection
const toggleSelection = (id) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const selectAll = () => setSelectedIds(new Set(filteredAssets.map(a => a.id)));
const deselectAll = () => setSelectedIds(new Set());
```

### Existing Scene Push to Group (from screenGroupService.js)
```javascript
// Source: src/services/screenGroupService.js lines 292-305
export async function publishSceneToGroup(groupId, sceneId, updateDevices = true) {
  const { data, error } = await supabase
    .rpc('publish_scene_to_group', {
      p_group_id: groupId,
      p_scene_id: sceneId,
      p_update_devices: updateDevices
    });
  if (error) throw error;
  return data;
}
```

### Existing FilterChips Usage Pattern
```jsx
// Source: src/design-system/components/FilterChips.jsx
<FilterChips
  options={[
    { id: 'all', label: 'All' },
    { id: 'lobby', label: 'Lobby' },
    { id: 'restaurant', label: 'Restaurant' },
  ]}
  selected={tagFilter}
  onChange={setTagFilter}
/>
```

### GIN Index Precedent (from svg_templates migration)
```sql
-- Source: supabase/migrations/094_svg_templates.sql line 35
CREATE INDEX IF NOT EXISTS idx_svg_templates_tags ON svg_templates USING GIN(tags);
```

### Supabase Array Contains Filter
```javascript
// Supabase JS v2 - .contains() maps to PostgreSQL @> operator
const { data, error } = await supabase
  .from('screen_groups')
  .select('*')
  .contains('tags', ['lobby'])  // WHERE tags @> ARRAY['lobby']
  .order('name');
```

### Bulk Update Devices by Group (from scheduleService pattern)
```javascript
// Source: src/services/scheduleService.js lines 997-1005
// Pattern: bulk assign to devices matching a criteria
const { data, error } = await supabase
  .from('tv_devices')
  .update({ assigned_schedule_id: scheduleId })
  .in('id', deviceIds)
  .select('id, device_name');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate tags junction table | `TEXT[]` column with GIN index | PostgreSQL best practice | Simpler schema, faster queries, no JOINs needed |
| Client-side array filtering | Supabase `.contains()` server-side | Supabase JS v2 | Pushes filtering to DB, leverages GIN index |
| Individual device updates for group push | Single `.eq('screen_group_id', id)` update | Current pattern | Single query updates all devices atomically |

**Deprecated/outdated:**
- None applicable - all patterns used are current

## Open Questions

1. **Push Playlist: RPC vs Direct Update**
   - What we know: Scene push uses an RPC (`publish_scene_to_group`) that validates tenant ownership and returns results. Playlist push could follow the same pattern OR use a simpler direct Supabase update.
   - What's unclear: Whether tenant validation in an RPC is needed (RLS already enforces tenant isolation).
   - Recommendation: Use a direct Supabase update (`.eq('screen_group_id', groupId)`) for simplicity. RLS already handles authorization. If more complex validation is needed later, an RPC can be added.

2. **Tag Autocomplete/Suggestions**
   - What we know: GROUP-01 says "tag chip UI" - doesn't specify autocomplete.
   - What's unclear: Should the tag input suggest existing tags from other groups?
   - Recommendation: Start with free-text input (Enter/comma to add). Autocomplete can be added later by querying distinct tags across groups. Keep scope minimal for Phase 60.

3. **Bulk Tag Assignment: Add or Replace?**
   - What we know: GROUP-04 says "tag" as a bulk action.
   - What's unclear: Should bulk tag add tags to existing tags or replace them?
   - Recommendation: "Add tags" (union with existing) is safer and more intuitive. Show a modal with a tag input that adds the specified tags to all selected groups' existing tags.

4. **Tag Filter: Single vs Multi-Select**
   - What we know: `FilterChips` component currently supports single selection only.
   - What's unclear: Should users be able to filter by multiple tags at once?
   - Recommendation: Start with single-tag filter using existing `FilterChips`. Multi-tag filtering (AND/OR) adds significant complexity and can be added in a future phase.

## Sources

### Primary (HIGH confidence)
- `src/pages/ScreenGroupsPage.jsx` - Current screen groups UI with tags display
- `src/pages/ScreenGroupDetailPage.jsx` - Group detail page with tabs
- `src/services/screenGroupService.js` - Full CRUD service with tag support
- `supabase/migrations/026_screen_groups_and_campaigns.sql` - Schema with `tags TEXT[]`
- `supabase/migrations/073_screen_group_scenes.sql` - Scene publishing RPCs
- `src/components/media/BulkActionBar.jsx` - Bulk action UI pattern
- `src/pages/hooks/useMediaLibrary.js` - Bulk selection state management
- `src/design-system/components/FilterChips.jsx` - Tag filter UI component
- `src/services/mediaService.js` - `addTagsToMedia`/`removeTagsFromMedia` pattern
- `supabase/migrations/094_svg_templates.sql` - GIN index precedent
- `src/components/scenes/PublishSceneModal.jsx` - Publish to groups pattern
- `package.json` - `@supabase/supabase-js: ^2.80.0` confirming `.contains()` support

### Secondary (MEDIUM confidence)
- Supabase JS v2 `.contains()` documentation - Array filtering maps to PostgreSQL `@>` operator

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified by examining package.json and existing imports
- Architecture: HIGH - All patterns verified by reading existing codebase files (BulkActionBar, FilterChips, screenGroupService, PublishSceneModal)
- Pitfalls: HIGH - Based on actual codebase patterns (tag normalization, NULL vs empty array observed in service code)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable - internal codebase patterns unlikely to change)
