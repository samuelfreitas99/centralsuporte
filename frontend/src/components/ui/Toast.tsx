import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (title: string, options?: { type?: ToastType; message?: string; duration?: number }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, options?: { type?: ToastType; message?: string; duration?: number }) => {
      const id = Math.random().toString(36).substring(2, 9);
      const type = options?.type || 'success';
      const message = options?.message;
      const duration = options?.duration || 3000;

      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => {
    showToast(title, { type: 'success', message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast(title, { type: 'error', message });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast(title, { type: 'warning', message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast(title, { type: 'info', message });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
        aria-live="polite"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />,
              warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />,
              error: <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />,
              info: <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />,
            };

            const borderColors = {
              success: 'border-success/30',
              warning: 'border-warning/30',
              error: 'border-destructive/30',
              info: 'border-info/30',
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-popover text-popover-foreground p-3.5 shadow-lg ${borderColors[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="flex-1 text-xs">
                  <p className="font-semibold leading-tight text-popover-foreground">{toast.title}</p>
                  {toast.message && (
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer transition-colors"
                  aria-label="Fechar notificação"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
