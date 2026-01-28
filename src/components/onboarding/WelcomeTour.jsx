/**
 * WelcomeTour Component
 *
 * Modal wizard for introducing new users to BizScreen's key features.
 * 6 steps covering: welcome, media library, playlists, templates, screens, scheduling.
 *
 * Features:
 * - Persistent progress (survives page refresh)
 * - Next/Back navigation
 * - Skip link for users who want to explore on their own
 * - Final step CTA routes to starter pack selection
 *
 * @module components/onboarding/WelcomeTour
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Image,
  ListVideo,
  LayoutTemplate,
  Monitor,
  Calendar,
} from 'lucide-react';


import {
  getWelcomeTourProgress,
  updateWelcomeTourStep,
  skipWelcomeTour,
} from '../../services/onboardingService';

/**
 * Tour step definitions
 */
const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to BizScreen',
    description:
      'Your all-in-one digital signage platform. Create stunning TV displays for your business in minutes. Let us show you around.',
    icon: Sparkles,
    color: 'from-blue-500 to-indigo-600',
    highlight: 'Quick 2-minute tour',
  },
  {
    id: 'media',
    title: 'Your Media Library',
    description:
      'Upload and organize your images, videos, and documents. Drag and drop files or import from your favorite cloud services. Everything you need in one place.',
    icon: Image,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'playlists',
    title: 'Create Playlists',
    description:
      'Arrange your media into playlists that play automatically. Set durations, transitions, and schedules. Perfect for rotating content throughout the day.',
    icon: ListVideo,
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'templates',
    title: 'Design with Templates',
    description:
      'Browse our marketplace for professionally designed templates. From menus to promotions, find the perfect starting point and customize to match your brand.',
    icon: LayoutTemplate,
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'screens',
    title: 'Manage Your Screens',
    description:
      'Register and pair your TV displays. Monitor their status in real-time, organize them into groups, and push content with one click.',
    icon: Monitor,
    color: 'from-orange-500 to-amber-600',
  },
  {
    id: 'scheduling',
    title: 'Schedule Content',
    description:
      'Set up when your content plays with our visual scheduler. Create recurring schedules, daypart content, or run time-limited campaigns.',
    icon: Calendar,
    color: 'from-cyan-500 to-blue-600',
  },
];

/**
 * WelcomeTour - Main tour modal component
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} [props.onComplete] - Called when tour is completed
 * @param {Function} [props.onGetStarted] - Called to route to starter pack selection
 */
export function WelcomeTour({ isOpen, onClose, onComplete, onGetStarted }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalSteps = TOUR_STEPS.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  /**
   * Load saved tour progress on mount
   */
  useEffect(() => {
    async function loadTourProgress() {
      if (!isOpen) return;

      setLoading(true);
      try {
        const progress = await getWelcomeTourProgress();
        // Resume from saved step if tour was in progress
        if (progress.currentTourStep > 0 && !progress.completedWelcomeTour) {
          setCurrentStep(progress.currentTourStep);
        }
      } catch (err) {
        // Continue with default (step 0) on error
        console.error('Failed to load tour progress:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTourProgress();
  }, [isOpen]);

  /**
   * Navigate to next step
   */
  const handleNext = useCallback(async () => {
    if (isLastStep) return;

    const newStep = currentStep + 1;
    setCurrentStep(newStep);

    // Persist progress (fire and forget)
    updateWelcomeTourStep(newStep).catch((err) => {
      console.error('Failed to save tour step:', err);
    });
  }, [currentStep, isLastStep]);

  /**
   * Navigate to previous step
   */
  const handleBack = useCallback(async () => {
    if (isFirstStep) return;

    const newStep = currentStep - 1;
    setCurrentStep(newStep);

    // Persist progress (fire and forget)
    updateWelcomeTourStep(newStep).catch((err) => {
      console.error('Failed to save tour step:', err);
    });
  }, [currentStep, isFirstStep]);

  /**
   * Complete the tour and route to starter packs
   */
  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      await updateWelcomeTourStep(totalSteps - 1, true);
      onComplete?.();
      onGetStarted?.();
    } catch (err) {
      console.error('Failed to complete tour:', err);
    } finally {
      setSaving(false);
    }
  }, [totalSteps, onComplete, onGetStarted]);

  /**
   * Skip the tour
   */
  const handleSkip = useCallback(async () => {
    try {
      await skipWelcomeTour();
      onClose?.();
    } catch (err) {
      console.error('Failed to skip tour:', err);
      onClose?.();
    }
  }, [onClose]);

  // Current step data
  const step = TOUR_STEPS[currentStep];

  return (
    <Modal
      open={isOpen}
      onClose={handleSkip}
      size="lg"
      showCloseButton={false}
      closeOnOverlay={false}
      closeOnEscape={false}
    >
      {/* Gradient header accent */}
      <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl" />

      <ModalContent className="min-h-[320px] flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-gray-400 text-sm">Loading...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <WelcomeTourStep
              key={step.id}
              step={step}
              isFirst={isFirstStep}
            />
          </AnimatePresence>
        )}
      </ModalContent>

      {/* Step indicator dots */}
      <div className="flex justify-center gap-2 pb-4">
        {TOUR_STEPS.map((s, index) => (
          <button
            key={s.id}
            onClick={() => {
              setCurrentStep(index);
              updateWelcomeTourStep(index).catch(() => {});
            }}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${index === currentStep
                ? 'bg-blue-500 w-6'
                : index < currentStep
                  ? 'bg-blue-300 hover:bg-blue-400'
                  : 'bg-gray-200 hover:bg-gray-300'
              }
            `}
            aria-label={`Go to step ${index + 1}: ${s.title}`}
          />
        ))}
      </div>

      <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
        {/* Skip link */}
        <button
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors order-2 sm:order-1"
        >
          Skip for now
        </button>

        {/* Navigation buttons */}
        <div className="flex gap-3 order-1 sm:order-2">
          {!isFirstStep && (
            <Button
              variant="secondary"
              onClick={handleBack}
              icon={<ChevronLeft size={18} />}
            >
              Back
            </Button>
          )}

          {isLastStep ? (
            <Button
              variant="primary"
              onClick={handleComplete}
              loading={saving}
              icon={<Sparkles size={18} />}
              iconPosition="left"
            >
              Get Started with Templates
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              icon={<ChevronRight size={18} />}
              iconPosition="right"
            >
              Next
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
}

export { TOUR_STEPS };
export default WelcomeTour;
