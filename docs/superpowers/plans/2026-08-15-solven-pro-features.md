# Solven Pro Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Solven from a basic prototype into a feature-rich teacher operations dashboard with profile system, analytics, dark mode, notifications, and data management — making it genuinely differentiated from generic AI tools.

**Architecture:** All features are client-side (localStorage persistence) since this is a hackathon prototype. New lib modules for profile, notifications, analytics, theme. Components extracted from page.tsx where needed. Settings page expanded into a multi-tab settings dashboard.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind v4, localStorage persistence, existing Stripe-inspired design tokens.

## Global Constraints
- All data stays client-side (localStorage) — no new backend endpoints
- PDPA: no real student/teacher data — demo data only
- Preserve existing Stripe-inspired design grammar (tokens, components, patterns)
- Thai language UI throughout
- Must work offline (PWA)
- `prefers-reduced-motion` respected for all animations

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/profile.ts` | Create | Teacher profile CRUD (localStorage) |
| `lib/notifications.ts` | Create | Notification center state + persistence |
| `lib/analytics.ts` | Create | Dashboard analytics computation |
| `lib/theme.ts` | Create | Dark mode toggle + persistence |
| `lib/data.ts` | Create | Export/import/clear data utilities |
| `components/ui/ProfileMenu.tsx` | Create | Avatar dropdown menu component |
| `components/ui/NotificationCenter.tsx` | Create | Notification bell + dropdown |
| `components/ui/ThemeToggle.tsx` | Create | Dark mode toggle button |
| `components/ui/StatsCard.tsx` | Create | Reusable stat card component |
| `app/page.tsx` | Modify | Integrate profile menu, notifications, analytics dashboard |
| `app/settings/page.tsx` | Modify | Multi-tab settings (profile, school, classes, notifications, theme, data) |
| `app/globals.css` | Modify | Dark mode CSS variables, notification styles |
| `lib/commands.ts` | Modify | Add new commands (profile, dark mode, export) |

---

## Task 1: Teacher Profile System

**Files:**
- Create: `frontend/lib/profile.ts`
- Modify: `frontend/app/page.tsx` (avatar → ProfileMenu)

**Interfaces:**
- Consumes: localStorage
- Produces: `TeacherProfile` type, `loadProfile()`, `saveProfile()`, `getInitials()`

- [ ] **Step 1: Create profile types and persistence**

```typescript
// frontend/lib/profile.ts
export interface TeacherProfile {
  name: string;
  initials: string;
  position: string;
  subjects: string[];
  classes: string[];
  email: string;
  phone: string;
  avatarColor: string; // hex color for avatar background
}

const DEFAULT_PROFILE: TeacherProfile = {
  name: "นางสาวสมหญิง ใจดี",
  initials: "สญ",
  position: "ครูผู้สอน",
  subjects: ["คณิตศาสตร์", "วิทยาศาสตร์"],
  classes: ["ป.5/1", "ป.5/2", "ป.6/1"],
  email: "",
  phone: "",
  avatarColor: "#635bff",
};

const KEY = "solven.profile";

export function loadProfile(): TeacherProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<TeacherProfile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(patch: Partial<TeacherProfile>): TeacherProfile {
  const next = { ...loadProfile(), ...patch };
  // Auto-generate initials from name if not manually set
  if (patch.name && !patch.initials) {
    const parts = patch.name.replace(/\s+/g, "").split("");
    next.initials = parts.slice(0, 2).join("");
  }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function getInitials(name: string): string {
  const parts = name.replace(/\s+/g, "").split("");
  return parts.slice(0, 2).join("");
}
```

- [ ] **Step 2: Run test to verify it works**

```bash
cd C:\TeachOps\frontend && npx tsc --noEmit lib/profile.ts
```

- [ ] **Step 3: Create ProfileMenu component**

```tsx
// frontend/components/ui/ProfileMenu.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { loadProfile, TeacherProfile } from "@/lib/profile";

interface ProfileMenuProps {
  onThemeToggle?: () => void;
  isDark?: boolean;
}

export default function ProfileMenu({ onThemeToggle, isDark }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile>(loadProfile);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const handler = () => setProfile(loadProfile());
    window.addEventListener("storage", handler);
    // Also refresh on focus in case profile was edited in another tab
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="avatar"
        title={`${profile.name} — คลิกเพื่อเปิดเมนู`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", background: profile.avatarColor }}
      >
        {profile.initials}
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-header">
            <span className="avatar avatar-lg" style={{ background: profile.avatarColor }}>
              {profile.initials}
            </span>
            <div>
              <div className="profile-name">{profile.name}</div>
              <div className="profile-position">{profile.position}</div>
            </div>
          </div>
          <div className="profile-divider" />
          <Link href="/settings?tab=profile" className="profile-item" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            โปรไฟล์ครู
          </Link>
          <Link href="/settings" className="profile-item" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            ตั้งค่า
          </Link>
          <button
            type="button"
            className="profile-item"
            role="menuitem"
            onClick={() => { onThemeToggle?.(); setOpen(false); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            {isDark ? "โหมดสว่าง" : "โหมดมืด"}
          </button>
          <div className="profile-divider" />
          <div className="profile-item profile-subjects">
            <span className="profile-label">วิชาที่สอน</span>
            <div className="profile-tags">
              {profile.subjects.map((s) => (
                <span key={s} className="profile-tag">{s}</span>
              ))}
            </div>
          </div>
          <div className="profile-item profile-classes">
            <span className="profile-label">ห้องเรียน</span>
            <div className="profile-tags">
              {profile.classes.map((c) => (
                <span key={c} className="profile-tag">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add profile dropdown CSS to globals.css**

```css
/* Profile dropdown */
.profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
  z-index: 80;
  animation: dropdown-in 0.15s ease-out;
  overflow: hidden;
}
@keyframes dropdown-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}
.avatar-lg {
  width: 44px;
  height: 44px;
  font-size: 1rem;
}
.profile-name {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink);
}
.profile-position {
  font-size: 0.78rem;
  color: var(--muted);
}
.profile-divider {
  height: 1px;
  background: var(--line);
  margin: 0;
}
.profile-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 0.85rem;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.12s;
}
.profile-item:hover {
  background: var(--surface-2);
}
.profile-item svg {
  flex: none;
  color: var(--muted);
}
.profile-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}
.profile-tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  background: var(--surface-2);
  border-radius: 999px;
  color: var(--muted);
}
```

- [ ] **Step 5: Replace avatar span in page.tsx with ProfileMenu**

In `page.tsx` around line 1248, replace:
```tsx
<span className="avatar" title="ผู้ใช้ (ตัวอย่าง)" aria-hidden="true">
  ท
</span>
```
with:
```tsx
<ProfileMenu onThemeToggle={toggleTheme} isDark={isDark} />
```

Add import at top of page.tsx:
```tsx
import ProfileMenu from "@/components/ui/ProfileMenu";
```

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/profile.ts frontend/components/ui/ProfileMenu.tsx frontend/app/page.tsx frontend/app/globals.css
git commit -m "feat(profile): add teacher profile system with dropdown menu"
```

---

## Task 2: Dark Mode System

**Files:**
- Create: `frontend/lib/theme.ts`
- Modify: `frontend/app/globals.css` (dark mode variables)
- Modify: `frontend/app/layout.tsx` (apply theme class)

**Interfaces:**
- Consumes: localStorage
- Produces: `Theme` type, `loadTheme()`, `saveTheme()`, `toggleTheme()`

- [ ] **Step 1: Create theme persistence module**

```typescript
// frontend/lib/theme.ts
export type Theme = "light" | "dark" | "system";

const KEY = "solven.theme";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    return (window.localStorage.getItem(KEY) as Theme) || "system";
  } catch {
    return "system";
  }
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {}
}

export function getEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const effective = getEffectiveTheme(theme);
  document.documentElement.setAttribute("data-theme", effective);
  document.documentElement.classList.toggle("dark", effective === "dark");
}
```

- [ ] **Step 2: Add dark mode CSS variables to globals.css**

Append after the existing `@theme inline` block:

```css
/* ============ Dark Mode ============ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0f1117;
    --surface: #1a1d27;
    --surface-2: #242836;
    --ink: #e8eaf0;
    --muted: #8b90a0;
    --line: #2a2e3d;
    --line-strong: #3a3f52;
    --accent-soft: #1e1b4b;
    --ok-soft: #052e16;
    --warn-soft: #422006;
    --danger-soft: #450a0a;
    --shadow-1: 0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.3);
    --shadow-2: 0 16px 40px rgba(0,0,0,0.5);
  }
}
:root[data-theme="dark"] {
  --bg: #0f1117;
  --surface: #1a1d27;
  --surface-2: #242836;
  --ink: #e8eaf0;
  --muted: #8b90a0;
  --line: #2a2e3d;
  --line-strong: #3a3f52;
  --accent-soft: #1e1b4b;
  --ok-soft: #052e16;
  --warn-soft: #422006;
  --danger-soft: #450a0a;
  --shadow-1: 0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.3);
  --shadow-2: 0 16px 40px rgba(0,0,0,0.5);
}
/* Dark mode toast overrides */
:root[data-theme="dark"] .toast {
  background: #2a2e3d;
  color: #e8eaf0;
}
:root[data-theme="dark"] .toast-success {
  background: #052e16;
}
:root[data-theme="dark"] .toast-error {
  background: #450a0a;
}
/* Dark mode print: always light */
@media print {
  :root[data-theme="dark"] {
    --bg: #ffffff;
    --surface: #ffffff;
    --ink: #000000;
  }
}
```

- [ ] **Step 3: Add theme initialization to layout.tsx**

In `layout.tsx`, add a `<script>` in `<head>` to prevent flash:

```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('solven.theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark')}}catch(e){}})()`,
  }}
/>
```

- [ ] **Step 4: Add theme state to page.tsx**

Add state and toggle function:
```tsx
const [isDark, setIsDark] = useState(() => {
  if (typeof window === "undefined") return false;
  const t = localStorage.getItem("solven.theme");
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const toggleTheme = useCallback(() => {
  setIsDark((prev) => {
    const next = !prev;
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("solven.theme", theme); } catch {}
    return next;
  });
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/theme.ts frontend/app/globals.css frontend/app/layout.tsx frontend/app/page.tsx
git commit -m "feat(theme): add dark mode with system preference detection"
```

---

## Task 3: Notification Center

**Files:**
- Create: `frontend/lib/notifications.ts`
- Create: `frontend/components/ui/NotificationCenter.tsx`
- Modify: `frontend/app/page.tsx` (add bell icon + integrate notifications)

**Interfaces:**
- Consumes: localStorage, Draft status changes
- Produces: `Notification` type, `addNotification()`, `getNotifications()`, `markRead()`

- [ ] **Step 1: Create notifications module**

```typescript
// frontend/lib/notifications.ts
export interface AppNotification {
  id: string;
  type: "draft-approved" | "draft-rejected" | "draft-created" | "system";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  draftId?: string;
}

const KEY = "solven.notifications";
const MAX_NOTIFICATIONS = 50;

export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addNotification(
  n: Omit<AppNotification, "id" | "read" | "createdAt">
): AppNotification {
  const notifications = getNotifications();
  const newN: AppNotification = {
    ...n,
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notifications.unshift(newN);
  // Trim to max
  if (notifications.length > MAX_NOTIFICATIONS) notifications.length = MAX_NOTIFICATIONS;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notifications));
  } catch {}
  return newN;
}

export function markRead(id: string): void {
  const notifications = getNotifications();
  const n = notifications.find((x) => x.id === id);
  if (n) n.read = true;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notifications));
  } catch {}
}

export function markAllRead(): void {
  const notifications = getNotifications();
  notifications.forEach((n) => (n.read = true));
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notifications));
  } catch {}
}

export function unreadCount(): number {
  return getNotifications().filter((n) => !n.read).length;
}

export function clearNotifications(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {}
}
```

- [ ] **Step 2: Create NotificationCenter component**

```tsx
// frontend/components/ui/NotificationCenter.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import {
  getNotifications,
  markRead,
  markAllRead,
  unreadCount,
  AppNotification,
} from "@/lib/notifications";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => {
    setNotifications(getNotifications());
    setUnread(unreadCount());
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000); // poll every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    refresh();
  };

  const handleMarkAll = () => {
    markAllRead();
    refresh();
  };

  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "เมื่อสักครู่";
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hours / 24)} วันที่แล้ว`;
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ position: "relative", padding: "6px 8px" }}
        onClick={() => setOpen(!open)}
        aria-label={`การแจ้งเตือน${unread > 0 ? ` (${unread} รายการใหม่)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && <span className="notification-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-title">การแจ้งเตือน</span>
            {unread > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleMarkAll}>
                อ่านทั้งหมด
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">ยังไม่มีการแจ้งเตือน</div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item ${!n.read ? "unread" : ""}`}
                  onClick={() => handleClick(n)}
                >
                  <div className="notification-icon">
                    {n.type === "draft-approved" && "✓"}
                    {n.type === "draft-rejected" && "✗"}
                    {n.type === "draft-created" && "+"}
                    {n.type === "system" && "•"}
                  </div>
                  <div className="notification-body">
                    <div className="notification-text">{n.title}</div>
                    <div className="notification-sub">{n.message}</div>
                    <div className="notification-time">{timeAgo(n.createdAt)}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add notification CSS to globals.css**

```css
/* Notification center */
.notification-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  display: grid;
  place-items: center;
  line-height: 1;
}
.notification-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  max-height: 420px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-2);
  z-index: 80;
  animation: dropdown-in 0.15s ease-out;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}
.notification-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--ink);
}
.notification-list {
  overflow-y: auto;
  flex: 1;
}
.notification-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 0.84rem;
  color: var(--muted);
}
.notification-item {
  display: flex;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--line);
}
.notification-item:hover {
  background: var(--surface-2);
}
.notification-item.unread {
  background: var(--accent-soft);
}
.notification-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex: none;
  color: var(--muted);
}
.notification-item.unread .notification-icon {
  background: var(--accent);
  color: #fff;
}
.notification-body {
  flex: 1;
  min-width: 0;
}
.notification-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notification-sub {
  font-size: 0.74rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notification-time {
  font-size: 0.68rem;
  color: var(--muted);
  margin-top: 2px;
}
```

- [ ] **Step 4: Add NotificationCenter to topbar in page.tsx**

Import:
```tsx
import NotificationCenter from "@/components/ui/NotificationCenter";
```

In the `topbar-actions` div (around line 1237), add before the ProfileMenu:
```tsx
<NotificationCenter />
```

- [ ] **Step 5: Hook notifications into draft status changes**

In the `setDraftStatus` function in page.tsx, add notification creation:
```tsx
import { addNotification } from "@/lib/notifications";

// Inside setDraftStatus callback, after patchDraftStatus:
addNotification({
  type: status === "approved" ? "draft-approved" : "draft-rejected",
  title: status === "approved" ? "อนุมัติร่างแล้ว" : "ปฏิเสธร่าง",
  message: `ร่างจาก ${AGENT_LABEL[d.agent]} ถูก${status === "approved" ? "อนุมัติ" : "ปฏิเสธ"}แล้ว`,
  draftId: d.id,
});
```

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/notifications.ts frontend/components/ui/NotificationCenter.tsx frontend/app/page.tsx frontend/app/globals.css
git commit -m "feat(notifications): add notification center with real-time updates"
```

---

## Task 4: Dashboard Analytics

**Files:**
- Create: `frontend/lib/analytics.ts`
- Modify: `frontend/app/page.tsx` (add analytics view to queue tab)

**Interfaces:**
- Consumes: Draft[] from API
- Produces: `getAnalytics()`, `AnalyticsData` type

- [ ] **Step 1: Create analytics computation module**

```typescript
// frontend/lib/analytics.ts
import { Draft } from "./types";

export interface AnalyticsData {
  totalDrafts: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
  byAgent: Record<string, { total: number; approved: number; rejected: number }>;
  weeklyActivity: { day: string; count: number; active: boolean }[];
  estimatedTimeSaved: number; // minutes
}

export function getAnalytics(drafts: Draft[]): AnalyticsData {
  const totalDrafts = drafts.length;
  const approved = drafts.filter((d) => d.status === "approved").length;
  const rejected = drafts.filter((d) => d.status === "rejected").length;
  const pending = drafts.filter((d) => d.status === "pending").length;
  const approvalRate = totalDrafts > 0 ? Math.round((approved / totalDrafts) * 100) : 0;

  // By agent
  const byAgent: AnalyticsData["byAgent"] = {};
  for (const d of drafts) {
    if (!byAgent[d.agent]) byAgent[d.agent] = { total: 0, approved: 0, rejected: 0 };
    byAgent[d.agent].total++;
    if (d.status === "approved") byAgent[d.agent].approved++;
    if (d.status === "rejected") byAgent[d.agent].rejected++;
  }

  // Weekly activity (last 7 days)
  const now = new Date();
  const dayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const count = drafts.filter((dr) => dr.createdAt.startsWith(dayStr)).length;
    return {
      day: dayNames[d.getDay()],
      count,
      active: count > 0,
    };
  });

  // Estimated time saved: ~5 min per approved draft (manual grading/typing estimate)
  const estimatedTimeSaved = approved * 5;

  return {
    totalDrafts,
    approved,
    rejected,
    pending,
    approvalRate,
    byAgent,
    weeklyActivity,
    estimatedTimeSaved,
  };
}
```

- [ ] **Step 2: Add analytics section to queue view in page.tsx**

Add a dashboard summary at the top of the queue view (before the filter bar):

```tsx
import { getAnalytics, AnalyticsData } from "@/lib/analytics";
import CountUp from "@/components/reactbits/CountUp";

// In the queue view section, add before the filter panel:
const analytics = useMemo(() => getAnalytics(drafts), [drafts]);

// Render stats row (uses existing .stats-row CSS):
<div className="stats-row view-in">
  <div className="stat">
    <div className="stat-num"><CountUp end={analytics.totalDrafts} /></div>
    <div className="stat-label">ร่างทั้งหมด</div>
  </div>
  <div className="stat stat-ok">
    <div className="stat-num"><CountUp end={analytics.approved} /></div>
    <div className="stat-label">อนุมัติแล้ว</div>
  </div>
  <div className="stat stat-danger">
    <div className="stat-num"><CountUp end={analytics.rejected} /></div>
    <div className="stat-label">ปฏิเสธ</div>
  </div>
  <div className="stat stat-blue">
    <div className="stat-num"><CountUp end={analytics.estimatedTimeSaved} /></div>
    <div className="stat-label">นาทีที่ประหยัดได้</div>
  </div>
</div>

// Activity bars (uses existing .activity-bars CSS):
<div className="panel panel-pad" style={{ marginBottom: 14 }}>
  <h3 className="section-title">กิจกรรม 7 วันล่าสุด</h3>
  <div className="activity-bars">
    {analytics.weeklyActivity.map((w, i) => (
      <div className="activity-col" key={i}>
        <div
          className="activity-bar"
          data-active={w.active ? "true" : undefined}
          style={{ height: `${Math.max(4, (w.count / Math.max(1, ...analytics.weeklyActivity.map(x => x.count))) * 48)}px` }}
        />
        <span className="activity-day">{w.day}</span>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/analytics.ts frontend/app/page.tsx
git commit -m "feat(analytics): add dashboard stats and weekly activity chart"
```

---

## Task 5: Enhanced Settings Page (Multi-Tab)

**Files:**
- Modify: `frontend/app/settings/page.tsx` (complete rewrite)
- Modify: `frontend/app/globals.css` (settings tab styles)

**Interfaces:**
- Consumes: `loadProfile()`, `saveProfile()`, `loadSchool()`, `saveSchool()`, `loadTheme()`, `saveTheme()`
- Produces: Multi-tab settings page

- [ ] **Step 1: Rewrite settings page with tabs**

The settings page becomes a tabbed interface with 5 sections:
1. **โปรไฟล์ครู** — name, position, subjects, classes, avatar color
2. **ข้อมูลโรงเรียน** — existing school info fields
3. **วิชาและชั้นเรียน** — manage subjects list and class roster
4. **การแจ้งเตือน** — notification preferences
5. **ธีมและข้อมูล** — dark mode toggle, export/import/clear data

```tsx
// frontend/app/settings/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { loadProfile, saveProfile, TeacherProfile } from "@/lib/profile";
import { loadSchool, saveSchool, SchoolInfo } from "@/lib/school";
import { loadTheme, saveTheme, Theme } from "@/lib/theme";
import {
  getNotifications,
  clearNotifications,
  unreadCount,
} from "@/lib/notifications";
import { useToast } from "@/components/ui/ToastProvider";

type Tab = "profile" | "school" | "subjects" | "notifications" | "data";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profile", label: "โปรไฟล์ครู", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" },
  { id: "school", label: "ข้อมูลโรงเรียน", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { id: "subjects", label: "วิชาและชั้นเรียน", icon: "M4 19.5A2.5 2.5 0 016.5 17H20" },
  { id: "notifications", label: "การแจ้งเตือน", icon: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" },
  { id: "data", label: "ธีมและข้อมูล", icon: "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const { push } = useToast();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo">S</span>
          <span className="brand-name">Solven</span>
        </div>
        <nav className="sidebar-nav" aria-label="ตั้งค่า">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="nav-item"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
              {t.label}
            </button>
          ))}
          <div style={{ marginTop: "auto" }}>
            <Link href="/" className="nav-item">← กลับไปแดชบอร์ด</Link>
          </div>
        </nav>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <div>
            <h1 className="page-title">ตั้งค่า</h1>
            <p className="page-sub">{TABS.find((t) => t.id === tab)?.label}</p>
          </div>
        </header>
        <main className="content view-in" key={tab}>
          {tab === "profile" && <ProfileTab push={push} />}
          {tab === "school" && <SchoolTab push={push} />}
          {tab === "subjects" && <SubjectsTab push={push} />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "data" && <DataTab push={push} />}
        </main>
      </div>
    </div>
  );
}

// Each tab is a separate component below...
```

(Implement ProfileTab, SchoolTab, SubjectsTab, NotificationsTab, DataTab as internal components)

- [ ] **Step 2: Add settings tab CSS**

```css
/* Settings tabs */
.settings-tab-content {
  max-width: 640px;
}
.settings-section {
  margin-bottom: 24px;
}
.settings-section-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 12px;
}
.settings-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.settings-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  font-size: 0.8rem;
  color: var(--ink);
}
.settings-chip button {
  border: none;
  background: none;
  color: var(--muted);
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
  line-height: 1;
}
.settings-chip button:hover {
  color: var(--danger);
}
.theme-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.15s;
}
.theme-option:hover {
  border-color: var(--accent);
}
.theme-option.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}
.data-danger-zone {
  border: 1px solid #f0c4c1;
  border-radius: var(--radius);
  padding: 16px;
  background: var(--danger-soft);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/settings/page.tsx frontend/app/globals.css
git commit -m "feat(settings): multi-tab settings with profile, subjects, theme, data"
```

---

## Task 6: Data Export/Import

**Files:**
- Create: `frontend/lib/data.ts`
- Integrate into settings page DataTab

**Interfaces:**
- Consumes: localStorage keys (solven.school, solven.profile, solven.rubricPresets, solven.theme, solven.notifications)
- Produces: `exportAllData()`, `importData()`, `clearAllData()`

- [ ] **Step 1: Create data utilities**

```typescript
// frontend/lib/data.ts

interface ExportData {
  version: 1;
  exportedAt: string;
  school: unknown;
  profile: unknown;
  presets: unknown;
  theme: unknown;
  notifications: unknown;
  drafts: unknown;
}

const KEYS = [
  "solven.school",
  "solven.profile",
  "solven.rubricPresets",
  "solven.theme",
  "solven.notifications",
  "solven.settings",
];

export function exportAllData(): string {
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    school: null,
    profile: null,
    presets: null,
    theme: null,
    notifications: null,
    drafts: null,
  };
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const field = key.replace("solven.", "") as keyof ExportData;
        (data as any)[field] = JSON.parse(raw);
      }
    } catch {}
  }
  // Also export drafts from the API if available
  try {
    const draftsRaw = localStorage.getItem("solven.drafts");
    if (draftsRaw) data.drafts = JSON.parse(draftsRaw);
  } catch {}
  return JSON.stringify(data, null, 2);
}

export function importData(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr) as ExportData;
    if (data.version !== 1) throw new Error("Unsupported version");
    const map: Record<string, string> = {
      school: "solven.school",
      profile: "solven.profile",
      presets: "solven.rubricPresets",
      theme: "solven.theme",
      notifications: "solven.notifications",
      settings: "solven.settings",
      drafts: "solven.drafts",
    };
    for (const [field, key] of Object.entries(map)) {
      const val = (data as any)[field];
      if (val !== null && val !== undefined) {
        localStorage.setItem(key, JSON.stringify(val));
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  for (const key of KEYS) {
    try { localStorage.removeItem(key); } catch {}
  }
  try { localStorage.removeItem("solven.drafts"); } catch {}
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/data.ts
git commit -m "feat(data): add export/import/clear data utilities"
```

---

## Task 7: Wire Everything Together in page.tsx

**Files:**
- Modify: `frontend/app/page.tsx` (final integration)

This task ensures all the new systems are properly wired:

1. ProfileMenu replaces avatar span
2. NotificationCenter added to topbar
3. Theme toggle state connected
4. Notifications triggered on draft status changes
5. Analytics displayed in queue view

- [ ] **Step 1: Add all new imports**

```tsx
import ProfileMenu from "@/components/ui/ProfileMenu";
import NotificationCenter from "@/components/ui/NotificationCenter";
import { addNotification } from "@/lib/notifications";
import { getAnalytics } from "@/lib/analytics";
```

- [ ] **Step 2: Add theme state and toggle**

```tsx
const [isDark, setIsDark] = useState(() => {
  if (typeof window === "undefined") return false;
  const t = localStorage.getItem("solven.theme");
  if (t === "dark") return true;
  if (t === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
});

const toggleTheme = useCallback(() => {
  setIsDark((prev) => {
    const next = !prev;
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("solven.theme", theme); } catch {}
    return next;
  });
}, []);
```

- [ ] **Step 3: Update topbar-actions**

```tsx
<div className="topbar-actions">
  <NotificationCenter />
  {isDesktop && (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPaletteOpen(true)} title="คำสั่งลัด (⌘K / Ctrl+K)">
      <kbd style={{ fontFamily: "inherit" }}>⌘K</kbd>
    </button>
  )}
  <ProfileMenu onThemeToggle={toggleTheme} isDark={isDark} />
</div>
```

- [ ] **Step 4: Add notifications to draft status changes**

In the `setDraftStatus` function, after `patchDraftStatus`:
```tsx
addNotification({
  type: status === "approved" ? "draft-approved" : "draft-rejected",
  title: status === "approved" ? "อนุมัติร่างแล้ว" : "ปฏิเสธร่าง",
  message: `ร่างจาก ${AGENT_LABEL[d.agent]} ถูก${status === "approved" ? "อนุมัติ" : "ปฏิเสธ"}`,
  draftId: d.id,
});
```

- [ ] **Step 5: Add analytics to queue view**

At the top of the queue view section (after the `{view === "queue" && (` line):
```tsx
const analytics = useMemo(() => getAnalytics(drafts), [drafts]);
// Render stats-row and activity-bars before the filter panel
```

- [ ] **Step 6: Add commands for new features**

In `lib/commands.ts`, add to the commands array:
```tsx
{
  id: "go-profile",
  group: "ไปยังหน้า",
  label: "โปรไฟล์ครู",
  hint: "u",
  keywords: "โปรไฟล์ ครู profile settings",
  onSelect: () => actions.goSettings(), // will navigate to settings?tab=profile
},
{
  id: "toggle-theme",
  group: "ระบบ",
  label: "สลับธีมสว่าง/มืด",
  keywords: "ธีม dark mode สว่าง มืด",
  onSelect: () => actions.toggleTheme?.(),
},
{
  id: "export-data",
  group: "ข้อมูล",
  label: "ส่งออกข้อมูล",
  keywords: "export ส่งออก ข้อมูล backup",
  onSelect: () => actions.exportData?.(),
},
```

- [ ] **Step 7: Final build test**

```bash
cd C:\TeachOps\frontend && npm run build
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: integrate profile, notifications, analytics, dark mode, data export"
```

---

## Task 8: Final Polish & Verification

- [ ] **Step 1: Take screenshot of each major view**

```bash
npx playwright screenshot --browser chromium --viewport-size '1280,900' http://localhost:3000 C:\Users\menum\AppData\Local\Temp\opencode\view-create.png
npx playwright screenshot --browser chromium --viewport-size '1280,900' http://localhost:3000/settings C:\Users\menum\AppData\Local\Temp\opencode\view-settings.png
```

- [ ] **Step 2: Verify dark mode renders correctly**

- [ ] **Step 3: Verify profile dropdown opens and shows correct info**

- [ ] **Step 4: Verify notifications appear when draft status changes**

- [ ] **Step 5: Verify data export downloads a JSON file**

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final polish and verification"
```
