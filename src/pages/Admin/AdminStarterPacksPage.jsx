/**
 * Admin Starter Packs Page (Phase 173 TPCK-03).
 *
 * super_admin-gated via App.jsx routing (admin-starter-packs is in adminToolPages).
 * Uses marketplaceService pack CRUD exports (Plan 05).
 *
 * Layout: PageLayout chrome (matches AdminTemplatesPage) + pack list table.
 *   When editingPackId !== null, the sibling PackEditorPanel component is mounted
 *   as a Modal-based drill-in editor (W-5 split — see PackEditorPanel.jsx).
 *
 * The table surfaces 6 columns: Name | Industry | Members | Active | Display
 * Order | Actions. "Members" shows the tpl count per pack (from
 * members_count column when present, else "—"). Actions provides inline Edit
 * and Delete with a UI-SPEC-verbatim confirmation dialog.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import PageLayout from '../../design-system/components/PageLayout';
import { Button, Alert, Modal } from '../../design-system';
import {
  fetchStarterPacks,
  updatePack,
  deletePack,
} from '../../services/marketplaceService';
import PackEditorPanel from './PackEditorPanel';

export default function AdminStarterPacksPage({ showToast, onNavigate: _onNavigate }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPackId, setEditingPackId] = useState(null); // null | 'new' | <uuid>
  const [deleteConfirmPack, setDeleteConfirmPack] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStarterPacks({ activeOnly: false });
      setPacks(rows);
    } catch (err) {
      console.error('[AdminStarterPacksPage] load failed:', err);
      setError('Failed to load packs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const handleToggleActive = async (pack) => {
    try {
      await updatePack(pack.id, { is_active: !pack.is_active });
      await loadPacks();
    } catch (err) {
      console.error('[AdminStarterPacksPage] toggle active failed:', err);
      showToast?.({ variant: 'error', message: 'Failed to update pack' });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPack) return;
    setDeleting(true);
    try {
      await deletePack(deleteConfirmPack.id);
      setDeleteConfirmPack(null);
      await loadPacks();
    } catch (err) {
      console.error('[AdminStarterPacksPage] delete failed:', err);
      showToast?.({ variant: 'error', message: 'Failed to delete pack' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageLayout
      title="Starter Packs"
      description="Manage curated bundles of templates"
      actions={
        <Button variant="primary" onClick={() => setEditingPackId('new')}>
          <Plus size={16} className="mr-1" /> New pack
        </Button>
      }
    >
      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : packs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No packs yet. Click "New pack" to create one.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Members</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Display Order</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {packs.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.slug && <p className="text-xs text-gray-500">{p.slug}</p>}
                    </div>
                  </td>

                  {/* Industry */}
                  <td className="px-4 py-3 text-sm text-gray-700">{p.industry || '—'}</td>

                  {/* Members */}
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {typeof p.members_count === 'number' ? p.members_count : '—'}
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        p.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          p.is_active ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  {/* Display Order */}
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {p.display_order ?? 0}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingPackId(p.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"
                        title="Edit pack"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmPack(p)}
                        data-testid={`delete-pack-${p.id}`}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        title="Delete pack"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Editor drill-in panel (sibling component — W-5 split) */}
      {editingPackId !== null && (
        <PackEditorPanel
          packId={editingPackId}
          onClose={() => setEditingPackId(null)}
          onSaved={async () => {
            setEditingPackId(null);
            await loadPacks();
          }}
          showToast={showToast}
        />
      )}

      {/* Delete confirmation — UI-SPEC Copywriting VERBATIM */}
      <Modal
        open={!!deleteConfirmPack}
        onClose={() => !deleting && setDeleteConfirmPack(null)}
        size="sm"
        aria-labelledby="delete-pack-title"
      >
        {deleteConfirmPack && (
          <div className="p-6">
            <h3 id="delete-pack-title" className="text-lg font-semibold text-gray-900 mb-2">
              Delete "{deleteConfirmPack.name}"?
            </h3>
            <p className="text-sm text-gray-700 mb-5">
              This removes the pack but does not delete its templates or any scenes you've already created from it.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirmPack(null)}
                disabled={deleting}
              >
                Keep pack
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete pack'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
}
