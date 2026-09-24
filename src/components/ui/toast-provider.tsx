"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}
const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(""), 3200);
  }, []);
  const value = useMemo(() => ({ success: show, error: show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed bottom-24 right-4 z-[80]">
        {message ? (
          <div
            role="status"
            className="rounded-xl bg-[var(--brand-600)] px-4 py-3 text-sm font-semibold text-white shadow-xl"
          >
            {message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value)
    throw new Error("useToast harus digunakan di dalam ToastProvider");
  return value;
}
