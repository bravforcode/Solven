/**
 * SyncEngine — background sync with exponential backoff and retry logic.
 *
 * Processes the sync queue from SolvenDB, with configurable retry limits
 * and exponential backoff delays.
 */

import { db, type SyncOperation } from "./offlineDb";

export interface SyncConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  batchSize: number;
}

const DEFAULT_CONFIG: SyncConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  batchSize: 10,
};

export class SyncEngine {
  private config: SyncConfig;
  private isRunning = false;
  private intervalId?: ReturnType<typeof setInterval>;

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  calculateDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const delay = this.config.baseDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * delay;
    return Math.min(delay + jitter, this.config.maxDelayMs);
  }

  shouldRetry(retryCount: number): boolean {
    return retryCount < this.config.maxRetries;
  }

  async processQueue(
    submit: (op: SyncOperation) => Promise<boolean>
  ): Promise<{ processed: number; failed: number }> {
    if (this.isRunning) {
      return { processed: 0, failed: 0 };
    }

    this.isRunning = true;
    let processed = 0;
    let failed = 0;

    try {
      const pendingOps = await db.getPendingSyncs();
      const batch = pendingOps.slice(0, this.config.batchSize);

      for (const op of batch) {
        if (!this.shouldRetry(op.retryCount)) {
          await db.markSyncCompleted(op.id);
          failed++;
          continue;
        }

        try {
          const delay = this.calculateDelay(op.retryCount);
          await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 100)));

          const success = await submit(op);
          if (success) {
            await db.markSyncCompleted(op.id);
            processed++;
          } else {
            await db.incrementRetry(op.id, "submit returned false");
            failed++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          await db.incrementRetry(op.id, errorMsg);
          failed++;
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { processed, failed };
  }

  start(
    submit: (op: SyncOperation) => Promise<boolean>,
    intervalMs: number = 30000
  ): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(async () => {
      await this.processQueue(submit);
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
