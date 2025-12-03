/**
 * Feature Flags Debug Component
 * Phase 14: Debug view showing resolved features for current tenant
 *
 * Shows:
 * - Current plan and tenant info
 * - All resolved features with their sources
 * - Ability to test feature toggling in dev mode
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEffectiveFeatures, useFeatureContext } from '../hooks/useFeatureFlag';
import { PLANS, Feature, FEATURE_METADATA, PlanSlug, getAllPlans } from '../config/plans';
import { getEffectiveFeatures } from '../config/featureFlags';
import { Card, CardHeader, CardContent } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Alert } from '../design-system/components/Alert';
import {
  Bug,
  Check,
  X,
  RefreshCw,
  Shield,
  Building2,
  CreditCard,
  Zap,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  AlertTriangle,
} from 'lucide-react';

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Main debug panel component
 */
export default function FeatureFlagsDebug() {
  const { userProfile } = useAuth();
  const { plan, tenantId, tenantOverrides, isLoading, refresh } = useFeatureContext();
  const effectiveFeatures = useEffectiveFeatures();

  const [simulatedPlan, setSimulatedPlan] = useState(null);
  const [localOverrides, setLocalOverrides] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Reset simulation when plan changes
  useEffect(() => {
    setSimulatedPlan(null);
    setLocalOverrides({});
  }, [plan]);

  // Calculate resolved features with simulation
  const resolvedFeatures = getEffectiveFeatures({
    plan: simulatedPlan || plan,
    tenantId,
    tenantOverrides: { ...tenantOverrides, ...localOverrides },
  });

  const handleToggleLocalOverride = (featureKey) => {
    setLocalOverrides((prev) => {
      const current = prev[featureKey];
      if (current === undefined) {
        // Get current resolved value and toggle it
        const resolved = resolvedFeatures.features[featureKey];
        return { ...prev, [featureKey]: !resolved?.enabled };
      } else if (current === true) {
        return { ...prev, [featureKey]: false };
      } else {
        // Remove override
        const { [featureKey]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  const handleCopyConfig = () => {
    const config = {
      timestamp: new Date().toISOString(),
      tenant: {
        id: tenantId,
        plan: simulatedPlan || plan,
      },
      features: resolvedFeatures.features,
      summary: resolvedFeatures.summary,
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleExportCSV = () => {
    const rows = [['Feature', 'Enabled', 'Source', 'Category']];
    Object.entries(resolvedFeatures.features).forEach(([key, value]) => {
      const meta = FEATURE_METADATA[key] || {};
      rows.push([key, value.enabled ? 'Yes' : 'No', value.source, meta.category || 'other']);
    });
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-flags-${tenantId || 'debug'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories = groupByCategory(resolvedFeatures.features);

  return (
    <div className="space-y-6">
      {/* Dev mode warning */}
      {!isDev && (
        <Alert variant="warning" icon={AlertTriangle}>
          Feature simulation is only available in development mode. Viewing production values.
        </Alert>
      )}

      {/* Current Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold">Current Context</h3>
            </div>
            <Button variant="secondary" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ContextItem
              icon={Building2}
              label="Tenant ID"
              value={tenantId || 'Not set'}
              truncate
            />
            <ContextItem
              icon={CreditCard}
              label="Plan"
              value={PLANS[plan]?.name || plan}
              badge={simulatedPlan ? 'Simulated' : null}
            />
            <ContextItem
              icon={Shield}
              label="Role"
              value={userProfile?.role || 'user'}
            />
            <ContextItem
              icon={Zap}
              label="Overrides"
              value={Object.keys(tenantOverrides).length + Object.keys(localOverrides).length}
            />
          </div>
        </CardContent>
      </Card>

      {/* Plan Simulator (Dev Only) */}
      {isDev && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Plan Simulator</h3>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Simulate plan:</span>
              {getAllPlans().map((p) => (
                <button
                  key={p.slug}
                  onClick={() => setSimulatedPlan(p.slug === plan ? null : p.slug)}
                  className={`
                    px-3 py-1 rounded-full text-sm font-medium transition-colors
                    ${(simulatedPlan || plan) === p.slug
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }
                  `}
                >
                  {p.name}
                </button>
              ))}
              {simulatedPlan && (
                <button
                  onClick={() => setSimulatedPlan(null)}
                  className="text-sm text-red-600 hover:text-red-700 ml-2"
                >
                  Reset
                </button>
              )}
            </div>
            {simulatedPlan && (
              <Alert variant="info" className="mt-4">
                Simulating {PLANS[simulatedPlan]?.name} plan. Local only - does not affect other users.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Feature Summary</h3>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopyConfig}>
                <Copy className="w-4 h-4 mr-1" />
                {copyFeedback ? 'Copied!' : 'Copy JSON'}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <SummaryCard label="Total" value={resolvedFeatures.summary.total} />
            <SummaryCard
              label="Enabled"
              value={resolvedFeatures.summary.enabled}
              color="green"
            />
            <SummaryCard
              label="From Plan"
              value={resolvedFeatures.summary.fromPlan}
              color="blue"
            />
            <SummaryCard
              label="From Override"
              value={resolvedFeatures.summary.fromOverride}
              color="purple"
            />
            <SummaryCard
              label="Global"
              value={resolvedFeatures.summary.fromGlobal}
              color="gray"
            />
          </div>
        </CardContent>
      </Card>

      {/* Features by Category */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Features by Category</h3>
        </CardHeader>
        <CardContent className="p-0">
          {Object.entries(categories).map(([category, features]) => (
            <CategorySection
              key={category}
              category={category}
              features={features}
              expanded={expandedCategory === category}
              onToggle={() =>
                setExpandedCategory(expandedCategory === category ? null : category)
              }
              localOverrides={localOverrides}
              onToggleOverride={isDev ? handleToggleLocalOverride : null}
            />
          ))}
        </CardContent>
      </Card>

      {/* Local Overrides (Dev Only) */}
      {isDev && Object.keys(localOverrides).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-purple-600">Local Overrides</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setLocalOverrides({})}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(localOverrides).map(([key, value]) => (
                <span
                  key={key}
                  className={`
                    px-3 py-1 rounded-full text-sm
                    ${value
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                    }
                  `}
                >
                  {key}: {value ? 'ON' : 'OFF'}
                  <button
                    onClick={() => {
                      const { [key]: _, ...rest } = localOverrides;
                      setLocalOverrides(rest);
                    }}
                    className="ml-2 hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper Components

function ContextItem({ icon: Icon, label, value, badge, truncate }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`font-medium ${truncate ? 'truncate' : ''}`} title={value}>
          {value}
          {badge && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    green: 'bg-green-50 text-green-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className={`p-4 rounded-lg ${colors[color] || 'bg-gray-50 text-gray-700'}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

function CategorySection({
  category,
  features,
  expanded,
  onToggle,
  localOverrides,
  onToggleOverride,
}) {
  const enabledCount = features.filter((f) => f.enabled).length;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-medium capitalize">{category}</span>
        </div>
        <span className="text-sm text-gray-500">
          {enabledCount} / {features.length} enabled
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {features.map((feature) => (
            <FeatureRow
              key={feature.key}
              feature={feature}
              hasLocalOverride={localOverrides[feature.key] !== undefined}
              onToggleOverride={onToggleOverride}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureRow({ feature, hasLocalOverride, onToggleOverride }) {
  const meta = FEATURE_METADATA[feature.key] || {};

  const sourceColors = {
    override: 'bg-purple-100 text-purple-700',
    global_override: 'bg-purple-100 text-purple-700',
    plan: 'bg-blue-100 text-blue-700',
    global: 'bg-gray-100 text-gray-600',
    default: 'bg-gray-100 text-gray-500',
  };

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg
        ${hasLocalOverride ? 'bg-purple-50 ring-1 ring-purple-200' : 'bg-gray-50'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`
            w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
            ${feature.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}
          `}
        >
          {feature.enabled ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">{meta.name || feature.key}</div>
          <div className="text-xs text-gray-500 truncate">
            {feature.key}
            {meta.description && ` - ${meta.description}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded ${sourceColors[feature.source]}`}>
          {feature.source}
        </span>
        {onToggleOverride && (
          <button
            onClick={() => onToggleOverride(feature.key)}
            className={`
              text-xs px-2 py-1 rounded transition-colors
              ${hasLocalOverride
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }
            `}
          >
            {hasLocalOverride ? 'Reset' : 'Override'}
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function
function groupByCategory(features) {
  const grouped = {};

  Object.entries(features).forEach(([key, value]) => {
    const meta = FEATURE_METADATA[key] || {};
    const category = meta.category || 'other';

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push({
      key,
      ...value,
    });
  });

  // Sort categories
  const order = ['core', 'scheduling', 'analytics', 'ai', 'marketing', 'management', 'integration', 'security', 'branding', 'reseller', 'support', 'other'];
  const sorted = {};

  order.forEach((cat) => {
    if (grouped[cat]) {
      sorted[cat] = grouped[cat];
    }
  });

  // Add any remaining categories
  Object.keys(grouped)
    .filter((cat) => !order.includes(cat))
    .forEach((cat) => {
      sorted[cat] = grouped[cat];
    });

  return sorted;
}

export { FeatureFlagsDebug };
