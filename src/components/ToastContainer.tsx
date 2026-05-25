import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastMessage } from '../lib/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        setToasts((prev) => [...prev, customEvent.detail]);

        // Auto remove after 4 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== customEvent.detail.id));
        }, 4000);
      }
    };

    window.addEventListener('vebo-toast', handleToastEvent);
    return () => {
      window.removeEventListener('vebo-toast', handleToastEvent);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-5 left-5 z-9999 max-w-sm w-full space-y-3 pointer-events-none" dir="rtl">
      <AnimatePresence>
        {toasts.map((toast) => {
          let bgColor = 'bg-white border-slate-200 text-slate-800';
          let icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;

          if (toast.type === 'success') {
            bgColor = 'bg-emerald-50 border-emerald-100 text-emerald-900';
            icon = <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />;
          } else if (toast.type === 'error') {
            bgColor = 'bg-rose-50 border-rose-100 text-rose-900';
            icon = <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />;
          } else if (toast.type === 'info') {
            bgColor = 'bg-blue-50 border-blue-100 text-blue-900';
            icon = <Info className="w-5 h-5 text-blue-500 shrink-0" />;
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 border rounded-2xl shadow-lg ${bgColor}`}
            >
              {icon}
              <div className="flex-1 text-xs font-bold leading-relaxed text-right">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
