/**
 * WelcomeModal.jsx
 * Welcome modal flow for new users with multiple steps.
 *
 * The modal guides users through:
 * 1. Choice step - Quick demo vs Business starter pack
 * 2. Business type selection - Choose industry for tailored templates
 * 3. Creating step - Shows progress and results
 */
import {
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  Building2,
} from 'lucide-react';

/**
 * Business type options for onboarding.
 * Each option includes id, label, icon component, and color classes.
 */
export const BUSINESS_TYPES = [
  { id: 'restaurant', label: 'Restaurant / Cafe', icon: Utensils, color: 'bg-orange-100 text-orange-600' },
  { id: 'salon', label: 'Salon / Spa', icon: Scissors, color: 'bg-pink-100 text-pink-600' },
  { id: 'gym', label: 'Gym / Fitness', icon: Dumbbell, color: 'bg-purple-100 text-purple-600' },
  { id: 'retail', label: 'Retail / Store', icon: ShoppingBag, color: 'bg-blue-100 text-blue-600' },
  { id: 'generic', label: 'Other Business', icon: Building2, color: 'bg-gray-100 text-gray-600' },
];

/**
 * Main welcome modal component with multi-step flow.
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether modal is visible
 * @param {'choice'|'businessType'|'creating'} props.step - Current step
 * @param {() => void} props.onClose - Close handler
 * @param {() => Promise<void>} props.onDemo - Create demo workspace handler
 * @param {(typeId: string) => void} props.onSelectType - Business type selection handler
 * @param {() => void} props.onBrowseTemplates - Browse templates handler
 * @param {(step: string) => void} props.onStepChange - Step change handler
 * @param {boolean} props.applyingPack - Whether pack is being applied
 * @param {Object|null} props.packResult - Result from applying pack
 * @param {string|null} props.packError - Error message if pack creation failed
 * @param {() => void} props.onRetryPack - Retry handler for failed pack creation
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 */
export function WelcomeModal({
  open,
  step,
  onClose,
  onDemo,
  onSelectType,
  onBrowseTemplates,
  onStepChange,
  applyingPack,
  packResult,
  packError,
  onRetryPack,
  setCurrentPage,
}) {
  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" showCloseButton={false}>
      {/* Header - Yodeck orange gradient */}
      <div className="bg-gradient-to-r from-[#f26f21] to-[#ff8f4c] p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-xl">
            <Rocket className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold">Welcome to BizScreen!</h2>
        </div>
        <p className="text-white/80">
          {step === 'choice' && 'Your digital signage journey starts here'}
          {step === 'businessType' && 'What type of business do you run?'}
          {step === 'creating' && 'Setting up your workspace...'}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 'choice' && (
          <ChoiceStep onDemo={onDemo} onNext={() => onStepChange('businessType')} onSkip={onClose} />
        )}
        {step === 'businessType' && (
          <BusinessTypeStep
            onSelect={onSelectType}
            onBack={() => onStepChange('choice')}
            onBrowse={onBrowseTemplates}
          />
        )}
        {step === 'creating' && (
          <CreatingStep
            loading={applyingPack}
            result={packResult}
            error={packError}
            onClose={onClose}
            onRetry={onRetryPack}
            setCurrentPage={setCurrentPage}
          />
        )}
      </div>
    </Modal>
  );
}

/**
 * First step: choice between Quick Demo and Business Starter Pack.
 *
 * @param {Object} props
 * @param {() => void} props.onDemo - Quick demo handler
 * @param {() => void} props.onNext - Go to business type step
 * @param {() => void} props.onSkip - Skip and close modal
 */
export function ChoiceStep({ onDemo, onNext, onSkip }) {
  return (
    <>
      <p className="text-gray-600 mb-6">Choose how you'd like to get started:</p>
      <Stack gap="sm" className="mb-6">
        <button
          onClick={onDemo}
          className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#f26f21] hover:bg-[#fff5f0] transition-colors text-left flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-[#fef3ed] rounded-lg flex items-center justify-center group-hover:bg-[#ffe8dc]">
            <Sparkles className="w-6 h-6 text-[#f26f21]" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">Quick Demo</h3>
            <p className="text-sm text-gray-500">Get sample content + a demo screen to test immediately</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#f26f21]" />
        </button>

        <button
          onClick={onNext}
          className="w-full p-4 border-2 border-[#f26f21]/30 rounded-lg hover:border-[#f26f21] bg-[#fff5f0] transition-colors text-left flex items-center gap-4 group"
        >
          <div className="w-12 h-12 bg-[#fef3ed] rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-[#f26f21]" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              Business Starter Pack
              <span className="px-2 py-0.5 text-xs font-medium bg-[#f26f21] text-white rounded-full">Recommended</span>
            </h3>
            <p className="text-sm text-gray-500">Templates tailored for your business type</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#f26f21]" />
        </button>
      </Stack>

      <button
        onClick={onSkip}
        className="w-full px-4 py-2.5 text-gray-500 text-sm hover:text-gray-700 transition-colors"
      >
        Skip, I'll start from scratch
      </button>
    </>
  );
}

/**
 * Second step: business type selection grid.
 *
 * @param {Object} props
 * @param {(typeId: string) => void} props.onSelect - Selection handler
 * @param {() => void} props.onBack - Go back to choice step
 * @param {() => void} props.onBrowse - Browse all templates
 */
export function BusinessTypeStep({ onSelect, onBack, onBrowse }) {
  return (
    <>
      <p className="text-gray-600 mb-4">
        We'll set up playlists, layouts, and content placeholders tailored for your business.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {BUSINESS_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-center"
            >
              <div className={`w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-2 ${type.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-medium text-gray-900 text-sm">{type.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          Back
        </button>
        <button
          onClick={onBrowse}
          className="flex-1 px-4 py-2 text-[#f26f21] hover:bg-[#fff5f0] rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <LayoutTemplate className="w-4 h-4" />
          Browse All Templates
        </button>
      </div>
    </>
  );
}

/**
 * Third step: creating state with loading spinner and results.
 *
 * @param {Object} props
 * @param {boolean} props.loading - Whether pack is being created
 * @param {Object|null} props.result - Creation result
 * @param {Array} [props.result.playlists] - Created playlists
 * @param {Array} [props.result.layouts] - Created layouts
 * @param {string|null} props.error - Error message if creation failed
 * @param {() => void} props.onClose - Close modal handler
 * @param {() => void} props.onRetry - Retry handler for failed creation
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 */
export function CreatingStep({ loading, result, error, onClose, onRetry, setCurrentPage }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-12 h-12 mx-auto animate-spin text-[#f26f21] mb-4" />
        <p className="text-gray-600">Creating your starter pack...</p>
        <p className="text-sm text-gray-400 mt-1">This only takes a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h3>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Skip for now
          </Button>
          {onRetry && (
            <Button onClick={onRetry} fullWidth>
              <RefreshCw size={16} />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    // Defensive: ensure arrays exist before mapping
    const playlists = Array.isArray(result.playlists) ? result.playlists : [];
    const layouts = Array.isArray(result.layouts) ? result.layouts : [];
    const playlistCount = playlists.length;
    const layoutCount = layouts.length;

    return (
      <>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Your workspace is ready!</h3>
          <p className="text-gray-500 text-sm">
            We created {playlistCount} playlists and {layoutCount} layouts for you.
          </p>
        </div>

        <Stack gap="xs" className="mb-6">
          {playlists.map((p) => (
            <div key={p?.id || Math.random()} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <ListVideo className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{p?.name || 'Playlist'}</span>
              {p?.id && (
                <button
                  onClick={() => {
                    onClose();
                    setCurrentPage(`playlist-editor-${p.id}`);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
          {layouts.map((l) => (
            <div key={l?.id || Math.random()} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <Grid3X3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{l?.name || 'Layout'}</span>
              {l?.id && (
                <button
                  onClick={() => {
                    onClose();
                    setCurrentPage(`layout-editor-${l.id}`);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                >
                  Edit
                </button>
              )}
            </div>
          ))}
        </Stack>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Go to Dashboard
          </Button>
          <Button
            onClick={() => {
              onClose();
              if (playlists[0]?.id) {
                setCurrentPage(`playlist-editor-${playlists[0].id}`);
              }
            }}
            fullWidth
          >
            Customize Content
          </Button>
        </div>
      </>
    );
  }

  return null;
}
