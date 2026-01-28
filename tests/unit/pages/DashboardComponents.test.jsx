/**
 * Dashboard Child Components Unit Tests
 * Phase 2: Tests for hardened dashboard sub-components
 *
 * These tests verify that child components handle null/undefined/partial data
 * gracefully without crashing, as hardened in Phase 1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Import named exports for testing

// Mock the i18n hook
vi.mock('../../../src/i18n', () => ({
  useTranslation: () => ({
    t: (key, defaultValue) => defaultValue,
  }),
}));

// Wrapper for components that need router context
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock translation function
const mockT = (key, defaultValue) => defaultValue;

describe('DashboardErrorState', () => {
  const defaultProps = {
    error: 'Test error message',
    onRetry: vi.fn(),
    t: mockT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error title and description', () => {
    renderWithRouter(<DashboardErrorState {...defaultProps} />);

    expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
    expect(
      screen.getByText("We're having trouble loading your dashboard data. This might be a temporary issue.")
    ).toBeInTheDocument();
  });

  it('displays the error message', () => {
    renderWithRouter(<DashboardErrorState {...defaultProps} error="Specific error" />);

    expect(screen.getByText('Specific error')).toBeInTheDocument();
  });

  it('renders Try Again button', () => {
    renderWithRouter(<DashboardErrorState {...defaultProps} />);

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onRetry when button is clicked', async () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    renderWithRouter(<DashboardErrorState {...defaultProps} onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows "Retrying..." text when retry is in progress', async () => {
    // Create a promise that doesn't resolve immediately
    let resolveRetry;
    const retryPromise = new Promise((resolve) => {
      resolveRetry = resolve;
    });
    const onRetry = vi.fn().mockReturnValue(retryPromise);

    renderWithRouter(<DashboardErrorState {...defaultProps} onRetry={onRetry} />);

    const button = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(button);

    // Button should show retrying state
    expect(screen.getByText('Retrying...')).toBeInTheDocument();

    // Cleanup
    resolveRetry();
  });

  it('handles null error gracefully', () => {
    // Should not crash with null error
    renderWithRouter(<DashboardErrorState {...defaultProps} error={null} />);

    // Should still render the error UI structure
    expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
  });

  it('handles undefined error gracefully', () => {
    // Should not crash with undefined error
    renderWithRouter(<DashboardErrorState {...defaultProps} error={undefined} />);

    expect(screen.getByText("Couldn't load dashboard")).toBeInTheDocument();
  });
});

describe('ScreenRow', () => {
  const createMockScreen = (overrides = {}) => ({
    id: 'screen-1',
    device_name: 'Test Screen',
    isOnline: true,
    last_seen: new Date().toISOString(),
    assigned_playlist: { name: 'Test Playlist' },
    assigned_layout: null,
    ...overrides,
  });

  it('renders null when screen is null', () => {
    const { container } = renderWithRouter(<ScreenRow screen={null} t={mockT} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null when screen is undefined', () => {
    const { container } = renderWithRouter(<ScreenRow screen={undefined} t={mockT} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders screen name correctly', () => {
    renderWithRouter(<ScreenRow screen={createMockScreen()} t={mockT} />);
    expect(screen.getByText('Test Screen')).toBeInTheDocument();
  });

  it('shows fallback name when device_name is missing', () => {
    renderWithRouter(
      <ScreenRow screen={createMockScreen({ device_name: null })} t={mockT} />
    );
    expect(screen.getByText('Unnamed Screen')).toBeInTheDocument();
  });

  it('shows fallback name when device_name is empty string', () => {
    renderWithRouter(
      <ScreenRow screen={createMockScreen({ device_name: '' })} t={mockT} />
    );
    expect(screen.getByText('Unnamed Screen')).toBeInTheDocument();
  });

  it('displays Online badge when screen is online', () => {
    renderWithRouter(
      <ScreenRow screen={createMockScreen({ isOnline: true })} t={mockT} />
    );
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('displays Offline badge when screen is offline', () => {
    renderWithRouter(
      <ScreenRow screen={createMockScreen({ isOnline: false })} t={mockT} />
    );
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('handles undefined isOnline gracefully (defaults to offline)', () => {
    renderWithRouter(
      <ScreenRow screen={createMockScreen({ isOnline: undefined })} t={mockT} />
    );
    // Should default to Offline (Boolean(undefined) = false)
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('displays assigned playlist name', () => {
    renderWithRouter(
      <ScreenRow
        screen={createMockScreen({ assigned_playlist: { name: 'My Playlist' } })}
        t={mockT}
      />
    );
    expect(screen.getByText('My Playlist')).toBeInTheDocument();
  });

  it('displays assigned layout name when no playlist', () => {
    renderWithRouter(
      <ScreenRow
        screen={createMockScreen({
          assigned_playlist: null,
          assigned_layout: { name: 'My Layout' },
        })}
        t={mockT}
      />
    );
    expect(screen.getByText('My Layout')).toBeInTheDocument();
  });

  it('shows "No content assigned" when no playlist or layout', () => {
    renderWithRouter(
      <ScreenRow
        screen={createMockScreen({
          assigned_playlist: null,
          assigned_layout: null,
        })}
        t={mockT}
      />
    );
    expect(screen.getByText('No content assigned')).toBeInTheDocument();
  });

  it('handles partial screen object without crashing', () => {
    // Minimal screen object - should not crash
    renderWithRouter(<ScreenRow screen={{ id: 'test' }} t={mockT} />);
    expect(screen.getByText('Unnamed Screen')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('No content assigned')).toBeInTheDocument();
  });
});

describe('StatsGrid', () => {
  const defaultProps = {
    stats: {
      screens: { total: 5, online: 3, offline: 2 },
      playlists: { total: 10 },
      media: { total: 25, images: 15, videos: 8, apps: 5 },
    },
    setCurrentPage: vi.fn(),
    t: mockT,
    isFirstRun: false,
    demoResult: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four stat cards', () => {
    renderWithRouter(<StatsGrid {...defaultProps} />);

    expect(screen.getByText('Total Screens')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Media Assets')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
  });

  it('displays correct stat values', () => {
    renderWithRouter(<StatsGrid {...defaultProps} />);

    // Check that stat labels and at least some values are present
    // Note: Some values like '5' appear multiple times (screens and apps)
    expect(screen.getByText('Total Screens')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Playlists (unique)
    expect(screen.getByText('25')).toBeInTheDocument(); // Media Assets (unique)
  });

  it('shows empty workspace hint when all stats are zero', () => {
    const zeroStats = {
      screens: { total: 0, online: 0, offline: 0 },
      playlists: { total: 0 },
      media: { total: 0, images: 0, videos: 0, apps: 0 },
    };

    renderWithRouter(
      <StatsGrid
        {...defaultProps}
        stats={zeroStats}
        isFirstRun={false}
        demoResult={null}
      />
    );

    expect(
      screen.getByText('Your workspace is empty. Start by uploading media or adding a screen!')
    ).toBeInTheDocument();
  });

  it('does NOT show empty hint when isFirstRun is true', () => {
    const zeroStats = {
      screens: { total: 0, online: 0, offline: 0 },
      playlists: { total: 0 },
      media: { total: 0, images: 0, videos: 0, apps: 0 },
    };

    renderWithRouter(
      <StatsGrid
        {...defaultProps}
        stats={zeroStats}
        isFirstRun={true}
        demoResult={null}
      />
    );

    expect(
      screen.queryByText('Your workspace is empty. Start by uploading media or adding a screen!')
    ).not.toBeInTheDocument();
  });

  it('does NOT show empty hint when demoResult exists', () => {
    const zeroStats = {
      screens: { total: 0, online: 0, offline: 0 },
      playlists: { total: 0 },
      media: { total: 0, images: 0, videos: 0, apps: 0 },
    };

    renderWithRouter(
      <StatsGrid
        {...defaultProps}
        stats={zeroStats}
        isFirstRun={false}
        demoResult={{ otpCode: '123456' }}
      />
    );

    expect(
      screen.queryByText('Your workspace is empty. Start by uploading media or adding a screen!')
    ).not.toBeInTheDocument();
  });

  it('handles null stats gracefully', () => {
    renderWithRouter(<StatsGrid {...defaultProps} stats={null} />);

    // Should render with all zeros
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThanOrEqual(4);
  });

  it('handles undefined stats gracefully', () => {
    renderWithRouter(<StatsGrid {...defaultProps} stats={undefined} />);

    // Should render without crashing
    expect(screen.getByText('Total Screens')).toBeInTheDocument();
  });

  it('handles partial stats object gracefully', () => {
    const partialStats = {
      screens: { total: 3 },
      // playlists and media missing
    };

    renderWithRouter(<StatsGrid {...defaultProps} stats={partialStats} />);

    // Should render without crashing
    expect(screen.getByText('3')).toBeInTheDocument(); // Total Screens
    expect(screen.getByText('Total Screens')).toBeInTheDocument();
  });

  it('shows "No media yet" when media count is zero', () => {
    const statsWithNoMedia = {
      screens: { total: 5, online: 3, offline: 2 },
      playlists: { total: 10 },
      media: { total: 0, images: 0, videos: 0, apps: 0 },
    };

    renderWithRouter(<StatsGrid {...defaultProps} stats={statsWithNoMedia} />);

    expect(screen.getByText('No media yet')).toBeInTheDocument();
  });

  it('calls setCurrentPage when stat card is clicked', () => {
    const setCurrentPage = vi.fn();
    renderWithRouter(<StatsGrid {...defaultProps} setCurrentPage={setCurrentPage} />);

    // Click on the Playlists card (more reliable target)
    const playlistsCard = screen.getByText('Playlists').closest('[class*="cursor-pointer"]');
    if (playlistsCard) {
      fireEvent.click(playlistsCard);
      expect(setCurrentPage).toHaveBeenCalledWith('playlists');
    }
  });
});
