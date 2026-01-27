/**
 * ScreenGroupSettingsTab
 *
 * Settings tab for screen group language and location configuration.
 * Allows admins to set a display language for an entire group with
 * location-based auto-assignment support.
 *
 * Per CONTEXT.md: Strict inheritance - devices in group always use
 * group's language, no device-level override displayed here.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Button, Select, FormField } from '../../design-system';
import { Globe, MapPin, Save, Loader2, ArrowRight } from 'lucide-react';
import {
  getSupportedLanguages,
  getAvailableLocations,
  getLanguageForLocation,
  getLanguageDisplayInfo,
} from '../../services/languageService';
import { updateGroupLanguage } from '../../services/screenGroupService';

/**
 * ScreenGroupSettingsTab component
 *
 * @param {Object} props
 * @param {Object} props.group - The screen group object
 * @param {Function} props.onUpdate - Callback to refresh parent data
 * @param {Function} props.showToast - Toast notification function
 */
export default function ScreenGroupSettingsTab({ group, onUpdate, showToast }) {
  // State
  const [displayLanguage, setDisplayLanguage] = useState(group?.display_language || '');
  const [location, setLocation] = useState(group?.location_code || '');
  const [saving, setSaving] = useState(false);

  // Derived data
  const [languages, setLanguages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [suggestedLanguage, setSuggestedLanguage] = useState(null);

  // Load languages and locations on mount
  useEffect(() => {
    setLanguages(getSupportedLanguages());
    setLocations(getAvailableLocations());
  }, []);

  // Sync state when group prop changes
  useEffect(() => {
    if (group) {
      setDisplayLanguage(group.display_language || '');
      setLocation(group.location_code || '');
    }
  }, [group?.id, group?.display_language, group?.location_code]);

  // Update suggested language when location changes
  useEffect(() => {
    if (location) {
      const langCode = getLanguageForLocation(location);
      const langInfo = getLanguageDisplayInfo(langCode);
      setSuggestedLanguage(langInfo);
    } else {
      setSuggestedLanguage(null);
    }
  }, [location]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGroupLanguage(group.id, {
        display_language: displayLanguage || null,
        location_code: location || null,
      });
      showToast?.('Language settings saved successfully', 'success');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to save language settings:', error);
      showToast?.(`Failed to save: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Apply suggested language from location
  const handleApplyLocationLanguage = () => {
    if (suggestedLanguage) {
      setDisplayLanguage(suggestedLanguage.code);
    }
  };

  // Check if there are unsaved changes
  const hasChanges =
    displayLanguage !== (group?.display_language || '') ||
    location !== (group?.location_code || '');

  return (
    <div className="space-y-6">
      {/* Group Language Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Group Language</h3>
              <p className="text-sm text-gray-500 mt-1">
                All devices in this group will display content in the selected language
              </p>
            </div>
          </div>

          <FormField label="Display Language" hint="Content will be shown in this language on all devices in the group">
            <Select
              value={displayLanguage}
              onChange={(e) => setDisplayLanguage(e.target.value)}
              className="max-w-md"
            >
              <option value="">None (use device default)</option>
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      {/* Location-Based Auto-Assignment Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Location-Based Auto-Assignment</h3>
              <p className="text-sm text-gray-500 mt-1">
                Set the device location to automatically determine the display language
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <FormField label="Group Location" hint="Country/region for this group of devices">
              <Select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="max-w-md"
              >
                <option value="">No location set</option>
                {locations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </Select>
            </FormField>

            {/* Show suggested language when location is selected */}
            {suggestedLanguage && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md">
                <div className="flex-1">
                  <p className="text-sm text-blue-800">
                    Suggested language for this location:
                  </p>
                  <p className="font-medium text-blue-900">
                    {suggestedLanguage.nativeName} ({suggestedLanguage.name})
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleApplyLocationLanguage}
                  disabled={displayLanguage === suggestedLanguage.code}
                >
                  <ArrowRight className="w-4 h-4 mr-1" />
                  Apply
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
