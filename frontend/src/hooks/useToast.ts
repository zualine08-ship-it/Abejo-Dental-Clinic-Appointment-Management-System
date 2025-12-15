import { useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

const toastCallbacks: Set<(toast: Toast | { type: 'remove'; id: string }) => void> = new Set();

export const showToast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
  const id = Math.random().toString(36).substr(2, 9);
  const toast: Toast = { id, message, type, duration };
  
  toastCallbacks.forEach(callback => callback(toast));
  
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

export const removeToast = (id: string) => {
  toastCallbacks.forEach(callback => callback({ type: 'remove', id }));
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((event: Toast | { type: 'remove'; id: string }) => {
    if ('type' in event && event.type === 'remove') {
      setToasts(prev => prev.filter(t => t.id !== event.id));
    } else {
      setToasts(prev => {
        const exists = prev.find(t => t.id === (event as Toast).id);
        if (exists) {
          return prev;
        }
        return [...prev, event as Toast];
      });
    }
  }, []);

  useEffect(() => {
    toastCallbacks.add(addToast);
    return () => {
      toastCallbacks.delete(addToast);
    };
  }, [addToast]);

  return { toasts, removeToast };
};
