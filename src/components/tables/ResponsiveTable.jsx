/**
 * ResponsiveTable Component
 * Wrapper for tables that enables horizontal scroll on mobile
 * and provides column visibility control.
 */
import { useBreakpoints } from '../../hooks/useMediaQuery';

/**
 * ResponsiveTable wrapper
 * @param {Object} props
 * @param {React.ReactNode} props.children - Table content
 * @param {string} [props.className] - Additional classes
 */
export function ResponsiveTable({ children, className = '' }) {
  return (
    <div
      className={`overflow-x-auto -webkit-overflow-scrolling-touch ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {children}
    </div>
  );
}

/**
 * Responsive table cell that hides on mobile
 * Use for non-essential columns
 */
export function HiddenOnMobile({ children, className = '', as: Component = 'td' }) {
  return (
    <Component className={`hidden sm:table-cell ${className}`}>
      {children}
    </Component>
  );
}

/**
 * Responsive table header cell that hides on mobile
 */
export function HiddenOnMobileHeader({ children, className = '' }) {
  return (
    <th className={`hidden sm:table-cell ${className}`}>
      {children}
    </th>
  );
}

/**
 * Hook for responsive column visibility
 * Returns object with visibility flags per breakpoint
 */
export function useResponsiveColumns() {
  const { isMobile, isTablet, isDesktop } = useBreakpoints();

  return {
    // Always visible
    showEssential: true,
    // Hidden on mobile, visible on tablet+
    showSecondary: !isMobile,
    // Only on desktop
    showTertiary: isDesktop,
    // Convenience flags
    isMobile,
    isTablet,
    isDesktop,
  };
}

export default ResponsiveTable;
