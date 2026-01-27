/**
 * ScreenGroupSettingsTab Component Unit Tests
 * Tests for language and location configuration component
 *
 * Phase 21-04: Test coverage for multi-language features
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock language service
vi.mock('../../../src/services/languageService', () => ({
  getSupportedLanguages: vi.fn(() => [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
    { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
  ]),
  getAvailableLocations: vi.fn(() => [
    { code: 'US', name: 'United States' },
    { code: 'ES', name: 'Spain' },
    { code: 'FR', name: 'France' },
  ]),
  getLanguageForLocation: vi.fn((code) => {
    const map = { US: 'en', ES: 'es', FR: 'fr' };
    return map[code] || 'en';
  }),
  getLanguageDisplayInfo: vi.fn((code) => {
    const info = {
      en: { code: 'en', name: 'English', nativeName: 'English' },
      es: { code: 'es', name: 'Spanish', nativeName: 'Español' },
      fr: { code: 'fr', name: 'French', nativeName: 'Français' },
    };
    return info[code] || { code, name: code.toUpperCase(), nativeName: code.toUpperCase() };
  }),
}));

// Mock screen group service
vi.mock('../../../src/services/screenGroupService', () => ({
  updateGroupLanguage: vi.fn().mockResolvedValue({}),
}));

// Component under test
import ScreenGroupSettingsTab from '../../../src/components/screens/ScreenGroupSettingsTab';

// Test wrapper
const renderComponent = (props = {}) => {
  const defaultGroup = {
    id: 'group-123',
    name: 'Test Group',
    display_language: '',
    location_code: '',
  };

  const defaultProps = {
    group: defaultGroup,
    onUpdate: vi.fn(),
    showToast: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <ScreenGroupSettingsTab {...defaultProps} />
    </BrowserRouter>
  );
};

describe('ScreenGroupSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderComponent();

      // Component should render without errors
      expect(screen.getByText('Group Language')).toBeInTheDocument();
    });

    it('displays language section with description', () => {
      renderComponent();

      expect(screen.getByText('Group Language')).toBeInTheDocument();
      expect(
        screen.getByText('All devices in this group will display content in the selected language')
      ).toBeInTheDocument();
    });

    it('displays location section with description', () => {
      renderComponent();

      expect(screen.getByText('Location-Based Auto-Assignment')).toBeInTheDocument();
      expect(
        screen.getByText('Set the device location to automatically determine the display language')
      ).toBeInTheDocument();
    });

    it('displays save button', () => {
      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Language Dropdown', () => {
    it('displays language dropdown with options', () => {
      renderComponent();

      // Find the display language dropdown
      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      expect(languageSelect).toBeInTheDocument();

      // Check options are present
      expect(screen.getByText('None (use device default)')).toBeInTheDocument();
      expect(screen.getByText('English (English)')).toBeInTheDocument();
      expect(screen.getByText('Español (Spanish)')).toBeInTheDocument();
    });

    it('shows current language when group has one set', () => {
      renderComponent({
        group: {
          id: 'group-123',
          name: 'Test Group',
          display_language: 'es',
          location_code: '',
        },
      });

      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      expect(languageSelect.value).toBe('es');
    });
  });

  describe('Location Dropdown', () => {
    it('displays location dropdown with options', () => {
      renderComponent();

      // Find the location dropdown
      const locationSelect = screen.getByRole('combobox', {
        name: /group location/i,
      });
      expect(locationSelect).toBeInTheDocument();

      // Check options are present
      expect(screen.getByText('No location set')).toBeInTheDocument();
      expect(screen.getByText('United States')).toBeInTheDocument();
      expect(screen.getByText('Spain')).toBeInTheDocument();
    });

    it('shows current location when group has one set', () => {
      renderComponent({
        group: {
          id: 'group-123',
          name: 'Test Group',
          display_language: '',
          location_code: 'ES',
        },
      });

      const locationSelect = screen.getByRole('combobox', {
        name: /group location/i,
      });
      expect(locationSelect.value).toBe('ES');
    });
  });

  describe('Suggested Language', () => {
    it('shows suggested language when location is selected', async () => {
      renderComponent({
        group: {
          id: 'group-123',
          name: 'Test Group',
          display_language: '',
          location_code: 'ES',
        },
      });

      // Should show suggestion for Spain -> Spanish
      await waitFor(() => {
        expect(screen.getByText(/suggested language for this location/i)).toBeInTheDocument();
      });
    });

    it('shows Apply button for suggested language', async () => {
      renderComponent({
        group: {
          id: 'group-123',
          name: 'Test Group',
          display_language: '',
          location_code: 'ES',
        },
      });

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i });
        expect(applyButton).toBeInTheDocument();
      });
    });

    it('clicking Apply sets the suggested language', async () => {
      renderComponent({
        group: {
          id: 'group-123',
          name: 'Test Group',
          display_language: '',
          location_code: 'ES',
        },
      });

      await waitFor(() => {
        const applyButton = screen.getByRole('button', { name: /apply/i });
        fireEvent.click(applyButton);
      });

      // After clicking Apply, the language should be set to Spanish
      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      expect(languageSelect.value).toBe('es');
    });
  });

  describe('Save Functionality', () => {
    it('save button is disabled when no changes', () => {
      renderComponent();

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('save button is enabled when language changes', async () => {
      renderComponent();

      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });

      fireEvent.change(languageSelect, { target: { value: 'es' } });

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('calls updateGroupLanguage on save', async () => {
      const { updateGroupLanguage } = await import('../../../src/services/screenGroupService');

      renderComponent();

      // Change language
      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateGroupLanguage).toHaveBeenCalledWith('group-123', {
          display_language: 'es',
          location_code: null,
        });
      });
    });

    it('calls onUpdate after successful save', async () => {
      const onUpdate = vi.fn();

      renderComponent({ onUpdate });

      // Change language
      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      fireEvent.change(languageSelect, { target: { value: 'fr' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });

    it('shows success toast after save', async () => {
      const showToast = vi.fn();

      renderComponent({ showToast });

      // Change location
      const locationSelect = screen.getByRole('combobox', {
        name: /group location/i,
      });
      fireEvent.change(locationSelect, { target: { value: 'FR' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          'Language settings saved successfully',
          'success'
        );
      });
    });

    it('shows error toast on save failure', async () => {
      const { updateGroupLanguage } = await import('../../../src/services/screenGroupService');
      updateGroupLanguage.mockRejectedValueOnce(new Error('Network error'));

      const showToast = vi.fn();

      renderComponent({ showToast });

      // Change language
      const languageSelect = screen.getByRole('combobox', {
        name: /display language/i,
      });
      fireEvent.change(languageSelect, { target: { value: 'es' } });

      // Click save
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save'),
          'error'
        );
      });
    });
  });

  describe('Props Update', () => {
    it('updates state when group prop changes', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ScreenGroupSettingsTab
            group={{ id: 'group-1', name: 'Group 1', display_language: 'en', location_code: 'US' }}
            onUpdate={vi.fn()}
            showToast={vi.fn()}
          />
        </BrowserRouter>
      );

      // Initial values
      expect(
        screen.getByRole('combobox', { name: /display language/i }).value
      ).toBe('en');

      // Rerender with new group
      rerender(
        <BrowserRouter>
          <ScreenGroupSettingsTab
            group={{ id: 'group-2', name: 'Group 2', display_language: 'fr', location_code: 'FR' }}
            onUpdate={vi.fn()}
            showToast={vi.fn()}
          />
        </BrowserRouter>
      );

      // Values should update
      expect(
        screen.getByRole('combobox', { name: /display language/i }).value
      ).toBe('fr');
    });
  });
});
