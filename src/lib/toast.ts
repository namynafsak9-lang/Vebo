/**
 * Custom Toast Event Dispatcher for sandboxed iframe environments.
 * Avoids any hard window.alert() blocks.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'info') {
  const event = new CustomEvent('vebo-toast', {
    detail: {
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      message,
      type,
    },
  });
  window.dispatchEvent(event);
}
