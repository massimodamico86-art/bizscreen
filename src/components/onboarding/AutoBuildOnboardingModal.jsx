/**
 * AutoBuildOnboardingModal
 *
 * Full-screen modal for AI-powered onboarding that:
 * - Asks user about their business type
 * - Optionally collects logo and brand color
 * - Auto-builds a complete TV scene using a starter pack
 *
 * @module components/onboarding/AutoBuildOnboardingModal
 */

import { useState } from 'react';
import {
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Stethoscope,
  Home,
  Building,
  Car,
  Coffee,
  Building2
} from 'lucide-react';
import { completeOnboarding, BUSINESS_TYPES } from '../../services/autoBuildService';
import { useLogger } from '../../hooks/useLogger.js';

// Icon mapping for business types
const BUSINESS_ICONS = {
  restaurant: Utensils,
  salon: Scissors,
  gym: Dumbbell,
  retail: ShoppingBag,
  medical: Stethoscope,
  realestate: Home,
  hotel: Building,
  auto: Car,
  coffee: Coffee,
  other: Building2
};

// Default brand colors by business type
const DEFAULT_COLORS = {
  restaurant: '#E53E3E',
  salon: '#D53F8C',
  gym: '#DD6B20',
  retail: '#3182CE',
  medical: '#38A169',
  realestate: '#805AD5',
  hotel: '#2D3748',
  auto: '#2B6CB0',
  coffee: '#744210',
  other: '#4A5568'
};

/**
 * AutoBuildOnboardingModal - Main component
 */
const AutoBuildOnboardingModal = ({
  isOpen,
  onClose,
  onComplete,
  user,
  userProfile
}) => {
  const logger = useLogger('AutoBuildOnboardingModal');
  // Wizard state
  const [step, setStep] = useState(1); // 1: business type, 2: brand (optional), 3: generating
  const [selectedType, setSelectedType] = useState(null);
  const [brandColor, setBrandColor] = useState('#3B82F6');
  const [tagline, setTagline] = useState('');

  // Loading/error states
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Reset on close
  const handleClose = () => {
    if (!isGenerating) {
      setStep(1);
      setSelectedType(null);
      setBrandColor('#3B82F6');
      setTagline('');
      setError(null);
      setResult(null);
      onClose();
    }
  };

  // Handle business type selection
  const handleSelectType = (typeId) => {
    setSelectedType(typeId);
    setBrandColor(DEFAULT_COLORS[typeId] || DEFAULT_COLORS.other);
  };

  // Generate the scene
  const handleGenerate = async () => {
    if (!selectedType || !userProfile?.id) return;

    setIsGenerating(true);
    setError(null);
    setStep(3);

    try {
      const result = await completeOnboarding({
        tenantId: userProfile.id,
        businessType: selectedType,
        brand: {
          primaryColor: brandColor,
          tagline: tagline || null
        }
      });

      setResult(result);
      setStep(4); // Success step
    } catch (err) {
      logger.error('Autobuild failed', { error: err, businessType: selectedType, tenantId: userProfile?.id });
      setError(err.message || 'Failed to generate your TV scene. Please try again.');
      setStep(2); // Go back to brand step to retry
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle completion
  const handleFinish = () => {
    onComplete?.(result);
    handleClose();
  };

  if (!isOpen) return null;

  const canProceed = step === 1 ? !!selectedType : true;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="autobuild-title"
    >
      {/* Close button (only show if not generating) */}
      {!isGenerating && step !== 4 && (
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      )}

      <div className="w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
            {step === 4 ? (
              <Check size={32} className="text-white" />
            ) : (
              <Sparkles size={32} className="text-white" />
            )}
          </div>
          <h1 id="autobuild-title" className="text-3xl font-bold text-white mb-2">
            {step === 1 && "Let's build your TV display"}
            {step === 2 && 'Personalize your brand'}
            {step === 3 && 'Creating your scene...'}
            {step === 4 && "You're all set!"}
          </h1>
          <p className="text-gray-400 max-w-md mx-auto">
            {step === 1 && "Tell us about your business, and we'll create the perfect digital signage for you."}
            {step === 2 && 'Add optional branding details (you can skip this and customize later).'}
            {step === 3 && "We're setting up your playlists, layouts, and content. This only takes a moment."}
            {step === 4 && 'Your TV scene has been created with ready-to-use content!'}
          </p>
        </div>

        {/* Step 1: Business Type Selection */}
        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <p className="text-sm font-medium text-gray-300 mb-4">What type of business do you run?</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {BUSINESS_TYPES.map((type) => {
                const Icon = BUSINESS_ICONS[type.id] || Building2;
                const isSelected = selectedType === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type.id)}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl transition-all
                      ${isSelected
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    <Icon size={24} />
                    <span className="text-sm font-medium text-center">{type.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className={`
                  inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${canProceed
                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/25'
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Brand Customization (Optional) */}
        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm mb-4">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-6">
              {/* Brand Color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Brand Color (optional)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-16 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                  />
                  <div className="flex gap-2">
                    {Object.values(DEFAULT_COLORS).slice(0, 6).map((color) => (
                      <button
                        key={color}
                        onClick={() => setBrandColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${brandColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Short Tagline (optional)
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g., Fresh food, fresh vibes"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">{tagline.length}/60 characters</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft size={18} />
                Back
              </button>

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all"
              >
                <Wand2 size={18} />
                Generate My TV Scene
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === 3 && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Loader2 size={40} className="text-blue-400 animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                  <Tv size={16} className="text-white" />
                </div>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Building your TV scene...</h3>
            <p className="text-gray-400">
              We're creating playlists, layouts, and placeholder content tailored for your business.
            </p>

            {/* Progress indicators */}
            <div className="mt-8 space-y-3">
              {['Selecting starter pack', 'Creating playlists', 'Setting up layouts', 'Configuring scene'].map((text, i) => (
                <div key={i} className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-blue-500/30 animate-pulse" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && result && (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                <Check size={40} className="text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Your TV scene is ready!</h3>
              <p className="text-gray-400">
                We've created everything you need to get started.
              </p>
            </div>

            {/* Created content summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.packResult?.playlists?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Playlists</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {result.packResult?.layouts?.length || 0}
                </div>
                <div className="text-sm text-gray-400">Layouts</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">1</div>
                <div className="text-sm text-gray-400">Scene</div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-200">
                <strong>Next step:</strong> Replace the placeholder content with your own images,
                videos, and menus. Visit the Playlists or Media Library to customize.
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 shadow-lg shadow-green-500/25 transition-all"
              >
                Get Started
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Progress dots */}
        {step < 4 && (
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-all ${
                  s === step
                    ? 'bg-blue-500 w-6'
                    : s < step
                    ? 'bg-blue-500/50'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoBuildOnboardingModal;
