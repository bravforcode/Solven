/**
 * SolvenDB — Dexie.js IndexedDB schema for offline-first PWA.
 *
 * Based on EduSync/CAMFED offline-first pattern.
 * Supports drafts + sync queue with background sync and retry logic.
 */

import Dexie, { type Table } from "dexie";

export interface OfflineDraft {
  id: string;
  agent: string;
  input: string;
  output: string;
  rubric?: string;
  status: "pending" | "synced" | "failed";
  createdAt: number;
  syncedAt?: number;
}

export interface SyncOperation {
  id: string;
  type: "submit_task" | "patch_draft" | "delete_draft";
  payload: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export class SolvenDB extends Dexie {
  drafts!: Table<OfflineDraft>;
  syncQueue!: Table<SyncOperation>;

  constructor() {
    super("solven-offline-db");
    this.version(1).stores({
      drafts: "id, agent, status, createdAt",
      syncQueue: "id, type, createdAt, retryCount",
    });
  }

  async addDraft(draft: OfflineDraft): Promise<void> {
    await this.drafts.put(draft);
  }

  async getAllDrafts(): Promise<OfflineDraft[]> {
    return await this.drafts.toArray();
  }

  async getDraft(id: string): Promise<OfflineDraft | undefined> {
    return await this.drafts.get(id);
  }

  async updateDraftStatus(
    id: string,
    status: OfflineDraft["status"]
  ): Promise<void> {
    await this.drafts.update(id, { status });
  }

  async deleteDraft(id: string): Promise<void> {
    await this.drafts.delete(id);
  }

  async queueSync(op: SyncOperation): Promise<void> {
    await this.syncQueue.put(op);
  }

  async getPendingSyncs(): Promise<SyncOperation[]> {
    return await this.syncQueue.orderBy("createdAt").toArray();
  }

  async markSyncCompleted(id: string): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async incrementRetry(id: string, error: string): Promise<void> {
    const op = await this.syncQueue.get(id);
    if (op) {
      await this.syncQueue.update(id, {
        retryCount: op.retryCount + 1,
        lastError: error,
      });
    }
  }
}

export const db = new SolvenDB();
