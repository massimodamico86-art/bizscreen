/**
 * LocationsPage - Manage physical locations/branches
 *
 * Features:
 * - List all locations with screen counts
 * - Create, edit, delete locations
 * - View screens by location
 */

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Monitor,
  Wifi,
  WifiOff,
  MoreVertical,
  Building2,
  Globe,
  Clock,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  Button,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Alert,
  EmptyState
} from '../design-system';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationStats,
  TIMEZONE_OPTIONS,
} from '../services/locationService';
import { getPermissions } from '../services/permissionsService';

const LocationsPage = ({ showToast, setCurrentPage }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    timezone: '',
    notes: '',
  });
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [locationsResult, statsResult, permsResult] = await Promise.all([
        fetchLocations(),
        getLocationStats(),
        getPermissions(),
      ]);

      if (locationsResult.error) {
        showToast?.('Error loading locations: ' + locationsResult.error, 'error');
      } else {
        setLocations(locationsResult.data);
      }

      if (!statsResult.error) {
        setStats(statsResult.data || []);
      }

      setPermissions(permsResult);
    } catch (err) {
      showToast?.('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      timezone: '',
      notes: '',
    });
    setEditingLocation(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowLocationModal(true);
  };

  const openEditModal = (location) => {
    setFormData({
      name: location.name || '',
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      postalCode: location.postal_code || '',
      timezone: location.timezone || '',
      notes: location.notes || '',
    });
    setEditingLocation(location);
    setShowLocationModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setProcessing(true);

      if (editingLocation) {
        const result = await updateLocation(editingLocation.id, formData);
        if (result.error) {
          showToast?.(result.error, 'error');
        } else {
          showToast?.('Location updated successfully');
          setShowLocationModal(false);
          loadData();
        }
      } else {
        const result = await createLocation(formData);
        if (result.error) {
          showToast?.(result.error, 'error');
        } else {
          showToast?.('Location created successfully');
          setShowLocationModal(false);
          loadData();
        }
      }
    } catch (err) {
      showToast?.('Error saving location', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (locationId, reassign = false) => {
    try {
      setProcessing(true);
      const result = await deleteLocation(locationId, reassign);

      if (result.success) {
        showToast?.('Location deleted');
        setShowDeleteModal(null);
        loadData();
      } else {
        showToast?.(result.error, 'error');
      }
    } catch (err) {
      showToast?.('Error deleting location', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const canManage = permissions?.canManageLocations ?? false;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64" role="status" aria-label={t('common.loading', 'Loading')}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-hidden="true" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title={t('locations.title', 'Locations')}
        description={t('locations.description', 'Organize your screens by physical location')}
        actions={canManage && (
          <Button onClick={openCreateModal} icon={<Plus size={18} aria-hidden="true" />}>
            {t('locations.addLocation', 'Add Location')}
          </Button>
        )}
      />

      <PageContent>

        {/* Stats Overview */}
        {stats.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {stats.slice(0, 4).map((stat) => (
              <Card key={stat.id || 'unassigned'} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 truncate">{stat.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.total}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Wifi size={14} aria-hidden="true" />
                      <span aria-label={t('locations.onlineScreens', '{{count}} online', { count: stat.online })}>{stat.online}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <WifiOff size={14} aria-hidden="true" />
                      <span aria-label={t('locations.offlineScreens', '{{count}} offline', { count: stat.offline })}>{stat.offline}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Locations List */}
        {locations.length === 0 ? (
          <EmptyState
            icon={<MapPin size={48} aria-hidden="true" />}
            title={t('locations.noLocations', 'No locations yet')}
            description={t('locations.noLocationsDesc', 'Create locations to organize your screens by physical branches or areas.')}
            action={canManage ? (
              <Button onClick={openCreateModal} variant="primary">
                <Plus size={18} aria-hidden="true" />
                {t('locations.addFirstLocation', 'Add Your First Location')}
              </Button>
            ) : null}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" role="list" aria-label={t('locations.locationsList', 'Locations list')}>
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                stats={stats.find((s) => s.id === location.id)}
                canManage={canManage}
                onEdit={() => openEditModal(location)}
                onDelete={() => setShowDeleteModal(location)}
                onViewScreens={() => setCurrentPage?.(`screens?location=${location.id}`)}
                t={t}
              />
            ))}

            {/* Unassigned Card */}
            {stats.find((s) => s.id === null)?.total > 0 && (
              <Card className="p-4 border-dashed" role="listitem">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg" aria-hidden="true">
                      <MapPin size={20} className="text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700">{t('locations.unassigned', 'Unassigned')}</h3>
                      <p className="text-sm text-gray-500">{t('locations.unassignedDesc', 'Screens without a location')}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Monitor size={14} className="text-gray-400" aria-hidden="true" />
                    <span className="text-gray-600">
                      {t('locations.screensCount', '{{count}} screens', { count: stats.find((s) => s.id === null)?.total || 0 })}
                    </span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => setCurrentPage?.('screens?location=unassigned')}
                >
                  {t('locations.viewScreens', 'View Screens')}
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Location Modal */}
        <Modal open={showLocationModal} onClose={() => setShowLocationModal(false)} size="md">
          <ModalHeader>
            <ModalTitle>
              {editingLocation ? t('locations.editLocation', 'Edit Location') : t('locations.addLocation', 'Add Location')}
            </ModalTitle>
          </ModalHeader>
          <ModalContent>
            <form id="location-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locations.locationName', 'Location Name')} *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('locations.namePlaceholder', 'Downtown Restaurant')}
                    required
                    aria-required="true"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locations.address', 'Address')}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t('locations.addressPlaceholder', '123 Main Street')}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('locations.city', 'City')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder={t('locations.cityPlaceholder', 'New York')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('locations.state', 'State/Province')}
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder={t('locations.statePlaceholder', 'NY')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('locations.country', 'Country')}
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder={t('locations.countryPlaceholder', 'USA')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('locations.postalCode', 'Postal Code')}
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder={t('locations.postalPlaceholder', '10001')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locations.timezone', 'Timezone')}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('locations.defaultTimezone', 'Use default timezone')}</option>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('locations.notes', 'Notes')}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('locations.notesPlaceholder', 'Additional notes about this location...')}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </form>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowLocationModal(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" form="location-form" loading={processing}>
              {editingLocation ? t('locations.saveChanges', 'Save Changes') : t('locations.addLocationBtn', 'Add Location')}
            </Button>
          </ModalFooter>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} size="sm">
          <ModalHeader>
            <ModalTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle size={24} aria-hidden="true" />
              {t('locations.deleteLocation', 'Delete Location')}
            </ModalTitle>
          </ModalHeader>
          <ModalContent>
            <p className="text-gray-600">
              {t('locations.deleteConfirm', 'Are you sure you want to delete {{name}}?', { name: showDeleteModal?.name })}
            </p>

            {showDeleteModal?.screenCount > 0 && (
              <Alert variant="warning" className="mt-4">
                <strong>{t('common.warning', 'Warning')}:</strong> {t('locations.deleteWarning', 'This location has {{count}} screen(s) assigned. They will be marked as unassigned.', { count: showDeleteModal.screenCount })}
              </Alert>
            )}
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(showDeleteModal?.id, true)}
              loading={processing}
            >
              {t('common.delete', 'Delete')}
            </Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageLayout>
  );
};

// Location Card Component
function LocationCard({ location, stats, canManage, onEdit, onDelete, onViewScreens, t }) {
  const [showMenu, setShowMenu] = useState(false);

  const screenCount = location.screenCount ?? stats?.total ?? 0;
  const onlineCount = stats?.online ?? 0;
  const offlineCount = stats?.offline ?? 0;

  const addressParts = [location.city, location.state, location.country].filter(Boolean);

  return (
    <Card className="p-4" role="listitem">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg" aria-hidden="true">
            <MapPin size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{location.name}</h3>
            {addressParts.length > 0 && (
              <p className="text-sm text-gray-500">{addressParts.join(', ')}</p>
            )}
          </div>
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-haspopup="menu"
              aria-expanded={showMenu}
              aria-label={t('common.moreActions', 'More actions')}
            >
              <MoreVertical size={16} className="text-gray-500" aria-hidden="true" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 z-10" role="menu">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit?.();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                  >
                    <Edit2 size={14} aria-hidden="true" />
                    {t('common.edit', 'Edit')}
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete?.();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Screen Stats */}
      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="flex items-center gap-1">
          <Monitor size={14} className="text-gray-400" aria-hidden="true" />
          <span className="text-gray-600">{t('locations.screenCount', '{{count}} screen', { count: screenCount })}{screenCount !== 1 ? 's' : ''}</span>
        </div>
        {screenCount > 0 && (
          <>
            <div className="flex items-center gap-1 text-green-600">
              <Wifi size={14} aria-hidden="true" />
              <span>{onlineCount}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <WifiOff size={14} aria-hidden="true" />
              <span>{offlineCount}</span>
            </div>
          </>
        )}
      </div>

      {/* Address Details */}
      {location.address && (
        <p className="text-sm text-gray-500 mb-4 truncate">{location.address}</p>
      )}

      {/* Timezone */}
      {location.timezone && (
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
          <Globe size={14} aria-hidden="true" />
          <span>{location.timezone}</span>
        </div>
      )}

      <Button variant="secondary" size="sm" className="w-full" onClick={onViewScreens}>
        {t('locations.viewScreens', 'View Screens')}
      </Button>
    </Card>
  );
}

export default LocationsPage;
