/**
 * PageTransition Component
 *
 * Wraps page content with a subtle fade-in animation on initial render.
 * Does not add delay to navigation - animation happens as content appears.
 *
 * @example
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 */

import { pageTransition } from '../motion';

/**
 * Page transition wrapper with fade-in animation
 */
export function PageTransition({
  children,
  className = '',
  ...props
}) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered page transition for lists/grids
 * Children animate in sequence
 */
export function StaggeredPageTransition({
  children,
  className = '',
  staggerDelay = 0.05,
  ...props
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered item wrapper - use inside StaggeredPageTransition
 */
export function StaggeredItem({
  children,
  className = '',
  ...props
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
