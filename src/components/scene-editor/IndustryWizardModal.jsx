/**
 * IndustryWizardModal
 *
 * 3-step wizard for creating industry-specific slide templates.
 * Steps:
 * 1. Choose Slide Type - Select from available wizards for the industry
 * 2. Details Form - Fill in optional customization fields
 * 3. Confirmation - Preview and create the slide
 */

import { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Stethoscope,
  Building2,
  Coffee,
  Home,
  Car,
  Briefcase,
  Star,
  Clock,
  Users,
  Calendar,
  Tag,
  Award,
  Phone,
  Wifi,
  Percent,
  Package,
  CreditCard,
  Zap,
  Wrench,
  Truck,
  List,
  Megaphone,
  CheckCircle,
  Heart,
} from 'lucide-react';

import { Button } from '../../design-system';
import {
  getAvailableWizards,
  buildWizardSlides,
  getDefaultBlueprint,
  getWizardByKey,
} from '../../services/industryWizardService';
import { getBrandTheme } from '../../services/brandThemeService';
import { useLogger } from '../../hooks/useLogger.js';

// Icon mapping for wizard types
const WIZARD_ICONS = {
  // General icons
  'utensils': Utensils,
  'scissors': Scissors,
  'dumbbell': Dumbbell,
  'shopping-bag': ShoppingBag,
  'stethoscope': Stethoscope,
  'building': Building2,
  'coffee': Coffee,
  'home': Home,
  'car': Car,
  'briefcase': Briefcase,
  // Action icons
  'star': Star,
  'clock': Clock,
  'users': Users,
  'calendar': Calendar,
  'tag': Tag,
  'award': Award,
  'phone': Phone,
  'wifi': Wifi,
  'percent': Percent,
  'package': Package,
  'credit-card': CreditCard,
  'zap': Zap,
  'wrench': Wrench,
  'truck': Truck,
  'list': List,
  'megaphone': Megaphone,
  'check-circle': CheckCircle,
  'heart': Heart,
  'user': Users,
};

// Industry display config
const INDUSTRY_CONFIG = {
  restaurant: { label: 'Restaurant', icon: Utensils, color: '#F59E0B' },
  salon: { label: 'Salon / Spa', icon: Scissors, color: '#EC4899' },
  gym: { label: 'Gym / Fitness', icon: Dumbbell, color: '#10B981' },
  retail: { label: 'Retail Store', icon: ShoppingBag, color: '#8B5CF6' },
  medical: { label: 'Medical Office', icon: Stethoscope, color: '#06B6D4' },
  hotel: { label: 'Hotel / Lobby', icon: Building2, color: '#F97316' },
  coffee: { label: 'Coffee Shop', icon: Coffee, color: '#92400E' },
  realestate: { label: 'Real Estate', icon: Home, color: '#3B82F6' },
  auto: { label: 'Auto Dealer', icon: Car, color: '#EF4444' },
  other: { label: 'Business', icon: Briefcase, color: '#6B7280' },
};

export default function IndustryWizardModal({
  isOpen,
  onClose,
  sceneId,
  industry,
  onSlideCreated,
  onShowToast,
}) {
  const logger = useLogger('IndustryWizardModal');
  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedWizard, setSelectedWizard] = useState(null);
  const [formData, setFormData] = useState({});
  const [brandTheme, setBrandTheme] = useState(null);
  const [previewDesign, setPreviewDesign] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Available wizards for this industry
  const wizards = getAvailableWizards(industry);
  const industryConfig = INDUSTRY_CONFIG[industry] || INDUSTRY_CONFIG.other;

  // Load brand theme on mount
  useEffect(() => {
    getBrandTheme()
      .then(setBrandTheme)
      .catch(() => setBrandTheme(null));
  }, []);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedWizard(null);
      setFormData({});
      setPreviewDesign(null);
    }
  }, [isOpen]);

  // Update preview when form data changes
  useEffect(() => {
    if (selectedWizard && step === 3) {
      const blueprint = getDefaultBlueprint(industry, selectedWizard.key, formData, brandTheme);
      setPreviewDesign(blueprint);
    }
  }, [selectedWizard, formData, brandTheme, industry, step]);

  if (!isOpen) return null;

  // ===========================================
  // HANDLERS
  // ===========================================

  function handleSelectWizard(wizard) {
    setSelectedWizard(wizard);
    // Initialize form data with defaults
    const defaults = {};
    wizard.fields?.forEach(field => {
      if (field.default !== undefined) {
        defaults[field.name] = field.default;
      }
    });
    setFormData(defaults);
  }

  function handleFormChange(name, value) {
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handleNext() {
    if (step === 1 && selectedWizard) {
      // If wizard has no fields, skip to confirmation
      if (!selectedWizard.fields || selectedWizard.fields.length === 0) {
        setStep(3);
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    }
  }

  function handleBack() {
    if (step === 3 && selectedWizard?.fields?.length === 0) {
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  }

  async function handleCreate() {
    if (!selectedWizard || isCreating) return;

    setIsCreating(true);
    try {
      const slide = await buildWizardSlides({
        sceneId,
        industry,
        wizardKey: selectedWizard.key,
        formData,
        brandTheme,
      });

      onShowToast?.(`Created "${selectedWizard.title}" slide`, 'success');
      onSlideCreated?.(slide);
      onClose();
    } catch (err) {
      logger.error('Error creating wizard slide', { error: err, wizardKey: selectedWizard.key });
      onShowToast?.('Failed to create slide', 'error');
    } finally {
      setIsCreating(false);
    }
  }

  // ===========================================
  // RENDER HELPERS
  // ===========================================

  function renderWizardCard(wizard) {
    const IconComponent = WIZARD_ICONS[wizard.icon] || Star;
    const isSelected = selectedWizard?.key === wizard.key;

    return (
      <button
        key={wizard.key}
        className={`
          w-full p-4 rounded-xl border text-left transition-all
          ${isSelected
            ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
          }
        `}
        onClick={() => handleSelectWizard(wizard)}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${industryConfig.color}20` }}
          >
            <IconComponent
              className="w-5 h-5"
              style={{ color: industryConfig.color }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white">{wizard.title}</div>
            <div className="text-sm text-gray-400 mt-0.5">{wizard.description}</div>
          </div>
          {isSelected && (
            <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
          )}
        </div>
      </button>
    );
  }

  function renderFormField(field) {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">
              {field.label}
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFormChange(field.name, e.target.value)}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">
              {field.label}
            </label>
            <textarea
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => handleFormChange(field.name, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">
              {field.label}
            </label>
            <select
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={value}
              onChange={(e) => handleFormChange(field.name, e.target.value)}
            >
              {field.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={field.name}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
              checked={value === true || value === 'true'}
              onChange={(e) => handleFormChange(field.name, e.target.checked)}
            />
            <label htmlFor={field.name} className="text-sm text-gray-300">
              {field.label}
            </label>
          </div>
        );

      default:
        return null;
    }
  }

  function renderPreviewCanvas() {
    if (!previewDesign) return null;

    const { background, blocks = [] } = previewDesign;

    // Calculate background style
    let bgStyle = {};
    if (background?.type === 'gradient') {
      bgStyle.background = `linear-gradient(${background.angle || 180}deg, ${background.from}, ${background.to})`;
    } else if (background?.type === 'solid') {
      bgStyle.backgroundColor = background.color;
    } else {
      bgStyle.backgroundColor = '#0F172A';
    }

    return (
      <div
        className="w-full aspect-video rounded-lg overflow-hidden relative"
        style={bgStyle}
      >
        {blocks.map(block => {
          const style = {
            position: 'absolute',
            left: `${block.x * 100}%`,
            top: `${block.y * 100}%`,
            width: `${block.width * 100}%`,
            height: `${block.height * 100}%`,
          };

          switch (block.type) {
            case 'text':
              return (
                <div
                  key={block.id}
                  style={{
                    ...style,
                    color: block.color || '#fff',
                    fontSize: `${(block.fontSize || 16) * 0.25}px`,
                    fontWeight: block.fontWeight || 'normal',
                    fontFamily: block.fontFamily || 'Inter',
                    textAlign: block.align || 'left',
                    lineHeight: block.lineHeight || 1.2,
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <span className="whitespace-pre-wrap">{block.text}</span>
                </div>
              );

            case 'shape':
              return (
                <div
                  key={block.id}
                  style={{
                    ...style,
                    backgroundColor: block.fill || '#3B82F6',
                    borderRadius: block.borderRadius || 0,
                  }}
                />
              );

            case 'image':
              return (
                <div
                  key={block.id}
                  style={{
                    ...style,
                    backgroundColor: '#374151',
                    borderRadius: block.borderRadius || 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="text-gray-500 text-[8px]">
                    {block.placeholder || 'Image'}
                  </span>
                </div>
              );

            case 'widget':
              return (
                <div
                  key={block.id}
                  style={{
                    ...style,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock
                    className="w-4 h-4"
                    style={{ color: block.props?.textColor || '#fff' }}
                  />
                </div>
              );

            default:
              return null;
          }
        })}
      </div>
    );
  }

  // ===========================================
  // STEP CONTENT
  // ===========================================

  function renderStep1() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${industryConfig.color}20` }}
          >
            <industryConfig.icon
              className="w-5 h-5"
              style={{ color: industryConfig.color }}
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Choose Slide Type</h3>
            <p className="text-sm text-gray-400">
              Select a template for your {industryConfig.label.toLowerCase()}
            </p>
          </div>
        </div>

        <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
          {wizards.map(renderWizardCard)}
        </div>
      </div>
    );
  }

  function renderStep2() {
    if (!selectedWizard) return null;

    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Customize Your Slide</h3>
          <p className="text-sm text-gray-400 mt-1">
            Fill in the details to personalize your {selectedWizard.title}
          </p>
        </div>

        <div className="space-y-4">
          {selectedWizard.fields?.map(renderFormField)}
        </div>

        <p className="text-xs text-gray-500 mt-4">
          All fields are optional. Leave blank to use placeholder text.
        </p>
      </div>
    );
  }

  function renderStep3() {
    if (!selectedWizard) return null;

    return (
      <div className="space-y-4">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Preview & Create</h3>
          <p className="text-sm text-gray-400 mt-1">
            Review your slide and click Create to add it
          </p>
        </div>

        {/* Preview */}
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-3">Preview</div>
          {renderPreviewCanvas()}
        </div>

        {/* Summary */}
        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Template</span>
            <span className="text-sm text-white font-medium">{selectedWizard.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-400">Industry</span>
            <span className="text-sm text-white">{industryConfig.label}</span>
          </div>
          {brandTheme && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Brand Theme</span>
              <span className="text-sm text-green-400">Applied</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================================
  // MAIN RENDER
  // ===========================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">Add from Wizard</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? 'bg-blue-500' : s < step ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 min-h-[400px]">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-gray-900/50">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={isCreating}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>

            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={step === 1 && !selectedWizard}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Create Slide
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
