/**
 * OnboardingWizard Component
 *
 * Step-by-step wizard for new tenant onboarding.
 * Guides users through: welcome, logo upload, media upload,
 * playlist creation, screen setup, and screen pairing.
 *
 * @module components/OnboardingWizard
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Image,
  Upload,
  List,
  Monitor,
  Link,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Loader2
} from 'lucide-react';
import Button from './Button';
import {
  ONBOARDING_STEPS,
  getOnboardingProgress,
  updateOnboardingStep,
  skipOnboarding,
  getNextStep,
  getCompletedCount,
  getProgressPercent
} from '../services/onboardingService';

/**
 * Icon mapping for step IDs
 */
const STEP_ICONS = {
  welcome: Sparkles,
  logo: Image,
  first_media: Upload,
  first_playlist: List,
  first_screen: Monitor,
  screen_pairing: Link
};

/**
 * OnboardingWizard - Main wizard component
 */
const OnboardingWizard = ({ isOpen, onClose, onComplete }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load progress on mount
  useEffect(() => {
    if (isOpen) {
      loadProgress();
    }
  }, [isOpen]);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const data = await getOnboardingProgress();
      setProgress(data);

      // Find the first incomplete step
      const nextStep = getNextStep(data);
      if (nextStep) {
        const idx = ONBOARDING_STEPS.findIndex(s => s.id === nextStep.id);
        setCurrentStepIndex(idx >= 0 ? idx : 0);
      } else {
        // All complete
        onComplete?.();
      }
    } catch (err) {
      console.error('Failed to load onboarding progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const StepIcon = currentStep ? STEP_ICONS[currentStep.id] : Sparkles;

  const isStepComplete = useCallback((stepId) => {
    if (!progress) return false;
    const mapping = {
      welcome: progress.completedWelcome,
      logo: progress.completedLogo,
      first_media: progress.completedFirstMedia,
      first_playlist: progress.completedFirstPlaylist,
      first_screen: progress.completedFirstScreen,
      screen_pairing: progress.completedScreenPairing
    };
    return mapping[stepId] || false;
  }, [progress]);

  const handleCompleteStep = async () => {
    if (!currentStep || isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await updateOnboardingStep(currentStep.id, true);

      if (result.success) {
        // Refresh progress
        const newProgress = await getOnboardingProgress();
        setProgress(newProgress);

        // Check if all complete
        if (result.isComplete || newProgress.isComplete) {
          onComplete?.();
          onClose();
          return;
        }

        // Move to next step or navigate
        if (currentStep.navigateTo) {
          onClose();
          navigate(`/${currentStep.navigateTo}`);
        } else if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        }
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      await skipOnboarding();
      onClose();
    } catch (err) {
      console.error('Failed to skip onboarding:', err);
    } finally {
      setIsSkipping(false);
    }
  };

  const handleNavigateToStep = async () => {
    if (!currentStep?.navigateTo) return;

    // Mark welcome as complete if we're on it
    if (currentStep.id === 'welcome') {
      await updateOnboardingStep('welcome', true);
    }

    onClose();
    navigate(`/${currentStep.navigateTo}`);
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  if (!isOpen) return null;

  const completedCount = progress ? getCompletedCount(progress) : 0;
  const progressPercent = progress ? getProgressPercent(progress) : 0;

  return (
    <div
      className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium opacity-90">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close wizard"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/30 rounded-full h-2 mb-4">
            <div
              className="bg-white rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <StepIcon size={28} />
            </div>
            <div>
              <h2 id="onboarding-title" className="text-xl font-bold">
                {currentStep?.title || 'Welcome'}
              </h2>
              <p className="text-sm opacity-90">
                {currentStep?.description || ''}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          ) : (
            <>
              {/* Step indicators */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {ONBOARDING_STEPS.map((step, idx) => {
                  const Icon = STEP_ICONS[step.id];
                  const isComplete = isStepComplete(step.id);
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStepIndex(idx)}
                      className={`
                        p-2 rounded-lg transition-all
                        ${isCurrent
                          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                          : isComplete
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }
                      `}
                      aria-label={`${step.title}${isComplete ? ' (completed)' : ''}`}
                    >
                      {isComplete ? (
                        <Check size={18} />
                      ) : (
                        <Icon size={18} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Step-specific content */}
              <StepContent
                step={currentStep}
                isComplete={isStepComplete(currentStep?.id)}
                onNavigate={handleNavigateToStep}
              />

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="flex gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevStep}
                    >
                      <ChevronLeft size={16} />
                      Back
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSkip}
                    disabled={isSkipping}
                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                  >
                    {isSkipping ? 'Skipping...' : 'Skip for now'}
                  </button>

                  {currentStep?.navigateTo ? (
                    <Button onClick={handleNavigateToStep}>
                      Go to {currentStep.title.replace(/^(Set Up|Create|Add|Upload|Pair)\s+/i, '')}
                      <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleCompleteStep}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : currentStepIndex < ONBOARDING_STEPS.length - 1 ? (
                        <>
                          Continue
                          <ChevronRight size={16} />
                        </>
                      ) : (
                        <>
                          Finish
                          <Check size={16} />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Step-specific content component
 */
const StepContent = ({ step, isComplete, onNavigate }) => {
  if (!step) return null;

  const content = {
    welcome: (
      <div className="text-center py-4">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to BizScreen!
        </h3>
        <p className="text-gray-600">
          Let's get your digital signage up and running in just a few minutes.
          We'll walk you through the essential steps to start displaying content
          on your screens.
        </p>
      </div>
    ),
    logo: (
      <div className="text-center py-4">
        {isComplete ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Logo Uploaded!
            </h3>
            <p className="text-gray-600">
              Your brand logo is set up. You can update it anytime in Settings.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
              <Image size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Add Your Brand Logo
            </h3>
            <p className="text-gray-600">
              Upload your company logo to personalize your screens and maintain
              brand consistency across all displays.
            </p>
          </>
        )}
      </div>
    ),
    first_media: (
      <div className="text-center py-4">
        {isComplete ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Media Uploaded!
            </h3>
            <p className="text-gray-600">
              You've added your first media. Keep adding more to create engaging content.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-4 bg-blue-50 rounded-xl flex items-center justify-center">
              <Upload size={32} className="text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Upload Your First Media
            </h3>
            <p className="text-gray-600">
              Add images, videos, or other content that you want to display.
              These will be organized in your Media Library.
            </p>
          </>
        )}
      </div>
    ),
    first_playlist: (
      <div className="text-center py-4">
        {isComplete ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Playlist Created!
            </h3>
            <p className="text-gray-600">
              Your first playlist is ready. Add more playlists to schedule different content.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-4 bg-purple-50 rounded-xl flex items-center justify-center">
              <List size={32} className="text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create a Playlist
            </h3>
            <p className="text-gray-600">
              Organize your media into playlists. Control the order, duration,
              and transitions between items.
            </p>
          </>
        )}
      </div>
    ),
    first_screen: (
      <div className="text-center py-4">
        {isComplete ? (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              Screen Created!
            </h3>
            <p className="text-gray-600">
              Your screen is set up. Now pair it with a physical display.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-4 bg-orange-50 rounded-xl flex items-center justify-center">
              <Monitor size={32} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Set Up a Screen
            </h3>
            <p className="text-gray-600">
              Register your first display screen. This represents a physical TV
              or monitor that will show your content.
            </p>
          </>
        )}
      </div>
    ),
    screen_pairing: (
      <div className="text-center py-4">
        {isComplete ? (
          <>
            <div className="text-5xl mb-4">🎊</div>
            <h3 className="text-lg font-semibold text-green-600 mb-2">
              You're All Set!
            </h3>
            <p className="text-gray-600">
              Congratulations! Your screen is paired and ready to display content.
            </p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-4 bg-green-50 rounded-xl flex items-center justify-center">
              <Link size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Pair Your Screen
            </h3>
            <p className="text-gray-600">
              Connect your TV or display device. Open the BizScreen player app
              on your device and scan the QR code or enter the pairing code.
            </p>
          </>
        )}
      </div>
    )
  };

  return content[step.id] || null;
};

export default OnboardingWizard;
