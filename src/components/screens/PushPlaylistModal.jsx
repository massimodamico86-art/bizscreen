import { useState, useEffect } from 'react';
import { ListMusic, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Button,
} from '../../design-system';
import { fetchPlaylists } from '../../services/playlistService';
import { pushPlaylistToGroup } from '../../services/screenGroupService';
import { useTranslation } from '../../i18n';

/**
 * PushPlaylistModal - Push a playlist to all screens in a screen group
 *
 * Shows a playlist dropdown, device count warning, and push confirmation.
 *
 * @param {Object} props
 * @param {Object} props.group - Screen group object (id, name, device_count)
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onPush - Callback after successful push (refresh parent)
 * @param {Function} props.showToast - Toast notification function
 */
export default function PushPlaylistModal({ group, onClose, onPush, showToast }) {
  const { t } = useTranslation();
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    const loadPlaylists = async () => {
      try {
        const data = await fetchPlaylists();
        setPlaylists(data);
      } catch {
        showToast?.(t('screenGroups.playlistLoadError', 'Error loading playlists'), 'error');
      } finally {
        setLoading(false);
      }
    };
    loadPlaylists();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);

  const handlePush = async () => {
    if (!selectedPlaylistId) return;
    setPushing(true);
    try {
      const result = await pushPlaylistToGroup(group.id, selectedPlaylistId);
      showToast?.(
        t('screenGroups.playlistPushed', 'Playlist pushed to {{count}} device(s)', {
          count: result.devicesUpdated,
        })
      );
      onPush?.();
      onClose();
    } catch (error) {
      showToast?.(
        t('screenGroups.pushError', 'Error pushing playlist: {{error}}', {
          error: error.message,
        }),
        'error'
      );
    } finally {
      setPushing(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} size="sm">
      <ModalHeader>
        <ModalTitle>
          <span className="flex items-center gap-2">
            <ListMusic size={20} aria-hidden="true" />
            {t('screenGroups.pushPlaylistTo', 'Push Playlist to {{name}}', { name: group.name })}
          </span>
        </ModalTitle>
      </ModalHeader>
      <ModalContent>
        {/* Warning callout */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
          <AlertTriangle size={18} className="text-yellow-600 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-sm text-yellow-800">
            {t(
              'screenGroups.pushWarning',
              'This will update the playlist on {{count}} screen(s) in this group.',
              { count: group.device_count || t('common.all', 'all') }
            )}
          </p>
        </div>

        {/* Playlist picker */}
        {loading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-label={t('common.loading', 'Loading')}>
            <Loader2 size={24} className="animate-spin text-blue-600" aria-hidden="true" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('screenGroups.selectPlaylist', 'Select Playlist')}
            </label>
            <select
              value={selectedPlaylistId}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('screenGroups.selectPlaylist', 'Select Playlist')}
            >
              <option value="">{t('screenGroups.choosePlaylist', '-- Choose a playlist --')}</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </ModalContent>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={handlePush}
          loading={pushing}
          disabled={pushing || !selectedPlaylistId}
        >
          {t('screenGroups.pushPlaylist', 'Push Playlist')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
