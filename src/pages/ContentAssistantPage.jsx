/**
 * Content Assistant Page
 *
 * AI-powered content generation wizard with 3 steps:
 * 1. Business Context - Enter business info
 * 2. Plan Review - Review AI-generated content plan
 * 3. Generate - Create playlists and slides
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  Building2,
  Utensils,
  Scissors,
  Dumbbell,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  List,
  Eye,
  RefreshCw,
  Plus,
  ChevronRight,
  Info,
  Palette,
  Users,
  FileText,
  Layout,
  Edit3,
} from 'lucide-react';
import {
  generatePlan,
  generateSlides,
  materializePlaylist,
  materializePlan,
  getBusinessContextFromProfile,
  rejectSuggestion,
  BUSINESS_TYPES,
} from '../services/assistantService';
import { canEditContent } from '../services/permissionsService';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Badge, EmptyState } from '../design-system';
import { useTranslation } from '../i18n';
import { useLogger } from '../hooks/useLogger.js';

// Icon mapping for business types
const getBusinessIcon = (type) => {
  const icons = {
    restaurant: Utensils,
    salon: Scissors,
    gym: Dumbbell,
    retail: ShoppingBag,
    generic: Building2,
  };
  return icons[type] || Building2;
};

// Step indicator component
const StepIndicator = ({ currentStep, steps }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {steps.map((step, index) => {
      const isActive = index === currentStep;
      const isComplete = index < currentStep;
      return (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : isComplete
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {isComplete ? <Check size={16} /> : index + 1}
          </div>
          <span
            className={`ml-2 text-sm font-medium ${
              isActive ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className="w-12 h-0.5 mx-4 bg-gray-200" />
          )}
        </div>
      );
    })}
  </div>
);

const ContentAssistantPage = ({ showToast }) => {
  const { t } = useTranslation();
  const logger = useLogger('ContentAssistantPage');
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step management
  const [currentStep, setCurrentStep] = useState(0);
  const steps = [
    { id: 'context', label: 'Business Context' },
    { id: 'plan', label: 'Review Plan' },
    { id: 'generate', label: 'Generate Content' },
  ];

  // Business context form
  const [businessContext, setBusinessContext] = useState({
    businessName: '',
    businessType: 'generic',
    brandColors: { primary: '#3B82F6', secondary: '#1E40AF' },
    targetAudience: '',
    specialNotes: '',
  });

  // Plan state
  const [planSuggestion, setPlanSuggestion] = useState(null);
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [generatedPlaylists, setGeneratedPlaylists] = useState([]);

  // Permissions
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load profile data and permissions
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Check permissions
      const hasPermission = await canEditContent();
      setCanEdit(hasPermission);

      // Try to load business context from profile
      try {
        const profileContext = await getBusinessContextFromProfile();
        if (profileContext.businessName) {
          setBusinessContext((prev) => ({
            ...prev,
            ...profileContext,
          }));
        }
      } catch (error) {
        // Profile might not have business info yet
        logger.info('No profile business context found');
      }
    } catch (error) {
      logger.error('Error loading initial data:', error);
      showToast?.('Error loading assistant', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Generate plan
  const handleGeneratePlan = async () => {
    if (!businessContext.businessName.trim()) {
      showToast?.('Please enter your business name', 'error');
      return;
    }

    try {
      setGenerating(true);
      const suggestion = await generatePlan(businessContext);
      setPlanSuggestion(suggestion);

      // Select all playlists by default
      if (suggestion.payload?.playlists) {
        setSelectedPlaylists(suggestion.payload.playlists.map((_, i) => i));
      }

      setCurrentStep(1);
      showToast?.('Content plan generated!', 'success');
    } catch (error) {
      logger.error('Error generating plan:', error);
      showToast?.(error.message || 'Error generating plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Step 2: Regenerate plan
  const handleRegeneratePlan = async () => {
    try {
      setGenerating(true);

      // Reject current suggestion
      if (planSuggestion?.id) {
        await rejectSuggestion(planSuggestion.id);
      }

      // Generate new plan
      const suggestion = await generatePlan(businessContext);
      setPlanSuggestion(suggestion);

      if (suggestion.payload?.playlists) {
        setSelectedPlaylists(suggestion.payload.playlists.map((_, i) => i));
      }

      showToast?.('New plan generated!', 'success');
    } catch (error) {
      logger.error('Error regenerating plan:', error);
      showToast?.(error.message || 'Error regenerating plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle playlist selection
  const togglePlaylistSelection = (index) => {
    setSelectedPlaylists((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  // Step 3: Generate content
  const handleGenerateContent = async () => {
    if (selectedPlaylists.length === 0) {
      showToast?.('Please select at least one playlist', 'error');
      return;
    }

    setCurrentStep(2);
    setGenerating(true);
    setGeneratedPlaylists([]);
    setGenerationProgress({ current: 0, total: selectedPlaylists.length });

    try {
      const playlists = planSuggestion.payload.playlists;
      const results = [];

      for (let i = 0; i < selectedPlaylists.length; i++) {
        const playlistIndex = selectedPlaylists[i];
        const playlistPlan = playlists[playlistIndex];

        setGenerationProgress({ current: i + 1, total: selectedPlaylists.length });

        // Generate slides for this playlist
        const slidesSuggestion = await generateSlides(
          {
            playlistName: playlistPlan.name,
            playlistDescription: playlistPlan.description,
            slideCount: playlistPlan.slideCount || 4,
            theme: playlistPlan.theme,
          },
          businessContext
        );

        // Materialize into real playlist
        const result = await materializePlaylist(slidesSuggestion);
        results.push(result);
        setGeneratedPlaylists((prev) => [...prev, result]);
      }

      showToast?.(`Created ${results.length} playlists!`, 'success');
    } catch (error) {
      logger.error('Error generating content:', error);
      showToast?.(error.message || 'Error generating content', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Navigation
  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const navigateToPlaylist = (playlistId) => {
    navigate(`/app/playlists/${playlistId}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Wand2 size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Content Assistant
          </h3>
          <p className="text-gray-500">
            You don't have permission to create content. Please contact your administrator.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
          <Wand2 size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Assistant</h1>
          <p className="text-sm text-gray-500">
            Let AI help you create engaging content for your screens
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={steps} />

      {/* Step 1: Business Context */}
      {currentStep === 0 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                Tell us about your business
              </h2>
            </div>

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                value={businessContext.businessName}
                onChange={(e) =>
                  setBusinessContext((prev) => ({
                    ...prev,
                    businessName: e.target.value,
                  }))
                }
                placeholder="e.g., Joe's Coffee Shop"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {BUSINESS_TYPES.map((type) => {
                  const Icon = getBusinessIcon(type.value);
                  const isSelected = businessContext.businessType === type.value;
                  return (
                    <button
                      key={type.value}
                      onClick={() =>
                        setBusinessContext((prev) => ({
                          ...prev,
                          businessType: type.value,
                        }))
                      }
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon
                        size={24}
                        className={`mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}
                      />
                      <span
                        className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}
                      >
                        {type.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Palette size={16} className="inline mr-1" />
                Brand Colors (optional)
              </label>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={businessContext.brandColors.primary}
                    onChange={(e) =>
                      setBusinessContext((prev) => ({
                        ...prev,
                        brandColors: { ...prev.brandColors, primary: e.target.value },
                      }))
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Primary</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={businessContext.brandColors.secondary}
                    onChange={(e) =>
                      setBusinessContext((prev) => ({
                        ...prev,
                        brandColors: { ...prev.brandColors, secondary: e.target.value },
                      }))
                    }
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Secondary</span>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users size={16} className="inline mr-1" />
                Target Audience (optional)
              </label>
              <input
                type="text"
                value={businessContext.targetAudience}
                onChange={(e) =>
                  setBusinessContext((prev) => ({
                    ...prev,
                    targetAudience: e.target.value,
                  }))
                }
                placeholder="e.g., Young professionals, families with kids"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Special Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} className="inline mr-1" />
                Special Notes (optional)
              </label>
              <textarea
                value={businessContext.specialNotes}
                onChange={(e) =>
                  setBusinessContext((prev) => ({
                    ...prev,
                    specialNotes: e.target.value,
                  }))
                }
                placeholder="Any specific content ideas, promotions, or things to highlight..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Generate Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleGeneratePlan}
                disabled={generating || !businessContext.businessName.trim()}
                size="lg"
              >
                {generating ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" />
                    Generate Content Plan
                    <ArrowRight size={18} className="ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Review Plan */}
      {currentStep === 1 && planSuggestion && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Content Plan
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegeneratePlan}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                <span className="ml-1">Regenerate</span>
              </Button>
            </div>

            {/* Rationale */}
            {planSuggestion.payload?.rationale && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-purple-700">
                    {planSuggestion.payload.rationale}
                  </p>
                </div>
              </div>
            )}

            {/* Playlist Selection */}
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-2">
                Select the playlists you want to create:
              </p>
              {planSuggestion.payload?.playlists?.map((playlist, index) => {
                const isSelected = selectedPlaylists.includes(index);
                return (
                  <button
                    key={index}
                    onClick={() => togglePlaylistSelection(index)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <List size={16} className="text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {playlist.name}
                          </span>
                          <Badge variant="blue" size="sm">
                            {playlist.slideCount} slides
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {playlist.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
            <Button
              onClick={handleGenerateContent}
              disabled={selectedPlaylists.length === 0}
            >
              <Sparkles size={18} className="mr-2" />
              Generate {selectedPlaylists.length} Playlist
              {selectedPlaylists.length !== 1 ? 's' : ''}
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Generation Progress & Results */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Progress */}
          {generating && (
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Generating Content...
                  </h3>
                  <p className="text-sm text-gray-500">
                    Creating playlist {generationProgress.current} of{' '}
                    {generationProgress.total}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                  }}
                />
              </div>
            </Card>
          )}

          {/* Generated Playlists */}
          {generatedPlaylists.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Check size={20} className="text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {generating ? 'Created So Far' : 'Content Created!'}
                </h2>
              </div>

              <div className="space-y-3">
                {generatedPlaylists.map((result, index) => (
                  <div
                    key={result.playlist.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <List size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {result.playlist.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {result.slideCount} slides created
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigateToPlaylist(result.playlist.id)}
                      >
                        <Eye size={16} className="mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigateToPlaylist(result.playlist.id)}
                      >
                        <Edit3 size={16} className="mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Done State */}
          {!generating && generatedPlaylists.length > 0 && (
            <Card className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">All Done!</h3>
              <p className="text-gray-500 mb-6">
                Your content has been created. You can now edit the slides, add
                your own images, and assign to screens.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCurrentStep(0);
                    setPlanSuggestion(null);
                    setGeneratedPlaylists([]);
                    setSelectedPlaylists([]);
                  }}
                >
                  <Plus size={18} className="mr-2" />
                  Create More
                </Button>
                <Button onClick={() => navigate('/app/playlists')}>
                  <List size={18} className="mr-2" />
                  View All Playlists
                </Button>
              </div>
            </Card>
          )}

          {/* Back Button (only during generation) */}
          {generating && (
            <div className="flex justify-start">
              <Button variant="ghost" onClick={goBack} disabled>
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentAssistantPage;
