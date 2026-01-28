/**
 * StarterPackOnboarding Component
 *
 * Modal for selecting and applying a starter pack during onboarding flow.
 * Shows packs optionally filtered by industry, allows template selection,
 * and marks onboarding as complete when a pack is applied.
 *
 * @module components/onboarding/StarterPackOnboarding
 */

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';


import { fetchStarterPacks, installTemplateAsScene } from '../../services/marketplaceService';
import { markStarterPackApplied } from '../../services/onboardingService';

/**
 * Get industry-specific subtitle
 */
function getIndustrySubtitle(industry) {
  const labels = {
    restaurant: 'Perfect templates for restaurants and cafes',
    retail: 'Templates designed for retail stores',
    salon: 'Stylish templates for salons and spas',
    fitness: 'Energetic templates for gyms and fitness centers',
    healthcare: 'Professional templates for healthcare',
    hotel: 'Elegant templates for hotels and hospitality',
    education: 'Engaging templates for educational settings',
    corporate: 'Polished templates for corporate offices',
    realestate: 'Property showcase templates for real estate',
    auto: 'Dynamic templates for auto dealerships',
    coffee: 'Cozy templates for coffee shops',
  };
  return labels[industry] || 'Browse our curated starter packs';
}

/**
 * StarterPackOnboarding - Pack selection modal for onboarding
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} [props.onComplete] - Called when pack is applied or skipped
 * @param {string} [props.industry] - Filter packs by industry if available
 */
export function StarterPackOnboarding({
  isOpen,
  onClose,
  onComplete,
  industry = null,
}) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applyingPackId, setApplyingPackId] = useState(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch starter packs on mount
   */
  const loadPacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStarterPacks();
      // Filter by industry if provided
      let filtered = data;
      if (industry) {
        filtered = data.filter(
          pack => !pack.industry || pack.industry === industry
        );
        // If no industry-specific packs, show all
        if (filtered.length === 0) {
          filtered = data;
        }
      }
      setPacks(filtered);
    } catch (err) {
      console.error('Error loading starter packs:', err);
      setError('Failed to load starter packs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [industry]);

  useEffect(() => {
    if (isOpen) {
      loadPacks();
      setSuccess(false);
    }
  }, [isOpen, loadPacks]);

  /**
   * Apply selected templates from a pack
   */
  const handleApplySelected = async (pack, selectedTemplates) => {
    if (selectedTemplates.length === 0) return;

    setApplying(true);
    setApplyingPackId(pack.id);
    setError(null);

    try {
      // Install templates sequentially (per 18-03 decision)
      for (const template of selectedTemplates) {
        await installTemplateAsScene(template.id);
      }

      // Mark starter pack as applied
      await markStarterPackApplied();

      setSuccess(true);

      // Close modal after short delay to show success state
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    } catch (err) {
      console.error('Error applying pack:', err);
      setError(`Failed to apply templates: ${err.message}`);
    } finally {
      setApplying(false);
      setApplyingPackId(null);
    }
  };

  /**
   * Skip pack selection
   */
  const handleSkip = () => {
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleSkip}
      size="lg"
      showCloseButton={false}
      closeOnOverlay={false}
    >
      {/* Gradient header accent */}
      <div className="h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-xl" />

      <ModalHeader className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose a Starter Pack
        </h2>
        <p className="text-gray-500">
          {industry ? getIndustrySubtitle(industry) : 'Get started with pre-made templates'}
        </p>
      </ModalHeader>

      <ModalContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-500">Loading starter packs...</p>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Templates Added!
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Your starter pack templates have been added to your scenes.
              Check out your Scenes page to see them.
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Package size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-500 text-center max-w-md mb-4">{error}</p>
            <Button variant="secondary" onClick={loadPacks}>
              Try Again
            </Button>
          </div>
        ) : packs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Package size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No packs available
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Browse our template marketplace to find templates for your business.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {packs.map((pack) => (
              <StarterPackCard
                key={pack.id}
                pack={pack}
                onApplySelected={handleApplySelected}
                isApplying={applyingPackId === pack.id}
              />
            ))}
          </div>
        )}
      </ModalContent>

      {!success && (
        <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
          {/* Skip link */}
          <button
            onClick={handleSkip}
            disabled={applying}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors order-2 sm:order-1 disabled:opacity-50"
          >
            Skip for now
          </button>

          {/* Info text */}
          <div className="flex items-center gap-2 text-sm text-gray-500 order-1 sm:order-2">
            <Sparkles size={16} className="text-purple-500" />
            <span>Expand a pack to select templates</span>
          </div>
        </ModalFooter>
      )}
    </Modal>
  );
}

StarterPackOnboarding.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onComplete: PropTypes.func,
  industry: PropTypes.string,
};

export default StarterPackOnboarding;
