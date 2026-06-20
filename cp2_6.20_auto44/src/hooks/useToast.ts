import { useState, useCallback } from 'react';

interface ToastMessage {
  id: string;
  message: string;
  duration: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, duration: number = 2000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, duration }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}
