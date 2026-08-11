-- 001: performance indexes for audit + review queue
CREATE INDEX IF NOT EXISTS idx_agent_runs_task_id ON agent_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON drafts(status);
