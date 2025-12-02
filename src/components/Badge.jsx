/**
 * Badge Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */
import { Badge as DSBadge } from '../design-system';

// Map legacy variants to design system variants
const variantMap = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'error',  // 'danger' maps to 'error' in new design system
  info: 'info',
};

/**
 * Legacy Badge - wraps design system Badge for backwards compatibility
 */
const Badge = ({ children, variant = 'default', ...props }) => {
  const mappedVariant = variantMap[variant] || variant;

  return (
    <DSBadge variant={mappedVariant} {...props}>
      {children}
    </DSBadge>
  );
};

export default Badge;
