/**
 * Modal Component
 *
 * A refined modal/dialog with smooth animations and proper accessibility.
 * Supports multiple sizes, custom headers, and confirmation dialogs.
 *
 * @example
 * <Modal open={isOpen} onClose={handleClose}>
 *   <ModalHeader>
 *     <ModalTitle>Edit Item</ModalTitle>
 *     <ModalDescription>Make changes to your item here.</ModalDescription>
 *   </ModalHeader>
 *   <ModalContent>
 *     {content}
 *   </ModalContent>
 *   <ModalFooter>
 *     <Button variant="secondary" onClick={handleClose}>Cancel</Button>
 *     <Button onClick={handleSave}>Save</Button>
 *   </ModalFooter>
 * </Modal>
 */

import { forwardRef, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { modal as modalAnimation } from '../motion';

/**
 * Main Modal component
 */
export const Modal = forwardRef(function Modal(
  {
    open = false,
    onClose,
    children,
    size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    closeOnOverlay = true,
    closeOnEscape = true,
    showCloseButton = true,
    className = '',
    ...props
  },
  ref
) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Size styles
  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[calc(100vw-2rem)] sm:max-w-[calc(100vw-4rem)]',
  };

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      // Focus the modal after animation
      setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [open]);

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, []);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden="true"
            initial={modalAnimation.overlay.initial}
            animate={modalAnimation.overlay.animate}
            exit={modalAnimation.overlay.exit}
            transition={modalAnimation.overlay.transition}
          />

          {/* Modal panel */}
          <motion.div
            ref={(node) => {
              modalRef.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) ref.current = node;
            }}
            className={`
              relative w-full ${sizeStyles[size]}
              bg-white rounded-xl shadow-modal
              max-h-[calc(100vh-2rem)] sm:max-h-[90vh]
              flex flex-col
              focus:outline-none
              ${className}
            `.trim()}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={modalAnimation.content.initial}
            animate={modalAnimation.content.animate}
            exit={modalAnimation.content.exit}
            transition={modalAnimation.content.transition}
            {...props}
          >
            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  absolute right-4 top-4 z-10
                  p-1.5 rounded-lg
                  text-gray-400 hover:text-gray-600 hover:bg-gray-100
                  transition-colors duration-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400
                  active:scale-95
                "
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Render to portal
  return createPortal(modalContent, document.body);
});

/**
 * Modal Header
 */
export const ModalHeader = forwardRef(function ModalHeader(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`px-6 pt-6 pb-4 pr-12 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Modal Title
 */
export const ModalTitle = forwardRef(function ModalTitle(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <h2
      ref={ref}
      className={`text-lg font-semibold text-gray-900 ${className}`}
      {...props}
    >
      {children}
    </h2>
  );
});

/**
 * Modal Description
 */
export const ModalDescription = forwardRef(function ModalDescription(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <p
      ref={ref}
      className={`text-sm text-gray-500 mt-1 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
});

/**
 * Modal Content (scrollable area)
 */
export const ModalContent = forwardRef(function ModalContent(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`px-6 py-4 flex-1 overflow-y-auto ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Modal Footer
 */
export const ModalFooter = forwardRef(function ModalFooter(
  {
    children,
    className = '',
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={`
        px-6 py-4 border-t border-gray-100
        flex items-center justify-end gap-3
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
});

/**
 * Confirmation Dialog - simplified modal for confirmations
 */
export const ConfirmDialog = forwardRef(function ConfirmDialog(
  {
    open = false,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'default', // 'default' | 'danger'
    loading = false,
    icon,
    ...props
  },
  ref
) {
  const handleConfirm = async () => {
    await onConfirm?.();
  };

  const iconColors = {
    default: 'bg-blue-100 text-blue-600',
    danger: 'bg-red-100 text-red-600',
  };

  const confirmButtonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      ref={ref}
      open={open}
      onClose={loading ? undefined : onClose}
      size="sm"
      showCloseButton={false}
      {...props}
    >
      <div className="p-6 text-center">
        {icon && (
          <div
            className={`
              w-12 h-12 mx-auto mb-4
              rounded-full flex items-center justify-center
              ${iconColors[variant]}
            `}
          >
            {icon}
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 mb-6">
            {description}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-4 py-2 text-sm font-medium
              text-gray-700 bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-100
            "
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg
              transition-all duration-100
              disabled:opacity-50 disabled:cursor-not-allowed
              ${variant === 'danger'
                ? 'text-white bg-red-600 hover:bg-red-700'
                : 'text-white bg-gray-900 hover:bg-gray-800'
              }
            `}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
});

export default Modal;
