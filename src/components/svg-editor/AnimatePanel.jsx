/**
 * Animate Panel - OptiSigns Style
 *
 * Left panel for applying animations to pages and objects.
 * Features:
 * - Page Animations (fade in effects)
 * - Object Animations with live preview
 */

import { useState, useCallback } from 'react';
import { X, ChevronDown, ChevronUp, Play, Plus, Trash2 } from 'lucide-react';

// Animation presets
const PAGE_ANIMATIONS = [
  { id: 'none', name: 'None', icon: '○' },
  { id: 'fade', name: 'Fade', icon: '◐' },
  { id: 'slide-left', name: 'Slide Left', icon: '←' },
  { id: 'slide-right', name: 'Slide Right', icon: '→' },
  { id: 'slide-up', name: 'Slide Up', icon: '↑' },
  { id: 'slide-down', name: 'Slide Down', icon: '↓' },
  { id: 'zoom-in', name: 'Zoom In', icon: '⊕' },
  { id: 'zoom-out', name: 'Zoom Out', icon: '⊖' },
];

const OBJECT_ANIMATIONS = [
  { id: 'fade-in', name: 'Fade In', icon: '◐' },
  { id: 'bounce', name: 'Bounce', icon: '⤴' },
  { id: 'pulse', name: 'Pulse', icon: '◉' },
  { id: 'shake', name: 'Shake', icon: '↔' },
  { id: 'flip', name: 'Flip', icon: '⟳' },
  { id: 'rotate', name: 'Rotate', icon: '↻' },
  { id: 'scale', name: 'Scale', icon: '⤢' },
  { id: 'slide-in', name: 'Slide In', icon: '→' },
];

// Animation execution functions
const runAnimation = (obj, animationId, canvas, onComplete) => {
  if (!obj || !canvas) return;

  // Store original values
  const originalLeft = obj.left;
  const originalTop = obj.top;
  const originalOpacity = obj.opacity;
  const originalScaleX = obj.scaleX;
  const originalScaleY = obj.scaleY;
  const originalAngle = obj.angle;

  const duration = 500;

  const resetObject = () => {
    obj.set({
      left: originalLeft,
      top: originalTop,
      opacity: originalOpacity,
      scaleX: originalScaleX,
      scaleY: originalScaleY,
      angle: originalAngle,
    });
    canvas.renderAll();
    onComplete?.();
  };

  switch (animationId) {
    case 'fade-in':
      obj.set('opacity', 0);
      canvas.renderAll();
      obj.animate('opacity', originalOpacity, {
        duration,
        onChange: () => canvas.renderAll(),
        onComplete: resetObject,
        easing: (t) => t, // linear
      });
      break;

    case 'bounce':
      const bounceHeight = 30;
      obj.animate('top', originalTop - bounceHeight, {
        duration: duration / 2,
        onChange: () => canvas.renderAll(),
        onComplete: () => {
          obj.animate('top', originalTop, {
            duration: duration / 2,
            onChange: () => canvas.renderAll(),
            onComplete: resetObject,
            easing: (t) => t * t, // ease in
          });
        },
        easing: (t) => 1 - (1 - t) * (1 - t), // ease out
      });
      break;

    case 'pulse':
      const pulseScale = 1.1;
      obj.animate({ scaleX: originalScaleX * pulseScale, scaleY: originalScaleY * pulseScale }, {
        duration: duration / 2,
        onChange: () => canvas.renderAll(),
        onComplete: () => {
          obj.animate({ scaleX: originalScaleX, scaleY: originalScaleY }, {
            duration: duration / 2,
            onChange: () => canvas.renderAll(),
            onComplete: resetObject,
          });
        },
      });
      break;

    case 'shake':
      const shakeAmount = 10;
      let shakeCount = 0;
      const shakeStep = () => {
        if (shakeCount >= 4) {
          resetObject();
          return;
        }
        const targetLeft = shakeCount % 2 === 0 ? originalLeft + shakeAmount : originalLeft - shakeAmount;
        obj.animate('left', targetLeft, {
          duration: 50,
          onChange: () => canvas.renderAll(),
          onComplete: () => {
            shakeCount++;
            shakeStep();
          },
        });
      };
      shakeStep();
      break;

    case 'flip':
      obj.animate('scaleX', 0, {
        duration: duration / 2,
        onChange: () => canvas.renderAll(),
        onComplete: () => {
          obj.animate('scaleX', originalScaleX, {
            duration: duration / 2,
            onChange: () => canvas.renderAll(),
            onComplete: resetObject,
          });
        },
      });
      break;

    case 'rotate':
      obj.animate('angle', originalAngle + 360, {
        duration,
        onChange: () => canvas.renderAll(),
        onComplete: resetObject,
      });
      break;

    case 'scale':
      obj.set({ scaleX: 0, scaleY: 0 });
      canvas.renderAll();
      obj.animate({ scaleX: originalScaleX, scaleY: originalScaleY }, {
        duration,
        onChange: () => canvas.renderAll(),
        onComplete: resetObject,
        easing: (t) => 1 - Math.pow(1 - t, 3), // ease out cubic
      });
      break;

    case 'slide-in':
      obj.set('left', originalLeft - 100);
      obj.set('opacity', 0);
      canvas.renderAll();
      obj.animate({ left: originalLeft, opacity: originalOpacity }, {
        duration,
        onChange: () => canvas.renderAll(),
        onComplete: resetObject,
      });
      break;

    default:
      onComplete?.();
  }
};

export default function AnimatePanel({
  selectedObject,
  canvas,
  onClose,
}) {
  const [expandedSections, setExpandedSections] = useState({
    pageAnimations: true,
    objectAnimations: true,
  });

  const [pageSettings, setPageSettings] = useState({
    animation: 'none',
    delay: 0,
    speed: 1,
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedAnimation, setSelectedAnimation] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 text-white text-sm font-medium"
    >
      <span>{title}</span>
      {expandedSections[section] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );

  // Preview animation on selected object
  const handlePreviewAnimation = useCallback((animationId) => {
    if (!selectedObject || !canvas || isAnimating) return;

    setIsAnimating(true);
    setSelectedAnimation(animationId);

    runAnimation(selectedObject, animationId, canvas, () => {
      setIsAnimating(false);
      setSelectedAnimation(null);
    });
  }, [selectedObject, canvas, isAnimating]);

  // Get stored animations for selected object
  const objectAnimations = selectedObject?.customAnimations || [];

  // Add animation to object
  const handleAddAnimation = useCallback((animationId) => {
    if (!selectedObject) return;

    const animDef = OBJECT_ANIMATIONS.find(a => a.id === animationId);
    const animations = selectedObject.customAnimations || [];

    selectedObject.customAnimations = [
      ...animations,
      { id: animationId, name: animDef?.name || animationId }
    ];

    // Preview the animation
    handlePreviewAnimation(animationId);
  }, [selectedObject, handlePreviewAnimation]);

  // Remove animation from object
  const handleRemoveAnimation = useCallback((index) => {
    if (!selectedObject) return;

    const animations = selectedObject.customAnimations || [];
    selectedObject.customAnimations = animations.filter((_, i) => i !== index);
  }, [selectedObject]);

  return (
    <div className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-white font-medium">Animate</span>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Page Animations */}
        <div className="border-b border-gray-700 pb-3">
          <SectionHeader title="Page Animations" section="pageAnimations" />
          {expandedSections.pageAnimations && (
            <div className="mt-2 space-y-3">
              {/* Animation Grid */}
              <div className="grid grid-cols-4 gap-2">
                {PAGE_ANIMATIONS.map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => setPageSettings(prev => ({ ...prev, animation: anim.id }))}
                    className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg transition-colors ${
                      pageSettings.animation === anim.id
                        ? 'border-green-500 bg-green-500/20 text-white'
                        : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                    title={anim.name}
                  >
                    {anim.icon}
                  </button>
                ))}
              </div>

              {/* Animation Settings */}
              {pageSettings.animation !== 'none' && (
                <div className="space-y-3 pt-2">
                  {/* Delay */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Delay</span>
                      <span className="text-xs text-white">{pageSettings.delay}s</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={pageSettings.delay}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, delay: parseFloat(e.target.value) }))}
                      className="w-full accent-green-500"
                    />
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">Animation Speed</span>
                      <span className="text-xs text-white">{pageSettings.speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="3"
                      step="0.25"
                      value={pageSettings.speed}
                      onChange={(e) => setPageSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))}
                      className="w-full accent-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Object Animations */}
        <div className="pb-3">
          <SectionHeader title="Object Animations" section="objectAnimations" />
          {expandedSections.objectAnimations && (
            <div className="mt-2 space-y-3">
              {selectedObject ? (
                <>
                  {/* Animation Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {OBJECT_ANIMATIONS.map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => handleAddAnimation(anim.id)}
                        disabled={isAnimating}
                        className={`w-12 h-12 rounded-lg border flex items-center justify-center text-lg transition-colors ${
                          selectedAnimation === anim.id
                            ? 'border-green-500 bg-green-500/20 text-white'
                            : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-green-500 hover:bg-green-500/10'
                        } ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={anim.name}
                      >
                        {anim.icon}
                      </button>
                    ))}
                  </div>

                  {/* Applied Animations List */}
                  {objectAnimations.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-gray-400">Applied Animations</span>
                      {objectAnimations.map((anim, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-700 rounded px-3 py-2"
                        >
                          <span className="text-sm text-white">{anim.name || anim.id}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handlePreviewAnimation(anim.id)}
                              disabled={isAnimating}
                              className="p-1 text-gray-400 hover:text-green-400 disabled:opacity-50"
                              title="Preview"
                            >
                              <Play className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveAnimation(index)}
                              className="p-1 text-gray-400 hover:text-red-400"
                              title="Remove"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Animation Button */}
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-600 rounded text-gray-400 hover:border-green-500 hover:text-green-500 transition-colors"
                    onClick={() => handleAddAnimation('fade-in')}
                    disabled={isAnimating}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add Animation</span>
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">
                  Select an object to add animations
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview All Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => {
            if (selectedObject && objectAnimations.length > 0) {
              handlePreviewAnimation(objectAnimations[0]?.id);
            }
          }}
          disabled={isAnimating || !selectedObject || objectAnimations.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
        >
          <Play className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isAnimating ? 'Playing...' : 'Preview Animations'}
          </span>
        </button>
      </div>
    </div>
  );
}
