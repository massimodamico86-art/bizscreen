import { useState } from 'react';

export const AddListingModal = ({ onClose, onAdd, showToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    tvs: 1,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Required field validation
    if (!formData.name.trim()) {
      showToast('Please enter a location name', 'error');
      return;
    }
    if (!formData.address.trim()) {
      showToast('Please enter an address', 'error');
      return;
    }

    // Numeric field validation and sanitization
    const bedrooms = parseInt(formData.bedrooms, 10);
    const bathrooms = parseFloat(formData.bathrooms);
    const guests = parseInt(formData.guests, 10);
    const tvs = parseInt(formData.tvs, 10);

    // Validate numeric fields are valid numbers
    if (isNaN(bedrooms) || isNaN(bathrooms) || isNaN(guests) || isNaN(tvs)) {
      showToast('Please enter valid numbers for property details', 'error');
      return;
    }

    // Enforce minimum constraints
    if (bedrooms < 0) {
      showToast('Bedrooms must be 0 or greater', 'error');
      return;
    }
    if (bathrooms < 0) {
      showToast('Bathrooms must be 0 or greater', 'error');
      return;
    }
    if (guests < 1) {
      showToast('Number of guests must be at least 1', 'error');
      return;
    }
    if (tvs < 0) {
      showToast('Number of TVs must be 0 or greater', 'error');
      return;
    }

    // Create sanitized data object
    const sanitizedData = {
      ...formData,
      name: formData.name.trim(),
      address: formData.address.trim(),
      description: formData.description.trim(),
      bedrooms,
      bathrooms,
      guests,
      tvs
    };

    setSaving(true);
    try {
      await onAdd(sanitizedData);
      onClose();
    } catch (error) {
      showToast('Error creating location: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Add New Location</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Cozy Downtown Apartment"
              className="w-full px-3 py-2 border rounded-lg"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g., 123 Main St, City, State"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of your property..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Bedrooms</label>
            <input
              type="number"
              min="0"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bathrooms</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Guests</label>
            <input
              type="number"
              min="1"
              value={formData.guests}
              onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Number of TVs</label>
            <input
              type="number"
              min="0"
              value={formData.tvs}
              onChange={(e) => setFormData({ ...formData, tvs: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating...' : 'Create Location'}
          </Button>
        </div>
      </form>
    </SimpleModal>
  );
};
