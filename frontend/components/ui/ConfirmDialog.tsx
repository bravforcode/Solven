"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Minimal confirmation dialog — reuses .drawer-mask overlay + .panel; Esc cancels, focus lands on confirm */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "ยืนยัน",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="drawer-mask"
      style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 80 }}
      onClick={onCancel}
    >
      <div
        className="panel panel-pad"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: "100%", maxWidth: 420, boxShadow: "var(--shadow-2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="section-title" style={{ marginBottom: 8 }}>
          {title}
        </h2>
        {body && <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 6 }}>{body}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            ยกเลิก
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
