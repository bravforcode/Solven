"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterCommands } from "@/lib/commands";
import type { CommandItem } from "@/lib/commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

/** ⌘K command palette — overlay dialog + search + keyboard-navigable listbox.
 *  Shortcut binding (⌘K/Ctrl+K) lives in the parent (useShortcuts — single source). */
export default function CommandPalette({ open, onClose, items }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => filterCommands(items, query), [items, query]);

  // reset + focus on open
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // Esc closes (dialog-level)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const select = (item: CommandItem) => {
    item.onSelect();
    onClose();
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) select(filtered[active]);
    }
  };

  return (
    <div className="cmd-palette" role="dialog" aria-modal="true" aria-label="คำสั่งลัด">
      <div className="cmd-panel">
        <div className="cmd-input-wrap">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--muted)", flex: "none" }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="ค้นหาคำสั่ง..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls="cmd-list"
            aria-label="ค้นหาคำสั่ง"
          />
          <span className="kbd-hint">
            <kbd>Esc</kbd>
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="cmd-empty">ไม่พบคำสั่งที่ตรงกับ “{query}”</div>
        ) : (
          <ul className="cmd-list" id="cmd-list" role="listbox" aria-label="รายการคำสั่ง">
            {filtered.map((item, i) => (
              <li key={item.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  className="cmd-item"
                  data-active={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => select(item)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.hint && <span className="cmd-item-hint">{item.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="cmd-foot">
          <span className="kbd-hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd> เลือก
          </span>
          <span className="kbd-hint">
            <kbd>↵</kbd> ใช้
          </span>
          <span className="kbd-hint">
            <kbd>Esc</kbd> ปิด
          </span>
        </div>
      </div>
    </div>
  );
}
