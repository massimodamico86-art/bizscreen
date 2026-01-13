/**
 * AiSuggestionsPanel
 *
 * Right panel showing AI-powered suggestions and presets.
 * Features:
 * - Industry-specific preset templates
 * - Quick actions for common tasks
 * - Design improvement suggestions
 */

import { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  ChevronRight,
  Wand2,
  Layout,
  Palette,
  Type,
  Image,
  Loader2,
  Zap,
  Eye,
  Star,
} from 'lucide-react';
import { Button } from '../../design-system';
import {
  getPresetsForBusinessType,
  suggestImprovements,
  getAiQuickActions,
  INDUSTRY_PRESETS,
  improveSlideModern,
  improveSlideReadable,
  highlightPromo,
  getAiPolishActions,
} from '../../services/sceneAiService';

export default function AiSuggestionsPanel({
  businessType,
  currentSlide,
  onApplyPreset,
  onPolishSlide,
  brandTheme,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'actions' | 'improve' | 'polish'
  const [loading, setLoading] = useState(false);

  const presets = useMemo(
    () => getPresetsForBusinessType(businessType),
    [businessType]
  );

  const quickActions = useMemo(
    () => getAiQuickActions({
      businessType,
      currentSlide: currentSlide?.design_json,
    }),
    [businessType, currentSlide]
  );

  const improvements = useMemo(
    () => currentSlide
      ? suggestImprovements({ slide: currentSlide?.design_json })
      : [],
    [currentSlide]
  );

  async function handleApplyPreset(preset) {
    setLoading(true);
    // Simulate brief loading for UX
    await new Promise(r => setTimeout(r, 300));
    onApplyPreset(preset);
    setLoading(false);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="font-medium text-gray-300">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 p-1">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <TabButton
          active={activeTab === 'presets'}
          onClick={() => setActiveTab('presets')}
        >
          Templates
        </TabButton>
        <TabButton
          active={activeTab === 'actions'}
          onClick={() => setActiveTab('actions')}
        >
          Quick Add
        </TabButton>
        <TabButton
          active={activeTab === 'polish'}
          onClick={() => setActiveTab('polish')}
        >
          Polish
        </TabButton>
        <TabButton
          active={activeTab === 'improve'}
          onClick={() => setActiveTab('improve')}
        >
          Tips
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        )}

        {!loading && activeTab === 'presets' && (
          <PresetsList presets={presets} onApply={handleApplyPreset} />
        )}

        {!loading && activeTab === 'actions' && (
          <QuickActionsList actions={quickActions} onApply={handleApplyPreset} />
        )}

        {!loading && activeTab === 'polish' && (
          <PolishSlidePanel
            currentSlide={currentSlide}
            onPolish={onPolishSlide}
            brandTheme={brandTheme}
            businessType={businessType}
            setLoading={setLoading}
          />
        )}

        {!loading && activeTab === 'improve' && (
          <ImprovementsList improvements={improvements} />
        )}
      </div>

      {/* Footer tip */}
      <div className="p-3 border-t border-gray-800 flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          <Wand2 className="w-3 h-3 inline mr-1" />
          AI suggestions based on {INDUSTRY_PRESETS[businessType]?.label || 'your business'} best practices
        </p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`
        flex-1 px-3 py-2 text-xs font-medium transition-colors
        ${active
          ? 'text-purple-400 border-b-2 border-purple-400'
          : 'text-gray-500 hover:text-gray-300'
        }
      `}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ===========================================
// PRESETS LIST
// ===========================================

function PresetsList({ presets, onApply }) {
  if (!presets || presets.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Layout className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No templates available</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {presets.map((preset, index) => (
        <PresetCard key={index} preset={preset} onApply={() => onApply(preset)} />
      ))}
    </div>
  );
}

function PresetCard({ preset, onApply }) {
  const bgColor = preset.design?.background?.color || '#1a1a2e';

  return (
    <button
      className="w-full text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg overflow-hidden transition-colors group"
      onClick={onApply}
    >
      {/* Mini preview */}
      <div
        className="aspect-video w-full relative"
        style={{ backgroundColor: bgColor }}
      >
        {/* Simplified block preview */}
        {preset.design?.blocks?.slice(0, 4).map((block, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${block.x * 100}%`,
              top: `${block.y * 100}%`,
              width: `${block.width * 100}%`,
              height: `${block.height * 100}%`,
              backgroundColor: block.type === 'shape' ? block.props?.fill : 'transparent',
              opacity: block.type === 'shape' ? (block.props?.opacity || 1) : 1,
            }}
          >
            {block.type === 'text' && (
              <div
                className="w-full h-full flex items-center overflow-hidden"
                style={{
                  justifyContent: block.props?.align === 'left' ? 'flex-start' : block.props?.align === 'right' ? 'flex-end' : 'center',
                  fontSize: `${Math.max(4, (block.props?.fontSize || 16) / 8)}px`,
                  fontWeight: block.props?.fontWeight,
                  color: block.props?.color || '#fff',
                }}
              >
                {block.props?.text?.substring(0, 15)}
              </div>
            )}
          </div>
        ))}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/20 transition-colors flex items-center justify-center">
          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 px-2 py-1 rounded">
            Apply
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">{preset.title}</span>
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{preset.description}</p>
      </div>
    </button>
  );
}

// ===========================================
// QUICK ACTIONS LIST
// ===========================================

function QuickActionsList({ actions, onApply }) {
  const actionItems = [
    { id: 'heading', icon: Type, label: 'Add Heading', description: 'Large title text' },
    { id: 'body', icon: Type, label: 'Add Body Text', description: 'Paragraph text' },
    { id: 'image', icon: Image, label: 'Add Image Placeholder', description: 'For photos or graphics' },
    { id: 'overlay', icon: Palette, label: 'Add Color Overlay', description: 'Background accent' },
  ];

  return (
    <div className="p-3 space-y-2">
      {actionItems.map(action => (
        <button
          key={action.id}
          className="w-full flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors text-left"
          onClick={() => {
            // These could trigger block creation
            const actionPreset = actions?.find(a => a.id === action.id);
            if (actionPreset) {
              onApply(actionPreset);
            }
          }}
        >
          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
            <action.icon className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-300 block">{action.label}</span>
            <span className="text-xs text-gray-500">{action.description}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      ))}
    </div>
  );
}

// ===========================================
// IMPROVEMENTS LIST
// ===========================================

function ImprovementsList({ improvements }) {
  if (!improvements || improvements.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Your slide looks great!</p>
        <p className="text-xs mt-1">No suggestions at this time</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {improvements.map((improvement, index) => (
        <div
          key={index}
          className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
        >
          <div className="flex items-start gap-2">
            <Wand2 className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm text-gray-300 block">{improvement.title}</span>
              <span className="text-xs text-gray-500">{improvement.description}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===========================================
// POLISH SLIDE PANEL
// ===========================================

function PolishSlidePanel({ currentSlide, onPolish, brandTheme, businessType, setLoading }) {
  const polishActions = getAiPolishActions();

  const icons = {
    modern: Zap,
    readable: Eye,
    promo: Star,
  };

  const colors = {
    modern: 'from-blue-500 to-purple-500',
    readable: 'from-green-500 to-teal-500',
    promo: 'from-orange-500 to-red-500',
  };

  async function handlePolish(actionId) {
    if (!currentSlide?.design_json) return;

    setLoading(true);

    // Simulate brief processing time for UX
    await new Promise(r => setTimeout(r, 400));

    let newDesign;
    const context = {
      slide: currentSlide.design_json,
      brandTheme,
      industry: businessType,
    };

    try {
      switch (actionId) {
        case 'modern':
          newDesign = improveSlideModern(context);
          break;
        case 'readable':
          newDesign = improveSlideReadable(context);
          break;
        case 'promo':
          newDesign = highlightPromo(context);
          break;
        default:
          newDesign = currentSlide.design_json;
      }

      if (onPolish && newDesign) {
        onPolish(newDesign);
      }
    } catch (err) {
      console.error('Polish slide error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!currentSlide) {
    return (
      <div className="p-4 text-center text-gray-500">
        <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a slide first</p>
        <p className="text-xs mt-1">Then use AI to polish it</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-xs text-gray-500 mb-2">
        One-click AI improvements for your current slide
      </p>

      {polishActions.map((action) => {
        const Icon = icons[action.id] || Sparkles;
        const gradient = colors[action.id] || 'from-purple-500 to-pink-500';

        return (
          <button
            key={action.id}
            onClick={() => handlePolish(action.id)}
            className="w-full text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg overflow-hidden transition-all group"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-200">{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                </div>
              </div>
            </div>
          </button>
        );
      })}

      <div className="pt-2 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">
          {brandTheme
            ? 'Using your brand colors'
            : 'Using industry-optimized colors'}
        </p>
      </div>
    </div>
  );
}
