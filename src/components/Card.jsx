/**
 * Card Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible behavior.
 * New code should import directly from '../design-system' instead.
 */

/**
 * Legacy Card - wraps design system Card for backwards compatibility
 * Uses padding="none" by default to match old behavior where children handle their own padding
 */
const Card = ({ children, className = '', ...props }) => (
  <DSCard padding="none" className={className} {...props}>
    {children}
  </DSCard>
);

export default Card;
