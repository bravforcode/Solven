"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------- useSelection: batch selection (auto-clears on filter/search change) ---------- */

export interface SelectionApi {
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
  clear: () => void;
  count: number;
  allSelected: boolean;
  indeterminate: boolean;
}

export function useSelection(ids: string[], resetKey: string): SelectionApi {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const prevKey = useRef(resetKey);

  useEffect(() => {
    if (prevKey.current !== resetKey) {
      prevKey.current = resetKey;
      setSelected(new Set());
    }
  }, [resetKey]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((list: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = list.length > 0 && list.every((id) => next.has(id));
      if (all) list.forEach((id) => next.delete(id));
      else list.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const count = selected.size;
  const list = ids.filter((id) => selected.has(id));
  const allSelected = ids.length > 0 && list.length === ids.length;
  const indeterminate = list.length > 0 && !allSelected;

  return { selected, toggle, toggleAll, clear, count, allSelected, indeterminate };
}

/* ---------- useMediaQuery ---------- */

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

/* ---------- useShortcuts: desktop keyboard shortcuts ---------- */

export interface ShortcutHandlers {
  goCreate?: () => void;
  goQueue?: () => void;
  focusSearch?: () => void;
  focusAnswers?: () => void;
  openPalette?: () => void;
}

/**
 * Desktop shortcuts: ⌘K/Ctrl+K palette · 1 สร้างงาน · 2 คิวตรวจ · n สร้างงาน · / ค้นหา · c คำตอบ.
 * Skips when focus is inside a form control; modifiers reserved for ⌘K.
 */
export function useShortcuts(handlers: ShortcutHandlers, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const isFormTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return (
        el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable
      );
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current.openPalette?.();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFormTarget(e.target)) return;
      if (e.key === "1") {
        e.preventDefault();
        ref.current.goCreate?.();
      } else if (e.key === "2") {
        e.preventDefault();
        ref.current.goQueue?.();
      } else if (e.key.toLowerCase() === "n") {
        ref.current.goCreate?.();
      } else if (e.key === "/") {
        e.preventDefault();
        ref.current.focusSearch?.();
      } else if (e.key.toLowerCase() === "c") {
        ref.current.focusAnswers?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
