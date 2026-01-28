/**
 * Badge Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */
import PropTypes from 'prop-types';
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
 * @param root0
 * @param root0.children
 * @param root0.variant
 */
const Badge = ({ children, variant = 'default', ...props }) => {
  const mappedVariant = variantMap[variant] || variant;

  return (
    <DSBadge variant={mappedVariant} {...props}>
      {children}
    </DSBadge>
  );
};

Badge.propTypes = {
  /** Badge content */
  children: PropTypes.node.isRequired,
  /** Visual style variant */
  variant: PropTypes.oneOf(['default', 'success', 'warning', 'danger', 'info', 'error']),
  /** Badge size */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

Badge.defaultProps = {
  variant: 'default',
  size: 'md',
};

export default Badge;
