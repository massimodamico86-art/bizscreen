/**
 * OnboardingCards.jsx
 * First-run and onboarding UI cards for the dashboard.
 *
 * These components guide new users through the initial setup process
 * and display demo workspace results.
 */
import {
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
} from 'lucide-react';
import { getSupportedIndustries } from '../../services/industryWizardService';

/**
 * Welcome card shown on first run, prompting user to create demo workspace.
 *
 * @param {Object} props
 * @param {() => Promise<void>} props.onCreateDemo - Handler to create demo workspace
 * @param {boolean} props.creating - Whether demo is being created
 */
export function GettingStartedCard({ onCreateDemo, creating }) {
  return (
    <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md flex-shrink-0">
          <Rocket className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Welcome to BizScreen!</h2>
          <p className="text-gray-600 mb-4">
            Get started in under 30 seconds. We'll create sample content, a playlist, and a demo screen for you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StepCard number={1} title="Create Demo Content" subtitle="Sample media, playlist & layout" color="blue" />
            <StepCard number={2} title="Pair Your TV" subtitle="Open /player and enter the code" color="purple" />
            <StepCard number={3} title="Watch It Play" subtitle="Your content displays instantly" color="green" />
          </div>

          <Button
            onClick={onCreateDemo}
            disabled={creating}
            icon={creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {creating ? 'Creating Demo Workspace...' : 'Create Demo Workspace'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Individual step card used within GettingStartedCard.
 *
 * @param {Object} props
 * @param {number} props.number - Step number (1, 2, or 3)
 * @param {string} props.title - Step title
 * @param {string} props.subtitle - Step description
 * @param {'blue'|'purple'|'green'} props.color - Color theme for the step number
 */
export function StepCard({ number, title, subtitle, color }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-white/70 rounded-lg">
      <div className={`w-8 h-8 ${colors[color]} rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0`}>
        {number}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900 text-sm">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * Card shown after demo workspace is created, displaying pairing code and quick links.
 *
 * @param {Object} props
 * @param {Object|null} props.result - Demo creation result
 * @param {string} [props.result.otpCode] - OTP pairing code
 * @param {string} [props.result.screenName] - Created screen name
 * @param {boolean} [props.result.alreadyExisted] - Whether demo already existed
 * @param {string} [props.result.playlistId] - Created playlist ID
 * @param {string} [props.result.playlistName] - Created playlist name
 * @param {string} [props.result.layoutId] - Created layout ID
 * @param {string} [props.result.layoutName] - Created layout name
 * @param {(code: string) => void} props.onCopyCode - Handler to copy OTP code
 * @param {(page: string) => void} props.setCurrentPage - Navigation handler
 * @returns {JSX.Element|null} Card or null if result is missing
 */
export function DemoResultCard({ result, onCopyCode, setCurrentPage }) {
  // Defensive: ensure result exists before rendering
  if (!result) return null;

  const otpCode = result.otpCode || '------';
  const screenName = result.screenName || 'Demo Screen';

  return (
    <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
      <div className="p-6 flex items-start gap-4">
        <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {result.alreadyExisted ? 'Demo Workspace Ready!' : 'Demo Workspace Created!'}
          </h2>
          <p className="text-gray-600 mb-4">
            Your demo screen is ready. Open <code className="bg-green-100 px-2 py-0.5 rounded text-green-800">/player</code> on your TV browser and enter the pairing code.
          </p>

          <div className="bg-white rounded-lg p-4 border border-green-200 mb-4 inline-block">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pairing Code</p>
            <div className="flex items-center gap-3">
              <code className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                {otpCode}
              </code>
              <button
                onClick={() => onCopyCode(otpCode)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy code"
              >
                <Copy className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {result.playlistId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ListVideo className="w-4 h-4 text-orange-500" />}
                onClick={() => setCurrentPage(`playlist-editor-${result.playlistId}`)}
              >
                {result.playlistName || 'Playlist'}
              </Button>
            )}
            {result.layoutId && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Layout className="w-4 h-4 text-purple-500" />}
                onClick={() => setCurrentPage(`layout-editor-${result.layoutId}`)}
              >
                {result.layoutName || 'Layout'}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Monitor className="w-4 h-4 text-blue-500" />}
              onClick={() => setCurrentPage('screens')}
            >
              {screenName}
            </Button>
            <a
              href="/player"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              Open Player
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Tips card for returning users with empty workspace.
 * Shows step-by-step instructions for getting started.
 */
export function GettingStartedTips() {
  const steps = [
    { title: 'Upload your media', desc: 'Add images, videos, or web pages to your media library' },
    { title: 'Create a playlist', desc: 'Arrange your content in the order you want it displayed' },
    { title: 'Connect a screen', desc: 'Add a TV and pair it using the OTP code' },
    { title: 'Assign and play', desc: 'Assign your playlist to the screen and watch it play!' },
  ];

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Getting Started</h2>
        <p className="text-gray-600 mb-4">
          Welcome to BizScreen! Follow these steps to set up your digital signage:
        </p>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-gray-900">{step.title}</p>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

// Industry icon mapping
const INDUSTRY_ICONS = {
  restaurant: Utensils,
  salon: Scissors,
  gym: Dumbbell,
  retail: ShoppingBag,
  medical: Stethoscope,
  hotel: Building2,
  coffee: Coffee,
  realestate: Home,
  auto: Car,
  other: Briefcase,
};

// Industry colors for visual distinction
const INDUSTRY_COLORS = {
  restaurant: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
  salon: 'bg-pink-100 text-pink-600 hover:bg-pink-200',
  gym: 'bg-green-100 text-green-600 hover:bg-green-200',
  retail: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
  medical: 'bg-cyan-100 text-cyan-600 hover:bg-cyan-200',
  hotel: 'bg-amber-100 text-amber-600 hover:bg-amber-200',
  coffee: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  realestate: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
  auto: 'bg-red-100 text-red-600 hover:bg-red-200',
  other: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
};

/**
 * Industry Quick Start Card
 * Allows users to quickly generate industry-specific content using the wizard.
 *
 * @param {Object} props
 * @param {(industry: string) => void} props.onSelectIndustry - Handler when industry is selected
 * @param {string} [props.selectedIndustry] - Currently selected industry
 */
export function IndustryQuickStartCard({ onSelectIndustry, selectedIndustry }) {
  const industries = getSupportedIndustries();

  return (
    <Card className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-200">
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md flex-shrink-0">
            <Wand2 className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Industry Quick Start</h2>
            <p className="text-gray-600">
              Select your business type to instantly generate professional slide templates tailored to your industry.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {industries.map(({ key, label }) => {
            const Icon = INDUSTRY_ICONS[key] || Briefcase;
            const colorClass = INDUSTRY_COLORS[key] || INDUSTRY_COLORS.other;
            const isSelected = selectedIndustry === key;

            return (
              <button
                key={key}
                onClick={() => onSelectIndustry(key)}
                className={`
                  p-3 rounded-xl transition-all text-center
                  ${isSelected
                    ? 'ring-2 ring-purple-500 ring-offset-2 bg-purple-100'
                    : colorClass
                  }
                `}
              >
                <Icon className="w-6 h-6 mx-auto mb-1" />
                <span className="text-xs font-medium block truncate">{label}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Click an industry to open the wizard with pre-built slide templates
        </p>
      </div>
    </Card>
  );
}
