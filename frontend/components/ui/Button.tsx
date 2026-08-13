"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "full";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** show spinner + aria-busy, disable clicks */
  loading?: boolean;
  /** flash green success state for 800ms then reset via onSuccessDone */
  success?: boolean;
  onSuccessDone?: () => void;
}

/**
 * Stateful button — wraps the existing Stripe .btn* grammar.
 * loading → .btn-loading spinner (::before, already in globals.css)
 * success → .btn-success green flash (utility layer)
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  success = false,
  onSuccessDone,
  className = "",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const [flash, setFlash] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (success && !flash) {
      setFlash(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        setFlash(false);
        onSuccessDone?.();
      }, 800);
    }
    return () => window.clearTimeout(timer.current);
  }, [success, flash, onSuccessDone]);

  const variantCls =
    variant === "primary"
      ? "btn-primary"
      : variant === "secondary"
        ? "btn-secondary"
        : variant === "danger"
          ? "btn-danger"
          : "btn-ghost";

  const sizeCls = size === "sm" ? "btn-sm" : size === "full" ? "btn-full" : "";

  const cls = ["btn", variantCls, sizeCls, loading ? "btn-loading" : "", flash ? "btn-success" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  );
}
