// Backup & restore (feature 30: สำรอง/กู้คืนข้อมูล) — JSON export/import.
// Exports drafts + ratings + settings as a single JSON file; import restores
// them into localStorage. Deterministic, no backend needed (demo mode).

import { Draft } from "./types";
import { FeedbackRating, loadRatings } from "./feedback";

export interface BackupPayload {
  app: "solven";
  version: 1;
  exportedAt: string;
  drafts: Draft[];
  ratings: FeedbackRating[];
  settings: Record<string, unknown>;
}

const DRAFTS_KEY = "solven-drafts";
const SETTINGS_KEY = "solven-settings";

export function buildBackup(drafts: Draft[]): BackupPayload {
  return {
    app: "solven",
    version: 1,
    exportedAt: new Date().toISOString(),
    drafts,
    ratings: loadRatings(),
    settings: JSON.parse(
      typeof window !== "undefined" ? (localStorage.getItem(SETTINGS_KEY) ?? "{}") : "{}"
    ),
  };
}

export function downloadBackup(drafts: Draft[]): void {
  const payload = buildBackup(drafts);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `solven-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreBackup(file: File): Promise<{ ok: boolean; error?: string; drafts?: Draft[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as BackupPayload;
        if (payload.app !== "solven" || payload.version !== 1) {
          resolve({ ok: false, error: "ไฟล์ไม่ใช่ข้อมูลสำรองของ Solven" });
          return;
        }
        if (typeof window !== "undefined") {
          if (payload.drafts?.length) {
            localStorage.setItem(DRAFTS_KEY, JSON.stringify(payload.drafts));
          }
          if (payload.ratings?.length) {
            localStorage.setItem("solven-feedback-ratings", JSON.stringify(payload.ratings));
          }
          if (payload.settings) {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload.settings));
          }
        }
        resolve({ ok: true, drafts: payload.drafts });
      } catch (err) {
        resolve({ ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: "อ่านไฟล์ไม่สำเร็จ" });
    reader.readAsText(file);
  });
}