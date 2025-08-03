import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { trapFocus, KEYBOARD_KEYS } from '../../utils/accessibility';
import { useAccessibility } from '../../contexts/AccessibilityContext';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { settings } = useAccessibility();

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Set up focus trap
      if (modalRef.current) {
        const cleanup = trapFocus(modalRef.current);
        return cleanup;
      }
    } else {
      // Restore focus to the previously focused element
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.ESCAPE) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 z-40 ${
          settings.reduceMotion ? '' : 'transition-opacity'
        }`}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        aria-describedby={description ? 'modal-description' : undefined}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            ref={modalRef}
            className={`relative transform overflow-hidden rounded-lg bg-white shadow-xl ${
              settings.reduceMotion ? '' : 'transition-all'
            } ${sizeClasses[size]} w-full`}
          >
            {/* Header */}
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <h3
                  id="modal-title"
                  className={`text-lg font-medium leading-6 text-gray-900 ${
                    settings.fontSize === 'large' ? 'text-xl' : 
                    settings.fontSize === 'extra-large' ? 'text-2xl' : ''
                  }`}
                >
                  {title}
                </h3>
                <button
                  type="button"
                  className="ml-auto inline-flex items-center justify-center rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              {description && (
                <p
                  id="modal-description"
                  className={`mt-2 text-sm text-gray-600 ${
                    settings.fontSize === 'large' ? 'text-base' : 
                    settings.fontSize === 'extra-large' ? 'text-lg' : ''
                  }`}
                >
                  {description}
                </p>
              )}
            </div>
            
            {/* Content */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccessibleModal;