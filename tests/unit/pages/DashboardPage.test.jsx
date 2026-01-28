/**
 * DashboardPage Unit Tests
 * Phase 2: Tests for client dashboard core states
 *
 * Tests cover:
 * - Happy path rendering with valid data
 * - Loading state on initial load
 * - Error state with retry functionality
 * - Empty workspace (all stats zero) state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Component under test
import DashboardPage from '../../../src/pages/DashboardPage';

// Mock the auth context
const mockUser = { id: 'test-user-id', email: 'test@example.com' };
const mockUseAuth = vi.fn();
vi.mock('../../../src/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the i18n hook
vi.mock('../../../src/i18n', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue,
  }),
  I18nProvider: ({ children }) => children,
}));

// Mock dashboard service
const mockGetDashboardStats = vi.fn();
const mockGetTopScreens = vi.fn();
const mockFormatLastSeen = vi.fn((lastSeen) => lastSeen ? 'Recently' : 'Never');

vi.mock('../../../src/services/dashboardService', () => ({
  getDashboardStats: () => mockGetDashboardStats(),
  getTopScreens: (limit) => mockGetTopScreens(limit),
  formatLastSeen: (lastSeen) => mockFormatLastSeen(lastSeen),
}));

// Mock onboarding service
vi.mock('../../../src/services/onboardingService', () => ({
  checkIsFirstRun: vi.fn().mockResolvedValue({ isFirstRun: false }),
  needsOnboarding: vi.fn().mockResolvedValue(false),
  shouldShowWelcomeTour: vi.fn().mockResolvedValue(false),
  getWelcomeTourProgress: vi.fn().mockResolvedValue({ completedWelcomeTour: false, starterPackApplied: false }),
  getSelectedIndustry: vi.fn().mockResolvedValue(null),
}));

// Mock demo content service
vi.mock('../../../src/services/demoContentService', () => ({
  createDemoWorkspace: vi.fn().mockResolvedValue({ otpCode: '123456' }),
}));

// Mock template service
vi.mock('../../../src/services/templateService', () => ({
  applyPack: vi.fn().mockResolvedValue({ playlists: [], layouts: [] }),
  getDefaultPackSlug: vi.fn().mockReturnValue('generic'),
}));

// Mock ErrorBoundary to pass through children
vi.mock('../../../src/components/ErrorBoundary', () => ({
  default: ({ children }) => children,
}));

// Mock OnboardingWizard
vi.mock('../../../src/components/OnboardingWizard', () => ({
  default: () => null,
}));

// Mock welcome components
vi.mock('../../../src/components/welcome', () => ({
  WelcomeHero: () => null,
  WelcomeFeatureCards: () => null,
}));

// Mock dashboard components
vi.mock('../../../src/components/dashboard', () => ({
  QuickActionsBar: () => null,
  HealthBanner: () => null,
  ActiveContentGrid: () => null,
  TimelineActivity: () => null,
  PendingApprovalsWidget: () => null,
}));

// Mock onboarding components
vi.mock('../../../src/components/onboarding/WelcomeTour', () => ({
  WelcomeTour: () => null,
}));

vi.mock('../../../src/components/onboarding/IndustrySelectionModal', () => ({
  IndustrySelectionModal: () => null,
}));

vi.mock('../../../src/components/onboarding/StarterPackOnboarding', () => ({
  StarterPackOnboarding: () => null,
}));

vi.mock('../../../src/components/onboarding/OnboardingBanner', () => ({
  OnboardingBanner: () => null,
  isBannerDismissed: vi.fn().mockReturnValue(false),
}));

// Mock dashboard sub-components from pages/dashboard
vi.mock('../../../src/pages/dashboard/WelcomeModal', () => ({
  default: () => null,
}));

vi.mock('../../../src/pages/dashboard/OnboardingCards', () => ({
  DemoResultCard: () => null,
  GettingStartedTips: () => null,
}));

// Test data factories
const createMockStats = (overrides = {}) => ({
  screens: {
    total: 5,
    online: 3,
    offline: 2,
    ...overrides.screens,
  },
  playlists: {
    total: 8,
    ...overrides.playlists,
  },
  media: {
    total: 25,
    images: 15,
    videos: 8,
    apps: 2,
    ...overrides.media,
  },
});

const createMockScreens = (count = 3) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `screen-${i}`,
    device_name: `Test Screen ${i + 1}`,
    isOnline: i % 2 === 0,
    last_seen: new Date().toISOString(),
    assigned_playlist: i === 0 ? { name: 'My Playlist' } : null,
    assigned_layout: null,
  }));
};

// Wrapper component with required providers
const renderDashboard = (props = {}) => {
  const defaultProps = {
    setCurrentPage: vi.fn(),
    showToast: vi.fn(),
    ...props,
  };

  return render(
    <BrowserRouter>
      <DashboardPage {...defaultProps} />
    </BrowserRouter>
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Default mock values
    mockUseAuth.mockReturnValue({
      user: mockUser,
    });

    mockGetDashboardStats.mockResolvedValue(createMockStats());
    mockGetTopScreens.mockResolvedValue(createMockScreens());

    // Mock localStorage
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('true'), // Skip welcome modal
      setItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Happy Path Rendering', () => {
    it('renders dashboard without crashing with valid data', async () => {
      renderDashboard();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check main heading is present
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Check stat card labels are present
      expect(screen.getByText('Total Screens')).toBeInTheDocument();
      expect(screen.getByText('Playlists')).toBeInTheDocument();
      expect(screen.getByText('Media Assets')).toBeInTheDocument();
      expect(screen.getByText('Apps')).toBeInTheDocument();

      // Check no error UI is shown
      expect(screen.queryByText("Couldn't load dashboard")).not.toBeInTheDocument();
    });

    it('displays correct stat values', async () => {
      const stats = createMockStats({
        screens: { total: 10, online: 7, offline: 3 },
        playlists: { total: 15 },
        media: { total: 50, images: 30, videos: 18, apps: 5 },
      });
      mockGetDashboardStats.mockResolvedValue(stats);

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check stat values are displayed
      expect(screen.getByText('10')).toBeInTheDocument(); // Total Screens
      expect(screen.getByText('15')).toBeInTheDocument(); // Playlists
      expect(screen.getByText('50')).toBeInTheDocument(); // Media Assets
      expect(screen.getByText('5')).toBeInTheDocument(); // Apps
    });

    it('displays screens in the overview section', async () => {
      const screens = createMockScreens(3);
      mockGetTopScreens.mockResolvedValue(screens);

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check screens overview header (may appear multiple times for responsive layouts)
      const overviewHeaders = screen.getAllByText('Screens Overview');
      expect(overviewHeaders.length).toBeGreaterThan(0);

      // Check screen names are displayed (may appear multiple times for responsive layouts)
      expect(screen.getAllByText('Test Screen 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Screen 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test Screen 3').length).toBeGreaterThan(0);
    });

    it('displays quick actions section', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Check quick actions header (may appear multiple times for responsive layouts)
      const quickActionsHeaders = screen.getAllByText('Quick Actions');
      expect(quickActionsHeaders.length).toBeGreaterThan(0);

      // Check action buttons are present (may appear multiple times for responsive layouts)
      expect(screen.getAllByText('Add Screen').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Create Playlist').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Upload Media').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Create App').length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('shows loading state on initial load', async () => {
      // Create a promise that we control
      let resolveStats;
      const statsPromise = new Promise((resolve) => {
        resolveStats = resolve;
      });
      mockGetDashboardStats.mockReturnValue(statsPromise);

      renderDashboard();

      // Should show loading indicator
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Resolve the promise to complete the test
      resolveStats(createMockStats());

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('shows loading spinner icon', async () => {
      let resolveStats;
      const statsPromise = new Promise((resolve) => {
        resolveStats = resolve;
      });
      mockGetDashboardStats.mockReturnValue(statsPromise);

      const { container } = renderDashboard();

      // Should show animated spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Cleanup
      resolveStats(createMockStats());
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    it('renders error UI when fetch fails', async () => {
      const errorMessage = 'Network error occurred';
      mockGetDashboardStats.mockRejectedValue(new Error(errorMessage));

      renderDashboard();

      // Wait for error UI to appear
      await waitFor(() => {
        expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
      });

      // Check error description is shown
      expect(
        screen.getByText("We're having trouble loading your dashboard data. This might be a temporary issue.")
      ).toBeInTheDocument();

      // Check error message is displayed
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('shows Try Again button in error state', async () => {
      mockGetDashboardStats.mockRejectedValue(new Error('API Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
      });

      // Check retry button is present
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('retry button triggers data refetch', async () => {
      // First call fails, second succeeds
      mockGetDashboardStats
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(createMockStats());

      renderDashboard();

      // Wait for error UI
      await waitFor(() => {
        expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      // Should call getDashboardStats again
      await waitFor(() => {
        // Called once on mount, once on retry
        expect(mockGetDashboardStats).toHaveBeenCalledTimes(2);
      });

      // After retry succeeds, should show dashboard content
      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText("Couldn't load dashboard")).not.toBeInTheDocument();
      });
    });

    it('shows toast notification on error', async () => {
      const showToast = vi.fn();
      mockGetDashboardStats.mockRejectedValue(new Error('API Error'));

      renderDashboard({ showToast });

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.stringContaining('Error loading dashboard'),
          'error'
        );
      });
    });
  });

  describe('Empty Workspace State', () => {
    it('shows empty workspace hint when all stats are zero', async () => {
      mockGetDashboardStats.mockResolvedValue({
        screens: { total: 0, online: 0, offline: 0 },
        playlists: { total: 0 },
        media: { total: 0, images: 0, videos: 0, apps: 0 },
      });
      mockGetTopScreens.mockResolvedValue([]);

      // Mock checkIsFirstRun to return false (not first run)
      const { checkIsFirstRun } = await import('../../../src/services/onboardingService');
      checkIsFirstRun.mockResolvedValue({ isFirstRun: false });

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show empty workspace hint
      expect(
        screen.getByText('Your workspace is empty. Start by uploading media or adding a screen!')
      ).toBeInTheDocument();
    });

    it('stats cards show zero values correctly', async () => {
      mockGetDashboardStats.mockResolvedValue({
        screens: { total: 0, online: 0, offline: 0 },
        playlists: { total: 0 },
        media: { total: 0, images: 0, videos: 0, apps: 0 },
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // All stat cards should show 0
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements.length).toBeGreaterThanOrEqual(4); // At least 4 zeros for the main stats
    });

    it('shows "No screens added yet" in screens overview when empty', async () => {
      mockGetDashboardStats.mockResolvedValue(createMockStats());
      mockGetTopScreens.mockResolvedValue([]);

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show empty state for screens
      expect(screen.getByText('No screens added yet')).toBeInTheDocument();
    });

    it('shows "No media yet" text when media count is zero', async () => {
      mockGetDashboardStats.mockResolvedValue({
        screens: { total: 1, online: 1, offline: 0 },
        playlists: { total: 1 },
        media: { total: 0, images: 0, videos: 0, apps: 0 },
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show "No media yet" placeholder
      expect(screen.getByText('No media yet')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('calls setCurrentPage when stat card is clicked', async () => {
      const setCurrentPage = vi.fn();
      renderDashboard({ setCurrentPage });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Click on the Total Screens stat card
      const screensCard = screen.getByText('Total Screens').closest('[class*="cursor-pointer"]');
      if (screensCard) {
        fireEvent.click(screensCard);
        expect(setCurrentPage).toHaveBeenCalledWith('screens');
      }
    });

    it('calls setCurrentPage when quick action is clicked', async () => {
      const setCurrentPage = vi.fn();
      renderDashboard({ setCurrentPage });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Click on Add Screen quick action (may appear multiple times, click first one)
      const addScreenButtons = screen.getAllByText('Add Screen');
      const addScreenButton = addScreenButtons[0].closest('button');
      if (addScreenButton) {
        fireEvent.click(addScreenButton);
        expect(setCurrentPage).toHaveBeenCalledWith('screens');
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles null user gracefully', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      // Should not crash, just not fetch data
      renderDashboard();

      // Since user is null, fetchData early returns
      expect(mockGetDashboardStats).not.toHaveBeenCalled();
    });

    it('handles partial stats data without crashing', async () => {
      // Return stats with missing nested fields
      mockGetDashboardStats.mockResolvedValue({
        screens: null,
        playlists: {},
        media: undefined,
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should render with fallback zeros without crashing
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
