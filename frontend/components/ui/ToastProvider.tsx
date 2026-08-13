"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  /** e.g. "เลิกทำ" — renders an undo button inside the toast */
  actionLabel?: string;
  onAction?: () => void;
  /** override auto-dismiss ms (default 4200, or 5000 when action present) */
  duration?: number;
}

interface Toast {
  id: number;
  type: ToastType;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  push: (type: ToastType, text: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast ต้องใช้ภายใน <ToastProvider>");
  return ctx;
}

/** Replaces the inline toast logic from page.tsx — same visuals (.toast* classes), adds undo action support */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((type: ToastType, text: string, opts?: ToastOptions) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, type, text, actionLabel: opts?.actionLabel, onAction: opts?.onAction }]);
    const duration = opts?.duration ?? (opts?.actionLabel ? 5000 : 4200);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}</span>
            <span>{t.text}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                className="undo-btn"
                onClick={() => {
                  t.onAction?.();
                  setToasts((ts) => ts.filter((x) => x.id !== t.id));
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
