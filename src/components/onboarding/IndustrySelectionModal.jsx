/**
 * IndustrySelectionModal Component
 *
 * Modal for selecting business type during onboarding.
 * Shows 12 industry options in a responsive grid with visual icons.
 * Selection filters template suggestions in the marketplace.
 *
 * @module components/onboarding/IndustrySelectionModal
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Utensils,
  ShoppingBag,
  Scissors,
  Dumbbell,
  Stethoscope,
  Building2,
  GraduationCap,
  Briefcase,
  Home,
  Car,
  Coffee,
  Building,
} from 'lucide-react';


import { setSelectedIndustry } from '../../services/onboardingService';

/**
 * Industry options with visual styling
 */
export const INDUSTRIES = [
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'retail', label: 'Retail / Store', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: 'salon', label: 'Salon / Spa', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  { id: 'fitness', label: 'Gym / Fitness', icon: Dumbbell, color: 'bg-purple-100 text-purple-600' },
  { id: 'healthcare', label: 'Healthcare', icon: Stethoscope, color: 'bg-cyan-100 text-cyan-600' },
  { id: 'hotel', label: 'Hotel / Hospitality', icon: Building2, color: 'bg-amber-100 text-amber-600' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'bg-green-100 text-green-600' },
  { id: 'corporate', label: 'Corporate Office', icon: Briefcase, color: 'bg-slate-100 text-slate-600' },
  { id: 'realestate', label: 'Real Estate', icon: Home, color: 'bg-emerald-100 text-emerald-600' },
  { id: 'auto', label: 'Auto / Dealership', icon: Car, color: 'bg-red-100 text-red-600' },
  { id: 'coffee', label: 'Coffee Shop', icon: Coffee, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'other', label: 'Other Business', icon: Building, color: 'bg-gray-100 text-gray-600' },
];

/**
 * IndustrySelectionModal - Grid of industry cards for user selection
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} props.onSelect - Called with industry ID after selection confirmed
 * @param {string} [props.currentIndustry] - Pre-selected industry if editing
 */
export function IndustrySelectionModal({
  isOpen,
  onClose,
  onSelect,
  currentIndustry = null,
}) {
  const [selected, setSelected] = useState(currentIndustry);
  const [saving, setSaving] = useState(false);

  // Reset selected when modal opens with different currentIndustry
  useEffect(() => {
    if (isOpen) {
      setSelected(currentIndustry);
    }
  }, [isOpen, currentIndustry]);

  /**
   * Handle industry card click
   */
  const handleCardClick = (industryId) => {
    setSelected(industryId);
  };

  /**
   * Confirm selection and save to database
   */
  const handleConfirm = async () => {
    if (!selected) return;

    setSaving(true);
    try {
      await setSelectedIndustry(selected);
      onSelect(selected);
    } catch (err) {
      console.error('Failed to save industry:', err);
      // Still proceed - we can retry later
      onSelect(selected);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Skip industry selection (save null)
   */
  const handleSkip = async () => {
    try {
      // Don't save null - just close
      onClose();
    } catch (err) {
      console.error('Error skipping:', err);
      onClose();
    }
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
      <div className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-xl" />

      <ModalHeader className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What type of business do you run?
        </h2>
        <p className="text-gray-500">
          We'll suggest templates tailored for your industry
        </p>
      </ModalHeader>

      <ModalContent className="pb-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INDUSTRIES.map((industry) => {
            const Icon = industry.icon;
            const isSelected = selected === industry.id;

            return (
              <button
                key={industry.id}
                onClick={() => handleCardClick(industry.id)}
                className={`
                  relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                  hover:border-blue-400 hover:shadow-md
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white'
                  }
                `}
              >
                {/* Selection checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}

                {/* Icon with colored background */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${industry.color}`}>
                  <Icon size={24} />
                </div>

                {/* Label */}
                <span className={`text-sm font-medium text-center leading-tight ${
                  isSelected ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {industry.label}
                </span>
              </button>
            );
          })}
        </div>
      </ModalContent>

      <ModalFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
        {/* Skip link */}
        <button
          onClick={handleSkip}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors order-2 sm:order-1"
        >
          Skip for now
        </button>

        {/* Continue button */}
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="order-1 sm:order-2"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

IndustrySelectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  currentIndustry: PropTypes.string,
};

export default IndustrySelectionModal;
