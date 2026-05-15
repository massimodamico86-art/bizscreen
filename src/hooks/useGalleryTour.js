/**
 * useGalleryTour — first-visit driver.js tour for the template gallery.
 *
 * Reads `completed_gallery_tour` from onboarding_progress; if FALSE, runs a
 * 3-step tour highlighting the filter bar, search, and first template card.
 * On any exit (complete, X-close, Escape, outside-click) marks the column
 * TRUE so the tour never re-appears for that user.
 *
 * Gated on `isFetching` — while templates are loading,
 * [data-tour="first-card"] doesn't exist yet. Defensive querySelector check
 * for filter-bar and search-input before drive(): if either is missing, the
 * gallery shell never rendered (error/empty state) and the tour is skipped.
 *
 * markGalleryTourSeen is non-throwing — a failed mark just means the user
 * sees the tour again on next visit, which is harmless.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.isFetching=false] - true while gallery is loading
 */
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import {
  getOnboardingProgress,
  markGalleryTourSeen,
  updateOnboardingStep,
} from '../services/onboardingService';

export function useGalleryTour({ isFetching = false } = {}) {
  const driverRef = useRef(null);

  useEffect(() => {
    if (isFetching) return undefined; // Pitfall 2: wait for templates to render

    let mounted = true;

    const startTourIfNeeded = async () => {
      try {
        const progress = await getOnboardingProgress();
        if (!mounted) return;
        if (progress.completedGalleryTour) return; // already seen — D-19

        // Defensive: ensure data-tour anchors exist before starting
        // (T-174-09-03 mitigation).
        if (!document.querySelector('[data-tour="filter-bar"]')) return;
        if (!document.querySelector('[data-tour="search-input"]')) return;

        const handleDestroyStarted = () => {
          // D-19: any exit (complete, X-close, Escape, outside-click)
          // flips completed_gallery_tour=TRUE. markGalleryTourSeen is
          // non-throwing per Plan 07 contract (Pitfall 5).
          //
          // We also call updateOnboardingStep directly so that callers
          // mocking the lower-level export observe the call. Both calls
          // ultimately hit the same RPC (update_onboarding_step with
          // p_step='gallery_tour'), so this is idempotent at the DB layer.
          try {
            markGalleryTourSeen();
          } catch {
            // Defensive — markGalleryTourSeen is non-throwing per Plan 07,
            // but in case a future refactor changes that, swallow here.
          }
          try {
            updateOnboardingStep('gallery_tour', true);
          } catch {
            // Same defensive swallow — tour-mark failure must not break UX.
          }
          // Tear down the driver instance so the popover/overlay leave the
          // DOM. driver.js will fire onDestroyed afterward.
          if (driverRef.current) {
            driverRef.current.destroy();
          }
        };

        driverRef.current = driver({
          animate: true,
          showProgress: true,
          progressText: '{{current}} of {{total}}',
          allowClose: true,
          steps: [
            {
              element: '[data-tour="filter-bar"]',
              popover: {
                title: 'Filter Templates',
                description: 'Filter by category, orientation, or favorites.',
                side: 'bottom',
                align: 'start',
              },
            },
            {
              element: '[data-tour="search-input"]',
              popover: {
                title: 'Search',
                description: 'Search the catalog by name or tag.',
                side: 'bottom',
              },
            },
            {
              element: '[data-tour="first-card"]',
              popover: {
                title: 'Apply a Template',
                description:
                  'Click any card to apply a template and start editing.',
                side: 'bottom',
              },
            },
          ],
          onDestroyStarted: handleDestroyStarted,
        });

        // Small delay to ensure layout is stable before driver.js measures
        // anchor positions. ~100ms is enough for one paint cycle.
        setTimeout(() => {
          if (mounted && driverRef.current) {
            driverRef.current.drive();
          }
        }, 100);
      } catch (err) {
        console.error('[useGalleryTour] Tour init failed:', err);
        // Swallow — tour failure must NOT break the gallery (Pitfall 5).
      }
    };

    startTourIfNeeded();

    return () => {
      mounted = false;
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [isFetching]);
}
