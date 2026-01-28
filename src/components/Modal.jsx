/**
 * Modal Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */
import PropTypes from 'prop-types';
import { Modal as DSModal, ModalHeader, ModalTitle, ModalContent } from '../design-system';

// Map legacy sizes to design system sizes
const sizeMap = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
  xlarge: 'xl',
};

/**
 * Legacy Modal - wraps design system Modal for backwards compatibility
 * Maps 'isOpen' to 'open' and 'size' values to new format
 * @param root0
 * @param root0.isOpen
 * @param root0.onClose
 * @param root0.title
 * @param root0.children
 * @param root0.size
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  ...props
}) => {
  const mappedSize = sizeMap[size] || size;

  return (
    <DSModal
      open={isOpen}
      onClose={onClose}
      size={mappedSize}
      {...props}
    >
      {title && (
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
      )}
      <ModalContent>
        {children}
      </ModalContent>
    </DSModal>
  );
};

Modal.propTypes = {
  /** Whether modal is visible */
  isOpen: PropTypes.bool.isRequired,
  /** Handler called when modal should close */
  onClose: PropTypes.func.isRequired,
  /** Modal header title */
  title: PropTypes.string,
  /** Modal content */
  children: PropTypes.node,
  /** Modal size */
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge', 'sm', 'md', 'lg', 'xl']),
};

Modal.defaultProps = {
  title: null,
  children: null,
  size: 'medium',
};

export default Modal;
