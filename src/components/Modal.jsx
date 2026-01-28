/**
 * Modal Component - Legacy wrapper
 * Re-exports from design system with backwards-compatible prop mapping.
 * New code should import directly from '../design-system' instead.
 */



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

export default Modal;
