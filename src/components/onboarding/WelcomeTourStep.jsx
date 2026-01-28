/**
 * WelcomeTourStep Component
 *
 * Individual step rendering for the welcome tour.
 * Displays icon, title, description with smooth animations.
 *
 * @module components/onboarding/WelcomeTourStep
 */


/**
 * Animation variants for step content
 */
const contentVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

/**
 * WelcomeTourStep - Individual tour step display
 *
 * @param {Object} props
 * @param {Object} props.step - Step object with id, title, description, icon
 * @param {React.ElementType} props.step.icon - Lucide icon component
 * @param {string} props.step.title - Step title
 * @param {string} props.step.description - Step description
 * @param {string} props.step.color - Icon background color class (e.g., 'from-blue-500 to-indigo-600')
 * @param {boolean} [props.isFirst] - Whether this is the first step (shows larger welcome)
 */
export function WelcomeTourStep({ step, isFirst = false }) {
  const Icon = step.icon;

  return (
    <motion.div
      className="flex flex-col items-center text-center py-8 px-4"
      variants={contentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Icon container with gradient background */}
      <div
        className={`
          ${isFirst ? 'w-24 h-24' : 'w-20 h-20'}
          rounded-2xl bg-gradient-to-br ${step.color || 'from-blue-500 to-indigo-600'}
          flex items-center justify-center mb-6
          shadow-lg
        `}
      >
        {Icon && (
          <Icon
            className="text-white"
            size={isFirst ? 48 : 40}
            strokeWidth={1.5}
          />
        )}
      </div>

      {/* Title */}
      <h2
        className={`
          font-semibold text-gray-900 mb-3
          ${isFirst ? 'text-2xl' : 'text-xl'}
        `}
      >
        {step.title}
      </h2>

      {/* Description */}
      <p className="text-gray-500 leading-relaxed max-w-md text-base">
        {step.description}
      </p>

      {/* Optional highlight for first step */}
      {isFirst && step.highlight && (
        <div className="mt-6 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium">
          {step.highlight}
        </div>
      )}
    </motion.div>
  );
}

export default WelcomeTourStep;
