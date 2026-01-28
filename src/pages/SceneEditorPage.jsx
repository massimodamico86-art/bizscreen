/**
 * SceneEditorPage
 *
 * Full-screen Canva-style editor for scene slides.
 * Features:
 * - Top bar with scene info and actions
 * - Left slide strip for navigation
 * - Center 16:9 canvas with drag-drop blocks
 * - Right properties panel + AI suggestions
 */

import { useState, useEffect, useCallback, useRef } from 'react';


import { useAuth } from '../contexts/AuthContext';
import { fetchScene, saveSceneWithApproval } from '../services/sceneService';
import { getApprovalStatusConfig, getOpenReviewForResource } from '../services/approvalService.js';
import { requiresApproval } from '../services/permissionsService.js';
import {
  fetchSlidesForScene,
  createSlide,
  updateSlide,
  deleteSlide,
  getDefaultDesign,
  createTextBlock,
  createImageBlock,
  createShapeBlock,
  createWidgetBlock,
  addBlockToDesign,
  updateBlockInDesign,
  removeBlockFromDesign,
  normalizeSlide,
} from '../services/sceneDesignService';


import { getBrandTheme, getThemedBlockDefaults } from '../services/brandThemeService';

// Components
import { emitDesignChange } from '../services/deviceSyncService';

import { fetchLanguageVariants } from '../services/languageService';

// Business type config
const BUSINESS_TYPE_LABELS = {
  restaurant: 'Restaurant',
  salon: 'Salon / Spa',
  gym: 'Gym / Fitness',
  retail: 'Retail Store',
  medical: 'Medical Office',
  realestate: 'Real Estate',
  hotel: 'Hotel / Lobby',
  auto: 'Auto Dealer',
  coffee: 'Coffee Shop',
  other: 'Business',
};

export default function SceneEditorPage({ sceneId, onNavigate, onShowToast }) {
  const { userProfile } = useAuth();

  // Scene and slides state
  const [scene, setScene] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editor state
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);
  const [showDataBoundWizard, setShowDataBoundWizard] = useState(false);
  const [smartGuidesEnabled, setSmartGuidesEnabled] = useState(true);

  // Preview mode state
  const [editorMode, setEditorMode] = useState('edit'); // 'edit' | 'preview'
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Brand theme
  const [activeTheme, setActiveTheme] = useState(null);

  // Approval state
  const [currentReview, setCurrentReview] = useState(null);
  const [userRequiresApproval, setUserRequiresApproval] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);

  // Language variants state
  const [languageVariants, setLanguageVariants] = useState([]);
  const [currentLanguageCode, setCurrentLanguageCode] = useState('en');
  const [showAddLanguageModal, setShowAddLanguageModal] = useState(false);

  // Save debounce
  const saveTimeoutRef = useRef(null);

  // Current slide shortcut
  const currentSlide = slides[activeSlideIndex] || null;
  const currentDesign = currentSlide?.design_json || getDefaultDesign();

  // ===========================================
  // DATA LOADING
  // ===========================================

  useEffect(() => {
    if (sceneId) {
      loadSceneData();
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [sceneId]);

  async function loadSceneData() {
    setLoading(true);
    setError(null);
    try {
      const [sceneData, slidesData, brandTheme, needsApproval] = await Promise.all([
        fetchScene(sceneId),
        fetchSlidesForScene(sceneId),
        getBrandTheme().catch(() => null), // Graceful fallback if no theme
        requiresApproval(),
      ]);
      setScene(sceneData);
      // Normalize slides to ensure all blocks have required properties
      const normalizedSlides = slidesData.map(slide => normalizeSlide(slide));
      setSlides(normalizedSlides);
      setActiveTheme(brandTheme);
      setUserRequiresApproval(needsApproval);

      // Load language variants for this scene
      fetchLanguageVariants(sceneId)
        .then(variants => {
          setLanguageVariants(variants);
          // Set current language from scene or default to 'en'
          setCurrentLanguageCode(sceneData.language_code || 'en');
        })
        .catch(() => {
          // Graceful fallback - just show current scene
          setLanguageVariants([]);
        });

      // Load current review status if exists
      if (sceneData?.id) {
        getOpenReviewForResource('scene', sceneData.id)
          .then(review => {
            setCurrentReview(review);
            setApprovalPending(!!review);
          })
          .catch(() => {}); // Graceful fallback
      }

      // Initialize history with first slide state
      if (normalizedSlides.length > 0) {
        setHistory([normalizedSlides[0].design_json]);
        setHistoryIndex(0);
      }
    } catch (err) {
      console.error('Error loading scene:', err);
      setError('Failed to load scene data');
    } finally {
      setLoading(false);
    }
  }

  // ===========================================
  // AUTO-SAVE
  // ===========================================

  const debouncedSave = useCallback((slideId, designJson) => {
    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await updateSlide(slideId, { design_json: designJson });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving slide:', err);
        setSaveStatus('unsaved');
        onShowToast?.('Failed to save changes', 'error');
      }
    }, 800);
  }, [onShowToast]);

  // ===========================================
  // DESIGN UPDATES
  // ===========================================

  function updateDesign(newDesign) {
    if (!currentSlide) return;

    // Update local state
    setSlides(prev => prev.map((slide, idx) =>
      idx === activeSlideIndex
        ? { ...slide, design_json: newDesign }
        : slide
    ));

    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newDesign);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Emit design change for live preview
    emitDesignChange(newDesign, currentSlide.id);

    // Trigger auto-save
    debouncedSave(currentSlide.id, newDesign);
  }

  // ===========================================
  // BLOCK OPERATIONS
  // ===========================================

  function handleAddBlock(type) {
    // Get themed defaults if brand theme is active
    const blockDefaults = activeTheme ? getThemedBlockDefaults(activeTheme) : {};
    let newBlock;

    switch (type) {
      case 'text':
        newBlock = createTextBlock({
          text: 'New Text',
          color: blockDefaults.text?.color || '#ffffff',
        });
        break;
      case 'image':
        newBlock = createImageBlock({
          borderRadius: blockDefaults.shape?.borderRadius || 8,
        });
        break;
      case 'shape':
        newBlock = createShapeBlock({
          fill: blockDefaults.shape?.fill || activeTheme?.primary_color || '#3B82F6',
          borderRadius: blockDefaults.shape?.borderRadius || 0,
        });
        break;
      case 'widget':
        newBlock = createWidgetBlock({
          widgetType: 'clock',
          props: {
            textColor: activeTheme?.text_primary_color || '#ffffff',
            accentColor: activeTheme?.accent_color || '#3B82F6',
          },
        });
        break;
      default:
        return;
    }

    const newDesign = addBlockToDesign(currentDesign, newBlock);
    updateDesign(newDesign);
    setSelectedBlockId(newBlock.id);
  }

  function handleBlockUpdate(blockId, updates) {
    const newDesign = updateBlockInDesign(currentDesign, blockId, updates);
    updateDesign(newDesign);
  }

  function handleBlockDelete(blockId) {
    const newDesign = removeBlockFromDesign(currentDesign, blockId);
    updateDesign(newDesign);
    setSelectedBlockId(null);
  }

  function handleBlockSelect(blockId) {
    setSelectedBlockId(blockId);
  }

  // ===========================================
  // SLIDE OPERATIONS
  // ===========================================

  async function handleAddSlide() {
    try {
      const newSlide = await createSlide(sceneId);
      setSlides(prev => [...prev, newSlide]);
      setActiveSlideIndex(slides.length);
      setSelectedBlockId(null);
      onShowToast?.('Slide added', 'success');
    } catch (err) {
      console.error('Error adding slide:', err);
      onShowToast?.('Failed to add slide', 'error');
    }
  }

  async function handleDeleteSlide(slideId) {
    if (slides.length <= 1) {
      onShowToast?.('Cannot delete the last slide', 'error');
      return;
    }

    try {
      await deleteSlide(slideId);
      const newSlides = slides.filter(s => s.id !== slideId);
      setSlides(newSlides);
      if (activeSlideIndex >= newSlides.length) {
        setActiveSlideIndex(newSlides.length - 1);
      }
      setSelectedBlockId(null);
      onShowToast?.('Slide deleted', 'success');
    } catch (err) {
      console.error('Error deleting slide:', err);
      onShowToast?.('Failed to delete slide', 'error');
    }
  }

  function handleSlideSelect(index) {
    setActiveSlideIndex(index);
    setSelectedBlockId(null);
  }

  function handleWizardSlideCreated(newSlide) {
    // Add the new slide to our local state and select it
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideIndex(slides.length); // Select the new slide
    setSelectedBlockId(null);
    setShowWizardModal(false);
  }

  // ===========================================
  // UNDO/REDO
  // ===========================================

  function handleUndo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);

      const prevDesign = history[newIndex];
      setSlides(prev => prev.map((slide, idx) =>
        idx === activeSlideIndex
          ? { ...slide, design_json: prevDesign }
          : slide
      ));

      if (currentSlide) {
        debouncedSave(currentSlide.id, prevDesign);
      }
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);

      const nextDesign = history[newIndex];
      setSlides(prev => prev.map((slide, idx) =>
        idx === activeSlideIndex
          ? { ...slide, design_json: nextDesign }
          : slide
      ));

      if (currentSlide) {
        debouncedSave(currentSlide.id, nextDesign);
      }
    }
  }

  // ===========================================
  // AI ACTIONS
  // ===========================================

  function handleApplyPreset(preset) {
    updateDesign(preset.design);
    setSelectedBlockId(null);
    onShowToast?.(`Applied "${preset.title}" preset`, 'success');
  }

  // ===========================================
  // LANGUAGE SWITCHING
  // ===========================================

  const handleLanguageChange = (variant) => {
    // Navigate to the variant's scene - this reloads the editor with different content
    if (onNavigate) {
      onNavigate('scene-editor', { sceneId: variant.id });
    }
  };

  const handleVariantCreated = (newVariant) => {
    // Add new variant to list and navigate to it
    setLanguageVariants(prev => [...prev, newVariant]);
    if (onNavigate) {
      onNavigate('scene-editor', { sceneId: newVariant.id });
    }
  };

  // ===========================================
  // NAVIGATION & PREVIEW
  // ===========================================

  async function handleBack() {
    // If user requires approval and not already pending, submit scene for approval
    if (userRequiresApproval && !approvalPending && scene) {
      try {
        // Use saveSceneWithApproval to trigger approval workflow
        // We pass empty updates since slide changes are saved via updateSlide
        // but this ensures the scene goes through approval
        const result = await saveSceneWithApproval(sceneId, {}, scene.name);

        if (result.wasResubmission) {
          onShowToast?.('Scene resubmitted for approval', 'success');
        } else if (result.submittedForApproval) {
          onShowToast?.('Scene submitted for approval', 'success');
        } else if (result.existingReview) {
          // Already pending - no action needed
        }
      } catch (err) {
        console.error('Error submitting for approval:', err);
        // Don't block navigation on approval error
      }
    }

    onNavigate?.(`scene-detail-${sceneId}`);
  }

  function handlePreview() {
    setShowPreviewPanel(!showPreviewPanel);
  }

  function toggleEditorMode() {
    setEditorMode(prev => prev === 'edit' ? 'preview' : 'edit');
  }

  // Keyboard shortcuts for P (preview) and E (edit)
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setEditorMode('preview');
        setShowPreviewPanel(true);
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setEditorMode('edit');
      }
      if (e.key === 'Escape') {
        if (editorMode === 'preview') {
          setEditorMode('edit');
        }
        if (showPreviewPanel) {
          setShowPreviewPanel(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorMode, showPreviewPanel]);

  // ===========================================
  // RENDER
  // ===========================================

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Scene not found'}</p>
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const selectedBlock = currentDesign.blocks.find(b => b.id === selectedBlockId);
  const businessTypeLabel = BUSINESS_TYPE_LABELS[scene.business_type] || 'Business';

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
        {/* Left: Back + Scene Info */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-white">{scene.name}</h1>
            <Badge variant="default" className="bg-gray-800 text-gray-300">
              {businessTypeLabel}
            </Badge>
            {scene?.approval_status && scene.approval_status !== 'draft' && (
              <Badge
                variant={getApprovalStatusConfig(scene.approval_status).variant}
                className="ml-1"
              >
                {getApprovalStatusConfig(scene.approval_status).label}
              </Badge>
            )}

            {/* Language Switcher */}
            {languageVariants.length > 0 && (
              <EditorLanguageSwitcher
                currentLanguage={currentLanguageCode}
                availableVariants={languageVariants}
                onLanguageChange={handleLanguageChange}
                onAddLanguage={() => setShowAddLanguageModal(true)}
                hasUnsavedChanges={saveStatus === 'unsaved'}
                disabled={loading}
              />
            )}
          </div>
        </div>

        {/* Center: Save Status */}
        <div className="flex items-center gap-2 text-sm text-gray-400">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-amber-400">Unsaved changes</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={historyIndex <= 0} className="text-gray-400">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="text-gray-400">
            <Redo2 className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-gray-700 mx-2" />

          {/* Edit/Preview Mode Toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorMode('edit')}
              className={`px-3 py-1 rounded ${editorMode === 'edit' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              title="Edit Mode (E)"
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditorMode('preview')}
              className={`px-3 py-1 rounded ${editorMode === 'preview' ? 'bg-gray-700 text-white' : 'text-gray-400'}`}
              title="Preview Mode (P)"
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-700 mx-2" />

          <Button variant="ghost" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} className={showAiPanel ? 'text-purple-400' : 'text-gray-400'}>
            <Sparkles className="w-4 h-4" />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreview}
            className={showPreviewPanel ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
          >
            <MonitorPlay className="w-4 h-4 mr-1" />
            {showPreviewPanel ? 'Hide TV' : 'Show TV'}
          </Button>

          <Button variant="primary" size="sm" onClick={handleBack}>
            <Tv className="w-4 h-4 mr-1" />
            Done
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Slide Strip (hidden in preview mode) */}
        {editorMode === 'edit' && (
          <div className="w-48 border-r border-gray-800 flex-shrink-0 overflow-y-auto">
            <SlideStrip
              slides={slides}
              activeIndex={activeSlideIndex}
              onSelect={handleSlideSelect}
              onAdd={handleAddSlide}
              onDelete={handleDeleteSlide}
            />
          </div>
        )}

        {/* Center: Canvas + Toolbar OR Full Preview */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {editorMode === 'edit' ? (
            <>
              {/* Block Toolbar */}
              <div className="h-12 border-b border-gray-800 flex items-center gap-2 px-4 flex-shrink-0">
                <span className="text-xs text-gray-500 mr-2">Add:</span>
                <Button variant="ghost" size="sm" onClick={() => handleAddBlock('text')} className="text-gray-400 hover:text-white">
                  <Type className="w-4 h-4 mr-1" />
                  Text
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleAddBlock('image')} className="text-gray-400 hover:text-white">
                  <Image className="w-4 h-4 mr-1" />
                  Image
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleAddBlock('shape')} className="text-gray-400 hover:text-white">
                  <Square className="w-4 h-4 mr-1" />
                  Shape
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleAddBlock('widget')} className="text-gray-400 hover:text-white">
                  <Clock className="w-4 h-4 mr-1" />
                  Widget
                </Button>

                <div className="w-px h-6 bg-gray-700 mx-2" />

                <Button variant="ghost" size="sm" onClick={() => setShowWizardModal(true)} className="text-purple-400 hover:text-purple-300">
                  <Wand2 className="w-4 h-4 mr-1" />
                  Add from Wizard
                </Button>

                <Button variant="ghost" size="sm" onClick={() => setShowDataBoundWizard(true)} className="text-cyan-400 hover:text-cyan-300">
                  <Database className="w-4 h-4 mr-1" />
                  Data-Bound
                </Button>

                {selectedBlockId && (
                  <>
                    <div className="w-px h-6 bg-gray-700 mx-2" />
                    <Button variant="ghost" size="sm" onClick={() => handleBlockDelete(selectedBlockId)} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-hidden p-6">
                <EditorCanvas
                  design={currentDesign}
                  selectedBlockId={selectedBlockId}
                  onBlockSelect={handleBlockSelect}
                  onBlockUpdate={handleBlockUpdate}
                  smartGuidesEnabled={smartGuidesEnabled}
                />
              </div>
            </>
          ) : (
            /* Full Preview Mode */
            <div className="flex-1 flex items-center justify-center bg-black p-8">
              <div className="w-full max-w-5xl">
                <LivePreviewWindow
                  slides={slides}
                  activeSlideIndex={activeSlideIndex}
                  brandTheme={activeTheme}
                  autoPlay={true}
                  onClose={() => setEditorMode('edit')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Properties Panel + AI Panel (hidden in preview mode) */}
        {editorMode === 'edit' && (
          <div className="w-72 border-l border-gray-800 flex-shrink-0 overflow-y-auto">
            {showAiPanel ? (
              <AiSuggestionsPanel
                businessType={scene.business_type}
                currentSlide={currentSlide}
                onApplyPreset={handleApplyPreset}
                onPolishSlide={updateDesign}
                brandTheme={activeTheme}
                onClose={() => setShowAiPanel(false)}
              />
            ) : (
              <>
                <PropertiesPanel
                  block={selectedBlock}
                  design={currentDesign}
                  onBlockUpdate={(updates) => handleBlockUpdate(selectedBlockId, updates)}
                  onDesignUpdate={updateDesign}
                  smartGuidesEnabled={smartGuidesEnabled}
                  onSmartGuidesChange={setSmartGuidesEnabled}
                />
                {/* Analytics Summary (only for existing scenes) */}
                {sceneId && (
                  <div className="p-4 border-t border-gray-800">
                    <ContentInlineMetrics
                      contentId={sceneId}
                      contentType="scene"
                      dateRange="7d"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Side Preview Panel (floating) */}
        {showPreviewPanel && editorMode === 'edit' && (
          <div className="absolute right-80 bottom-4 w-96 z-50 shadow-2xl">
            <LivePreviewWindow
              slides={slides}
              activeSlideIndex={activeSlideIndex}
              brandTheme={activeTheme}
              autoPlay={false}
              showSafeZone={false}
              onClose={() => setShowPreviewPanel(false)}
            />
          </div>
        )}
      </div>

      {/* Industry Wizard Modal */}
      <IndustryWizardModal
        isOpen={showWizardModal}
        onClose={() => setShowWizardModal(false)}
        sceneId={sceneId}
        industry={scene.business_type}
        onSlideCreated={handleWizardSlideCreated}
        onShowToast={onShowToast}
      />

      {/* Data-Bound Wizard Modal */}
      <DataBoundWizardModal
        isOpen={showDataBoundWizard}
        onClose={() => setShowDataBoundWizard(false)}
        sceneId={sceneId}
        onSlideCreated={handleWizardSlideCreated}
        onShowToast={onShowToast}
      />

      {/* Add Language Modal */}
      <AddLanguageModal
        isOpen={showAddLanguageModal}
        onClose={() => setShowAddLanguageModal(false)}
        sceneId={sceneId}
        existingLanguages={languageVariants.map(v => v.language_code)}
        onVariantCreated={handleVariantCreated}
      />
    </div>
  );
}
