import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ToastValue {
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastValue>({ notify: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const notify = useCallback((msg: string) => setMessage(msg), []);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(t);
  }, [message]);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" aria-atomic="true">
        {message && (
          <div className="toast" role="status">
            <Icon name="check" size={16} strokeWidth={2.4} />
            {message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastValue => useContext(ToastContext);
