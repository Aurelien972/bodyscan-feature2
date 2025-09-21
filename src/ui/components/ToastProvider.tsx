// src/ui/components/ToastProvider.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastMessage } from './Toast';
import { nanoid } from 'nanoid';
import { useFeedback } from '@/hooks';
import logger from '../../lib/utils/logger';

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { success, error, notif } = useFeedback();
  
  const showToast = (toast: Omit<ToastMessage, 'id'>) => {
    try {
      const id = nanoid();
      const newToast: ToastMessage = { 
        ...toast, 
        id,
        duration: toast.duration ?? 4000 
      };
      
      // Play feedback based on toast type with error handling
      try {
        if (toast.type === 'success') {
          success();
        } else if (toast.type === 'error') {
          error();
        } else {
          notif(); // For info, warning, etc.
        }
      } catch (feedbackError) {
        logger.error('TOAST_FEEDBACK_ERROR', 'Toast feedback audio failed', {
          toastType: toast.type,
          error: feedbackError instanceof Error ? feedbackError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
        // Continue with toast display even if audio fails
      }
      
      // Limit to 4 toasts maximum for better UX with error handling
      setToasts(prev => {
        try {
          return [...prev.slice(-3), newToast];
        } catch (setToastsError) {
          logger.error('TOAST_STATE_ERROR', 'Failed to update toast state', {
            error: setToastsError instanceof Error ? setToastsError.message : 'Unknown error',
            toastId: id,
            timestamp: new Date().toISOString()
          });
          // Return previous state if update fails
          return prev;
        }
      });
    } catch (toastError) {
      logger.error('TOAST_PROVIDER_ERROR', 'Complete toast creation failed', {
        toastType: toast.type,
        toastTitle: toast.title,
        error: toastError instanceof Error ? toastError.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Toast creation failed completely - this should not prevent other operations
    }
  };
  
  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  const clearAll = () => {
    setToasts([]);
  };
  
  const value = {
    showToast,
    dismissToast,
    clearAll,
  };
  
  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
