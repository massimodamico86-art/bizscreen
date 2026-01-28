/**
 * Button Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */
import PropTypes from 'prop-types';
import { Button as DSButton } from '../design-system';

// Map legacy variants to design system variants
const variantMap = {
  primary: 'primary',
  outline: 'secondary',  // 'outline' maps to 'secondary' in new design system
  success: 'success',
  danger: 'danger',
};

/**
 * Legacy Button - wraps design system Button for backwards compatibility
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {Function} [props.onClick] - Click handler
 * @param {'primary'|'outline'|'success'|'danger'} [props.variant='primary'] - Button visual style
 * @param {'sm'|'md'} [props.size='md'] - Button size
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {'button'|'submit'|'reset'} [props.type='button'] - HTML button type
 * @param {string} [props.ariaLabel] - Accessible label for screen readers
 * @returns {React.ReactElement} Button component
 */
const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
  ...props
}) => {
  const mappedVariant = variantMap[variant] || variant;

  return (
    <DSButton
      variant={mappedVariant}
      size={size}
      className={className}
      disabled={disabled}
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </DSButton>
  );
};

Button.propTypes = {
  /** Button content - text, icon, or any React node */
  children: PropTypes.node.isRequired,
  /** Click handler function */
  onClick: PropTypes.func,
  /** Visual style variant */
  variant: PropTypes.oneOf(['primary', 'outline', 'success', 'danger']),
  /** Button size */
  size: PropTypes.oneOf(['sm', 'md']),
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Whether button is disabled */
  disabled: PropTypes.bool,
  /** HTML button type */
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  /** Accessible label for screen readers */
  ariaLabel: PropTypes.string,
};

Button.defaultProps = {
  onClick: null,
  variant: 'primary',
  size: 'md',
  className: '',
  disabled: false,
  type: 'button',
  ariaLabel: undefined,
};

export default Button;
