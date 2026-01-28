/**
 * StatCard Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */

/**
 * Legacy StatCard - wraps design system StatCard for backwards compatibility
 * Maps 'trend' to 'change' and 'changeType', 'subtitle' to 'description'
 */
const StatCard = ({ title, value, icon: Icon, trend, subtitle, ...props }) => {
  // Convert trend to change and changeType
  let change = null;
  let changeType = 'neutral';

  if (trend !== undefined) {
    const direction = trend >= 0 ? '↑' : '↓';
    change = `${direction} ${Math.abs(trend)}% from last month`;
    changeType = trend >= 0 ? 'positive' : 'negative';
  }

  return (
    <DSStatCard
      title={title}
      value={value}
      icon={Icon ? <Icon size={18} /> : undefined}
      change={change}
      changeType={changeType}
      description={subtitle}
      {...props}
    />
  );
};

export default StatCard;
