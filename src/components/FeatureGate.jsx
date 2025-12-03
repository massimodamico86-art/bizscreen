/**
 * FeatureGate Component
 * Phase 14: Conditionally render content based on feature flags
 *
 * Usage:
 *   <FeatureGate feature="ai_assistant">
 *     <AIAssistantButton />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="campaigns" fallback={<UpgradePrompt />}>
 *     <CampaignsPage />
 *   </FeatureGate>
 */

import React from 'react';
import { useFeatureFlag, useFeatureInfo, useFeatureContext } from '../hooks/useFeatureFlag';
import { Feature, FEATURE_METADATA, PLANS } from '../config/plans';
import { Lock, Sparkles, ArrowUpRight } from 'lucide-react';

// ============================================================================
// FEATURE GATE COMPONENT
// ============================================================================

/**
 * Conditionally renders children based on feature flag
 *
 * @param {Object} props
 * @param {string} props.feature - Feature key to check
 * @param {React.ReactNode} [props.children] - Content to show if feature is enabled
 * @param {React.ReactNode} [props.fallback] - Content to show if feature is disabled
 * @param {boolean} [props.showUpgradePrompt=false] - Show upgrade prompt when disabled
 * @param {string} [props.fallbackMessage] - Custom message for upgrade prompt
 * @param {Function} [props.onUpgradeClick] - Handler for upgrade button click
 */
export function FeatureGate({
  feature,
  children,
  fallback = null,
  showUpgradePrompt = false,
  fallbackMessage,
  onUpgradeClick,
}) {
  const isEnabled = useFeatureFlag(feature);

  if (isEnabled) {
    return <>{children}</>;
  }

  // Show fallback content
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show upgrade prompt if requested
  if (showUpgradePrompt) {
    return (
      <FeatureUpgradePrompt
        feature={feature}
        message={fallbackMessage}
        onUpgradeClick={onUpgradeClick}
      />
    );
  }

  // Default: render nothing
  return null;
}

// ============================================================================
// FEATURE UPGRADE PROMPT
// ============================================================================

/**
 * Upgrade prompt shown when a feature is not available
 */
export function FeatureUpgradePrompt({ feature, message, onUpgradeClick, variant = 'default' }) {
  const { upgradePath } = useFeatureInfo(feature);
  const featureMeta = FEATURE_METADATA[feature];

  const featureName = featureMeta?.name || feature;
  const requiredPlan = upgradePath?.name || 'a higher plan';

  const defaultMessage = message || `${featureName} is available on ${requiredPlan}.`;

  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-gray-500">
        <Lock className="w-3 h-3" />
        <span>{requiredPlan}</span>
      </span>
    );
  }

  if (variant === 'badge') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Sparkles className="w-3 h-3" />
        {requiredPlan}
      </span>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50 text-center">
      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{featureName}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{defaultMessage}</p>
      {onUpgradeClick ? (
        <button
          onClick={onUpgradeClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upgrade Now
          <ArrowUpRight className="w-4 h-4" />
        </button>
      ) : (
        <a
          href="/settings/plan"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Plans
          <ArrowUpRight className="w-4 h-4" />
        </a>
      )}
    </div>
  );
}

// ============================================================================
// FEATURE BADGE
// ============================================================================

/**
 * Badge showing required plan for a feature
 */
export function FeatureBadge({ feature, showWhenEnabled = false }) {
  const isEnabled = useFeatureFlag(feature);
  const { upgradePath } = useFeatureInfo(feature);

  if (isEnabled && !showWhenEnabled) {
    return null;
  }

  if (isEnabled) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <Sparkles className="w-3 h-3" />
        Enabled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
      <Lock className="w-3 h-3" />
      {upgradePath?.name || 'Upgrade'}
    </span>
  );
}

// ============================================================================
// FEATURE LOCKED OVERLAY
// ============================================================================

/**
 * Overlay that covers content and shows upgrade prompt
 */
export function FeatureLockedOverlay({ feature, children, onUpgradeClick }) {
  const isEnabled = useFeatureFlag(feature);

  if (isEnabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <FeatureUpgradePrompt feature={feature} onUpgradeClick={onUpgradeClick} />
      </div>
    </div>
  );
}

// ============================================================================
// REQUIRE FEATURE WRAPPER
// ============================================================================

/**
 * Higher-order component that requires a feature to be enabled
 */
export function withFeatureGate(WrappedComponent, featureKey, FallbackComponent = null) {
  return function FeatureGatedComponent(props) {
    const isEnabled = useFeatureFlag(featureKey);

    if (!isEnabled) {
      if (FallbackComponent) {
        return <FallbackComponent {...props} requiredFeature={featureKey} />;
      }
      return <FeatureUpgradePrompt feature={featureKey} />;
    }

    return <WrappedComponent {...props} />;
  };
}

// ============================================================================
// FEATURE LIST COMPONENT
// ============================================================================

/**
 * Display a list of features with their availability status
 */
export function FeatureList({ features, showAll = false }) {
  const { plan } = useFeatureContext();

  const featuresToShow = showAll
    ? Object.keys(FEATURE_METADATA)
    : features || Object.values(Feature);

  return (
    <div className="space-y-2">
      {featuresToShow.map((featureKey) => (
        <FeatureListItem key={featureKey} feature={featureKey} />
      ))}
    </div>
  );
}

function FeatureListItem({ feature }) {
  const isEnabled = useFeatureFlag(feature);
  const featureMeta = FEATURE_METADATA[feature];

  if (!featureMeta) return null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{featureMeta.name}</div>
        <div className="text-sm text-gray-500">{featureMeta.description}</div>
      </div>
      <FeatureBadge feature={feature} showWhenEnabled />
    </div>
  );
}

// ============================================================================
// PLAN COMPARISON COMPONENT
// ============================================================================

/**
 * Shows features comparison across plans
 */
export function PlanFeaturesComparison({ highlightPlan }) {
  const plans = [PLANS.free, PLANS.starter, PLANS.pro, PLANS.enterprise];
  const features = Object.values(Feature);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b dark:border-gray-700">
            <th className="text-left py-3 px-4">Feature</th>
            {plans.map((plan) => (
              <th
                key={plan.slug}
                className={`text-center py-3 px-4 ${
                  highlightPlan === plan.slug ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => {
            const meta = FEATURE_METADATA[feature];
            if (!meta) return null;

            return (
              <tr key={feature} className="border-b dark:border-gray-700">
                <td className="py-3 px-4">
                  <div className="font-medium">{meta.name}</div>
                </td>
                {plans.map((plan) => {
                  const included = plan.features.includes(feature);
                  return (
                    <td
                      key={plan.slug}
                      className={`text-center py-3 px-4 ${
                        highlightPlan === plan.slug ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {included ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FeatureGate;
