/**
 * Card Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible behavior.
 * New code should import directly from '../design-system' instead.
 */
import PropTypes from 'prop-types';
import { Card as DSCard } from '../design-system';

/**
 * Legacy Card - wraps design system Card for backwards compatibility
 * Uses padding="none" by default to match old behavior where children handle their own padding
 * @param root0
 * @param root0.children
 * @param root0.className
 */
const Card = ({ children, className = '', ...props }) => (
  <DSCard padding="none" className={className} {...props}>
    {children}
  </DSCard>
);

Card.propTypes = {
  /** Card content */
  children: PropTypes.node,
  /** Additional CSS classes */
  className: PropTypes.string,
  /** Click handler - makes card interactive */
  onClick: PropTypes.func,
};

Card.defaultProps = {
  children: null,
  className: '',
  onClick: null,
};

export default Card;
