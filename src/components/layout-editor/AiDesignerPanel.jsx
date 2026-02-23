/**
 * AiDesignerPanel
 *
 * Collapsible side panel for the AI Designer feature within the layout editor.
 * Users type a prompt, select an orientation, and generate a complete layout
 * from text descriptions using the AI Designer service.
 *
 * @module components/layout-editor/AiDesignerPanel
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check,
  Loader2,
  Monitor,
  Smartphone,
  ScreenShare,
  Sparkles,
  Square,
} from 'lucide-react';
import { useLogger } from '../../hooks/useLogger';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { Feature } from '../../config/plans';
import { generateLayout, EXAMPLE_PROMPTS } from '../../services/aiDesignerService';
import Button from '../../design-system/components/Button';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORIENTATIONS = [
  { id: '16:9', icon: Monitor, label: 'Landscape' },
  { id: '9:16', icon: Smartphone, label: 'Portrait' },
  { id: '4:3', icon: ScreenShare, label: 'Standard' },
  { id: '1:1', icon: Square, label: 'Square' },
];

const LOADING_STEPS = [
  'Analyzing prompt...',
  'Designing layout...',
  'Generating elements...',
];

// Show 3-4 example prompts in the UI
const VISIBLE_EXAMPLES = EXAMPLE_PROMPTS.slice(0, 4);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiDesignerPanel({
  onApplyLayout,
  orientation = '16:9',
  onOrientationChange,
  showToast,
}) {
  const logger = useLogger('AiDesignerPanel');
  const hasAiFeature = useFeatureFlag(Feature.AI_ASSISTANT);

  // Local state
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Refs for cleanup
  const loadingIntervalRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  // Cycle loading steps while generating
  useEffect(() => {
    if (isGenerating) {
      setLoadingStepIndex(0);
      loadingIntervalRef.current = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2000);
    } else {
      if (loadingIntervalRef.current) {
        clearInterval(loadingIntervalRef.current);
        loadingIntervalRef.current = null;
      }
    }
    return () => {
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    };
  }, [isGenerating]);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    logger.info('Generating layout from prompt', { prompt: prompt.substring(0, 100), orientation });
    setIsGenerating(true);
    setShowSuccess(false);

    try {
      const result = await generateLayout({ prompt: prompt.trim(), orientation });

      logger.info('Layout generated', { elementCount: result.elements.length, name: result.name });

      onApplyLayout?.({
        elements: result.elements,
        background: result.background,
        name: result.name,
      });

      // Show success state
      setShowSuccess(true);
      setPrompt('');

      successTimeoutRef.current = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      logger.error('Layout generation failed', { error: err.message });
      showToast?.({ type: 'error', message: err.message || 'Failed to generate layout' });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, orientation, isGenerating, onApplyLayout, showToast, logger]);

  // Handle example prompt click
  const handleExampleClick = useCallback((example) => {
    setPrompt(example);
  }, []);

  // Feature gate: show upsell if AI_ASSISTANT is not available
  if (!hasAiFeature) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">AI Designer</h3>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-purple-800 mb-1">
            AI Designer is available on Pro plans
          </p>
          <p className="text-xs text-purple-600 mb-3">
            Generate entire layouts from text descriptions with AI.
          </p>
          <Button
            variant="primary"
            size="sm"
            accentColor="#7c3aed"
            onClick={() => showToast?.({ type: 'info', message: 'Upgrade to Pro to access AI Designer' })}
          >
            Upgrade to Pro
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">AI Designer</h3>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the layout you want..."
          rows={4}
          disabled={isGenerating}
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        {/* Example prompts */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Try:</span>
          <div className="flex flex-wrap gap-1.5">
            {VISIBLE_EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                disabled={isGenerating}
                className="px-2 py-1 text-[10px] bg-purple-50 text-purple-700 rounded-full border border-purple-200 hover:bg-purple-100 hover:border-purple-300 transition-colors truncate max-w-full disabled:opacity-50 disabled:cursor-not-allowed"
                title={example}
              >
                {example.length > 35 ? `${example.substring(0, 35)}...` : example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orientation Selector */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Orientation</span>
        <div className="flex gap-2">
          {ORIENTATIONS.map((o) => {
            const Icon = o.icon;
            const isActive = orientation === o.id;
            return (
              <button
                key={o.id}
                onClick={() => onOrientationChange?.(o.id)}
                disabled={isGenerating}
                className={`flex-1 py-2 px-1 flex flex-col items-center gap-1 rounded-lg border text-[10px] font-medium transition-all ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={o.label}
              >
                <Icon className="w-4 h-4" />
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-purple-700"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Layout
          </>
        )}
      </button>

      {/* Loading State */}
      {isGenerating && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          {LOADING_STEPS.map((step, index) => (
            <div
              key={step}
              className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                index === loadingStepIndex
                  ? 'text-purple-700 opacity-100'
                  : index < loadingStepIndex
                    ? 'text-purple-400 opacity-60'
                    : 'text-gray-400 opacity-40'
              }`}
            >
              {index < loadingStepIndex ? (
                <Check className="w-3.5 h-3.5" />
              ) : index === loadingStepIndex ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
              )}
              {step}
            </div>
          ))}
        </div>
      )}

      {/* Success State */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-sm text-green-700">
          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
          Layout applied!
        </div>
      )}
    </div>
  );
}
