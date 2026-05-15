/**
 * PackEditorPanel — drill-in editor for a single starter pack (new or existing).
 *
 * W-5 SPLIT: This component is deliberately in a sibling file next to
 * AdminStarterPacksPage.jsx (matches AdminEditTemplatePage.jsx convention).
 * Do NOT inline back into the parent page — the split keeps
 * AdminStarterPacksPage under ~250 lines per plan acceptance.
 *
 * Behavior:
 *   - Loads pack detail (existing pack) via fetchPackDetail; starts empty for 'new'.
 *   - Metadata form: name, slug, description, industry, thumbnail_url,
 *     display_order, is_active.
 *   - Member management: multi-select from gallery_templates via <details>
 *     picker. Each row shows GripVertical decorative drag-handle (actual
 *     drag-reorder wiring deferred to Plan 10 / future phase).
 *   - Save flow:
 *       - New pack: createPack(form) → reorderPackItems on returned id
 *       - Existing: updatePack(packId, form) → reorderPackItems to persist ordering
 *     Add/remove for existing packs fire immediate API calls; for 'new' packs
 *     the member list is local and persisted by reorderPackItems after createPack.
 */

import { useState, useEffect } from 'react';
import { GripVertical, Trash2, X } from 'lucide-react';
import { Button, Badge, Modal, Alert } from '../../design-system';
import {
  fetchPackDetail,
  createPack,
  updatePack,
  addPackItem,
  removePackItem,
  reorderPackItems,
} from '../../services/marketplaceService';
import { fetchGalleryTemplates } from '../../services/templateGalleryService';

export default function PackEditorPanel({ packId, onClose, onSaved, showToast }) {
  const isNew = packId === 'new';

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    industry: '',
    thumbnail_url: '',
    display_order: 0,
    is_active: true,
  });
  const [members, setMembers] = useState([]); // [{ id, name, editor_type, position }]
  const [allTemplates, setAllTemplates] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Load member-picker source + optional pack detail
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const tpls = await fetchGalleryTemplates();
        if (!cancelled) setAllTemplates(Array.isArray(tpls) ? tpls : []);
      } catch (err) {
        if (!cancelled) console.error('[PackEditorPanel] template fetch failed:', err);
      }
    })();

    if (isNew) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const detail = await fetchPackDetail(packId);
        if (cancelled) return;
        setForm({
          name: detail.name ?? '',
          slug: detail.slug ?? '',
          description: detail.description ?? '',
          industry: detail.industry ?? '',
          thumbnail_url: detail.thumbnail_url ?? '',
          display_order: detail.display_order ?? 0,
          is_active: detail.is_active ?? true,
        });
        setMembers(Array.isArray(detail.members) ? detail.members : []);
      } catch (err) {
        if (!cancelled) {
          console.error('[PackEditorPanel] detail fetch failed:', err);
          setError('Failed to load pack');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [packId, isNew]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      let savedId = packId;

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim(),
        industry: form.industry.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        display_order: Number.isFinite(form.display_order) ? form.display_order : 0,
        is_active: !!form.is_active,
      };

      if (isNew) {
        const created = await createPack(payload);
        savedId = created?.id;
        // For a freshly created pack, persist initial membership via addPackItem
        // in declared order. reorderPackItems on its own won't INSERT new rows.
        for (let i = 0; i < members.length; i += 1) {
          const m = members[i];
          // eslint-disable-next-line no-await-in-loop
          await addPackItem(savedId, m.id, m.editor_type, i);
        }
      } else {
        await updatePack(packId, payload);
        // Persist current ordering for existing members.
        if (members.length > 0) {
          await reorderPackItems(
            savedId,
            members.map((m, i) => ({
              templateId: m.id,
              editorType: m.editor_type,
              position: i,
            }))
          );
        }
      }

      await onSaved?.();
    } catch (err) {
      console.error('[PackEditorPanel] save failed:', err);
      setError('Failed to save pack');
      showToast?.({ variant: 'error', message: 'Failed to save pack' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (template) => {
    if (members.find((m) => m.id === template.id && m.editor_type === template.editor_type)) {
      return;
    }
    if (!isNew) {
      try {
        await addPackItem(packId, template.id, template.editor_type, members.length);
      } catch (err) {
        console.error('[PackEditorPanel] add member failed:', err);
        showToast?.({ variant: 'error', message: 'Failed to add member' });
        return;
      }
    }
    setMembers((prev) => [...prev, { ...template, position: prev.length }]);
  };

  const handleRemoveMember = async (member) => {
    if (!isNew) {
      try {
        await removePackItem(packId, member.id, member.editor_type);
      } catch (err) {
        console.error('[PackEditorPanel] remove member failed:', err);
        showToast?.({ variant: 'error', message: 'Failed to remove member' });
        return;
      }
    }
    setMembers((prev) =>
      prev.filter((m) => !(m.id === member.id && m.editor_type === member.editor_type))
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      closeOnOverlay={false}
      aria-labelledby="pack-editor-title"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 id="pack-editor-title" className="text-xl font-semibold text-gray-900">
            {isNew ? 'New pack' : `Edit ${form.name || 'pack'}`}
          </h3>
          <Button variant="ghost" size="md" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <>
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <label className="text-sm">
                Name
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Slug
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Industry
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Display order
                <input
                  type="number"
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      display_order: parseInt(e.target.value || '0', 10),
                    })
                  }
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Thumbnail URL (optional)
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  value={form.thumbnail_url}
                  onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Description
                <textarea
                  className="w-full border border-gray-200 rounded px-3 py-2 mt-1"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">
                Members ({members.length})
              </h4>
              <ul className="space-y-1 max-h-64 overflow-y-auto mb-3">
                {members.map((m) => (
                  <li
                    key={`${m.editor_type}-${m.id}`}
                    className="flex items-center gap-2 px-2 py-1 border border-gray-100 rounded"
                  >
                    <GripVertical
                      size={14}
                      className="text-gray-400 cursor-move"
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-sm">{m.name}</span>
                    <Badge variant="default" size="sm">
                      {m.editor_type}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(m)}
                      aria-label={`Remove ${m.name}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                ))}
              </ul>

              <details className="text-sm">
                <summary className="cursor-pointer text-[#f26f21]">+ Add template</summary>
                <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {allTemplates
                    .filter(
                      (t) =>
                        !members.find((m) => m.id === t.id && m.editor_type === t.editor_type)
                    )
                    .slice(0, 100)
                    .map((t) => (
                      <li key={`${t.editor_type}-${t.id}`}>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded"
                          onClick={() => handleAddMember(t)}
                        >
                          {t.name}{' '}
                          <span className="text-xs text-gray-500">({t.editor_type})</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </details>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
              >
                {saving ? 'Saving…' : 'Save pack'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
